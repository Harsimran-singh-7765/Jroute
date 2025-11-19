document.addEventListener("DOMContentLoaded", () => {
    const msgBox = document.getElementById("msgBox");
    const messagesDiv = document.getElementById("messages");
    const onlineUsersDiv = document.getElementById("online-users");
    const uploadBtn = document.getElementById("upload-btn");
    const fileInput = document.getElementById("file-input");
    const chatWindow = document.getElementById('chat-window');
    const modal = document.getElementById('nickname-modal');
    const modalInput = document.getElementById('nickname-input');
    const modalBtn = document.getElementById('nickname-submit');

    let nickname = sessionStorage.getItem('jroute_nickname');
    let ws = null;

    function startApp() {
        if (!nickname) { showNicknameModal(); return; }
        connectWebSocket();
        fetchOnlineUsers();
        setInterval(fetchOnlineUsers, 5000);
        if(typeof initThreeJS === "function") initThreeJS();
        if(typeof initScreenEffects === "function") initScreenEffects();
    }

    function showNicknameModal() {
        if(modal) {
            modal.classList.add('active');
            modalInput.focus();
            const save = () => {
                if(modalInput.value.trim()) {
                    nickname = modalInput.value.trim();
                    sessionStorage.setItem('jroute_nickname', nickname);
                    modal.classList.remove('active');
                    startApp();
                }
            };
            modalBtn.onclick = save;
            modalInput.onkeydown = (e) => { if(e.key === 'Enter') save(); };
        } else {
            nickname = prompt("Enter Nickname:");
            sessionStorage.setItem('jroute_nickname', nickname);
            startApp();
        }
    }

    function connectWebSocket() {
        const host = window.location.hostname || "localhost";
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${proto}//${host}:8000/ws?name=${encodeURIComponent(nickname)}`);
        
        ws.onopen = () => console.log("Connected to Grid");
        ws.onmessage = (e) => showMessage(JSON.parse(e.data));
        ws.onclose = () => setTimeout(connectWebSocket, 3000);
    }

    function sendMessage() {
        const text = msgBox.value.trim();
        if (text && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ name: nickname, text: text }));
            msgBox.value = "";
        }
    }

    async function simulateTerminalLogs(filename) {
        const logs = [
            `[J-TP] Target: ${filename}`,
            `[BASH] split -b 512k stream...`,
            `[BASH] sha256sum verifying integrity...`,
            `[J-TP] Upload Complete.`
        ];
        for (const log of logs) {
            showMessage({type: "join", name: "KERNEL", text: log, timestamp: new Date().toISOString()});
            await new Promise(r => setTimeout(r, 200));
        }
    }

    async function uploadFile(file) {
        const host = window.location.hostname || "localhost";
        const formData = new FormData();
        formData.append("file", file);
        await simulateTerminalLogs(file.name);
        try {
            uploadBtn.disabled = true;
            await fetch(`${window.location.protocol}//${host}:8000/upload?nickname=${encodeURIComponent(nickname)}`, {
                method: "POST", body: formData
            });
        } catch (err) {
            console.error(err);
        } finally {
            uploadBtn.disabled = false;
        }
    }

    // --- ADVANCED DOWNLOADER (CLIENT SIDE) ---
    // Triggers parallel parallel downloads
    window.startAdvancedDownload = async (filename) => {
        console.log("Starting Multi-Socket Download...");
        const url = `/download/${filename}`;
        
        // 1. Get Size
        const head = await fetch(url, { method: 'HEAD' });
        const size = parseInt(head.headers.get('content-length'));
        
        // 2. Parallel Fetch (4 threads for demo)
        const chunkSize = Math.ceil(size / 4);
        const promises = [0, 1, 2, 3].map(i => {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize - 1, size - 1);
            return fetch(url, { headers: { 'Range': `bytes=${start}-${end}` } }).then(r => r.blob());
        });

        // 3. Reassemble
        const blobs = await Promise.all(promises);
        const finalBlob = new Blob(blobs);
        
        // 4. Save
        const a = document.createElement('a');
        a.href = URL.createObjectURL(finalBlob);
        a.download = filename;
        a.click();
    };

    function showMessage(data) {
        const div = document.createElement("div");
        div.className = `message-item ${data.type} ${data.name === nickname ? 'own' : ''}`;
        
        let content = `<div class="message-text">${escapeHTML(data.text)}</div>`;
        
        if (data.type === "file") {
            const fname = data.filename;
            // We use onclick to trigger our advanced downloader
            content = `
            <div class="message-text" style="border:1px dashed #99ff66; padding:8px;">
                <div>📦 J-TRANSPORT PACKET</div>
                ${escapeHTML(data.text)}<br>
                <button onclick="startAdvancedDownload('${fname}')" class="download-link" style="background:transparent; border:none; cursor:pointer; font-family:inherit; font-size:inherit;">
                    [INITIATE DOWNLOAD: ${escapeHTML(fname)}]
                </button>
            </div>`;
        }
        
        div.innerHTML = `
            <div class="message-meta">
                <span class="message-name">${escapeHTML(data.name)}</span>
                <span class="message-timestamp">${new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
            ${content}
        `;
        messagesDiv.appendChild(div);
        chatWindow.scrollTo({ top: chatWindow.scrollHeight, behavior: 'smooth' });
    }

    function escapeHTML(str) {
        return str ? str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])) : "";
    }

    msgBox.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }});
    uploadBtn.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", (e) => { if(e.target.files[0]) { uploadFile(e.target.files[0]); e.target.value=null; }});

    startApp();
});


// --- THEME SWITCHER LOGIC (RIPPLE EFFECT) ---
    const themeSelect = document.getElementById('theme-select');
    
    // 1. Load Saved Theme (or default to Amber)
    const savedTheme = localStorage.getItem('jroute_theme') || 'amber';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if(themeSelect) themeSelect.value = savedTheme;

    // 2. Handle Change
    if(themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            const newTheme = e.target.value;
            
            // Fallback if browser doesn't support View Transitions
            if (!document.startViewTransition) {
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('jroute_theme', newTheme);
                return;
            }

            // The Magic Ripple
            document.startViewTransition(() => {
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('jroute_theme', newTheme);
            });
        });
    }