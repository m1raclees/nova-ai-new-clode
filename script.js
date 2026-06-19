const API_BASE_URL = 'http://127.0.0.1:5000';

// DOM элементы
const uploadZone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const selectFileBtn = document.getElementById('selectFileBtn');
const selectFileBtn2 = document.getElementById('selectFileBtn2');
const fileInfoDiv = document.getElementById('fileInfo');
const fileNameSpan = document.getElementById('fileName');
const fileSizeSpan = document.getElementById('fileSize');
const removeFileBtn = document.getElementById('removeFileBtn');
const lectureText = document.getElementById('lectureText');
const charCountSpan = document.getElementById('charCount');
const generateBtn = document.getElementById('generateBtn');
const resultContentDiv = document.getElementById('resultContent');
const copyResultBtn = document.getElementById('copyResultBtn');
const clearResultBtn = document.getElementById('clearResultBtn');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const downloadDocxBtn = document.getElementById('downloadDocxBtn');
const downloadTxtBtn = document.getElementById('downloadTxtBtn');
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const sendChatBtn = document.getElementById('sendChatBtn');
const tabs = document.querySelectorAll('.tab');
const panes = document.querySelectorAll('.tab-pane');
const themeToggleBtn = document.getElementById('themeToggleBtn');
const historyList = document.getElementById('historyList');
const clearHistoryBtn = document.getElementById('clearHistoryBtn');

let currentFile = null;
let lastResultText = '';

// === ТЕМА (одна кнопка) ===
function setTheme(theme) {
    if (theme === 'dark') {
        document.body.classList.add('dark');
        localStorage.setItem('nova-theme', 'dark');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i>';
    } else {
        document.body.classList.remove('dark');
        localStorage.setItem('nova-theme', 'light');
        if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i>';
    }
}
function toggleTheme() {
    const isDark = document.body.classList.contains('dark');
    setTheme(isDark ? 'light' : 'dark');
}
const savedTheme = localStorage.getItem('nova-theme');
if (savedTheme === 'dark') {
    setTheme('dark');
} else {
    setTheme('light');
}
themeToggleBtn?.addEventListener('click', toggleTheme);

// === БЕЗОПАСНЫЙ МИНИ-РЕНДЕР MARKDOWN -> HTML ===
function renderMarkdown(md) {
    const lines = String(md).replace(/\r\n/g, '\n').split('\n');
    let html = '';
    let listType = null;
    const closeList = () => { if (listType) { html += `</${listType}>`; listType = null; } };
    const inline = (s) => {
        let t = escapeHtml(s);
        t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
        t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
        return t;
    };
    for (const raw of lines) {
        const line = raw.trim();
        if (!line) { closeList(); continue; }
        let m;
        if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
            closeList();
            const lvl = Math.min(m[1].length, 4);
            html += `<h${lvl}>${inline(m[2])}</h${lvl}>`;
        } else if ((m = line.match(/^\d+[.)]\s+(.*)$/))) {
            if (listType !== 'ol') { closeList(); html += '<ol>'; listType = 'ol'; }
            html += `<li>${inline(m[1])}</li>`;
        } else if ((m = line.match(/^[-*•]\s+(.*)$/))) {
            if (listType !== 'ul') { closeList(); html += '<ul>'; listType = 'ul'; }
            html += `<li>${inline(m[1])}</li>`;
        } else {
            closeList();
            html += `<p>${inline(line)}</p>`;
        }
    }
    closeList();
    return html;
}

// Переключение вкладок
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetId = tab.dataset.tab + 'Pane';
        tabs.forEach(t => t.classList.remove('active'));
        panes.forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(targetId).classList.add('active');
    });
});

// Загрузка файла
function triggerFileInput() { fileInput.click(); }
if (selectFileBtn) selectFileBtn.addEventListener('click', triggerFileInput);
if (selectFileBtn2) selectFileBtn2.addEventListener('click', triggerFileInput);
if (uploadZone) uploadZone.addEventListener('click', triggerFileInput);

