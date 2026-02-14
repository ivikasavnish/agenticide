const ProjectIndex = require('./projectIndex');
const TerminalManager = require('./terminalManager');
const APITester = require('./apiTester');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs');

/**
 * ProjectManager - Central project management system
 * Everything revolves around the Project as the central object
 */
class ProjectManager extends EventEmitter {
    constructor() {
        super();
        this.index = new ProjectIndex();
        this.terminalManager = new TerminalManager(this.index);
        this.apiTester = new APITester(this.index);
        this.currentProject = null;

        // Forward terminal events
        this.terminalManager.on('terminal:created', (data) => this.emit('terminal:created', data));
        this.terminalManager.on('terminal:output', (data) => this.emit('terminal:output', data));
        this.terminalManager.on('terminal:exit', (data) => this.emit('terminal:exit', data));
    }

    /**
     * Discover projects on the system
     */
    async discoverProjects(searchPaths = []) {
        if (searchPaths.length === 0) {
            // Default search paths
            searchPaths = [
                path.join(require('os').homedir(), 'Projects'),
                path.join(require('os').homedir(), 'projects'),
                path.join(require('os').homedir(), 'Code'),
                path.join(require('os').homedir(), 'code'),
                path.join(require('os').homedir(), 'workspace'),
                path.join(require('os').homedir(), 'dev')
            ];
        }

        const discovered = [];

        for (const searchPath of searchPaths) {
            if (!fs.existsSync(searchPath)) continue;

            const items = fs.readdirSync(searchPath);
            
            for (const item of items) {
                const itemPath = path.join(searchPath, item);
                
                try {
                    const stats = fs.statSync(itemPath);
                    if (!stats.isDirectory()) continue;

                    // Check if it's a project
                    if (this.isProject(itemPath)) {
                        const project = this.index.addProject(itemPath);
                        discovered.push(project);
                        this.emit('project:discovered', project);
                    }
                } catch (e) {
                    // Skip inaccessible directories
                }
            }
        }

        return discovered;
    }

    /**
     * Check if directory is a project
     */
    isProject(dir) {
        const projectFiles = [
            'package.json',
            'pom.xml',
            'requirements.txt',
            'Cargo.toml',
            'go.mod',
            'Gemfile',
            'composer.json',
            '.git'
        ];

        return projectFiles.some(file => fs.existsSync(path.join(dir, file)));
    }

    /**
     * Set current project
     */
    setCurrentProject(projectPath) {
        const project = this.index.getProject(projectPath);
        if (!project) {
            throw new Error('Project not found');
        }

        this.currentProject = project;
        this.index.touchProject(projectPath);
        this.emit('project:current', project);

        return project;
    }

    /**
     * Get current project
     */
    getCurrentProject() {
        return this.currentProject;
    }

    /**
     * Open project (set as current and index files)
     */
    async openProject(projectPath) {
        let project = this.index.getProject(projectPath);
        
        if (!project) {
            project = this.index.addProject(projectPath);
        }

        this.setCurrentProject(projectPath);

        // Index files in background
        setTimeout(() => {
            this.index.indexProjectFiles(project.id, projectPath);
            this.emit('project:indexed', project);
        }, 100);

        return project;
    }

    /**
     * List all projects
     */
    listProjects(options = {}) {
        return this.index.listProjects(options);
    }

    /**
     * Search projects
     */
    searchProjects(query) {
        return this.index.searchProjects(query);
    }

    /**
     * Get project stats
     */
    getProjectStats(projectId) {
        return this.index.getProjectStats(projectId);
    }

    // ========== TASK MANAGEMENT ==========

    /**
     * Add task to project
     */
    addTask(projectId, description, priority = 0) {
        const stmt = this.index.db.prepare(`
            INSERT INTO project_tasks (project_id, description, priority, created_at)
            VALUES (?, ?, ?, ?)
        `);
        
        const info = stmt.run(projectId, description, priority, Date.now());
        
        const task = {
            id: info.lastInsertRowid,
            projectId,
            description,
            priority,
            completed: 0,
            createdAt: Date.now()
        };

        this.emit('task:added', task);
        return task;
    }

    /**
     * List project tasks
     */
    listTasks(projectId, options = {}) {
        let query = 'SELECT * FROM project_tasks WHERE project_id = ?';
        const params = [projectId];

        if (options.completed !== undefined) {
            query += ' AND completed = ?';
            params.push(options.completed ? 1 : 0);
        }

        query += ' ORDER BY priority DESC, created_at DESC';

        const stmt = this.index.db.prepare(query);
        return stmt.all(...params);
    }

    /**
     * Complete task
     */
    completeTask(taskId) {
        const stmt = this.index.db.prepare(`
            UPDATE project_tasks SET completed = 1, completed_at = ? WHERE id = ?
        `);
        stmt.run(Date.now(), taskId);
        this.emit('task:completed', { id: taskId });
    }

