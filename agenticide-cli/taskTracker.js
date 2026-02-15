// Task Tracker Integration - Manages tasks for stub workflow
const fs = require('fs');
const path = require('path');

class TaskTracker {
    constructor(projectPath = '.') {
        this.projectPath = projectPath;
        this.taskFile = path.join(projectPath, '.agenticide-tasks.json');
    }

    /**
     * Load tasks from file
     */
    loadTasks() {
        if (fs.existsSync(this.taskFile)) {
            try {
                const content = fs.readFileSync(this.taskFile, 'utf8');
                return JSON.parse(content);
            } catch (error) {
                return { modules: [], tasks: [] };
            }
        }
        return { modules: [], tasks: [] };
    }

    /**
     * Save tasks to file
     */
    saveTasks(data) {
        fs.writeFileSync(this.taskFile, JSON.stringify(data, null, 2));
    }

    /**
     * Create tasks from stub generation
     */
    createStubTasks(moduleName, files, options = {}) {
        const data = this.loadTasks();
        
        // Create module entry
        const moduleId = `module-${moduleName}-${Date.now()}`;
        const module = {
            id: moduleId,
            name: moduleName,
            type: options.type || 'service',
            language: options.language || 'unknown',
            style: options.style || 'default',
            createdAt: new Date().toISOString(),
            status: 'stubbed', // stubbed -> implementing -> complete
            branch: options.branch || null,
            files: files.map(f => f.path),
            totalStubs: files.reduce((sum, f) => sum + f.stubs, 0),
            implementedStubs: 0,
            progress: 0
        };

        data.modules = data.modules || [];
        data.modules.push(module);

        // Create individual tasks for each stub
        const tasks = [];
        files.forEach(file => {
            if (file.stubList && file.stubList.length > 0) {
                file.stubList.forEach(stub => {
                    const taskId = `task-${moduleName}-${stub.name}-${Date.now()}`;
                    tasks.push({
                        id: taskId,
                        moduleId: moduleId,
                        type: 'implement',
                        function: stub.name,
                        file: file.path,
                        line: stub.line,
                        status: 'todo', // todo -> in_progress -> done
                        createdAt: new Date().toISOString(),
                        implementedAt: null,
                        testStatus: options.withTests ? 'pending' : 'not_required',
                        branch: options.branch || null
                    });
                });
            }
        });

        data.tasks = data.tasks || [];
        data.tasks.push(...tasks);

        this.saveTasks(data);

        return {
            module: module,
            tasks: tasks,
            totalTasks: tasks.length
        };
    }

    /**
     * Update task status
     */
    updateTaskStatus(functionName, status, options = {}) {
        const data = this.loadTasks();
        
        const task = data.tasks.find(t => 
            t.function.toLowerCase() === functionName.toLowerCase() &&
            t.status !== 'done'
        );

        if (!task) {
            return { updated: false, reason: 'task not found' };
        }

        task.status = status;
        if (status === 'done') {
            task.implementedAt = new Date().toISOString();
            if (options.withTests) {
                task.testStatus = 'completed';
            }
        } else if (status === 'in_progress') {
            task.startedAt = new Date().toISOString();
        }

        // Update module progress
        const module = data.modules.find(m => m.id === task.moduleId);
        if (module) {
            const moduleTasks = data.tasks.filter(t => t.moduleId === module.id);
            const completedTasks = moduleTasks.filter(t => t.status === 'done').length;
            module.implementedStubs = completedTasks;
            module.progress = Math.round((completedTasks / moduleTasks.length) * 100);
            
            if (module.progress === 100) {
                module.status = 'complete';
                module.completedAt = new Date().toISOString();
            } else if (module.progress > 0) {
                module.status = 'implementing';
            }
        }

        this.saveTasks(data);

        return {
            updated: true,
            task: task,
            module: module
        };
    }

    /**
     * Get tasks for a module
     */
    getModuleTasks(moduleName) {
        const data = this.loadTasks();
        const module = data.modules.find(m => m.name === moduleName);
        
        if (!module) {
            return null;
        }

        const tasks = data.tasks.filter(t => t.moduleId === module.id);
        
        return {
            module,
            tasks,
            summary: {
                total: tasks.length,
                todo: tasks.filter(t => t.status === 'todo').length,
                in_progress: tasks.filter(t => t.status === 'in_progress').length,
                done: tasks.filter(t => t.status === 'done').length,
                progress: module.progress
            }
        };
    }

    /**
     * Get all modules
     */
    getAllModules() {
        const data = this.loadTasks();
        return data.modules || [];
    }

    /**
     * Get pending tasks
     */
    getPendingTasks() {
        const data = this.loadTasks();
        return data.tasks.filter(t => t.status !== 'done');
    }

    /**
     * Get next task to implement
     */
    getNextTask() {
        const data = this.loadTasks();
        const todoTasks = data.tasks.filter(t => t.status === 'todo');
        
        if (todoTasks.length === 0) {
            return null;
        }

        // Return oldest todo task
        return todoTasks.sort((a, b) => 
            new Date(a.createdAt) - new Date(b.createdAt)
        )[0];
    }

    /**
     * Get project summary
     */
    getProjectSummary() {
        const data = this.loadTasks();
        const modules = data.modules || [];
        const tasks = data.tasks || [];

        return {
            totalModules: modules.length,
            modulesByStatus: {
                stubbed: modules.filter(m => m.status === 'stubbed').length,
                implementing: modules.filter(m => m.status === 'implementing').length,
                complete: modules.filter(m => m.status === 'complete').length
            },
            totalTasks: tasks.length,
            tasksByStatus: {
                todo: tasks.filter(t => t.status === 'todo').length,
                in_progress: tasks.filter(t => t.status === 'in_progress').length,
                done: tasks.filter(t => t.status === 'done').length
            },
            overallProgress: tasks.length > 0 
                ? Math.round((tasks.filter(t => t.status === 'done').length / tasks.length) * 100)
                : 0
        };
    }

    /**
     * Clear all tasks
     */
    clearTasks() {
        this.saveTasks({ modules: [], tasks: [] });
    }

    /**
     * Export tasks to markdown checklist
     */
    exportToMarkdown() {
        const data = this.loadTasks();
        const modules = data.modules || [];
        
        let markdown = '# Agenticide Tasks\n\n';
        
        modules.forEach(module => {
            const moduleTasks = data.tasks.filter(t => t.moduleId === module.id);
            markdown += `## ${module.name} (${module.progress}%)\n\n`;
            markdown += `**Type:** ${module.type} | **Language:** ${module.language} | **Style:** ${module.style}\n`;
            markdown += `**Status:** ${module.status} | **Created:** ${new Date(module.createdAt).toLocaleDateString()}\n\n`;
            
            moduleTasks.forEach(task => {
                const checkbox = task.status === 'done' ? '[x]' : '[ ]';
                markdown += `- ${checkbox} \`${task.function}\` (${task.file})\n`;
            });
            
            markdown += '\n';
        });

        return markdown;
    }
}

module.exports = { TaskTracker };
