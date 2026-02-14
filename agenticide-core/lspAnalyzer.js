/**
 * LSP-based Code Analyzer
 * Uses Language Server Protocol for accurate code analysis
 * 
 * Features:
 * - TypeScript/JavaScript: typescript-language-server
 * - Python: pyright
 * - Full semantic understanding
 * - Type information
 * - Symbol hierarchy
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class LSPAnalyzer {
    constructor(db) {
        this.db = db;
        this.servers = new Map();
        this.requestId = 0;
        this.initDatabase();
    }

    initDatabase() {
        // Same schema as CodeAnalyzer
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS code_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                language TEXT,
                size INTEGER,
                entrypoint BOOLEAN DEFAULT 0,
                analyzed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            CREATE TABLE IF NOT EXISTS code_symbols (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                signature TEXT,
                return_type TEXT,
                parameters TEXT,
                is_exported BOOLEAN DEFAULT 0,
                line_start INTEGER,
                line_end INTEGER,
                parent_id INTEGER,
                FOREIGN KEY (file_id) REFERENCES code_files(id),
                FOREIGN KEY (parent_id) REFERENCES code_symbols(id)
            );

            CREATE TABLE IF NOT EXISTS code_references (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_symbol_id INTEGER NOT NULL,
                to_symbol_id INTEGER NOT NULL,
                reference_type TEXT,
                FOREIGN KEY (from_symbol_id) REFERENCES code_symbols(id),
                FOREIGN KEY (to_symbol_id) REFERENCES code_symbols(id)
            );
        `);
    }

    /**
     * Start LSP server for language
     */
    async startLSPServer(language) {
        if (this.servers.has(language)) {
            return this.servers.get(language);
        }

        let command, args;
        
        switch (language) {
            case 'javascript':
            case 'typescript':
                command = 'typescript-language-server';
                args = ['--stdio'];
                break;
            case 'python':
                command = 'pyright-langserver';
                args = ['--stdio'];
                break;
            case 'go':
                command = 'gopls';
                args = [];
                break;
            case 'rust':
                command = 'rust-analyzer';
                args = [];
                break;
            default:
                throw new Error(`No LSP server configured for ${language}`);
        }

        const server = {
            process: spawn(command, args),
            language,
            initialized: false,
            requests: new Map(),
            buffer: ''
        };

        // Handle stdout (LSP responses)
        server.process.stdout.on('data', (data) => {
            server.buffer += data.toString();
            this.processLSPMessages(server);
        });

        // Handle errors
        server.process.stderr.on('data', (data) => {
            console.error(`LSP ${language} error:`, data.toString());
        });

        // Initialize LSP server
        await this.initializeLSP(server);
        
        this.servers.set(language, server);
        return server;
    }

    /**
     * Process LSP messages from buffer
     */
    processLSPMessages(server) {
        while (true) {
            const headerEnd = server.buffer.indexOf('\r\n\r\n');
            if (headerEnd === -1) break;

            const headers = server.buffer.substring(0, headerEnd);
            const contentLengthMatch = headers.match(/Content-Length: (\d+)/);
            
            if (!contentLengthMatch) {
                server.buffer = server.buffer.substring(headerEnd + 4);
                continue;
            }

            const contentLength = parseInt(contentLengthMatch[1]);
            const messageStart = headerEnd + 4;
            const messageEnd = messageStart + contentLength;

            if (server.buffer.length < messageEnd) break;

            const messageStr = server.buffer.substring(messageStart, messageEnd);
            server.buffer = server.buffer.substring(messageEnd);

            try {
                const message = JSON.parse(messageStr);
                this.handleLSPMessage(server, message);
            } catch (err) {
                console.error('Failed to parse LSP message:', err);
            }
        }
    }

    /**
     * Handle LSP message
     */
    handleLSPMessage(server, message) {
        if (message.id && server.requests.has(message.id)) {
            const { resolve, reject } = server.requests.get(message.id);
            server.requests.delete(message.id);

            if (message.error) {
                reject(new Error(message.error.message));
            } else {
                resolve(message.result);
            }
        }
    }

    /**
     * Send LSP request
     */
    sendLSPRequest(server, method, params) {
        return new Promise((resolve, reject) => {
            const id = ++this.requestId;
            const request = {
                jsonrpc: '2.0',
                id,
                method,
                params
            };

            const content = JSON.stringify(request);
            const message = `Content-Length: ${content.length}\r\n\r\n${content}`;

            server.requests.set(id, { resolve, reject });
            server.process.stdin.write(message);

            // Timeout after 30 seconds
            setTimeout(() => {
                if (server.requests.has(id)) {
                    server.requests.delete(id);
                    reject(new Error('LSP request timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Initialize LSP server
     */
    async initializeLSP(server) {
        const result = await this.sendLSPRequest(server, 'initialize', {
            processId: process.pid,
            rootUri: null,
            capabilities: {
                textDocument: {
                    documentSymbol: {
                        hierarchicalDocumentSymbolSupport: true
                    },
                    hover: {
                        contentFormat: ['markdown', 'plaintext']
                    }
                }
            }
        });

        // Send initialized notification
        const notification = {
            jsonrpc: '2.0',
            method: 'initialized',
            params: {}
        };
        const content = JSON.stringify(notification);
        const message = `Content-Length: ${content.length}\r\n\r\n${content}`;
        server.process.stdin.write(message);

        server.initialized = true;
        console.log(`✅ LSP server initialized: ${server.language}`);
    }

    /**
     * Analyze file using LSP
     */
    async analyzeFile(projectId, filePath, language) {
        try {
            const server = await this.startLSPServer(language);
            const uri = `file://${filePath}`;
            const code = fs.readFileSync(filePath, 'utf-8');

            // Open document
            const openNotification = {
                jsonrpc: '2.0',
                method: 'textDocument/didOpen',
                params: {
                    textDocument: {
                        uri,
                        languageId: language,
                        version: 1,
                        text: code
                    }
                }
            };
            const openContent = JSON.stringify(openNotification);
            const openMessage = `Content-Length: ${openContent.length}\r\n\r\n${openContent}`;
            server.process.stdin.write(openMessage);

            // Wait a bit for server to process
            await new Promise(resolve => setTimeout(resolve, 500));

            // Get document symbols
            const symbols = await this.sendLSPRequest(server, 'textDocument/documentSymbol', {
                textDocument: { uri }
            });

            // Register file
            const fileStmt = this.db.prepare(`
                INSERT INTO code_files (project_id, file_path, language, size)
                VALUES (?, ?, ?, ?)
            `);
            const fileResult = fileStmt.run(projectId, filePath, language, code.length);
            const fileId = fileResult.lastInsertRowid;

            // Store symbols
            this.storeSymbols(fileId, symbols);

            // Close document
            const closeNotification = {
                jsonrpc: '2.0',
                method: 'textDocument/didClose',
                params: {
                    textDocument: { uri }
                }
            };
            const closeContent = JSON.stringify(closeNotification);
            const closeMessage = `Content-Length: ${closeContent.length}\r\n\r\n${closeContent}`;
            server.process.stdin.write(closeMessage);

            return { fileId, symbolCount: symbols?.length || 0 };

        } catch (error) {
            console.error(`Error analyzing ${filePath}:`, error.message);
            return { fileId: null, symbolCount: 0 };
        }
    }

    /**
     * Store symbols in database
     */
    storeSymbols(fileId, symbols, parentId = null) {
        if (!symbols) return;

        const stmt = this.db.prepare(`
            INSERT INTO code_symbols (file_id, name, kind, signature, is_exported, line_start, line_end, parent_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const symbol of symbols) {
            const result = stmt.run(
                fileId,
                symbol.name,
                this.symbolKindToString(symbol.kind),
                symbol.detail || null,
                1, // Assume exported for now
                symbol.range?.start?.line || 0,
                symbol.range?.end?.line || 0,
                parentId
            );

            // Recursively store children
            if (symbol.children && symbol.children.length > 0) {
                this.storeSymbols(fileId, symbol.children, result.lastInsertRowid);
            }
        }
    }

    /**
     * Convert LSP symbol kind to string
     */
    symbolKindToString(kind) {
        const kinds = {
            1: 'File', 2: 'Module', 3: 'Namespace', 4: 'Package',
            5: 'Class', 6: 'Method', 7: 'Property', 8: 'Field',
            9: 'Constructor', 10: 'Enum', 11: 'Interface', 12: 'Function',
            13: 'Variable', 14: 'Constant', 15: 'String', 16: 'Number',
            17: 'Boolean', 18: 'Array', 19: 'Object', 20: 'Key',
            21: 'Null', 22: 'EnumMember', 23: 'Struct', 24: 'Event',
            25: 'Operator', 26: 'TypeParameter'
        };
        return kinds[kind] || 'Unknown';
    }

    /**
     * Analyze entire project
     */
    async analyzeProject(projectId, projectPath) {
        const extensions = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.go': 'go',
            '.rs': 'rust'
        };

        const files = this.findCodeFiles(projectPath, Object.keys(extensions));
        const results = { files: 0, symbols: 0, errors: 0 };

        for (const filePath of files) {
            const ext = path.extname(filePath);
            const language = extensions[ext];

            if (language) {
                const result = await this.analyzeFile(projectId, filePath, language);
                if (result.fileId) {
                    results.files++;
                    results.symbols += result.symbolCount;
                } else {
                    results.errors++;
                }
            }
        }

        return results;
    }

    /**
     * Find code files
     */
    findCodeFiles(dir, extensions) {
        const ignore = ['node_modules', '.git', 'dist', 'build', '__pycache__'];
        const files = [];

        const walk = (currentDir) => {
            if (!fs.existsSync(currentDir)) return;

            const items = fs.readdirSync(currentDir);

            for (const item of items) {
                if (ignore.includes(item)) continue;

                const fullPath = path.join(currentDir, item);
                const stat = fs.statSync(fullPath);

                if (stat.isDirectory()) {
                    walk(fullPath);
                } else if (extensions.includes(path.extname(item))) {
                    files.push(fullPath);
                }
            }
        };

        walk(dir);
        return files;
    }

    /**
     * Get project structure
     */
    getProjectStructure(projectId) {
        const files = this.db.prepare('SELECT COUNT(*) as count FROM code_files WHERE project_id = ?').get(projectId);
        const symbols = this.db.prepare('SELECT COUNT(*) as count FROM code_symbols WHERE file_id IN (SELECT id FROM code_files WHERE project_id = ?)').get(projectId);
        
        const functions = this.db.prepare(`
            SELECT COUNT(*) as count FROM code_symbols 
            WHERE file_id IN (SELECT id FROM code_files WHERE project_id = ?) 
            AND kind IN ('Function', 'Method')
        `).get(projectId);

        const classes = this.db.prepare(`
            SELECT COUNT(*) as count FROM code_symbols 
            WHERE file_id IN (SELECT id FROM code_files WHERE project_id = ?) 
            AND kind IN ('Class', 'Interface')
        `).get(projectId);

        return {
            files: files.count,
            symbols: symbols.count,
            functions: functions.count,
            classes: classes.count
        };
    }

    /**
     * Get file symbols
     */
    getFileSymbols(filePath) {
        const file = this.db.prepare('SELECT * FROM code_files WHERE file_path = ?').get(filePath);
        if (!file) return null;

        const symbols = this.db.prepare('SELECT * FROM code_symbols WHERE file_id = ? AND parent_id IS NULL').all(file.id);

        // Get children for each symbol
        for (const symbol of symbols) {
            symbol.children = this.db.prepare('SELECT * FROM code_symbols WHERE parent_id = ?').all(symbol.id);
        }

        return {
            file: file.file_path,
            language: file.language,
            symbols
        };
    }

    /**
     * Cleanup
     */
    close() {
        for (const [language, server] of this.servers) {
            try {
                server.process.kill();
                console.log(`Stopped LSP server: ${language}`);
            } catch (err) {
                // Ignore
            }
        }
        this.servers.clear();
    }
}

module.exports = LSPAnalyzer;
