/**
 * Code Analyzer - Extract structure, contracts, and control flow from code
 * 
 * Features:
 * - Parse files and extract AST
 * - Track functions, classes, interfaces (contracts only, no bodies)
 * - Find entrypoints (main, exports, routes)
 * - Trace control flow and dependencies
 * - Store in project context for AI agents
 */

const fs = require('fs');
const path = require('path');
const { parse: babelParse } = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const ts = require('typescript');

class CodeAnalyzer {
    constructor(db) {
        this.db = db;
        this.initDatabase();
    }

    initDatabase() {
        // Code structure tables
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

            CREATE TABLE IF NOT EXISTS code_functions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                signature TEXT NOT NULL,
                return_type TEXT,
                parameters TEXT,
                is_async BOOLEAN DEFAULT 0,
                is_exported BOOLEAN DEFAULT 0,
                line_start INTEGER,
                line_end INTEGER,
                FOREIGN KEY (file_id) REFERENCES code_files(id)
            );

            CREATE TABLE IF NOT EXISTS code_classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                extends TEXT,
                implements TEXT,
                is_exported BOOLEAN DEFAULT 0,
                line_start INTEGER,
                line_end INTEGER,
                FOREIGN KEY (file_id) REFERENCES code_files(id)
            );

            CREATE TABLE IF NOT EXISTS code_methods (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                signature TEXT NOT NULL,
                return_type TEXT,
                parameters TEXT,
                is_async BOOLEAN DEFAULT 0,
                is_static BOOLEAN DEFAULT 0,
                visibility TEXT DEFAULT 'public',
                line_start INTEGER,
                line_end INTEGER,
                FOREIGN KEY (class_id) REFERENCES code_classes(id)
            );

            CREATE TABLE IF NOT EXISTS code_imports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER NOT NULL,
                import_path TEXT NOT NULL,
                imported_names TEXT,
                is_default BOOLEAN DEFAULT 0,
                FOREIGN KEY (file_id) REFERENCES code_files(id)
            );

            CREATE TABLE IF NOT EXISTS code_exports (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_id INTEGER NOT NULL,
                export_name TEXT NOT NULL,
                export_type TEXT,
                is_default BOOLEAN DEFAULT 0,
                FOREIGN KEY (file_id) REFERENCES code_files(id)
            );

            CREATE TABLE IF NOT EXISTS control_flow (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                from_file_id INTEGER NOT NULL,
                from_function TEXT,
                to_file_id INTEGER NOT NULL,
                to_function TEXT,
                flow_type TEXT,
                FOREIGN KEY (from_file_id) REFERENCES code_files(id),
                FOREIGN KEY (to_file_id) REFERENCES code_files(id)
            );
        `);
    }

    /**
     * Analyze entire project
     */
    async analyzeProject(projectId, projectPath) {
        console.log(`📊 Analyzing project structure...`);
        
        const files = this.findCodeFiles(projectPath);
        const results = {
            files: 0,
            functions: 0,
            classes: 0,
            entrypoints: []
        };

        for (const filePath of files) {
            const language = this.detectLanguage(filePath);
            const fileId = this.registerFile(projectId, filePath, language);
            
            try {
                if (language === 'javascript' || language === 'typescript') {
                    await this.analyzeJavaScriptFile(fileId, filePath, language);
                } else if (language === 'python') {
                    await this.analyzePythonFile(fileId, filePath);
                } else if (language === 'java') {
                    await this.analyzeJavaFile(fileId, filePath);
                }
                
                results.files++;
                
                // Check if entrypoint
                if (this.isEntrypoint(filePath)) {
                    this.markEntrypoint(fileId);
                    results.entrypoints.push(filePath);
                }
            } catch (error) {
                console.error(`Error analyzing ${filePath}:`, error.message);
            }
        }

        // Calculate totals
        results.functions = this.db.prepare('SELECT COUNT(*) as count FROM code_functions').get().count;
        results.classes = this.db.prepare('SELECT COUNT(*) as count FROM code_classes').get().count;

        return results;
    }

    /**
     * Find all code files in project
     */
    findCodeFiles(projectPath) {
        const codeExtensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.rb', '.php'];
        const ignore = ['node_modules', '.git', 'dist', 'build', 'out', '.next', 'coverage'];
        
        const files = [];
        
        const walk = (dir) => {
            if (!fs.existsSync(dir)) return;
            
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                if (ignore.includes(item)) continue;
                
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                
                if (stat.isDirectory()) {
                    walk(fullPath);
                } else if (codeExtensions.includes(path.extname(item))) {
                    files.push(fullPath);
                }
            }
        };
        
        walk(projectPath);
        return files;
    }

    /**
     * Detect programming language
     */
    detectLanguage(filePath) {
        const ext = path.extname(filePath);
        const map = {
            '.js': 'javascript',
            '.jsx': 'javascript',
            '.ts': 'typescript',
            '.tsx': 'typescript',
            '.py': 'python',
            '.java': 'java',
            '.go': 'go',
            '.rs': 'rust',
            '.rb': 'ruby',
            '.php': 'php'
        };
        return map[ext] || 'unknown';
    }

    /**
     * Register file in database
     */
    registerFile(projectId, filePath, language) {
        const stat = fs.statSync(filePath);
        
        const stmt = this.db.prepare(`
            INSERT INTO code_files (project_id, file_path, language, size)
            VALUES (?, ?, ?, ?)
        `);
        
        const result = stmt.run(projectId, filePath, language, stat.size);
        return result.lastInsertRowid;
    }

    /**
     * Check if file is an entrypoint
     */
    isEntrypoint(filePath) {
        const basename = path.basename(filePath);
        const entrypoints = [
            'index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts',
            'server.js', 'server.ts', '__main__.py', 'main.py', 'Main.java',
            'main.go', 'main.rs'
        ];
        
        return entrypoints.includes(basename) || filePath.includes('/bin/');
    }

    /**
     * Mark file as entrypoint
     */
    markEntrypoint(fileId) {
        this.db.prepare('UPDATE code_files SET entrypoint = 1 WHERE id = ?').run(fileId);
    }

    /**
     * Analyze JavaScript/TypeScript file
     */
    async analyzeJavaScriptFile(fileId, filePath, language) {
        const code = fs.readFileSync(filePath, 'utf-8');
        
        // Parse with Babel (supports both JS and TS)
        const ast = babelParse(code, {
            sourceType: 'module',
            plugins: [
                'jsx',
                'typescript',
                'decorators-legacy',
                'classProperties',
                'asyncGenerators',
                'dynamicImport'
            ]
        });

        const functions = [];
        const classes = [];
        const imports = [];
        const exports = [];

        // Traverse AST
        traverse(ast, {
            // Function declarations
            FunctionDeclaration(path) {
                functions.push({
                    name: path.node.id?.name || 'anonymous',
                    signature: this.extractFunctionSignature(path.node),
                    parameters: JSON.stringify(this.extractParameters(path.node.params)),
                    return_type: this.extractReturnType(path.node),
                    is_async: path.node.async,
                    is_exported: path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration',
                    line_start: path.node.loc?.start.line,
                    line_end: path.node.loc?.end.line
                });
            },

            // Arrow functions assigned to variables
            VariableDeclarator(path) {
                if (path.node.init && (path.node.init.type === 'ArrowFunctionExpression' || path.node.init.type === 'FunctionExpression')) {
                    functions.push({
                        name: path.node.id?.name || 'anonymous',
                        signature: this.extractFunctionSignature(path.node.init),
                        parameters: JSON.stringify(this.extractParameters(path.node.init.params)),
                        return_type: this.extractReturnType(path.node.init),
                        is_async: path.node.init.async,
                        is_exported: path.parent.parent?.type === 'ExportNamedDeclaration',
                        line_start: path.node.loc?.start.line,
                        line_end: path.node.loc?.end.line
                    });
                }
            },

            // Class declarations
            ClassDeclaration(path) {
                const classData = {
                    name: path.node.id?.name || 'AnonymousClass',
                    extends: path.node.superClass?.name || null,
                    implements: path.node.implements?.map(i => i.id.name).join(', ') || null,
                    is_exported: path.parent.type === 'ExportNamedDeclaration' || path.parent.type === 'ExportDefaultDeclaration',
                    line_start: path.node.loc?.start.line,
                    line_end: path.node.loc?.end.line
                };
                
                classes.push({
                    ...classData,
                    methods: []
                });

                // Extract methods
                path.node.body.body.forEach(member => {
                    if (member.type === 'ClassMethod') {
                        classes[classes.length - 1].methods.push({
                            name: member.key.name,
                            signature: this.extractMethodSignature(member),
                            parameters: JSON.stringify(this.extractParameters(member.params)),
                            return_type: this.extractReturnType(member),
                            is_async: member.async,
                            is_static: member.static,
                            visibility: 'public', // JS doesn't have visibility, but TS might
                            line_start: member.loc?.start.line,
                            line_end: member.loc?.end.line
                        });
                    }
                });
            },

            // Imports
            ImportDeclaration(path) {
                imports.push({
                    import_path: path.node.source.value,
                    imported_names: JSON.stringify(path.node.specifiers.map(s => s.local.name)),
                    is_default: path.node.specifiers.some(s => s.type === 'ImportDefaultSpecifier')
                });
            },

            // Exports
            ExportNamedDeclaration(path) {
                if (path.node.declaration) {
                    const name = path.node.declaration.id?.name || path.node.declaration.declarations?.[0]?.id?.name;
                    if (name) {
                        exports.push({
                            export_name: name,
                            export_type: path.node.declaration.type,
                            is_default: false
                        });
                    }
                }
            },

            ExportDefaultDeclaration(path) {
                const name = path.node.declaration.id?.name || path.node.declaration.name || 'default';
                exports.push({
                    export_name: name,
                    export_type: path.node.declaration.type,
                    is_default: true
                });
            }
        });

        // Store in database
        this.storeFunctions(fileId, functions);
        this.storeClasses(fileId, classes);
        this.storeImports(fileId, imports);
        this.storeExports(fileId, exports);
    }

    /**
     * Extract function signature (contract)
     */
    extractFunctionSignature(node) {
        const params = this.extractParameters(node.params);
        const returnType = this.extractReturnType(node);
        
        const paramStr = params.map(p => `${p.name}${p.type ? `: ${p.type}` : ''}`).join(', ');
        const returnStr = returnType ? `: ${returnType}` : '';
        
        return `(${paramStr})${returnStr}`;
    }

    /**
     * Extract method signature
     */
    extractMethodSignature(node) {
        return this.extractFunctionSignature(node);
    }

    /**
     * Extract parameters
     */
    extractParameters(params) {
        return params.map(param => {
            if (param.type === 'Identifier') {
                return {
                    name: param.name,
                    type: param.typeAnnotation?.typeAnnotation?.type || null
                };
            } else if (param.type === 'AssignmentPattern') {
                return {
                    name: param.left.name,
                    type: param.left.typeAnnotation?.typeAnnotation?.type || null,
                    default: true
                };
            }
            return { name: 'unknown', type: null };
        });
    }

    /**
     * Extract return type
     */
    extractReturnType(node) {
        if (node.returnType) {
            return node.returnType.typeAnnotation?.type || 'any';
        }
        return null;
    }

    /**
     * Analyze Python file (basic)
     */
    async analyzePythonFile(fileId, filePath) {
        const code = fs.readFileSync(filePath, 'utf-8');
        const lines = code.split('\n');
        
        const functions = [];
        const classes = [];
        
        // Simple regex-based parsing for Python
        lines.forEach((line, idx) => {
            // Functions
            const funcMatch = line.match(/^(\s*)def\s+(\w+)\s*\((.*?)\)/);
            if (funcMatch) {
                functions.push({
                    name: funcMatch[2],
                    signature: `(${funcMatch[3]})`,
                    parameters: JSON.stringify(funcMatch[3].split(',').map(p => ({ name: p.trim() }))),
                    return_type: null,
                    is_async: line.includes('async def'),
                    is_exported: !funcMatch[1], // Top-level functions
                    line_start: idx + 1,
                    line_end: idx + 1
                });
            }
            
            // Classes
            const classMatch = line.match(/^class\s+(\w+)(?:\((.*?)\))?:/);
            if (classMatch) {
                classes.push({
                    name: classMatch[1],
                    extends: classMatch[2] || null,
                    implements: null,
                    is_exported: true,
                    line_start: idx + 1,
                    line_end: idx + 1,
                    methods: []
                });
            }
        });
        
        this.storeFunctions(fileId, functions);
        this.storeClasses(fileId, classes);
    }

    /**
     * Analyze Java file (basic)
     */
    async analyzeJavaFile(fileId, filePath) {
        const code = fs.readFileSync(filePath, 'utf-8');
        const lines = code.split('\n');
        
        const functions = [];
        const classes = [];
        
        // Simple regex-based parsing for Java
        lines.forEach((line, idx) => {
            // Methods
            const methodMatch = line.match(/^\s*(public|private|protected)?\s*(static)?\s*(\w+)\s+(\w+)\s*\((.*?)\)/);
            if (methodMatch && !line.includes('class') && !line.includes('interface')) {
                functions.push({
                    name: methodMatch[4],
                    signature: `(${methodMatch[5]}): ${methodMatch[3]}`,
                    parameters: JSON.stringify(methodMatch[5].split(',').map(p => ({ name: p.trim() }))),
                    return_type: methodMatch[3],
                    is_async: false,
                    is_exported: methodMatch[1] === 'public',
                    line_start: idx + 1,
                    line_end: idx + 1
                });
            }
            
            // Classes
            const classMatch = line.match(/^\s*(public|private)?\s*class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?/);
            if (classMatch) {
                classes.push({
                    name: classMatch[2],
                    extends: classMatch[3] || null,
                    implements: classMatch[4] || null,
                    is_exported: classMatch[1] === 'public',
                    line_start: idx + 1,
                    line_end: idx + 1,
                    methods: []
                });
            }
        });
        
        this.storeFunctions(fileId, functions);
        this.storeClasses(fileId, classes);
    }

    /**
     * Store functions in database
     */
    storeFunctions(fileId, functions) {
        const stmt = this.db.prepare(`
            INSERT INTO code_functions (file_id, name, signature, return_type, parameters, is_async, is_exported, line_start, line_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const func of functions) {
            stmt.run(
                fileId,
                func.name,
                func.signature,
                func.return_type,
                func.parameters,
                func.is_async ? 1 : 0,
                func.is_exported ? 1 : 0,
                func.line_start,
                func.line_end
            );
        }
    }

    /**
     * Store classes in database
     */
    storeClasses(fileId, classes) {
        const classStmt = this.db.prepare(`
            INSERT INTO code_classes (file_id, name, extends, implements, is_exported, line_start, line_end)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        const methodStmt = this.db.prepare(`
            INSERT INTO code_methods (class_id, name, signature, return_type, parameters, is_async, is_static, visibility, line_start, line_end)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        for (const cls of classes) {
            const result = classStmt.run(
                fileId,
                cls.name,
                cls.extends,
                cls.implements,
                cls.is_exported ? 1 : 0,
                cls.line_start,
                cls.line_end
            );
            
            const classId = result.lastInsertRowid;
            
            // Store methods
            for (const method of cls.methods || []) {
                methodStmt.run(
                    classId,
                    method.name,
                    method.signature,
                    method.return_type,
                    method.parameters,
                    method.is_async ? 1 : 0,
                    method.is_static ? 1 : 0,
                    method.visibility,
                    method.line_start,
                    method.line_end
                );
            }
        }
    }

    /**
     * Store imports in database
     */
    storeImports(fileId, imports) {
        const stmt = this.db.prepare(`
            INSERT INTO code_imports (file_id, import_path, imported_names, is_default)
            VALUES (?, ?, ?, ?)
        `);
        
        for (const imp of imports) {
            stmt.run(fileId, imp.import_path, imp.imported_names, imp.is_default ? 1 : 0);
        }
    }

    /**
     * Store exports in database
     */
    storeExports(fileId, exports) {
        const stmt = this.db.prepare(`
            INSERT INTO code_exports (file_id, export_name, export_type, is_default)
            VALUES (?, ?, ?, ?)
        `);
        
        for (const exp of exports) {
            stmt.run(fileId, exp.export_name, exp.export_type, exp.is_default ? 1 : 0);
        }
    }

    /**
     * Get project structure summary
     */
    getProjectStructure(projectId) {
        const files = this.db.prepare('SELECT * FROM code_files WHERE project_id = ?').all(projectId);
        const entrypoints = files.filter(f => f.entrypoint);
        
        const structure = {
            files: files.length,
            entrypoints: entrypoints.map(e => e.file_path),
            functions: this.db.prepare('SELECT COUNT(*) as count FROM code_functions WHERE file_id IN (SELECT id FROM code_files WHERE project_id = ?)').get(projectId).count,
            classes: this.db.prepare('SELECT COUNT(*) as count FROM code_classes WHERE file_id IN (SELECT id FROM code_files WHERE project_id = ?)').get(projectId).count,
            exports: this.db.prepare('SELECT COUNT(*) as count FROM code_exports WHERE file_id IN (SELECT id FROM code_files WHERE project_id = ?)').get(projectId).count
        };
        
        return structure;
    }

    /**
     * Get file contracts (signatures only)
     */
    getFileContracts(filePath) {
        const file = this.db.prepare('SELECT * FROM code_files WHERE file_path = ?').get(filePath);
        if (!file) return null;
        
        const functions = this.db.prepare('SELECT name, signature, return_type, is_async, is_exported FROM code_functions WHERE file_id = ?').all(file.id);
        const classes = this.db.prepare('SELECT * FROM code_classes WHERE file_id = ?').all(file.id);
        
        for (const cls of classes) {
            cls.methods = this.db.prepare('SELECT name, signature, return_type, is_async, is_static, visibility FROM code_methods WHERE class_id = ?').all(cls.id);
        }
        
        const imports = this.db.prepare('SELECT * FROM code_imports WHERE file_id = ?').all(file.id);
        const exports = this.db.prepare('SELECT * FROM code_exports WHERE file_id = ?').all(file.id);
        
        return {
            file: file.file_path,
            language: file.language,
            imports,
            exports,
            functions,
            classes
        };
    }

    /**
     * Find control flow from entrypoints
     */
    traceControlFlow(projectId) {
        const entrypoints = this.db.prepare('SELECT * FROM code_files WHERE project_id = ? AND entrypoint = 1').all(projectId);
        
        const flow = [];
        
        for (const entry of entrypoints) {
            // Get all imports from this file
            const imports = this.db.prepare('SELECT * FROM code_imports WHERE file_id = ?').all(entry.id);
            
            for (const imp of imports) {
                // Find the imported file
                const importedFile = this.db.prepare('SELECT * FROM code_files WHERE project_id = ? AND file_path LIKE ?').get(projectId, `%${imp.import_path}%`);
                
                if (importedFile) {
                    flow.push({
                        from: entry.file_path,
                        to: importedFile.file_path,
                        type: 'import',
                        names: JSON.parse(imp.imported_names || '[]')
                    });
                }
            }
        }
        
        return flow;
    }
}

module.exports = CodeAnalyzer;