if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#4f46e5';
    });
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = 'var(--border-strong)';
    });
    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = 'var(--border-strong)';
        const file = e.dataTransfer.files[0];
        if (file) await processFile(file);
    });
}

if (fileInput) {
    fileInput.addEventListener('change', async (e) => {
        if (e.target.files[0]) await processFile(e.target.files[0]);
    });
}

async function processFile(file) {
    if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой (макс. 10 MB)');
        return;
    }
    currentFile = file;
    fileNameSpan.textContent = file.name;
    fileSizeSpan.textContent = formatBytes(file.size);
    fileInfoDiv.style.display = 'flex';
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch(`${API_BASE_URL}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.text) {
            lectureText.value = data.text;
            updateCharCounter();
        } else {
            alert('Ошибка чтения файла: ' + (data.error || 'неизвестная ошибка'));
        }
    } catch {
        alert('Ошибка соединения с сервером');
    }
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

if (removeFileBtn) {
    removeFileBtn.addEventListener('click', () => {
        currentFile = null;
        fileInfoDiv.style.display = 'none';
        fileInput.value = '';
    });
}

function updateCharCounter() {
    const len = lectureText.value.length;
    charCountSpan.textContent = len;
    generateBtn.disabled = len < 500;
}
lectureText.addEventListener('input', updateCharCounter);

// Генерация вопросов
generateBtn.addEventListener('click', async () => {
    const text = lectureText.value.trim();
    if (text.length < 500) {
        alert('Минимум 500 символов');
        return;
    }
    generateBtn.disabled = true;
    resultContentDiv.innerHTML = '<div class="placeholder" style="padding:2rem"><i class="fas fa-spinner fa-pulse"></i> Генерация...</div>';
    try {
        const res = await fetch(`${API_BASE_URL}/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        const data = await res.json();
        if (data.result) {
            lastResultText = data.result;
            resultContentDiv.innerHTML = `<div class="result-text">${renderMarkdown(data.result)}</div>`;
            addHistoryEntry(text, data.result);
        } else {
            resultContentDiv.innerHTML = `<div class="placeholder">Ошибка: ${escapeHtml(data.error)}</div>`;
        }
    } catch {
        resultContentDiv.innerHTML = '<div class="placeholder">Ошибка соединения с сервером</div>';
    } finally {
        generateBtn.disabled = false;
    }
});

function escapeHtml(str) {
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// === ИСТОРИЯ ГЕНЕРАЦИЙ (localStorage, без базы данных) ===
const HISTORY_KEY = 'nova-history';

function loadHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch { return []; }
}
function saveHistory(arr) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}
function deriveTopic(sourceText) {
    if (currentFile && currentFile.name) return currentFile.name;
    const clean = (sourceText || '').trim().replace(/\s+/g, ' ');
    if (!clean) return 'Без названия';
    return clean.length > 60 ? clean.slice(0, 60) + '…' : clean;
}
function formatDateTime(iso) {
    const d = new Date(iso);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function addHistoryEntry(sourceText, result) {
    const history = loadHistory();
    history.unshift({ id: Date.now(), topic: deriveTopic(sourceText), time: new Date().toISOString(), result });
    if (history.length > 50) history.length = 50;
    saveHistory(history);
    renderHistory();
}
function renderHistory() {
    if (!historyList) return;
    const history = loadHistory();
    if (!history.length) {
        historyList.innerHTML = '<div class="placeholder"><i class="fas fa-clock-rotate-left"></i><p>Здесь появится история сгенерированных вопросов</p></div>';
        return;
    }
    historyList.innerHTML = history.map(item => `
        <button class="history-item" data-id="${item.id}">
            <span class="history-icon"><i class="fas fa-file-lines"></i></span>
            <span class="history-meta">
                <span class="history-topic">${escapeHtml(item.topic)}</span>
                <span class="history-time"><i class="fas fa-clock"></i> ${formatDateTime(item.time)}</span>
            </span>
            <span class="history-open"><i class="fas fa-arrow-right"></i></span>
        </button>
    `).join('');
    historyList.querySelectorAll('.history-item').forEach(btn => {
        btn.addEventListener('click', () => openHistoryEntry(Number(btn.dataset.id)));
    });
}
function openHistoryEntry(id) {
    const item = loadHistory().find(h => h.id === id);
    if (!item) return;
    lastResultText = item.result;
    resultContentDiv.innerHTML = `<div class="result-text">${renderMarkdown(item.result)}</div>`;
    tabs.forEach(t => t.classList.remove('active'));
    panes.forEach(p => p.classList.remove('active'));
    const qTab = document.querySelector('.tab[data-tab="questions"]');
    if (qTab) qTab.classList.add('active');
    document.getElementById('questionsPane').classList.add('active');
}
clearHistoryBtn?.addEventListener('click', () => {
    if (confirm('Очистить всю историю?')) {
        saveHistory([]);
        renderHistory();
    }
});

// Копирование
copyResultBtn?.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    navigator.clipboard.writeText(lastResultText).then(() => alert('Скопировано'));
});

