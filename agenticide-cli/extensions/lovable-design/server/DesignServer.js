// Lovable-Style Design Extension
// AI-powered browser-based UI development

const express = require('express');
const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// Optional dependencies - check if available
let WebSocket, chokidar, open;
try {
    WebSocket = require('ws');
} catch (e) {
    console.warn('ws not installed - WebSocket features disabled');
}
try {
    chokidar = require('chokidar');
} catch (e) {
    console.warn('chokidar not installed - Hot reload disabled');
}
try {
    open = require('open');
} catch (e) {
    console.warn('open not installed - Auto-open browser disabled');
}

class LovableDesignServer {
    constructor(agentManager, options = {}) {
        this.agentManager = agentManager;
        this.port = options.port || 3456;
        this.autoOpen = options.autoOpen !== false;
        this.workDir = options.workDir || path.join(process.cwd(), '.lovable');
        this.app = null;
        this.server = null;
        this.wss = null;
        this.clients = new Set();
        this.consoleBuffer = [];
        this.fileWatcher = null;
    }

    /**
     * Initialize the design server
     */
    async start() {
        // Create work directory
        if (!fs.existsSync(this.workDir)) {
            fs.mkdirSync(this.workDir, { recursive: true });
        }

        // Initialize default files
        this.initializeDefaultFiles();

        // Setup Express server
        this.setupExpress();

        // Setup WebSocket
        this.setupWebSocket();

        // Setup file watcher
        this.setupFileWatcher();

        // Start server
        await this.listen();

        // Open browser
        if (this.autoOpen && open) {
            await open(`http://localhost:${this.port}`);
        } else if (this.autoOpen && !open) {
            console.log(chalk.yellow('⚠️  Auto-open disabled - open package not available'));
            console.log(chalk.cyan(`   Visit: http://localhost:${this.port}`));
        }

        return {
            url: `http://localhost:${this.port}`,
            port: this.port,
            workDir: this.workDir
        };
    }

