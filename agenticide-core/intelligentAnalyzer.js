/**
 * Intelligent Project Analyzer
 * 
 * Features:
 * - Auto-detect languages (Node.js, Go, Rust, Ruby)
 * - Selective LSP activation
 * - Complete code outlines
 * - Hash tree for incremental updates
 * - Exclude library/package directories
 * - Only rebuild changed files
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

class IntelligentAnalyzer {
    constructor(db) {
        this.db = db;
        this.lspServers = new Map();
        this.requestId = 0;
        this.fileHashes = new Map(); // file_path -> hash
        this.initDatabase();
    }

    initDatabase() {
        this.db.exec(`
            -- Project metadata
            CREATE TABLE IF NOT EXISTS project_metadata (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL UNIQUE,
                detected_languages TEXT, -- JSON array
                primary_language TEXT,
                last_scan TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            -- File hash tracking
            CREATE TABLE IF NOT EXISTS file_hashes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                hash TEXT NOT NULL,
                language TEXT,
                size INTEGER,
                last_modified TEXT,
                last_analyzed TEXT,
                UNIQUE(project_id, file_path),
                FOREIGN KEY (project_id) REFERENCES projects(id)
            );

            -- Code symbols (LSP-extracted)
            CREATE TABLE IF NOT EXISTS code_symbols (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL,
                name TEXT NOT NULL,
                kind TEXT NOT NULL,
                detail TEXT,
                range_start_line INTEGER,
                range_start_char INTEGER,
                range_end_line INTEGER,
                range_end_char INTEGER,
                parent_id INTEGER,
                is_exported BOOLEAN DEFAULT 1,
                FOREIGN KEY (parent_id) REFERENCES code_symbols(id)
            );

            CREATE INDEX IF NOT EXISTS idx_symbols_file ON code_symbols(file_path);
            CREATE INDEX IF NOT EXISTS idx_symbols_parent ON code_symbols(parent_id);
            CREATE INDEX IF NOT EXISTS idx_file_hashes_project ON file_hashes(project_id);
        `);
    }

    /**
     * Language detection rules
     */
    getLanguageConfig() {
        return {
            javascript: {
                extensions: ['.js', '.jsx', '.mjs', '.cjs'],
                indicators: ['package.json', 'node_modules'],
                exclude: ['node_modules', 'dist', 'build', '.next', 'out', 'coverage'],
                lsp: { command: 'typescript-language-server', args: ['--stdio'] }
            },
            typescript: {
                extensions: ['.ts', '.tsx'],
                indicators: ['tsconfig.json', 'package.json'],
                exclude: ['node_modules', 'dist', 'build', '.next', 'out', 'coverage'],
                lsp: { command: 'typescript-language-server', args: ['--stdio'] }
            },
            go: {
                extensions: ['.go'],
                indicators: ['go.mod', 'go.sum'],
                exclude: ['vendor', 'bin', 'pkg'],
                lsp: { command: 'gopls', args: [] }
            },
            rust: {
                extensions: ['.rs'],
                indicators: ['Cargo.toml', 'Cargo.lock'],
                exclude: ['target', 'deps'],
                lsp: { command: 'rust-analyzer', args: [] }
            },
            ruby: {
                extensions: ['.rb'],
                indicators: ['Gemfile', 'Rakefile'],
                exclude: ['vendor', 'tmp', 'log'],
                lsp: { command: 'solargraph', args: ['stdio'] }
            },
            python: {
                extensions: ['.py'],
                indicators: ['requirements.txt', 'setup.py', 'pyproject.toml'],
                exclude: ['venv', '__pycache__', '.venv', 'env', 'site-packages'],
                lsp: { command: 'pyright-langserver', args: ['--stdio'] }
            }
        };
    }

    /**
     * Detect languages used in project
     */
    detectLanguages(projectPath) {
        const config = this.getLanguageConfig();
        const detected = new Set();
        const langStats = {}; // language -> file count

        // Check for indicator files at root
        for (const [lang, langConfig] of Object.entries(config)) {
            for (const indicator of langConfig.indicators) {
                const indicatorPath = path.join(projectPath, indicator);
                if (fs.existsSync(indicatorPath)) {
                    detected.add(lang);
                    break;
                }
            }
        }

        // Scan for actual code files
        const files = this.scanProjectFiles(projectPath);
        
        for (const filePath of files) {
            const ext = path.extname(filePath);
            
            for (const [lang, langConfig] of Object.entries(config)) {
                if (langConfig.extensions.includes(ext)) {
                    detected.add(lang);
                    langStats[lang] = (langStats[lang] || 0) + 1;
                }
            }
        }

        // Determine primary language (most files)
        let primary = null;
        let maxCount = 0;
        for (const [lang, count] of Object.entries(langStats)) {
            if (count > maxCount) {
                maxCount = count;
                primary = lang;
            }
        }

        return {
            languages: Array.from(detected),
            primary,
            stats: langStats
        };
    }

    /**
     * Scan project files (excluding libraries)
     */
    scanProjectFiles(projectPath) {
        const config = this.getLanguageConfig();
        const allExcludes = new Set(['node_modules', '.git', 'vendor', 'target', 
                                     '__pycache__', 'dist', 'build', '.venv', 'venv']);
        
        const files = [];

        const walk = (dir, depth = 0) => {
            if (depth > 20) return; // Prevent deep recursion
            if (!fs.existsSync(dir)) return;

            try {
                const items = fs.readdirSync(dir);

                for (const item of items) {
                    // Skip hidden files and excluded directories
                    if (item.startsWith('.') && item !== '.') continue;
                    if (allExcludes.has(item)) continue;

                    const fullPath = path.join(dir, item);
                    
                    try {
                        const stat = fs.statSync(fullPath);

                        if (stat.isDirectory()) {
                            walk(fullPath, depth + 1);
                        } else if (stat.isFile()) {
                            const ext = path.extname(item);
                            // Check if it's a code file
                            for (const langConfig of Object.values(config)) {
                                if (langConfig.extensions.includes(ext)) {
                                    files.push(fullPath);
                                    break;
                                }
                            }
                        }
                    } catch (err) {
                        // Skip files we can't read
                    }
                }
            } catch (err) {
                console.error(`Error reading directory ${dir}:`, err.message);
            }
        };

        walk(projectPath);
        return files;
    }

    /**
     * Calculate file hash (MD5)
     */
    hashFile(filePath) {
        try {
            const content = fs.readFileSync(filePath);
            return crypto.createHash('md5').update(content).digest('hex');
        } catch (err) {
            return null;
        }
    }

    /**
     * Get changed files since last analysis
     */
    getChangedFiles(projectId, files) {
        const changed = [];
        const unchanged = [];
        const newFiles = [];

        // Load existing hashes from database
        const existing = this.db.prepare(
            'SELECT file_path, hash FROM file_hashes WHERE project_id = ?'
        ).all(projectId);

        const dbHashes = new Map(existing.map(row => [row.file_path, row.hash]));

        for (const filePath of files) {
            const currentHash = this.hashFile(filePath);
            if (!currentHash) continue;

            const previousHash = dbHashes.get(filePath);

            if (!previousHash) {
                newFiles.push(filePath);
            } else if (previousHash !== currentHash) {
                changed.push(filePath);
            } else {
                unchanged.push(filePath);
            }

            this.fileHashes.set(filePath, currentHash);
        }

        // Find deleted files
        const currentFiles = new Set(files);
        const deleted = Array.from(dbHashes.keys()).filter(f => !currentFiles.has(f));

        return { changed, newFiles, unchanged, deleted };
    }

    /**
     * Update file hash in database
     */
    updateFileHash(projectId, filePath, hash, language) {
        const stmt = this.db.prepare(`
            INSERT INTO file_hashes (project_id, file_path, hash, language, size, last_modified, last_analyzed)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT(project_id, file_path) 
            DO UPDATE SET hash = ?, last_modified = datetime('now'), last_analyzed = datetime('now')
        `);

        const stat = fs.statSync(filePath);
        stmt.run(projectId, filePath, hash, language, stat.size, hash);
    }

    /**
     * Start LSP server for language
     */
    async startLSP(language) {
        if (this.lspServers.has(language)) {
            return this.lspServers.get(language);
        }

        const config = this.getLanguageConfig()[language];
        if (!config || !config.lsp) {
            throw new Error(`No LSP configured for ${language}`);
        }

        console.log(`🚀 Starting LSP: ${config.lsp.command}`);

        try {
            const server = {
                process: spawn(config.lsp.command, config.lsp.args),
                language,
                initialized: false,
                requests: new Map(),
                buffer: ''
            };

            // Handle stdout
            server.process.stdout.on('data', (data) => {
                server.buffer += data.toString();
                this.processLSPMessages(server);
            });

            // Handle stderr
            server.process.stderr.on('data', (data) => {
                const msg = data.toString();
                if (!msg.includes('Checking')) { // Filter noise
                    console.error(`LSP ${language}:`, msg);
                }
            });

            // Initialize
            await this.initializeLSP(server);

            this.lspServers.set(language, server);
            console.log(`✅ LSP ready: ${language}`);
            return server;

        } catch (err) {
            console.error(`❌ Failed to start LSP for ${language}:`, err.message);
            return null;
        }
    }

    /**
     * Process LSP messages
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

            setTimeout(() => {
                if (server.requests.has(id)) {
                    server.requests.delete(id);
                    reject(new Error('LSP request timeout'));
                }
            }, 30000);
        });
    }

    /**
     * Send LSP notification
     */
    sendLSPNotification(server, method, params) {
        const notification = {
            jsonrpc: '2.0',
            method,
            params
        };
        const content = JSON.stringify(notification);
        const message = `Content-Length: ${content.length}\r\n\r\n${content}`;
        server.process.stdin.write(message);
    }

    /**
     * Initialize LSP
     */
    async initializeLSP(server) {
        await this.sendLSPRequest(server, 'initialize', {
            processId: process.pid,
            rootUri: null,
            capabilities: {
                textDocument: {
                    documentSymbol: {
                        hierarchicalDocumentSymbolSupport: true
                    }
                }
            }
        });

        this.sendLSPNotification(server, 'initialized', {});
        server.initialized = true;
    }

    /**
     * Analyze file with LSP
     */
    async analyzeFileWithLSP(filePath, language) {
        try {
            const server = await this.startLSP(language);
            if (!server) return null;

            const uri = `file://${filePath}`;
            const code = fs.readFileSync(filePath, 'utf-8');

            // Open document
            this.sendLSPNotification(server, 'textDocument/didOpen', {
                textDocument: {
                    uri,
                    languageId: language,
                    version: 1,
                    text: code
                }
            });

            // Wait for processing
            await new Promise(resolve => setTimeout(resolve, 200));

            // Get symbols
            const symbols = await this.sendLSPRequest(server, 'textDocument/documentSymbol', {
                textDocument: { uri }
            });

            // Close document
            this.sendLSPNotification(server, 'textDocument/didClose', {
                textDocument: { uri }
            });

            return symbols;

        } catch (err) {
            console.error(`Error analyzing ${filePath}:`, err.message);
            return null;
        }
    }

    /**
     * Store symbols in database
     */
    storeSymbols(filePath, symbols, parentId = null) {
        if (!symbols || !Array.isArray(symbols)) return;

        const stmt = this.db.prepare(`
            INSERT INTO code_symbols (file_path, name, kind, detail, range_start_line, range_start_char, 
                                     range_end_line, range_end_char, parent_id, is_exported)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const symbol of symbols) {
            const result = stmt.run(
                filePath,
                symbol.name,
                this.symbolKindToString(symbol.kind),
                symbol.detail || null,
                symbol.range?.start?.line || 0,
                symbol.range?.start?.character || 0,
                symbol.range?.end?.line || 0,
                symbol.range?.end?.character || 0,
                parentId,
                1
            );

            // Recursively store children
            if (symbol.children && symbol.children.length > 0) {
                this.storeSymbols(filePath, symbol.children, result.lastInsertRowid);
            }
        }
    }

    /**
     * Convert symbol kind to string
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
     * Main analysis function
     */
    async analyzeProject(projectId, projectPath) {
        console.log('\n🔍 Intelligent Project Analysis\n');
        console.log(`📂 Project: ${projectPath}\n`);

        // Step 1: Detect languages
        console.log('🔎 Detecting languages...');
        const detection = this.detectLanguages(projectPath);
        console.log(`   Detected: ${detection.languages.join(', ')}`);
        console.log(`   Primary: ${detection.primary || 'unknown'}`);
        console.log(`   File counts:`, detection.stats);
        console.log('');

        // Save metadata
        this.db.prepare(`
            INSERT OR REPLACE INTO project_metadata (project_id, detected_languages, primary_language, last_scan)
            VALUES (?, ?, ?, datetime('now'))
        `).run(projectId, JSON.stringify(detection.languages), detection.primary);

        // Step 2: Scan files
        console.log('📁 Scanning project files...');
        const files = this.scanProjectFiles(projectPath);
        console.log(`   Found: ${files.length} code files\n`);

        // Step 3: Check for changes
        console.log('🔄 Checking for changes...');
        const changes = this.getChangedFiles(projectId, files);
        console.log(`   New: ${changes.newFiles.length}`);
        console.log(`   Changed: ${changes.changed.length}`);
        console.log(`   Unchanged: ${changes.unchanged.length}`);
        console.log(`   Deleted: ${changes.deleted.length}\n`);

        // Step 4: Analyze only changed/new files
        const filesToAnalyze = [...changes.newFiles, ...changes.changed];
        
        if (filesToAnalyze.length === 0) {
            console.log('✅ No changes detected - analysis up to date!\n');
            return this.getAnalysisReport(projectId);
        }

        console.log(`⚙️  Analyzing ${filesToAnalyze.length} files...\n`);

        const results = {
            analyzed: 0,
            symbols: 0,
            errors: 0,
            byLanguage: {}
        };

        // Group files by language
        const filesByLang = {};
        for (const filePath of filesToAnalyze) {
            const ext = path.extname(filePath);
            let lang = null;

            for (const [language, config] of Object.entries(this.getLanguageConfig())) {
                if (config.extensions.includes(ext)) {
                    lang = language;
                    break;
                }
            }

            if (lang) {
                if (!filesByLang[lang]) filesByLang[lang] = [];
                filesByLang[lang].push(filePath);
            }
        }

        // Analyze by language
        for (const [lang, langFiles] of Object.entries(filesByLang)) {
            console.log(`   ${lang}: ${langFiles.length} files`);
            
            // Delete old symbols for these files
            const deleteStmt = this.db.prepare('DELETE FROM code_symbols WHERE file_path = ?');
            for (const filePath of langFiles) {
                deleteStmt.run(filePath);
            }

            results.byLanguage[lang] = { files: 0, symbols: 0, errors: 0 };

            for (const filePath of langFiles) {
                try {
                    const symbols = await this.analyzeFileWithLSP(filePath, lang);
                    
                    if (symbols) {
                        this.storeSymbols(filePath, symbols);
                        const symbolCount = this.countSymbols(symbols);
                        
                        results.analyzed++;
                        results.symbols += symbolCount;
                        results.byLanguage[lang].files++;
                        results.byLanguage[lang].symbols += symbolCount;

                        // Update hash
                        const hash = this.fileHashes.get(filePath);
                        if (hash) {
                            this.updateFileHash(projectId, filePath, hash, lang);
                        }
                    } else {
                        results.errors++;
                        results.byLanguage[lang].errors++;
                    }
                } catch (err) {
                    console.error(`   Error analyzing ${path.basename(filePath)}:`, err.message);
                    results.errors++;
                    results.byLanguage[lang].errors++;
                }
            }
        }

        // Handle deleted files
        if (changes.deleted.length > 0) {
            console.log(`\n🗑️  Removing ${changes.deleted.length} deleted files...`);
            const deleteFileStmt = this.db.prepare('DELETE FROM file_hashes WHERE project_id = ? AND file_path = ?');
            const deleteSymbolsStmt = this.db.prepare('DELETE FROM code_symbols WHERE file_path = ?');
            
            for (const filePath of changes.deleted) {
                deleteFileStmt.run(projectId, filePath);
                deleteSymbolsStmt.run(filePath);
            }
        }

        console.log('\n✅ Analysis complete!\n');

        return { ...results, ...this.getAnalysisReport(projectId) };
    }

    /**
     * Count symbols recursively
     */
    countSymbols(symbols) {
        if (!symbols) return 0;
        let count = symbols.length;
        for (const symbol of symbols) {
            if (symbol.children) {
                count += this.countSymbols(symbol.children);
            }
        }
        return count;
    }

    /**
     * Get analysis report
     */
    getAnalysisReport(projectId) {
        const fileCount = this.db.prepare('SELECT COUNT(*) as count FROM file_hashes WHERE project_id = ?').get(projectId);
        const symbolCount = this.db.prepare('SELECT COUNT(*) as count FROM code_symbols').get();
        
        const functions = this.db.prepare(`
            SELECT COUNT(*) as count FROM code_symbols 
            WHERE kind IN ('Function', 'Method')
        `).get();

        const classes = this.db.prepare(`
            SELECT COUNT(*) as count FROM code_symbols 
            WHERE kind IN ('Class', 'Interface', 'Struct')
        `).get();

        return {
            totalFiles: fileCount.count,
            totalSymbols: symbolCount.count,
            functions: functions.count,
            classes: classes.count
        };
    }

    /**
     * Get hash tree
     */
    getHashTree(projectId) {
        const files = this.db.prepare(`
            SELECT file_path, hash, language, size, last_analyzed 
            FROM file_hashes 
            WHERE project_id = ? 
            ORDER BY file_path
        `).all(projectId);

        return files;
    }

    /**
     * Get file outline
     */
    getFileOutline(filePath) {
        const symbols = this.db.prepare(`
            SELECT * FROM code_symbols 
            WHERE file_path = ? AND parent_id IS NULL
            ORDER BY range_start_line
        `).all(filePath);

        for (const symbol of symbols) {
            symbol.children = this.getSymbolChildren(symbol.id);
        }

        return symbols;
    }

    /**
     * Get symbol children
     */
    getSymbolChildren(parentId) {
        const children = this.db.prepare(`
            SELECT * FROM code_symbols 
            WHERE parent_id = ?
            ORDER BY range_start_line
        `).all(parentId);

        for (const child of children) {
            child.children = this.getSymbolChildren(child.id);
        }

        return children;
    }

    /**
     * Cleanup
     */
    close() {
        for (const [lang, server] of this.lspServers) {
            try {
                server.process.kill();
                console.log(`Stopped LSP: ${lang}`);
            } catch (err) {
                // Ignore
            }
        }
        this.lspServers.clear();
    }
}

module.exports = IntelligentAnalyzer;
