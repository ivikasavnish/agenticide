// VSCode Web Extension - Browser-based code editor with Monaco
const { Extension } = require('../core/extensionManager');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');
const http = require('http');
const express = require('express');

class VSCodeWebExtension extends Extension {
    constructor() {
        super();
        this.name = 'vscode-web';
        this.version = '1.0.0';
        this.description = 'Browser-based VSCode editor with Monaco integration';
        this.author = 'Agenticide';
        
        this.server = null;
        this.port = 3500;
        this.workspaceRoot = process.cwd();
        this.fileSystem = new Map();
        this.openFiles = new Set();

        this.commands = [
            {
                name: 'code',
                description: 'Open VSCode in browser',
                usage: '/code [file|directory]',
                aliases: ['edit', 'editor']
            },
            {
                name: 'code-server',
                description: 'Manage VSCode web server',
                usage: '/code-server <start|stop|status>',
                aliases: ['editor-server']
            }
        ];

        this.hooks = [];
    }

    async enable() {
        console.log(chalk.green('✓ VSCode web extension enabled'));
        return { success: true, message: 'Ready to start editor' };
    }

    async disable() {
        await this.stopServer();
        return { success: true, message: 'VSCode web disabled' };
    }

    async handleCommand(command, args, context) {
        switch (command) {
            case 'code':
            case 'edit':
            case 'editor':
                return await this.handleCode(args, context);
            
            case 'code-server':
            case 'editor-server':
                return await this.handleServer(args, context);
            
            default:
                return {
                    success: false,
                    message: `Unknown command: ${command}`
                };
        }
    }

    async handleCode(args, context) {
        const target = args[0] || '.';
        const fullPath = path.resolve(this.workspaceRoot, target);

        // Start server if not running
        if (!this.server) {
            await this.startServer();
        }

        // Open in browser
        const url = `http://localhost:${this.port}?file=${encodeURIComponent(fullPath)}`;
        
        console.log(chalk.blue(`\n📝 Opening editor...\n`));
        console.log(chalk.cyan(`   URL: ${url}`));
        console.log(chalk.dim(`   Target: ${fullPath}\n`));
        console.log(chalk.gray('   Press Ctrl+C to stop server'));

        // Try to open browser
        this.openBrowser(url);

        return {
            success: true,
            url,
            port: this.port,
            target: fullPath
        };
    }

    async handleServer(args, context) {
        const action = args[0];

        switch (action) {
            case 'start':
                return await this.startServer();
            
            case 'stop':
                return await this.stopServer();
            
            case 'status':
                return this.getStatus();
            
            default:
                return {
                    success: false,
                    message: 'Usage: /code-server <start|stop|status>'
                };
        }
    }