    /**
     * Setup Express server
     */
    setupExpress() {
        this.app = express();

        // Serve static files
        this.app.use('/static', express.static(path.join(__dirname, 'client')));

        // Main page
        this.app.get('/', (req, res) => {
            const html = this.generateMainPage();
            res.send(html);
        });

        // API: Get current design
        this.app.get('/api/design', (req, res) => {
            const design = this.loadDesign();
            res.json(design);
        });

        // Favicon endpoint (prevents 404)
        this.app.get('/favicon.ico', (req, res) => {
            // Send a simple SVG favicon
            res.setHeader('Content-Type', 'image/svg+xml');
            res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <rect width="100" height="100" fill="#667eea"/>
                <text x="50" y="70" font-size="70" text-anchor="middle" fill="white">🎨</text>
            </svg>`);
        });

        // API: Update design (from AI)
        this.app.post('/api/design', express.json(), (req, res) => {
            const { html, css, js } = req.body;
            this.updateDesign({ html, css, js });
            this.broadcast({ type: 'reload' });
            res.json({ success: true });
        });

        // API: Console logs
        this.app.post('/api/console', express.json(), (req, res) => {
            this.handleConsoleLog(req.body);
            res.json({ success: true });
        });

        // API: Request AI help
        this.app.post('/api/ai', express.json(), async (req, res) => {
            try {
                const result = await this.handleAIRequest(req.body);
                res.json(result);
            } catch (error) {
                res.status(500).json({ error: error.message });
            }
        });
    }

    /**
     * Setup WebSocket for live updates
     */
    setupWebSocket() {
        if (!WebSocket) {
            console.warn(chalk.yellow('⚠️  WebSocket not available - live updates disabled'));
            return;
        }

        this.wss = new WebSocket.Server({ noServer: true });

        this.wss.on('connection', (ws) => {
            console.log(chalk.green('✓ Browser connected'));
            this.clients.add(ws);

            ws.on('message', (message) => {
                try {
                    const data = JSON.parse(message);
                    this.handleClientMessage(data, ws);
                } catch (error) {
                    console.error('WebSocket message error:', error);
                }
            });

            ws.on('close', () => {
                console.log(chalk.yellow('✗ Browser disconnected'));
                this.clients.delete(ws);
            });

            // Send initial state
            ws.send(JSON.stringify({
                type: 'connected',
                design: this.loadDesign()
            }));
        });
    }

    /**
     * Setup file watcher for hot reload
     */
    setupFileWatcher() {
        if (!chokidar) {
            console.warn(chalk.yellow('⚠️  File watcher not available - hot reload disabled'));
            return;
        }

        this.fileWatcher = chokidar.watch(this.workDir, {
            ignored: /(^|[\/\\])\../,
            persistent: true
        });

        this.fileWatcher.on('change', (filepath) => {
            console.log(chalk.cyan(`✎ File changed: ${path.basename(filepath)}`));
            this.broadcast({
                type: 'reload',
                design: this.loadDesign()
            });
        });
    }

    /**
     * Start listening
     */
    async listen() {
        return new Promise((resolve, reject) => {
            this.server = this.app.listen(this.port, () => {
                console.log(chalk.green(`\n🎨 Lovable Design Server started!`));
                console.log(chalk.cyan(`   URL: http://localhost:${this.port}`));
                console.log(chalk.gray(`   Work dir: ${this.workDir}`));
                console.log(chalk.gray(`   Press Ctrl+C to stop\n`));
                resolve();
            });

            // Upgrade HTTP to WebSocket
            this.server.on('upgrade', (request, socket, head) => {
                this.wss.handleUpgrade(request, socket, head, (ws) => {
                    this.wss.emit('connection', ws, request);
                });
            });

            this.server.on('error', reject);
        });
    }

    /**
     * Initialize default files
     */
    initializeDefaultFiles() {
        // Ensure work directory exists
        if (!fs.existsSync(this.workDir)) {
            fs.mkdirSync(this.workDir, { recursive: true });
        }

        const files = {
            'index.html': `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lovable Design</title>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="container">
        <h1>Welcome to Lovable Design! 🎨</h1>
        <p>Ask the AI to create something beautiful.</p>
        <button id="demo-btn">Click Me!</button>
    </div>
    <script src="script.js"></script>
</body>
</html>`,

            'styles.css': `* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
}

.container {
    text-align: center;
    padding: 3rem;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    border-radius: 20px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

h1 {
    font-size: 3rem;
    margin-bottom: 1rem;
    animation: fadeIn 0.5s ease-in;
}

p {
    font-size: 1.2rem;
    margin-bottom: 2rem;
    opacity: 0.9;
}

button {
    padding: 1rem 2rem;
    font-size: 1.1rem;
    background: white;
    color: #667eea;
    border: none;
    border-radius: 50px;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
}

button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-20px); }
    to { opacity: 1; transform: translateY(0); }
}`,

            'script.js': `// Lovable Design - Interactive UI
console.log('🎨 Lovable Design loaded!');

document.getElementById('demo-btn')?.addEventListener('click', () => {
    alert('Button clicked! Ask AI to make it better.');
});

// Connect to WebSocket for live updates
const ws = new WebSocket('ws://' + location.host);

ws.onopen = () => {
    console.log('✓ Connected to design server');
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Message from server:', data);
};`
        };

        for (const [filename, content] of Object.entries(files)) {
            const filepath = path.join(this.workDir, filename);
            if (!fs.existsSync(filepath)) {
                fs.writeFileSync(filepath, content, 'utf8');
            }
        }
    }

    /**
     * Generate main page with live preview
     */
    generateMainPage() {
        const design = this.loadDesign();
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Lovable Design - Live Preview</title>
    <link rel="icon" href="/favicon.ico" type="image/svg+xml">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: system-ui, -apple-system, sans-serif; }
        
        #toolbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 50px;
            background: #1e1e1e;
            color: white;
            display: flex;
            align-items: center;
            padding: 0 1rem;
            z-index: 9999;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        
        #toolbar h1 {
            font-size: 1.2rem;
            margin-right: auto;
        }
        
        #toolbar button {
            margin-left: 0.5rem;
            padding: 0.5rem 1rem;
            background: #667eea;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.9rem;
        }
        
        #toolbar button:hover {
            background: #764ba2;
        }
        
        #preview-frame {
            position: fixed;
            top: 50px;
            left: 0;
            right: 0;
            bottom: 0;
            border: none;
            width: 100%;
            height: calc(100% - 50px);
        }
        
        #console-panel {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            height: 0;
            background: #1e1e1e;
            color: #d4d4d4;
            overflow-y: auto;
            transition: height 0.3s;
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            padding: 0.5rem;
            z-index: 9998;
        }
        
        #console-panel.open {
            height: 250px;
            border-top: 1px solid #333;
        }
        
        .console-entry {
            padding: 0.25rem 0;
            border-bottom: 1px solid #333;
        }
        
        .console-error { color: #f48771; }
        .console-warn { color: #dcdcaa; }
        .console-log { color: #d4d4d4; }
        
        #loading {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-size: 1.5rem;
            color: #667eea;
        }
        
        /* Overlay Chat Window */
        #ai-chat-overlay {
            position: fixed;
            right: -400px;
            top: 50px;
            bottom: 0;
            width: 400px;
            background: #1e1e1e;
            box-shadow: -2px 0 10px rgba(0,0,0,0.3);
            transition: right 0.3s ease;
            z-index: 10000;
            display: flex;
            flex-direction: column;
        }
        
        #ai-chat-overlay.open {
            right: 0;
        }
        
        .chat-header {
            padding: 1rem;
            background: #2d2d2d;
            border-bottom: 1px solid #444;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        
        .chat-header h3 {
            margin: 0;
            color: #fff;
            font-size: 1rem;
        }
        
        .close-chat {
            background: none;
            border: none;
            color: #aaa;
            font-size: 1.5rem;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
        }
        
        .close-chat:hover {
            color: #fff;
        }
        
        .chat-status {
            padding: 0.5rem 1rem;
            background: #252525;
            border-bottom: 1px solid #333;
            font-size: 0.85rem;
            color: #888;
        }
        
        .chat-status.active {
            color: #4caf50;
        }
        
        .chat-messages {
            flex: 1;
            overflow-y: auto;
            padding: 1rem;
        }
        
        .chat-message {
            margin-bottom: 1rem;
            animation: slideIn 0.2s ease;
        }
        
        @keyframes slideIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .message-user {
            text-align: right;
        }
        
        .message-ai {
            text-align: left;
        }
        
        .message-system {
            text-align: center;
            font-size: 0.85rem;
            color: #666;
        }
        
        .message-bubble {
            display: inline-block;
            max-width: 80%;
            padding: 0.75rem;
            border-radius: 12px;
            word-wrap: break-word;
        }
        
        .message-user .message-bubble {
            background: #667eea;
            color: white;
        }
        
        .message-ai .message-bubble {
            background: #2d2d2d;
            color: #d4d4d4;
            border: 1px solid #444;
        }
        
        .message-progress {
            background: #2a2a2a;
            border: 1px solid #444;
            border-radius: 8px;
            padding: 0.75rem;
            margin: 0.5rem 0;
        }
        
        .progress-file {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            margin: 0.25rem 0;
            font-size: 0.85rem;
            color: #aaa;
        }
        
        .progress-file.editing {
            color: #4caf50;
        }
        
        .progress-spinner {
            width: 12px;
            height: 12px;
            border: 2px solid #444;
            border-top-color: #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            to { transform: rotate(360deg); }
        }
        
        .error-suggestion {
            background: #3a2525;
            border-left: 3px solid #f44336;
            padding: 0.75rem;
            margin: 0.5rem 0;
            border-radius: 4px;
        }
        
        .error-title {
            color: #f48771;
            font-weight: bold;
            margin-bottom: 0.25rem;
        }
        
        .error-suggestion-text {
            color: #ddd;
            font-size: 0.85rem;
        }
        
        .chat-input-area {
            padding: 1rem;
            background: #2d2d2d;
            border-top: 1px solid #444;
        }
        
        .chat-attachments {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 0.5rem;
            flex-wrap: wrap;
        }
        
        .attachment-preview {
            position: relative;
            width: 60px;
            height: 60px;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #444;
        }
        
        .attachment-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .remove-attachment {
            position: absolute;
            top: 2px;
            right: 2px;
            background: rgba(0,0,0,0.7);
            color: white;
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 12px;
            cursor: pointer;
            padding: 0;
        }
        
        .chat-input-wrapper {
            display: flex;
            gap: 0.5rem;
            align-items: flex-end;
        }
        
        .chat-tools {
            display: flex;
            flex-direction: column;
            gap: 0.25rem;
        }
        
        .tool-btn {
            background: #3a3a3a;
            border: none;
            color: #aaa;
            width: 36px;
            height: 36px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1.2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .tool-btn:hover {
            background: #4a4a4a;
            color: #fff;
        }
        
        .tool-btn.active {
            background: #667eea;
            color: white;
        }
        
        #chat-input {
            flex: 1;
            background: #3a3a3a;
            border: 1px solid #555;
            color: #ddd;
            padding: 0.75rem;
            border-radius: 8px;
            resize: vertical;
            min-height: 44px;
            max-height: 120px;
            font-family: inherit;
        }
        
        #chat-input:focus {
            outline: none;
            border-color: #667eea;
        }
        
        .send-btn {
            background: #667eea;
            border: none;
            color: white;
            width: 44px;
            height: 44px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1.2rem;
        }
        
        .send-btn:hover {
            background: #764ba2;
        }
        
        .send-btn:disabled {
            background: #3a3a3a;
            color: #666;
            cursor: not-allowed;
        }
        
        input[type="file"] {
            display: none;
        }
    </style>
