// SQL Runner Extension - Execute SQL queries and manage database connections
const { Extension } = require('../core/extensionManager');
const fs = require('fs');
const path = require('path');

class SQLRunnerExtension extends Extension {
    constructor() {
        super();
        this.name = 'sql';
        this.version = '1.0.0';
        this.description = 'Execute SQL queries and manage databases';
        this.author = 'Agenticide';
        this.connections = new Map();
        this.activeConnection = null;
        this.queryHistory = [];
        this.commands = [
            { name: 'sql', description: 'SQL query execution and database management', usage: '/sql <action> [options]' }
        ];
    }

    async install() { 
        // Check for database drivers
        try {
            require('better-sqlite3');
            this.hasSqlite = true;
        } catch {
            this.hasSqlite = false;
        }
        return { success: true }; 
    }

    async enable() { 
        this.enabled = true; 
        return { success: true }; 
    }

    async disable() { 
        // Close all connections
        for (const [name, conn] of this.connections) {
            if (conn.close) {
                conn.close();
            }
        }
        this.connections.clear();
        this.activeConnection = null;
        this.enabled = false; 
        return { success: true }; 
    }

    async execute(action, args) {
        try {
            switch (action) {
                case 'connect': return await this.connect(args[0], args[1]);
                case 'disconnect': return this.disconnect(args[0]);
                case 'use': return this.useConnection(args[0]);
                case 'list': return this.listConnections();
                case 'query': case 'exec': return await this.runQuery(args.join(' '));
                case 'file': return await this.runFile(args[0]);
                case 'history': return this.showHistory();
                case 'tables': return await this.listTables();
                case 'describe': case 'desc': return await this.describeTable(args[0]);
                case 'export': return await this.exportResults(args[0], args[1]);
                default: 
                    return { 
                        success: false, 
                        error: `Unknown action: ${action}. Available: connect, disconnect, use, list, query, file, history, tables, describe, export` 
                    };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async connect(type, connectionString) {
        if (!type) {
            return { success: false, error: 'Connection type required (sqlite, mysql, postgres)' };
        }

        try {
            switch (type.toLowerCase()) {
                case 'sqlite': case 'sqlite3':
                    return await this.connectSqlite(connectionString);
                case 'mysql':
                    return { success: false, error: 'MySQL support coming soon. Install mysql2 package.' };
                case 'postgres': case 'postgresql':
                    return { success: false, error: 'PostgreSQL support coming soon. Install pg package.' };
                default:
                    return { success: false, error: `Unsupported database type: ${type}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async connectSqlite(dbPath) {
        if (!this.hasSqlite) {
            return { 
                success: false, 
                error: 'SQLite driver not found. Install: npm install better-sqlite3' 
            };
        }

        if (!dbPath) {
            return { success: false, error: 'Database path required' };
        }

        const Database = require('better-sqlite3');
        const absolutePath = path.resolve(dbPath);
        
        const db = new Database(absolutePath, { 
            readonly: false,
            fileMustExist: fs.existsSync(absolutePath)
        });

        const connectionName = path.basename(dbPath, '.db');
        this.connections.set(connectionName, {
            type: 'sqlite',
            db,
            path: absolutePath,
            connected: new Date().toISOString()
        });

        this.activeConnection = connectionName;

        return { 
            success: true, 
            message: `Connected to SQLite: ${connectionName}`,
            connection: connectionName,
            path: absolutePath
        };
    }

    disconnect(name) {
        name = name || this.activeConnection;
        if (!name) {
            return { success: false, error: 'No connection to disconnect' };
        }

        const conn = this.connections.get(name);
        if (!conn) {
            return { success: false, error: `Connection '${name}' not found` };
        }

        if (conn.db && conn.db.close) {
            conn.db.close();
        }

        this.connections.delete(name);
        if (this.activeConnection === name) {
            this.activeConnection = null;
        }

        return { success: true, message: `Disconnected from: ${name}` };
    }

    useConnection(name) {
        if (!name) {
            return { success: false, error: 'Connection name required' };
        }

        if (!this.connections.has(name)) {
            return { success: false, error: `Connection '${name}' not found` };
        }

        this.activeConnection = name;
        return { success: true, message: `Active connection: ${name}` };
    }

    listConnections() {
        if (this.connections.size === 0) {
            return { success: true, message: 'No active connections' };
        }

        const connections = Array.from(this.connections.entries()).map(([name, conn]) => ({
            name,
            type: conn.type,
            path: conn.path,
            active: name === this.activeConnection,
            connected: conn.connected
        }));

        return { success: true, connections, active: this.activeConnection };
    }

    async runQuery(query) {
        if (!this.activeConnection) {
            return { success: false, error: 'No active connection. Use /sql connect first' };
        }

        if (!query || query.trim() === '') {
            return { success: false, error: 'Query is required' };
        }

        const conn = this.connections.get(this.activeConnection);
        if (!conn || !conn.db) {
            return { success: false, error: 'Invalid connection' };
        }

        try {
            const startTime = Date.now();
            const isSelect = query.trim().toLowerCase().startsWith('select');

            let result;
            if (isSelect) {
                result = conn.db.prepare(query).all();
            } else {
                const info = conn.db.prepare(query).run();
                result = { 
                    changes: info.changes, 
                    lastInsertRowid: info.lastInsertRowid 
                };
            }

            const duration = Date.now() - startTime;

            this.queryHistory.push({
                timestamp: new Date().toISOString(),
                query,
                connection: this.activeConnection,
                duration: `${duration}ms`,
                rowCount: Array.isArray(result) ? result.length : result.changes
            });

            return { 
                success: true, 
                result,
                duration: `${duration}ms`,
                rowCount: Array.isArray(result) ? result.length : result.changes
            };
        } catch (error) {
            return { success: false, error: error.message, query };
        }
    }

    async runFile(filePath) {
        if (!filePath) {
            return { success: false, error: 'SQL file path required' };
        }

        if (!fs.existsSync(filePath)) {
            return { success: false, error: `File not found: ${filePath}` };
        }

        const sql = fs.readFileSync(filePath, 'utf-8');
        const queries = sql.split(';').filter(q => q.trim());

        const results = [];
        for (const query of queries) {
            const result = await this.runQuery(query.trim());
            results.push(result);
            if (!result.success) break;
        }

        return { 
            success: results.every(r => r.success), 
            results,
            total: queries.length
        };
    }

    showHistory() {
        if (this.queryHistory.length === 0) {
            return { success: true, message: 'No query history' };
        }

        const formatted = this.queryHistory.slice(-20).map((entry, idx) => ({
            index: this.queryHistory.length - 20 + idx,
            query: entry.query.substring(0, 80) + (entry.query.length > 80 ? '...' : ''),
            connection: entry.connection,
            duration: entry.duration,
            rows: entry.rowCount,
            timestamp: entry.timestamp
        }));

        return { success: true, history: formatted };
    }

    async listTables() {
        if (!this.activeConnection) {
            return { success: false, error: 'No active connection' };
        }

        const conn = this.connections.get(this.activeConnection);
        if (conn.type === 'sqlite') {
            try {
                const tables = conn.db
                    .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
                    .all();
                return { success: true, tables: tables.map(t => t.name) };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        return { success: false, error: 'Unsupported for this connection type' };
    }

    async describeTable(tableName) {
        if (!tableName) {
            return { success: false, error: 'Table name required' };
        }

        if (!this.activeConnection) {
            return { success: false, error: 'No active connection' };
        }

        const conn = this.connections.get(this.activeConnection);
        if (conn.type === 'sqlite') {
            try {
                const columns = conn.db.prepare(`PRAGMA table_info(${tableName})`).all();
                return { success: true, table: tableName, columns };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }

        return { success: false, error: 'Unsupported for this connection type' };
    }

    async exportResults(format, outputPath) {
        if (this.queryHistory.length === 0) {
            return { success: false, error: 'No query results to export' };
        }

        const lastResult = this.queryHistory[this.queryHistory.length - 1];
        
        // Export implementation would go here
        return { 
            success: false, 
            error: 'Export feature coming soon' 
        };
    }
}

module.exports = SQLRunnerExtension;