    /**
     * Delete task
     */
    deleteTask(taskId) {
        const stmt = this.index.db.prepare('DELETE FROM project_tasks WHERE id = ?');
        stmt.run(taskId);
        this.emit('task:deleted', { id: taskId });
    }

    // ========== TERMINAL MANAGEMENT ==========

    /**
     * Create terminal for project
     */
    createTerminal(options = {}) {
        if (!this.currentProject && !options.projectId) {
            throw new Error('No project selected');
        }

        const projectId = options.projectId || this.currentProject.id;
        const cwd = options.cwd || this.getProjectPath(projectId);

        return this.terminalManager.createTerminal(projectId, {
            ...options,
            cwd
        });
    }

    /**
     * Run command in background
     */
    async runBackground(command, options = {}) {
        if (!this.currentProject && !options.projectId) {
            throw new Error('No project selected');
        }

        const projectId = options.projectId || this.currentProject.id;
        const cwd = options.cwd || this.getProjectPath(projectId);

        return await this.terminalManager.runBackground(projectId, command, {
            ...options,
            cwd
        });
    }

    /**
     * Run command in foreground
     */
    async runForeground(command, options = {}) {
        if (!this.currentProject && !options.projectId) {
            throw new Error('No project selected');
        }

        const projectId = options.projectId || this.currentProject.id;
        const cwd = options.cwd || this.getProjectPath(projectId);

        return await this.terminalManager.runForeground(projectId, command, {
            ...options,
            cwd
        });
    }

    /**
     * List project terminals
     */
    listTerminals(projectId = null) {
        projectId = projectId || this.currentProject?.id;
        if (!projectId) {
            throw new Error('No project selected');
        }

        return this.terminalManager.listTerminals(projectId);
    }

    /**
     * Get terminal output
     */
    getTerminalOutput(pid, options = {}) {
        return this.terminalManager.getOutput(pid, options);
    }

    /**
     * Kill terminal
     */
    killTerminal(pid) {
        return this.terminalManager.killTerminal(pid);
    }

    // ========== API TESTING ==========

    /**
     * Test API endpoint
     */
    async testAPI(options = {}) {
        if (!this.currentProject && !options.projectId) {
            throw new Error('No project selected');
        }

        const projectId = options.projectId || this.currentProject.id;
        return await this.apiTester.request(projectId, options);
    }

    /**
     * Execute curl command
     */
    async curl(curlCommand, options = {}) {
        if (!this.currentProject && !options.projectId) {
            throw new Error('No project selected');
        }

        const projectId = options.projectId || this.currentProject.id;
        return await this.apiTester.curl(projectId, curlCommand, options);
    }

    /**
     * Get API test history
     */
    getAPIHistory(options = {}) {
        if (!this.currentProject && !options.projectId) {
            throw new Error('No project selected');
        }

        const projectId = options.projectId || this.currentProject.id;
        return this.apiTester.getHistory(projectId, options);
    }

    /**
     * Replay API test
     */
    async replayTest(testId) {
        return await this.apiTester.replayTest(testId);
    }

    /**
     * Create test collection
     */
    createTestCollection(name, tests) {
        if (!this.currentProject) {
            throw new Error('No project selected');
        }

        return this.apiTester.createCollection(this.currentProject.id, name, tests);
    }

    /**
     * Run test collection
     */
    async runTestCollection(collectionName) {
        if (!this.currentProject) {
            throw new Error('No project selected');
        }

        return await this.apiTester.runCollection(this.currentProject.id, collectionName);
    }

    // ========== HELPERS ==========

    /**
     * Get project path by ID
     */
    getProjectPath(projectId) {
        const stmt = this.index.db.prepare('SELECT path FROM projects WHERE id = ?');
        const result = stmt.get(projectId);
        return result?.path;
    }

    /**
     * Get project context (full information)
     */
    getProjectContext(projectId = null) {
        projectId = projectId || this.currentProject?.id;
        if (!projectId) {
            return null;
        }

        const project = this.index.db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
        if (!project) return null;

        project.metadata = JSON.parse(project.metadata || '{}');

        return {
            ...project,
            stats: this.getProjectStats(projectId),
            tasks: this.listTasks(projectId, { completed: 0 }),
            terminals: this.listTerminals(projectId),
            recentTests: this.apiTester.getHistory(projectId, { limit: 10 })
        };
    }

    /**
     * Export project data
     */
    exportProject(projectId) {
        const context = this.getProjectContext(projectId);
        return JSON.stringify(context, null, 2);
    }

    /**
     * Close and cleanup
     */
    close() {
        this.terminalManager.cleanup();
        this.index.close();
    }
}

module.exports = ProjectManager;