    async startServer() {
        if (this.server) {
            return {
                success: false,
                message: 'Server already running',
                port: this.port
            };
        }

        const app = express();

        // Middleware
        app.use(express.json({ limit: '50mb' }));
        app.use(express.static(path.join(__dirname, 'vscode-web', 'public')));

        // API routes
        this.setupRoutes(app);

        // Create server
        this.server = http.createServer(app);

        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                console.log(chalk.green(`\n✓ VSCode Web Server started`));
                console.log(chalk.cyan(`   URL: http://localhost:${this.port}`));
                console.log(chalk.dim(`   Workspace: ${this.workspaceRoot}\n`));

                resolve({
                    success: true,
                    port: this.port,
                    url: `http://localhost:${this.port}`
                });
            });
        });
    }

    async stopServer() {
        if (!this.server) {
            return {
                success: false,
                message: 'Server not running'
            };
        }

        return new Promise((resolve) => {
            this.server.close(() => {
                this.server = null;
                console.log(chalk.yellow('\n⏸️  VSCode web server stopped\n'));
                resolve({ success: true, message: 'Server stopped' });
            });
        });
    }

    getStatus() {
        if (!this.server) {
            console.log(chalk.dim('\nServer: Not running\n'));
            return { success: true, running: false };
        }

        console.log(chalk.bold('\n📊 Server Status:\n'));
        console.log(chalk.white(`  Status: Running`));
        console.log(chalk.white(`  Port: ${this.port}`));
        console.log(chalk.white(`  URL: http://localhost:${this.port}`));
        console.log(chalk.white(`  Workspace: ${this.workspaceRoot}`));
        console.log(chalk.white(`  Open Files: ${this.openFiles.size}\n`));

        return {
            success: true,
            running: true,
            port: this.port,
            workspace: this.workspaceRoot,
            openFiles: Array.from(this.openFiles)
        };
    }

    setupRoutes(app) {
        // Main editor page
        app.get('/', (req, res) => {
            res.send(this.generateEditorHTML());
        });

        // List files in directory
        app.get('/api/files', (req, res) => {
            const dir = req.query.path || this.workspaceRoot;
            try {
                const files = this.listFiles(dir);
                res.json({ success: true, files });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Read file content
        app.get('/api/file', (req, res) => {
            const filePath = req.query.path;
            if (!filePath) {
                return res.status(400).json({ success: false, error: 'Missing path' });
            }

            try {
                const content = fs.readFileSync(filePath, 'utf8');
                this.openFiles.add(filePath);
                res.json({ success: true, content, path: filePath });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Save file content
        app.post('/api/file', (req, res) => {
            const { path: filePath, content } = req.body;
            if (!filePath || content === undefined) {
                return res.status(400).json({ success: false, error: 'Missing path or content' });
            }

            try {
                // Create directory if needed
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(filePath, content, 'utf8');
                res.json({ success: true, path: filePath });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Create new file
        app.post('/api/file/create', (req, res) => {
            const { path: filePath, content = '' } = req.body;
            if (!filePath) {
                return res.status(400).json({ success: false, error: 'Missing path' });
            }

            try {
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }

                if (fs.existsSync(filePath)) {
                    return res.status(400).json({ success: false, error: 'File already exists' });
                }

                fs.writeFileSync(filePath, content, 'utf8');
                res.json({ success: true, path: filePath });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Delete file
        app.delete('/api/file', (req, res) => {
            const filePath = req.query.path;
            if (!filePath) {
                return res.status(400).json({ success: false, error: 'Missing path' });
            }

            try {
                fs.unlinkSync(filePath);
                this.openFiles.delete(filePath);
                res.json({ success: true, path: filePath });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Search files
        app.get('/api/search', (req, res) => {
            const query = req.query.q;
            const dir = req.query.path || this.workspaceRoot;
            
            if (!query) {
                return res.status(400).json({ success: false, error: 'Missing query' });
            }

            try {
                const results = this.searchFiles(dir, query);
                res.json({ success: true, results });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // Download extension
        app.get('/api/extension/download', (req, res) => {
            const extensionId = req.query.id;
            // Mock extension download
            res.json({
                success: true,
                extension: {
                    id: extensionId,
                    name: extensionId,
                    version: '1.0.0',
                    downloadUrl: `/extensions/${extensionId}.vsix`
                }
            });
        });

        // Load extension
        app.post('/api/extension/load', (req, res) => {
            const { extensionData } = req.body;
            // Mock extension loading
            res.json({
                success: true,
                message: 'Extension loaded',
                extension: extensionData
            });
        });
    }

    listFiles(dir, relativeTo = this.workspaceRoot) {
        const files = [];
        
        try {
            const items = fs.readdirSync(dir);
            
            items.forEach(item => {
                if (item.startsWith('.') && item !== '.') return;
                
                const fullPath = path.join(dir, item);
                const stats = fs.statSync(fullPath);
                const relativePath = path.relative(relativeTo, fullPath);
                
                files.push({
                    name: item,
                    path: fullPath,
                    relativePath,
                    type: stats.isDirectory() ? 'directory' : 'file',
                    size: stats.size,
                    modified: stats.mtime
                });
            });
        } catch (error) {
            console.error('Error listing files:', error);
        }

        return files.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'directory' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }

    searchFiles(dir, query, results = []) {
        try {
            const items = fs.readdirSync(dir);
            
            items.forEach(item => {
                if (item.startsWith('.')) return;
                
                const fullPath = path.join(dir, item);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    this.searchFiles(fullPath, query, results);
                } else if (item.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        name: item,
                        path: fullPath,
                        relativePath: path.relative(this.workspaceRoot, fullPath)
                    });
                }
            });
        } catch (error) {
            // Skip inaccessible directories
        }

        return results;
    }

    generateEditorHTML() {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agenticide Code Editor</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/editor/editor.main.min.css">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; overflow: hidden; }
        
        #app { display: flex; height: 100vh; }
        
        #sidebar {
            width: 250px;
            background: #1e1e1e;
            color: #cccccc;
            display: flex;
            flex-direction: column;
            border-right: 1px solid #2d2d30;
        }
        
        #sidebar-header {
            padding: 1rem;
            background: #2d2d30;
            border-bottom: 1px solid #3e3e42;
        }
        
        #sidebar-header h2 {
            font-size: 0.9rem;
            font-weight: 600;
            color: #cccccc;
        }
        
        #file-tree {
            flex: 1;
            overflow-y: auto;
            padding: 0.5rem;
        }
        
        .file-item, .folder-item {
            padding: 0.4rem 0.5rem;
            cursor: pointer;
            border-radius: 3px;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .file-item:hover, .folder-item:hover {
            background: #2a2d2e;
        }
        
        .file-item.active {
            background: #37373d;
        }
        
        .folder-item { font-weight: 500; }
        .folder-children { padding-left: 1rem; }
        
        #editor-container {
            flex: 1;
            display: flex;
            flex-direction: column;
        }
        
        #tabs {
            display: flex;
            background: #2d2d30;
            border-bottom: 1px solid #3e3e42;
            overflow-x: auto;
        }
        
        .tab {
            padding: 0.6rem 1rem;
            background: #2d2d30;
            color: #969696;
            border-right: 1px solid #3e3e42;
            cursor: pointer;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            white-space: nowrap;
        }
        
        .tab.active {
            background: #1e1e1e;
            color: #ffffff;
        }
        
        .tab:hover { background: #37373d; }
        .tab-close { margin-left: 0.5rem; cursor: pointer; }
        .tab-close:hover { color: #ffffff; }
        
        #editor { flex: 1; }
        
        #status-bar {
            height: 22px;
            background: #007acc;
            color: #ffffff;
            display: flex;
            align-items: center;
            padding: 0 1rem;
            font-size: 0.75rem;
            gap: 1rem;
        }
        
        .icon { width: 16px; height: 16px; }
        
        #search-box {
            position: absolute;
            top: 1rem;
            right: 1rem;
            background: #2d2d30;
            padding: 0.5rem;
            border-radius: 4px;
            display: none;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        }
        
        #search-input {
            background: #3c3c3c;
            border: 1px solid #555;
            color: #cccccc;
            padding: 0.4rem;
            border-radius: 3px;
            width: 300px;
        }
        
        .toolbar {
            background: #2d2d30;
            padding: 0.5rem;
            display: flex;
            gap: 0.5rem;
            border-bottom: 1px solid #3e3e42;
        }
        
        .btn {
            background: #0e639c;
            color: white;
            border: none;
            padding: 0.4rem 0.8rem;
            border-radius: 3px;
            cursor: pointer;
            font-size: 0.85rem;
        }
        
        .btn:hover { background: #1177bb; }
        .btn:active { background: #0d5687; }
    </style>
</head>
<body>
    <div id="app">
        <div id="sidebar">
            <div id="sidebar-header">
                <h2>📁 EXPLORER</h2>
            </div>
            <div class="toolbar">
                <button class="btn" onclick="newFile()">📄 New</button>
                <button class="btn" onclick="save()">💾 Save</button>
            </div>
            <div id="file-tree"></div>
        </div>
        
        <div id="editor-container">
            <div id="tabs"></div>
            <div id="editor"></div>
            <div id="status-bar">
                <span id="status-file">No file open</span>
                <span id="status-position">Ln 1, Col 1</span>
            </div>
        </div>
    </div>
    
    <div id="search-box">
        <input type="text" id="search-input" placeholder="Search files...">
        <div id="search-results"></div>
    </div>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"></script>
    <script>
        let editor;
        let openTabs = new Map();
        let currentFile = null;
        
        require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' }});
        
        require(['vs/editor/editor.main'], function() {
            editor = monaco.editor.create(document.getElementById('editor'), {
                value: '// Welcome to Agenticide Code Editor\\n// Open a file from the sidebar to start editing',
                language: 'javascript',
                theme: 'vs-dark',
                automaticLayout: true,
                fontSize: 14,
                minimap: { enabled: true },
                scrollBeyondLastLine: false
            });
            
            editor.onDidChangeCursorPosition((e) => {
                document.getElementById('status-position').textContent = 
                    \`Ln \${e.position.lineNumber}, Col \${e.position.column}\`;
            });
            
            loadFileTree();
        });
        
        async function loadFileTree() {
            const response = await fetch('/api/files');
            const data = await response.json();
            
            if (data.success) {
                renderFileTree(data.files);
            }
        }
        
        function renderFileTree(files, container = document.getElementById('file-tree')) {
            container.innerHTML = '';
            
            files.forEach(file => {
                const item = document.createElement('div');
                
                if (file.type === 'directory') {
                    item.className = 'folder-item';
                    item.innerHTML = \`📁 \${file.name}\`;
                    item.onclick = () => loadDirectory(file.path);
                } else {
                    item.className = 'file-item';
                    item.innerHTML = \`📄 \${file.name}\`;
                    item.onclick = () => openFile(file.path);
                }
                
                container.appendChild(item);
            });
        }
        
        async function loadDirectory(dir) {
            const response = await fetch(\`/api/files?path=\${encodeURIComponent(dir)}\`);
            const data = await response.json();
            
            if (data.success) {
                renderFileTree(data.files);
            }
        }
        
        async function openFile(filePath) {
            if (openTabs.has(filePath)) {
                switchTab(filePath);
                return;
            }
            
            const response = await fetch(\`/api/file?path=\${encodeURIComponent(filePath)}\`);
            const data = await response.json();
            
            if (data.success) {
                openTabs.set(filePath, {
                    path: filePath,
                    content: data.content,
                    originalContent: data.content
                });
                
                addTab(filePath);
                switchTab(filePath);
            }
        }
        
        function addTab(filePath) {
            const tabs = document.getElementById('tabs');
            const tab = document.createElement('div');
            const fileName = filePath.split('/').pop();
            
            tab.className = 'tab';
            tab.innerHTML = \`
                📄 \${fileName}
                <span class="tab-close" onclick="closeTab(event, '\${filePath}')">×</span>
            \`;
            tab.onclick = () => switchTab(filePath);
            tab.dataset.path = filePath;
            
            tabs.appendChild(tab);
        }
        
        function switchTab(filePath) {
            currentFile = filePath;
            const tab = openTabs.get(filePath);
            
            if (tab) {
                const lang = getLanguage(filePath);
                editor.setValue(tab.content);
                monaco.editor.setModelLanguage(editor.getModel(), lang);
                
                document.getElementById('status-file').textContent = filePath;
                
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                document.querySelector(\`.tab[data-path="\${filePath}"]\`)?.classList.add('active');
            }
        }
        
        function closeTab(event, filePath) {
            event.stopPropagation();
            
            openTabs.delete(filePath);
            document.querySelector(\`.tab[data-path="\${filePath}"]\`)?.remove();
            
            if (currentFile === filePath) {
                const remaining = Array.from(openTabs.keys());
                if (remaining.length > 0) {
                    switchTab(remaining[0]);
                } else {
                    currentFile = null;
                    editor.setValue('');
                }
            }
        }
        
        async function save() {
            if (!currentFile) {
                alert('No file open');
                return;
            }
            
            const content = editor.getValue();
            const response = await fetch('/api/file', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentFile, content })
            });
            
            const data = await response.json();
            if (data.success) {
                const tab = openTabs.get(currentFile);
                tab.content = content;
                tab.originalContent = content;
                console.log('✓ File saved');
            }
        }
        
        async function newFile() {
            const fileName = prompt('Enter file name:');
            if (!fileName) return;
            
            const filePath = \`\${process.cwd()}/\${fileName}\`;
            const response = await fetch('/api/file/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: filePath, content: '' })
            });
            
            const data = await response.json();
            if (data.success) {
                await loadFileTree();
                await openFile(filePath);
            }
        }
        
        function getLanguage(filePath) {
            const ext = filePath.split('.').pop();
            const languages = {
                'js': 'javascript',
                'ts': 'typescript',
                'json': 'json',
                'html': 'html',
                'css': 'css',
                'py': 'python',
                'java': 'java',
                'go': 'go',
                'rs': 'rust',
                'md': 'markdown'
            };
            return languages[ext] || 'plaintext';
        }
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 's') {
                    e.preventDefault();
                    save();
                }
            }
        });
    </script>
</body>
</html>`;
    }

    openBrowser(url) {
        const platform = process.platform;
        const command = platform === 'darwin' ? 'open' :
                       platform === 'win32' ? 'start' : 'xdg-open';
        
        try {
            require('child_process').exec(`${command} ${url}`);
        } catch (error) {
            console.log(chalk.dim('   (Could not auto-open browser)'));
        }
    }
}

module.exports = VSCodeWebExtension;
