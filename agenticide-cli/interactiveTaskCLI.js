/**
 * Interactive Task CLI with Search
 * Fast, minimal UI without menus
 */

const inquirer = require('inquirer');
const chalk = require('chalk');
const { TaskManager } = require('../agenticide-core/taskManager');
const { DependencyResolver } = require('../agenticide-core/dependencyResolver');
const { TaskExecutor } = require('../agenticide-core/taskExecutor');
const path = require('path');
const os = require('os');

class InteractiveTaskCLI {
    constructor(dbPath) {
        this.dbPath = dbPath || path.join(os.homedir(), '.agenticide', 'projects.db');
        this.taskManager = new TaskManager(this.dbPath);
        this.resolver = new DependencyResolver(this.taskManager);
        this.executor = new TaskExecutor(this.taskManager, { autoStart: false });
        this.running = true;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.executor.on('task:started', ({ task }) => {
            console.log(chalk.blue(`\n▶️  ${task.title}`));
        });

        this.executor.on('task:completed', ({ task, duration }) => {
            console.log(chalk.green(`✅ ${task.title} (${Math.round(duration/1000)}s)\n`));
        });

        this.executor.on('task:failed', ({ task, error }) => {
            console.error(chalk.red(`❌ ${task.title}: ${error}\n`));
        });
    }

    /**
     * Main interactive loop
     */
    async start() {
        console.clear();
        this.showBanner();
        
        while (this.running) {
            await this.showMainPrompt();
        }

        this.taskManager.close();
    }

    showBanner() {
        console.log(chalk.cyan.bold('\n╔═══════════════════════════════════════╗'));
        console.log(chalk.cyan.bold('║   AGENTICIDE TASK SYSTEM (v2.0)       ║'));
        console.log(chalk.cyan.bold('╚═══════════════════════════════════════╝\n'));
        this.showQuickStats();
    }

    showQuickStats() {
        const summary = this.taskManager.getTaskSummary();
        const ready = summary.by_status.find(s => s.status === 'ready')?.count || 0;
        const pending = summary.by_status.find(s => s.status === 'pending')?.count || 0;
        const done = summary.by_status.find(s => s.status === 'done')?.count || 0;
        
        console.log(chalk.gray(`Total: ${summary.total} | Ready: ${chalk.green(ready)} | Pending: ${chalk.yellow(pending)} | Done: ${chalk.blue(done)}\n`));
    }

    /**
     * Main command prompt with search
     */
    async showMainPrompt() {
        const { command } = await inquirer.prompt([
            {
                type: 'list',
                name: 'command',
                message: 'Command:',
                choices: [
                    { name: '🎯 Show Ready Tasks', value: 'ready' },
                    { name: '🚀 Execute Next Task', value: 'execute' },
                    { name: '📝 Generate Plan', value: 'plan' },
                    { name: '➕ Create Task', value: 'create' },
                    { name: '📋 List All Tasks', value: 'list' },
                    { name: '🌳 Dependency Tree', value: 'tree' },
                    { name: '📊 Statistics', value: 'stats' },
                    '───────────────',
                    { name: '❌ Exit', value: 'exit' }
                ],
                pageSize: 20
            }
        ]);

        console.log('');
        await this.handleCommand(command);
    }

    /**
     * Handle command execution
     */
    async handleCommand(command) {
        switch (command) {
            case 'list':
                await this.listTasks();
                break;
            case 'create':
                await this.createTask();
                break;
            case 'ready':
                await this.showReadyTasks();
                break;
            case 'tree':
                await this.showDependencyTree();
                break;
            case 'execute':
                await this.executeTask();
                break;
            case 'plan':
                await this.generatePlan();
                break;
            case 'search':
                await this.searchTasks();
                break;
            case 'stats':
                await this.showStatistics();
                break;
            case 'settings':
                await this.showSettings();
                break;
            case 'exit':
                this.running = false;
                console.log(chalk.green('\n👋 Goodbye!\n'));
                break;
        }
    }

