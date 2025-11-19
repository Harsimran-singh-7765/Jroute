document.addEventListener("DOMContentLoaded", () => {
    // --- DOM Elements ---
    const msgBox = document.getElementById("msgBox");
    const messagesDiv = document.getElementById("messages");
    const onlineUsersDiv = document.getElementById("online-users");
    const uploadBtn = document.getElementById("upload-btn");
    const fileInput = document.getElementById("file-input");
    const chatWindow = document.getElementById('chat-window');

    // Modal Elements
    const modal = document.getElementById('nickname-modal');
    const modalInput = document.getElementById('nickname-input');
    const modalBtn = document.getElementById('nickname-submit');

    // --- State ---
    let nickname = sessionStorage.getItem('jroute_nickname');
    let ws = null;

    // --- CORE LOGIC ---
    
    function startApp() {
        // If no nickname, show modal and STOP here.
        if (!nickname) {
            showNicknameModal();
            return;
        }

        // If we have a nickname, proceed to connect
        connectWebSocket();
        fetchOnlineUsers();
        setInterval(fetchOnlineUsers, 5000);
        
        // Initialize Visuals
        initThreeJS();
        initScreenEffects();
    }

    // --- Modal Logic (Replaces Prompt) ---
    function showNicknameModal() {
        modal.classList.add('active');
        modalInput.focus();

        const saveNickname = () => {
            const val = modalInput.value.trim();
            if (val) {
                // Save to storage
                sessionStorage.setItem('jroute_nickname', val);
                nickname = val;
                
                // Hide modal
                modal.classList.remove('active');
                
                // START THE APP NOW
                startApp();
            } else {
                modalInput.placeholder = "REQUIRED!";
                modalInput.style.borderColor = "red";
            }
        };

        // Click listener
        modalBtn.onclick = saveNickname;
        
        // Enter key listener
        modalInput.onkeydown = (e) => {
            if (e.key === 'Enter') saveNickname();
        };
    }

    // --- WebSocket Functions ---
    function connectWebSocket() {
        const host = window.location.hostname || "localhost";
        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${wsProtocol}//${host}:8000/ws?name=${encodeURIComponent(nickname)}`;

        ws = new WebSocket(wsUrl);

        ws.onopen = () => console.log("Connected to Jroute Grid");

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'error') {
                showMessage(data);
                ws.close(); 
                msgBox.disabled = true;
                msgBox.placeholder = "Error: " + data.text;
            } else {
                showMessage(data);
            }
        };

        ws.onclose = () => {
            const sysMsg = {
                type: "error",
                name: "System",
                text: "Connection Lost. Refresh required.",
                timestamp: new Date().toISOString()
            };
            showMessage(sysMsg);
            msgBox.disabled = true;
            uploadBtn.disabled = true;
        };
        
        ws.onerror = (err) => console.error("WS Error", err);
    }

    function sendMessage() {
        const messageText = msgBox.value.trim();
        if (messageText && ws && ws.readyState === WebSocket.OPEN) {
            const message = { name: nickname, text: messageText };
            ws.send(JSON.stringify(message));
            msgBox.value = "";
        }
    }

    // --- File Upload Logic ---
    async function uploadFile(file) {
        const host = window.location.hostname || "localhost";
        const httpProtocol = window.location.protocol;
        const apiUrl = `${httpProtocol}//${host}:8000/upload?nickname=${encodeURIComponent(nickname)}`;

        const formData = new FormData();
        formData.append("file", file);

        // Optimistic UI update
        showMessage({
            type: "join",
            name: "System",
            text: `Uploading encrypted packet: ${file.name}...`,
            timestamp: new Date().toISOString()
        });

        try {
            uploadBtn.disabled = true;
            const response = await fetch(apiUrl, {
                method: "POST",
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || "Upload failed");
            }
        } catch (err) {
            console.error("Upload Error:", err);
            showMessage({
                type: "error",
                name: "System",
                text: `Upload Failed: ${err.message}`,
                timestamp: new Date().toISOString()
            });
        } finally {
            uploadBtn.disabled = false;
        }
    }

    // --- UI Functions ---
    function showMessage(data) {
        const msgItem = document.createElement("div");
        msgItem.classList.add("message-item");
        msgItem.classList.add(data.type); 

        const time = new Date(data.timestamp).toLocaleTimeString([], { 
            hour: '2-digit', minute: '2-digit' 
        });

        if (data.type === "message") {
            if (data.name === nickname) msgItem.classList.add("own");
            msgItem.innerHTML = `
                <div class="message-meta">
                    <span class="message-name">${escapeHTML(data.name)}</span>
                    <span class="message-timestamp">${time}</span>
                </div>
                <div class="message-text">${escapeHTML(data.text)}</div>
            `;
        
        } else if (data.type === "file") {
            if (data.name === nickname) msgItem.classList.add("own");
            const displayFilename = data.filename.split('_').slice(2).join('_');
            
            msgItem.innerHTML = `
                <div class="message-meta">
                    <span class="message-name">${escapeHTML(data.name)}</span>
                    <span class="message-timestamp">${time}</span>
                </div>
                <div class="message-text">
                    ${escapeHTML(data.text)}<br>
                    <a href="/download/${encodeURIComponent(data.filename)}" 
                       target="_blank" 
                       class="download-link">
                        [DOWNLOAD: ${escapeHTML(displayFilename)}]
                    </a>
                </div>
            `;
            
        } else if (data.type === "join" || data.type === "leave" || data.type === "error") {
            msgItem.innerHTML = `
                <span class="message-text">${escapeHTML(data.text)}</span>
                <span class="message-timestamp">${time}</span>
            `;
        }
        
        messagesDiv.appendChild(msgItem);
        
        // Auto-scroll
        chatWindow.scrollTo({
            top: chatWindow.scrollHeight,
            behavior: 'smooth'
        });
    }

    async function fetchOnlineUsers() {
        const host = window.location.hostname || "localhost";
        const httpProtocol = window.location.protocol;
        try {
            const response = await fetch(`${httpProtocol}//${host}:8000/online-users`);
            const users = await response.json();
            onlineUsersDiv.textContent = `ONLINE: ${users.length}`;
        } catch (err) { }
    }

    function escapeHTML(str) {
        if(!str) return "";
        return str.replace(/[&<>"']/g, function(m) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
        });
    }

    // --- Event Listeners ---
    msgBox.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
    
    uploadBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
            uploadFile(file);
        }
        fileInput.value = null; 
    });

    // --- VISUALS: Three.js & Effects ---
    function initThreeJS() {
        const container = document.getElementById('three-canvas');
        if(!container) return;
        
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, container.offsetWidth / container.offsetHeight, 0.1, 1000);
        camera.position.set(0, 0, 3);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setSize(container.offsetWidth, container.offsetHeight);
        renderer.setClearColor(0x000000, 0);
        container.appendChild(renderer.domElement);

        // Wireframe Plane
        const geometry = new THREE.PlaneGeometry(6, 4, 50, 50);
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const distanceFromCenter = Math.sqrt(x * x + y * y);
            const bulge = Math.sin((distanceFromCenter * Math.PI) / 6) * 0.4;
            positions.setZ(i, bulge);
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshBasicMaterial({ color: 0xffaa33, wireframe: true, transparent: true, opacity: 0.15 });
        const plane = new THREE.Mesh(geometry, material);
        plane.rotation.x = -0.1;
        scene.add(plane);

        // Particles
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 100;
        const posArray = new Float32Array(particlesCount * 3);
        for(let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 10;
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        const particlesMaterial = new THREE.PointsMaterial({ size: 0.02, color: 0xffaa33, transparent: true, opacity: 0.2 });
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        let time = 0;
        function animate() {
            requestAnimationFrame(animate);
            time += 0.003;
            plane.rotation.y = Math.sin(time * 0.5) * 0.1;
            plane.position.z = Math.cos(time * 0.3) * 0.1;
            particlesMesh.rotation.y += 0.0005;
            renderer.render(scene, camera);
        }
        animate();

        window.addEventListener('resize', () => {
            const width = container.offsetWidth;
            const height = container.offsetHeight;
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        });
    }

    function initScreenEffects() {
        // Screen shake
        setInterval(() => {
            if (Math.random() > 0.97) {
                const screen = document.getElementById('crt-screen');
                const xRot = Math.random() * 3 - 1.5;
                const yRot = Math.random() * 3 - 1.5;
                const xTrans = Math.random() * 6 - 3;
                screen.style.transform = `perspective(1200px) rotateX(${xRot}deg) rotateY(${yRot}deg) translateX(${xTrans}px)`;
                setTimeout(() => {
                    screen.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg)';
                }, 150);
            }
        }, 300);

        // Phosphor fade
        setInterval(() => {
            const lastBrightness = 0.95 + Math.random() * 0.05;
            const screen = document.getElementById('crt-screen');
            if(screen) screen.style.opacity = lastBrightness;
        }, 100);
    }

    // --- Run App ---
    startApp();
});