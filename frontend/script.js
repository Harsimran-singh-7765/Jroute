document.addEventListener("DOMContentLoaded", () => {
    const msgBox = document.getElementById("msgBox");
    const messagesDiv = document.getElementById("messages");
    const uploadBtn = document.getElementById("upload-btn");
    const fileInput = document.getElementById("file-input");
    const chatWindow = document.getElementById('chat-window');

    let nickname = sessionStorage.getItem('jroute_nickname');
    let ws = null;

    function startApp() {
        // Standard Prompt Fallback
        if (!nickname) {
            while (!nickname || nickname.trim() === "") {
                nickname = prompt("Enter Identity:");
                if (!nickname) alert("Identity required for JROUTE access.");
            }
            sessionStorage.setItem('jroute_nickname', nickname.trim());
        }
        connectWebSocket();
    }

    function connectWebSocket() {
        const host = window.location.hostname || "localhost";
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        ws = new WebSocket(`${proto}//${host}:8000/ws?name=${encodeURIComponent(nickname)}`);
        
        ws.onopen = () => {
            console.log("Uplink Established");
            // Optional: System message for local user
            // showMessage({type: "join", name: "SYSTEM", text: "Uplink Established.", timestamp: new Date().toISOString()});
        };
        
        ws.onmessage = (e) => showMessage(JSON.parse(e.data));
        
        ws.onclose = () => {
            console.log("Link Lost. Retrying...");
            setTimeout(connectWebSocket, 3000);
        };
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
            `[BASH] calculating hash...`,
            `[BASH] encrypting stream...`,
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

    // --- ADVANCED DOWNLOADER ---
    window.startAdvancedDownload = async (filename) => {
        const url = `/download/${filename}`;
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            console.error("Download error", e);
        }
    };

    function showMessage(data) {
        const div = document.createElement("div");
        div.className = `message-item ${data.type} ${data.name === nickname ? 'own' : ''}`;
        
        let content = `<div class="message-text">${escapeHTML(data.text)}</div>`;
        
        if (data.type === "file") {
            const fname = data.filename;
            content = `
            <div class="message-text" style="border:1px dashed var(--primary); padding:8px;">
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
        // Scroll handled by Observer in index.html now
    }

    function escapeHTML(str) {
        return str ? str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[m])) : "";
    }

    if(msgBox) msgBox.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }});
    if(uploadBtn) uploadBtn.addEventListener("click", () => fileInput.click());
    if(fileInput) fileInput.addEventListener("change", (e) => { if(e.target.files[0]) { uploadFile(e.target.files[0]); e.target.value=null; }});

    startApp();
});