    /**
     * List all tasks
     */
    async listTasks() {
        const tasks = this.taskManager.getTasks();
        
        if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks found. Create one!\n'));
            return;
        }

        const { taskId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'taskId',
                message: 'Select task:',
                choices: tasks.map(t => ({
                    name: `${this.getStatusIcon(t.status)} ${t.title} ${chalk.gray(`(${t.type})`)}`,
                    value: t.id
                })),
                pageSize: 15,
                loop: false
            }
        ]);

        await this.showTaskDetails(taskId);
    }

    /**
     * Create new task
     */
    async createTask() {
        const { title, description, type, priority, complexity } = await inquirer.prompt([
            {
                type: 'input',
                name: 'title',
                message: 'Task title:',
                validate: input => input.length > 0 || 'Title required'
            },
            {
                type: 'input',
                name: 'description',
                message: 'Description:'
            },
            {
                type: 'list',
                name: 'type',
                message: 'Type:',
                choices: ['feature', 'bug', 'test', 'refactor', 'doc'],
                default: 'feature'
            },
            {
                type: 'number',
                name: 'priority',
                message: 'Priority (0-10):',
                default: 5
            },
            {
                type: 'list',
                name: 'complexity',
                message: 'Complexity:',
                choices: ['trivial', 'simple', 'moderate', 'complex'],
                default: 'moderate'
            }
        ]);

        const task = this.taskManager.createTask({
            title,
            description,
            type,
            priority,
            complexity
        });

        console.log(chalk.green(`\n✅ Created: ${task.id}\n`));

        // Ask if want to add dependencies
        const { addDeps } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'addDeps',
                message: 'Add dependencies?',
                default: false
            }
        ]);

        if (addDeps) {
            await this.addDependencies(task.id);
        }
    }

    /**
     * Add dependencies with autocomplete
     */
    async addDependencies(taskId) {
        const tasks = this.taskManager.getTasks().filter(t => t.id !== taskId);
        
        const choices = tasks.map(t => ({
            name: `${t.title} (${t.id})`,
            value: t.id
        }));

        const { deps } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'deps',
                message: 'Select dependencies (tasks that must complete first):',
                choices
            }
        ]);

        deps.forEach(depId => {
            try {
                this.taskManager.addDependency(taskId, depId, 'blocks');
                console.log(chalk.green(`✓ Added dependency: ${depId}`));
            } catch (error) {
                console.log(chalk.red(`✗ Failed to add ${depId}: ${error.message}`));
            }
        });

        console.log('');
    }

    /**
     * Show ready tasks (no dependencies)
     */
    async showReadyTasks() {
        const ready = this.taskManager.getReadyTasks();
        
        if (ready.length === 0) {
            console.log(chalk.yellow('No tasks ready. All tasks have pending dependencies.\n'));
            return;
        }

        console.log(chalk.cyan.bold(`\n🎯 Ready Tasks (${ready.length}):\n`));
        ready.forEach((task, i) => {
            console.log(`${i + 1}. ${chalk.green(task.title)}`);
            console.log(`   ${chalk.gray(`Priority: ${task.priority} | Complexity: ${task.complexity}`)}`);
        });
        console.log('');
    }

    /**
     * Show dependency tree visualization
     */
    async showDependencyTree() {
        try {
            const groups = this.resolver.getParallelGroups();
            
            console.log(chalk.cyan.bold('\n🌳 Dependency Tree:\n'));
            
            groups.forEach(group => {
                console.log(chalk.yellow(`Level ${group.level}:`));
                group.tasks.forEach(task => {
                    const icon = this.getStatusIcon(task.status);
                    console.log(`  ${icon} ${task.title} ${chalk.gray(`(${task.id})`)}`);
                });
                if (group.canRunInParallel) {
                    console.log(chalk.green('  ⚡ Can run in parallel'));
                }
                console.log('');
            });

            // Show critical path
            const criticalPath = this.resolver.getCriticalPath();
            console.log(chalk.magenta.bold('🎯 Critical Path:'));
            criticalPath.path.forEach((task, i) => {
                const arrow = i < criticalPath.path.length - 1 ? ' → ' : '';
                process.stdout.write(`${task.title}${arrow}`);
            });
            console.log(chalk.gray(`\n   (${criticalPath.estimatedDuration})\n`));

        } catch (error) {
            console.log(chalk.red(`Error: ${error.message}\n`));
        }
    }

    /**
     * Execute task
     */
    async executeTask() {
        const ready = this.taskManager.getReadyTasks();
        
        if (ready.length === 0) {
            console.log(chalk.yellow('No tasks ready to execute.\n'));
            return;
        }

        const { taskId } = await inquirer.prompt([
            {
                type: 'list',
                name: 'taskId',
                message: 'Select task to execute:',
                choices: ready.map(t => ({
                    name: `${t.title} ${chalk.gray(`(${t.complexity}) - Priority: ${t.priority}`)}`,
                    value: t.id
                })),
                pageSize: 10
            }
        ]);

        // Simulate execution
        console.log(chalk.blue('\n⏳ Executing...\n'));
        
        this.executor.on('task:execute', ({ task, complete }) => {
            // Simulate work
            setTimeout(() => {
                complete({ success: true, message: 'Completed' });
            }, 1000);
        });

        await this.executor.executeTask(taskId);
        
        this.showQuickStats();
    }

    /**
     * Generate plan from natural language
     */
    async generatePlan() {
        const { description } = await inquirer.prompt([
            {
                type: 'editor',
                name: 'description',
                message: 'Describe what you want to build:'
            }
        ]);

        console.log(chalk.blue('\n🤖 Generating task breakdown...\n'));

        // Simple heuristic-based plan generation
        const plan = this.generateTasksFromDescription(description);

        console.log(chalk.cyan.bold(`Generated ${plan.tasks.length} tasks:\n`));
        plan.tasks.forEach((task, i) => {
            console.log(`${i + 1}. ${task.title}`);
            console.log(`   ${chalk.gray(task.description)}`);
            if (task.dependencies.length > 0) {
                console.log(`   ${chalk.yellow(`Depends on: ${task.dependencies.join(', ')}`)}`);
            }
        });
        console.log('');

        const { confirm } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'confirm',
                message: 'Create these tasks?',
                default: true
            }
        ]);

        if (confirm) {
            const created = [];
            plan.tasks.forEach(taskData => {
                const task = this.taskManager.createTask({
                    title: taskData.title,
                    description: taskData.description,
                    type: taskData.type,
                    complexity: taskData.complexity,
                    priority: taskData.priority
                });
                created.push({ id: task.id, originalId: taskData.id });
            });

            // Add dependencies
            plan.tasks.forEach(taskData => {
                const task = created.find(t => t.originalId === taskData.id);
                taskData.dependencies.forEach(depOriginalId => {
                    const dep = created.find(t => t.originalId === depOriginalId);
                    if (dep) {
                        this.taskManager.addDependency(task.id, dep.id, 'blocks');
                    }
                });
            });

            console.log(chalk.green(`\n✅ Created ${created.length} tasks with dependencies!\n`));
        }
    }

    /**
     * Simple task generation from description
     */
    generateTasksFromDescription(description) {
        // Extract key phrases
        const lines = description.toLowerCase().split('\n').filter(l => l.trim());
        const tasks = [];

        // Common patterns
        const setupKeywords = ['setup', 'initialize', 'configure', 'install'];
        const buildKeywords = ['create', 'build', 'implement', 'develop', 'add'];
        const testKeywords = ['test', 'verify', 'validate'];
        const docKeywords = ['document', 'readme', 'doc'];

        lines.forEach((line, idx) => {
            let type = 'feature';
            let priority = 5;
            let complexity = 'moderate';

            if (setupKeywords.some(k => line.includes(k))) {
                type = 'feature';
                priority = 10;
                complexity = 'simple';
            } else if (testKeywords.some(k => line.includes(k))) {
                type = 'test';
                priority = 7;
                complexity = 'simple';
            } else if (docKeywords.some(k => line.includes(k))) {
                type = 'doc';
                priority = 5;
                complexity = 'trivial';
            } else if (buildKeywords.some(k => line.includes(k))) {
                type = 'feature';
                priority = 8;
                complexity = 'moderate';
            }

            tasks.push({
                id: `task-${idx}`,
                title: line.charAt(0).toUpperCase() + line.slice(1),
                description: line,
                type,
                priority,
                complexity,
                dependencies: idx > 0 ? [`task-${idx - 1}`] : []
            });
        });

        return { tasks };
    }

    /**
     * Search tasks
     */
    async searchTasks() {
        const { query } = await inquirer.prompt([
            {
                type: 'input',
                name: 'query',
                message: 'Search:'
            }
        ]);

        const tasks = this.taskManager.getTasks();
        const results = tasks.filter(t => 
            t.title.toLowerCase().includes(query.toLowerCase()) ||
            (t.description && t.description.toLowerCase().includes(query.toLowerCase()))
        );

        if (results.length === 0) {
            console.log(chalk.yellow('\nNo results found.\n'));
            return;
        }

        console.log(chalk.cyan.bold(`\n🔍 Found ${results.length} tasks:\n`));
        results.forEach(task => {
            console.log(`${this.getStatusIcon(task.status)} ${task.title}`);
            console.log(`  ${chalk.gray(task.description || 'No description')}\n`);
        });
    }

    /**
     * Show statistics
     */
    async showStatistics() {
        const summary = this.taskManager.getTaskSummary();
        const metrics = this.executor.getMetrics();

        console.log(chalk.cyan.bold('\n📊 Task Statistics:\n'));
        
        console.log(chalk.yellow('By Status:'));
        summary.by_status.forEach(stat => {
            const percent = (stat.count / summary.total * 100).toFixed(1);
            console.log(`  ${stat.status}: ${stat.count} (${percent}%)`);
        });

        console.log(chalk.yellow('\nBy Type:'));
        summary.by_type.forEach(stat => {
            console.log(`  ${stat.type}: ${stat.count}`);
        });

        if (metrics.totalExecuted > 0) {
            console.log(chalk.yellow('\nExecution Metrics:'));
            console.log(`  Success rate: ${metrics.successRate}`);
            console.log(`  Average duration: ${metrics.averageDuration}`);
        }

        console.log('');
    }

    /**
     * Settings (removed)
     */
    async showSettings() {
        console.log(chalk.gray('\nSettings coming soon...\n'));
    }

    /**
     * Show task details
     */
    async showTaskDetails(taskId) {
        const task = this.taskManager.getTask(taskId);
        const events = this.taskManager.getTaskEvents(taskId);

        console.log(chalk.cyan.bold(`\n📋 ${task.title}\n`));
        console.log(`ID: ${chalk.gray(task.id)}`);
        console.log(`Status: ${this.getStatusIcon(task.status)} ${task.status}`);
        console.log(`Type: ${task.type}`);
        console.log(`Priority: ${task.priority}`);
        console.log(`Complexity: ${task.complexity}`);
        if (task.description) {
            console.log(`\nDescription: ${chalk.gray(task.description)}`);
        }

        if (events.length > 0) {
            console.log(chalk.yellow('\nHistory:'));
            events.slice(0, 5).forEach(e => {
                console.log(`  ${e.timestamp}: ${e.message}`);
            });
        }

        console.log('');
    }

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        const icons = {
            'pending': '⏸️',
            'ready': '🎯',
            'in_progress': '▶️',
            'done': '✅',
            'failed': '❌',
            'blocked': '🚫',
            'cancelled': '⛔'
        };
        return icons[status] || '❓';
    }
}

module.exports = { InteractiveTaskCLI };

// Run if called directly
if (require.main === module) {
    const cli = new InteractiveTaskCLI();
    cli.start().catch(console.error);
}
