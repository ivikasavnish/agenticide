const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * ProjectIndex - Central indexing system for all projects
 * Maintains a database of all projects on the system
 */
class ProjectIndex {
    constructor() {
        const dbPath = path.join(os.homedir(), '.agenticide', 'projects.db');
        
        // Ensure directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        this.db = new Database(dbPath);
        this.initDatabase();
    }

    initDatabase() {
        // Projects table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS projects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                path TEXT UNIQUE NOT NULL,
                type TEXT,
                language TEXT,
                framework TEXT,
                git_remote TEXT,
                last_accessed INTEGER,
                created_at INTEGER,
                metadata TEXT
            )
        `);

        // Project files index
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS project_files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                path TEXT NOT NULL,
                type TEXT,
                size INTEGER,
                last_modified INTEGER,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )
        `);

        // Project terminals
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS project_terminals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                name TEXT,
                type TEXT,
                pid INTEGER,
                command TEXT,
                status TEXT,
                created_at INTEGER,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )
        `);

        // Project tasks
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS project_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                description TEXT,
                completed INTEGER DEFAULT 0,
                priority INTEGER DEFAULT 0,
                created_at INTEGER,
                completed_at INTEGER,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )
        `);

        // API tests (curl history)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS api_tests (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_id INTEGER,
                name TEXT,
                method TEXT,
                url TEXT,
                headers TEXT,
                body TEXT,
                response TEXT,
                status_code INTEGER,
                duration INTEGER,
                created_at INTEGER,
                FOREIGN KEY (project_id) REFERENCES projects(id)
            )
        `);

        // Create indexes
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_project_path ON projects(path)');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_project_accessed ON projects(last_accessed)');
        this.db.exec('CREATE INDEX IF NOT EXISTS idx_file_project ON project_files(project_id)');
    }

    /**
     * Add or update a project
     */
    addProject(projectPath, metadata = {}) {
        const name = path.basename(projectPath);
        const now = Date.now();
        
        // Detect project type
        const type = this.detectProjectType(projectPath);
        const language = this.detectLanguage(projectPath);
        const framework = this.detectFramework(projectPath);
        const gitRemote = this.getGitRemote(projectPath);

        const stmt = this.db.prepare(`
            INSERT INTO projects (name, path, type, language, framework, git_remote, last_accessed, created_at, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
                name = excluded.name,
                type = excluded.type,
                language = excluded.language,
                framework = excluded.framework,
                git_remote = excluded.git_remote,
                last_accessed = excluded.last_accessed,
                metadata = excluded.metadata
        `);

        stmt.run(
            name,
            projectPath,
            type,
            language,
            framework,
            gitRemote,
            now,
            now,
            JSON.stringify(metadata)
        );

        return this.getProject(projectPath);
    }

    /**
     * Get project by path
     */
    getProject(projectPath) {
        const stmt = this.db.prepare('SELECT * FROM projects WHERE path = ?');
        const project = stmt.get(projectPath);
        
        if (project) {
            project.metadata = JSON.parse(project.metadata || '{}');
        }
        
        return project;
    }

    /**
     * List all projects
     */
    listProjects(options = {}) {
        let query = 'SELECT * FROM projects';
        const conditions = [];
        const params = [];

        if (options.type) {
            conditions.push('type = ?');
            params.push(options.type);
        }

        if (options.language) {
            conditions.push('language = ?');
            params.push(options.language);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY last_accessed DESC';

        if (options.limit) {
            query += ` LIMIT ${options.limit}`;
        }

        const stmt = this.db.prepare(query);
        const projects = stmt.all(...params);

        return projects.map(p => {
            p.metadata = JSON.parse(p.metadata || '{}');
            return p;
        });
    }

    /**
     * Update last accessed time
     */
    touchProject(projectPath) {
        const stmt = this.db.prepare('UPDATE projects SET last_accessed = ? WHERE path = ?');
        stmt.run(Date.now(), projectPath);
    }

    /**
     * Detect project type
     */
    detectProjectType(projectPath) {
        if (fs.existsSync(path.join(projectPath, 'package.json'))) return 'node';
        if (fs.existsSync(path.join(projectPath, 'pom.xml'))) return 'java';
        if (fs.existsSync(path.join(projectPath, 'requirements.txt'))) return 'python';
        if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) return 'rust';
        if (fs.existsSync(path.join(projectPath, 'go.mod'))) return 'go';
        if (fs.existsSync(path.join(projectPath, 'Gemfile'))) return 'ruby';
        if (fs.existsSync(path.join(projectPath, 'composer.json'))) return 'php';
        return 'unknown';
    }

    /**
     * Detect primary language
     */
    detectLanguage(projectPath) {
        const type = this.detectProjectType(projectPath);
        const langMap = {
            'node': 'javascript',
            'java': 'java',
            'python': 'python',
            'rust': 'rust',
            'go': 'go',
            'ruby': 'ruby',
            'php': 'php'
        };
        return langMap[type] || 'unknown';
    }

    /**
     * Detect framework
     */
    detectFramework(projectPath) {
        try {
            const pkgPath = path.join(projectPath, 'package.json');
            if (fs.existsSync(pkgPath)) {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
                const deps = { ...pkg.dependencies, ...pkg.devDependencies };
                
                if (deps.react) return 'react';
                if (deps.vue) return 'vue';
                if (deps.angular) return 'angular';
                if (deps.express) return 'express';
                if (deps['@nestjs/core']) return 'nestjs';
                if (deps.next) return 'nextjs';
            }
        } catch (e) {
            // Ignore
        }
        return null;
    }

    /**
     * Get git remote URL
     */
    getGitRemote(projectPath) {
        try {
            const configPath = path.join(projectPath, '.git', 'config');
            if (fs.existsSync(configPath)) {
                const content = fs.readFileSync(configPath, 'utf8');
                const match = content.match(/url\s*=\s*(.+)/);
                return match ? match[1].trim() : null;
            }
        } catch (e) {
            // Ignore
        }
        return null;
    }

    /**
     * Index project files
     */
    indexProjectFiles(projectId, projectPath) {
        const fg = require('fast-glob');
        
        // Clear existing files
        const deleteStmt = this.db.prepare('DELETE FROM project_files WHERE project_id = ?');
        deleteStmt.run(projectId);

        // Index new files
        const files = fg.sync(['**/*'], {
            cwd: projectPath,
            ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**'],
            stats: true
        });

        const insertStmt = this.db.prepare(`
            INSERT INTO project_files (project_id, path, type, size, last_modified)
            VALUES (?, ?, ?, ?, ?)
        `);

        const insertMany = this.db.transaction((files) => {
            for (const file of files) {
                insertStmt.run(
                    projectId,
                    file.path,
                    path.extname(file.path),
                    file.stats.size,
                    file.stats.mtimeMs
                );
            }
        });

        insertMany(files);
    }

    /**
     * Search projects
     */
    searchProjects(query) {
        const stmt = this.db.prepare(`
            SELECT * FROM projects
            WHERE name LIKE ? OR path LIKE ?
            ORDER BY last_accessed DESC
        `);
        
        const searchTerm = `%${query}%`;
        return stmt.all(searchTerm, searchTerm).map(p => {
            p.metadata = JSON.parse(p.metadata || '{}');
            return p;
        });
    }

    /**
     * Get project statistics
     */
    getProjectStats(projectId) {
        const fileCount = this.db.prepare('SELECT COUNT(*) as count FROM project_files WHERE project_id = ?').get(projectId);
        const taskCount = this.db.prepare('SELECT COUNT(*) as count FROM project_tasks WHERE project_id = ?').get(projectId);
        const completedTasks = this.db.prepare('SELECT COUNT(*) as count FROM project_tasks WHERE project_id = ? AND completed = 1').get(projectId);
        const terminalCount = this.db.prepare('SELECT COUNT(*) as count FROM project_terminals WHERE project_id = ? AND status = "active"').get(projectId);

        return {
            files: fileCount.count,
            tasks: taskCount.count,
            completedTasks: completedTasks.count,
            activeTerminals: terminalCount.count
        };
    }

    /**
     * Close database
     */
    close() {
        this.db.close();
    }
}

module.exports = ProjectIndex;