</head>
<body>
    <div id="toolbar">
        <h1>🎨 Lovable Design - Live Preview</h1>
        <button onclick="toggleConsole()">Console</button>
        <button onclick="requestAI()">Ask AI</button>
        <button onclick="exportDesign()">Export</button>
    </div>
    
    <!-- Preview iframe: srcdoc needs allow-same-origin for postMessage -->
    <iframe id="preview-frame" sandbox="allow-scripts allow-same-origin"></iframe>
    
    <div id="console-panel"></div>
    
    <!-- AI Chat Overlay -->
    <div id="ai-chat-overlay">
        <div class="chat-header">
            <h3>🤖 AI Assistant</h3>
            <button class="close-chat" onclick="toggleChat()">×</button>
        </div>
        
        <div class="chat-status" id="chat-status">
            Ready
        </div>
        
        <div class="chat-messages" id="chat-messages">
            <div class="chat-message message-system">
                <div class="message-bubble">
                    Ask me to design anything! I can see your console, files, and errors in real-time.
                </div>
            </div>
        </div>
        
        <div class="chat-input-area">
            <div class="chat-attachments" id="chat-attachments"></div>
            
            <div class="chat-input-wrapper">
                <div class="chat-tools">
                    <button class="tool-btn" onclick="document.getElementById('image-upload').click()" title="Upload Image">
                        📷
                    </button>
                    <button class="tool-btn" id="picker-btn" onclick="startElementPicker()" title="Pick Element">
                        🎯
                    </button>
                    <button class="tool-btn" onclick="document.getElementById('design-upload').click()" title="Upload Design">
                        📁
                    </button>
                </div>
                
                <textarea id="chat-input" placeholder="Ask AI to design something..." rows="1"></textarea>
                
                <button class="send-btn" onclick="sendMessage()">▶</button>
            </div>
            
            <input type="file" id="image-upload" accept="image/*" onchange="handleImageUpload(event)">
            <input type="file" id="design-upload" accept=".html,.css,.js,.json,.fig" onchange="handleDesignUpload(event)">
        </div>
    </div>
    
    <script>
        // WebSocket connection
        const ws = new WebSocket('ws://' + location.host);
        let consoleOpen = false;
        
        ws.onopen = () => {
            console.log('✓ Connected to design server');
        };
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'reload') {
                reloadPreview();
            } else if (data.type === 'console') {
                addConsoleEntry(data);
            } else if (data.type === 'connected') {
                loadDesign(data.design);
            }
        };
        
        // Load design into iframe
        function loadDesign(design) {
            const frame = document.getElementById('preview-frame');
            
            // Build HTML content
            const html = '<!DOCTYPE html>' +
'<html>' +
'<head>' +
'    <meta charset="UTF-8">' +
'    <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'    <style>' + (design.css || '') + '</style>' +
'</head>' +
'<body>' +
    (design.html || '') +
'    <script>' +
'        // Intercept console' +
'        const originalLog = console.log;' +
'        const originalError = console.error;' +
'        const originalWarn = console.warn;' +
'        ' +
'        console.log = (...args) => {' +
'            originalLog.apply(console, args);' +
'            parent.postMessage({ type: "console", level: "log", message: args.join(" ") }, "*");' +
'        };' +
'        ' +
'        console.error = (...args) => {' +
'            originalError.apply(console, args);' +
'            parent.postMessage({ type: "console", level: "error", message: args.join(" ") }, "*");' +
'        };' +
'        ' +
'        console.warn = (...args) => {' +
'            originalWarn.apply(console, args);' +
'            parent.postMessage({ type: "console", level: "warn", message: args.join(" ") }, "*");' +
'        };' +
'        ' +
'        // Catch errors' +
'        window.onerror = (msg, url, line, col, error) => {' +
'            parent.postMessage({ ' +
'                type: "console", ' +
'                level: "error", ' +
'                message: msg + " (line " + line + ")"' +
'            }, "*");' +
'        };' +
'        ' +
'        // Element picker functionality' +
'        let pickerEnabled = false;' +
'        let pickerOverlay = null;' +
'        ' +
'        function enableElementPicker() {' +
'            pickerEnabled = true;' +
'            document.body.style.cursor = "crosshair";' +
'            ' +
'            // Create overlay' +
'            pickerOverlay = document.createElement("div");' +
'            pickerOverlay.style.cssText = "position: absolute; pointer-events: none; border: 2px solid #667eea; background: rgba(102, 126, 234, 0.1); z-index: 999999;";' +
'            document.body.appendChild(pickerOverlay);' +
'        }' +
'        ' +
'        function disableElementPicker() {' +
'            pickerEnabled = false;' +
'            document.body.style.cursor = "";' +
'            if (pickerOverlay) {' +
'                pickerOverlay.remove();' +
'                pickerOverlay = null;' +
'            }' +
'        }' +
'        ' +
'        document.addEventListener("mousemove", (e) => {' +
'            if (!pickerEnabled || !pickerOverlay) return;' +
'            const el = e.target;' +
'            if (el === pickerOverlay || el === document.body) return;' +
'            const rect = el.getBoundingClientRect();' +
'            pickerOverlay.style.left = rect.left + "px";' +
'            pickerOverlay.style.top = rect.top + "px";' +
'            pickerOverlay.style.width = rect.width + "px";' +
'            pickerOverlay.style.height = rect.height + "px";' +
'        });' +
'        ' +
'        document.addEventListener("click", (e) => {' +
'            if (!pickerEnabled) return;' +
'            e.preventDefault();' +
'            e.stopPropagation();' +
'            ' +
'            const el = e.target;' +
'            const selector = getSelector(el);' +
'            const html = el.outerHTML.substring(0, 200);' +
'            ' +
'            parent.postMessage({' +
'                type: "element-selected",' +
'                selector: selector,' +
'                html: html,' +
'                tagName: el.tagName,' +
'                className: el.className,' +
'                id: el.id' +
'            }, "*");' +
'            ' +
'            disableElementPicker();' +
'        }, true);' +
'        ' +
'        function getSelector(el) {' +
'            if (el.id) return "#" + el.id;' +
'            if (el.className) return "." + el.className.split(" ")[0];' +
'            return el.tagName.toLowerCase();' +
'        }' +
'        ' +
'        // Listen for picker commands' +
'        window.addEventListener("message", (event) => {' +
'            if (event.data.type === "enable-picker") {' +
'                enableElementPicker();' +
'            } else if (event.data.type === "disable-picker") {' +
'                disableElementPicker();' +
'            }' +
'        });' +
'    </' + 'script>' +
'    <script>' + (design.js || '') + '</' + 'script>' +
'</body>' +
'</html>';
            
            // Use srcdoc instead of contentDocument to avoid CORS
            frame.srcdoc = html;
        }
        
        // Reload preview
        async function reloadPreview() {
            const response = await fetch('/api/design');
            const design = await response.json();
            loadDesign(design);
        }
        
        // Toggle console
        function toggleConsole() {
            const panel = document.getElementById('console-panel');
            consoleOpen = !consoleOpen;
            panel.className = consoleOpen ? 'open' : '';
        }
        
        // Add console entry
        function addConsoleEntry(data) {
            const panel = document.getElementById('console-panel');
            const entry = document.createElement('div');
            entry.className = 'console-entry console-' + data.level;
            entry.textContent = '[' + data.level.toUpperCase() + '] ' + data.message;
            panel.appendChild(entry);
            panel.scrollTop = panel.scrollHeight;
        }
        

        
        // Request AI help
        async function requestAI() {
            toggleChat();
        }
        
        // Toggle chat overlay
        function toggleChat() {
            const overlay = document.getElementById('ai-chat-overlay');
            overlay.classList.toggle('open');
            if (overlay.classList.contains('open')) {
                document.getElementById('chat-input').focus();
            }
        }
        
        // Chat state
        let attachedFiles = [];
        let pickerActive = false;
        let consoleErrors = [];
        
        // Send message
        async function sendMessage() {
            const input = document.getElementById('chat-input');
            const message = input.value.trim();
            
            if (!message && attachedFiles.length === 0) return;
            
            // Add user message
            addChatMessage('user', message);
            
            // Clear input
            input.value = '';
            input.style.height = 'auto';
            
            // Update status
            updateStatus('Processing...', true);
            
            // Prepare request
            const request = {
                message,
                files: attachedFiles,
                consoleErrors: consoleErrors.slice(-5), // Last 5 errors
                context: {
                    html: await getCurrentHTML(),
                    css: await getCurrentCSS(),
                    js: await getCurrentJS()
                }
            };
            
            // Clear attachments
            attachedFiles = [];
            document.getElementById('chat-attachments').innerHTML = '';
            
            try {
                // Send to AI
                const response = await fetch('/api/ai', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(request)
                });
                
                const result = await response.json();
                
                // Show progress if files are being modified
                if (result.files) {
                    showProgress(result.files);
                }
                
                // Add AI response
                addChatMessage('ai', result.message || 'Changes applied!');
                
                updateStatus('Ready');
            } catch (error) {
                addChatMessage('ai', 'Sorry, something went wrong: ' + error.message);
                updateStatus('Error', false);
            }
        }
        
        // Add chat message
        function addChatMessage(type, content) {
            const messagesDiv = document.getElementById('chat-messages');
            const messageDiv = document.createElement('div');
            messageDiv.className = \`chat-message message-\${type}\`;
            
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            bubble.textContent = content;
            
            messageDiv.appendChild(bubble);
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // Show progress for file modifications
        function showProgress(files) {
            const messagesDiv = document.getElementById('chat-messages');
            const progressDiv = document.createElement('div');
            progressDiv.className = 'message-progress';
            progressDiv.id = 'active-progress';
            
            files.forEach(file => {
                const fileDiv = document.createElement('div');
                fileDiv.className = 'progress-file editing';
                fileDiv.innerHTML = \`
                    <div class="progress-spinner"></div>
                    <span>Editing \${file}</span>
                \`;
                progressDiv.appendChild(fileDiv);
            });
            
            messagesDiv.appendChild(progressDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Remove after completion
            setTimeout(() => {
                const p = document.getElementById('active-progress');
                if (p) p.remove();
            }, 3000);
        }
        
        // Update status
        function updateStatus(text, active = false) {
            const status = document.getElementById('chat-status');
            status.textContent = text;
            status.className = 'chat-status' + (active ? ' active' : '');
        }
        
        // Handle image upload
        function handleImageUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                attachedFiles.push({
                    type: 'image',
                    name: file.name,
                    data: e.target.result
                });
                showAttachment(file.name, e.target.result);
            };
            reader.readAsDataURL(file);
        }
        
        // Handle design upload
        function handleDesignUpload(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                attachedFiles.push({
                    type: 'design',
                    name: file.name,
                    data: e.target.result
                });
                showAttachment(file.name, null);
            };
            reader.readAsText(file);
        }
        
        // Show attachment preview
        function showAttachment(name, imageData) {
            const container = document.getElementById('chat-attachments');
            const preview = document.createElement('div');
            preview.className = 'attachment-preview';
            
            if (imageData) {
                preview.innerHTML = \`
                    <img src="\${imageData}" alt="\${name}">
                    <button class="remove-attachment" onclick="removeAttachment(this)">×</button>
                \`;
            } else {
                preview.innerHTML = \`
                    <div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #2a2a2a; color: #aaa;">
                        📄
                    </div>
                    <button class="remove-attachment" onclick="removeAttachment(this)">×</button>
                \`;
            }
            
            container.appendChild(preview);
        }
        
        // Remove attachment
        function removeAttachment(btn) {
            const preview = btn.parentElement;
            const index = Array.from(preview.parentElement.children).indexOf(preview);
            attachedFiles.splice(index, 1);
            preview.remove();
        }
        
        // Start element picker
        function startElementPicker() {
            const btn = document.getElementById('picker-btn');
            pickerActive = !pickerActive;
            
            if (pickerActive) {
                btn.classList.add('active');
                updateStatus('Click an element in the preview...', true);
                enablePicker();
            } else {
                btn.classList.remove('active');
                updateStatus('Ready');
                disablePicker();
            }
        }
        
        // Enable picker in iframe
        function enablePicker() {
            const frame = document.getElementById('preview-frame');
            // srcdoc iframe shares same origin, can post message
            try {
                frame.contentWindow.postMessage({ type: 'enable-picker' }, '*');
            } catch (e) {
                console.error('Cannot communicate with iframe:', e);
            }
        }
        
        // Disable picker
        function disablePicker() {
            const frame = document.getElementById('preview-frame');
            try {
                frame.contentWindow.postMessage({ type: 'disable-picker' }, '*');
            } catch (e) {
                console.error('Cannot communicate with iframe:', e);
            }
        }
        
        // Listen for element selection from iframe
        window.addEventListener('message', (event) => {
            if (event.data.type === 'console') {
                addConsoleEntry(event.data);
                
                // Track errors for AI context
                if (event.data.level === 'error') {
                    consoleErrors.push({
                        message: event.data.message,
                        timestamp: Date.now()
                    });
                    
                    // Show error suggestion
                    showErrorSuggestion(event.data.message);
                }
                
                // Send to server for AI analysis
                fetch('/api/console', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(event.data)
                });
            } else if (event.data.type === 'element-selected') {
                // Element picked
                pickerActive = false;
                document.getElementById('picker-btn').classList.remove('active');
                updateStatus('Ready');
                
                const input = document.getElementById('chat-input');
                input.value = \`Modify this element: \${event.data.selector}\\n\${event.data.html}\`;
                input.focus();
            }
        });
        
        // Show error suggestion
        function showErrorSuggestion(error) {
            const messagesDiv = document.getElementById('chat-messages');
            const errorDiv = document.createElement('div');
            errorDiv.className = 'error-suggestion';
            errorDiv.innerHTML = \`
                <div class="error-title">⚠️ Error Detected</div>
                <div class="error-suggestion-text">\${error}</div>
                <div class="error-suggestion-text" style="margin-top: 0.5rem; font-style: italic;">
                    💡 Ask AI: "Fix this error"
                </div>
            \`;
            messagesDiv.appendChild(errorDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        }
        
        // Get current HTML/CSS/JS
        async function getCurrentHTML() {
            const response = await fetch('/api/design');
            const design = await response.json();
            return design.html || '';
        }
        
        async function getCurrentCSS() {
            const response = await fetch('/api/design');
            const design = await response.json();
            return design.css || '';
        }
        
        async function getCurrentJS() {
            const response = await fetch('/api/design');
            const design = await response.json();
            return design.js || '';
        }
        
        // Auto-resize textarea
        document.getElementById('chat-input').addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 120) + 'px';
        });
        
        // Send on Enter (Shift+Enter for new line)
        document.getElementById('chat-input').addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        
        // WebSocket progress updates
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'reload') {
                reloadPreview();
            } else if (data.type === 'console') {
                addConsoleEntry(data);
            } else if (data.type === 'connected') {
                loadDesign(data.design);
            } else if (data.type === 'file-progress') {
                // Show which file is being modified
                updateStatus(\`Editing \${data.file}...\`, true);
                showProgress([data.file]);
            } else if (data.type === 'ai-thinking') {
                updateStatus('AI is thinking...', true);
            } else if (data.type === 'ai-complete') {
                updateStatus('Ready');
            }
        };
        
            const prompt = window.prompt('What would you like to create or change?');
            if (!prompt) return;
            
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('AI updated the design!');
                reloadPreview();
            } else {
                alert('Error: ' + result.error);
            }
        }
        
        // Export design
        async function exportDesign() {
            const response = await fetch('/api/design');
            const design = await response.json();
            
            const blob = new Blob([
                '<!-- HTML -->\\n' + design.html + '\\n\\n' +
                '/* CSS */\\n' + design.css + '\\n\\n' +
                '// JavaScript\\n' + design.js
            ], { type: 'text/plain' });
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'design-export.txt';
            a.click();
        }
        
        // Initial load
        reloadPreview();
    </script>
</body>
</html>`;
    }

    /**
     * Load current design
     */
    loadDesign() {
        try {
            const html = fs.readFileSync(path.join(this.workDir, 'index.html'), 'utf8');
            const css = fs.readFileSync(path.join(this.workDir, 'styles.css'), 'utf8');
            const js = fs.readFileSync(path.join(this.workDir, 'script.js'), 'utf8');
            
            return { html, css, js };
        } catch (error) {
            return { html: '', css: '', js: '' };
        }
    }

    /**
     * Update design files
     */
    updateDesign({ html, css, js }) {
        if (html !== undefined) {
            fs.writeFileSync(path.join(this.workDir, 'index.html'), html, 'utf8');
        }
        if (css !== undefined) {
            fs.writeFileSync(path.join(this.workDir, 'styles.css'), css, 'utf8');
        }
        if (js !== undefined) {
            fs.writeFileSync(path.join(this.workDir, 'script.js'), js, 'utf8');
        }
    }

    /**
     * Handle console log from browser
     */
    handleConsoleLog(data) {
        this.consoleBuffer.push({
            timestamp: Date.now(),
            ...data
        });
        
        // Keep last 100 entries
        if (this.consoleBuffer.length > 100) {
            this.consoleBuffer.shift();
        }
        
        // If error, potentially trigger AI fix
        if (data.level === 'error') {
            console.log(chalk.red(`❌ Browser error: ${data.message}`));
        }
    }

    /**
     * Handle AI request
     */
    async handleAIRequest({ prompt }) {
        try {
            const design = this.loadDesign();
            
            // Check if AI agent is available
            if (!this.agentManager || typeof this.agentManager.sendMessage !== 'function') {
                // No AI available - provide helpful response
                console.log(chalk.yellow('⚠️  AI agent not available. You can:'));
                console.log(chalk.gray('   1. Manually edit files in .lovable/ directory'));
                console.log(chalk.gray('   2. Use external AI (ChatGPT, Claude) with this prompt:'));
                console.log(chalk.cyan('\n' + '-'.repeat(60)));
                console.log(chalk.white(`Update this UI design: "${prompt}"`));
                console.log(chalk.gray('\nCurrent HTML:\n') + design.html.substring(0, 200) + '...');
                console.log(chalk.cyan('-'.repeat(60) + '\n'));
                
                return {
                    success: false,
                    error: 'AI agent not available',
                    message: 'Edit files manually in .lovable/ directory, or use external AI with the prompt shown in terminal.'
                };
            }
            
            // Build AI prompt
            const aiPrompt = `You are a UI designer. The user wants to: "${prompt}"

Current design:
HTML:
\`\`\`html
${design.html}
\`\`\`

CSS:
\`\`\`css
${design.css}
\`\`\`

JavaScript:
\`\`\`javascript
${design.js}
\`\`\`

Generate updated HTML, CSS, and JavaScript. Return ONLY valid code, no explanations.
Format:
<!-- HTML -->
[html code]

/* CSS */
[css code]

// JavaScript
[js code]`;

            // Call AI
            const response = await this.agentManager.sendMessage(aiPrompt);
            
            // Parse response
            const updated = this.parseAIResponse(response);
            
            // Update design
            this.updateDesign(updated);
            
            // Broadcast reload
            this.broadcast({ type: 'reload', design: this.loadDesign() });
            
            return { success: true, updated };
        } catch (error) {
            console.error('AI request error:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Parse AI response into HTML/CSS/JS
     */
    parseAIResponse(response) {
        const result = { html: '', css: '', js: '' };
        
        // Extract HTML
        const htmlMatch = response.match(/<!--\s*HTML\s*-->\s*([\s\S]*?)(?=\/\*\s*CSS|\$)/i);
        if (htmlMatch) {
            result.html = htmlMatch[1].trim();
        }
        
        // Extract CSS
        const cssMatch = response.match(/\/\*\s*CSS\s*\*\/\s*([\s\S]*?)(?=\/\/\s*JavaScript|\$)/i);
        if (cssMatch) {
            result.css = cssMatch[1].trim();
        }
        
        // Extract JS
        const jsMatch = response.match(/\/\/\s*JavaScript\s*([\s\S]*?)$/i);
        if (jsMatch) {
            result.js = jsMatch[1].trim();
        }
        
        return result;
    }

    /**
     * Handle client WebSocket message
     */
    handleClientMessage(data, ws) {
        if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
        }
    }

    /**
     * Broadcast to all clients
     */
    broadcast(data) {
        if (!this.wss || !WebSocket) return;
        
        const message = JSON.stringify(data);
        for (const client of this.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    }

    /**
     * Stop the server
     */
    async stop() {
        if (this.fileWatcher) {
            await this.fileWatcher.close();
        }
        
        if (this.wss) {
            this.wss.close();
        }
        
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log(chalk.yellow('\n✓ Design server stopped'));
                    resolve();
                });
            });
        }
    }
}

module.exports = LovableDesignServer;