// Очистка
clearResultBtn?.addEventListener('click', () => {
    lastResultText = '';
    resultContentDiv.innerHTML = `<div class="placeholder"><i class="fas fa-wand-magic-sparkles"></i><p>Сгенерируйте вопросы – они появятся здесь</p></div>`;
});

// Скачивание (три отдельные кнопки)
downloadTxtBtn?.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    const blob = new Blob([lastResultText], { type: 'text/plain' });
    saveAs(blob, 'questions.txt');
});
downloadPdfBtn?.addEventListener('click', () => {
    if (!lastResultText) return alert('Нет результата');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const lines = doc.splitTextToSize(lastResultText, 170);
    doc.text(lines, 15, 15);
    doc.save('questions.pdf');
});
downloadDocxBtn?.addEventListener('click', async () => {
    if (!lastResultText) return alert('Нет результата');
    const { Document, Packer, Paragraph, TextRun } = window.docx;
    const doc = new Document({
        sections: [{
            children: [new Paragraph({ children: [new TextRun(lastResultText)] })]
        }]
    });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, 'questions.docx');
});

// Чат
sendChatBtn?.addEventListener('click', sendMessage);
chatInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

async function sendMessage() {
    const msg = chatInput.value.trim();
    if (!msg) return;
    addMessage('user', msg);
    chatInput.value = '';
    const typingId = showTyping();
    try {
        const res = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg })
        });
        const data = await res.json();
        removeTyping(typingId);
        if (data.result) addMessage('bot', data.result);
        else addMessage('bot', 'Ошибка: ' + (data.error || 'неизвестно'));
    } catch {
        removeTyping(typingId);
        addMessage('bot', 'Ошибка соединения с сервером');
    }
}

function addMessage(role, text) {
    const div = document.createElement('div');
    div.className = `message ${role === 'user' ? 'user' : 'bot'}`;
    const avatar = role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
    const sender = role === 'user' ? 'Вы' : 'Nova AI';
    const body = role === 'user' ? escapeHtml(text).replace(/\n/g, '<br>') : renderMarkdown(text);
    div.innerHTML = `
        <div class="avatar">${avatar}</div>
        <div class="bubble">
            <div class="sender">${sender}</div>
            <div class="text">${body}</div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showTyping() {
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message bot';
    div.id = id;
    div.innerHTML = `
        <div class="avatar"><i class="fas fa-robot"></i></div>
        <div class="bubble">
            <div class="sender">Nova AI</div>
            <div class="text"><i>печатает...</i></div>
        </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}

function removeTyping(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

updateCharCounter();
renderHistory();
