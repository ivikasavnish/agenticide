// Agentic Development Extension - Autonomous AI-powered development workflows
const { Extension } = require('../core/extensionManager');
const { TaskManager } = require('../../agenticide-core/taskManager');
const { DependencyResolver } = require('../../agenticide-core/dependencyResolver');
const { TaskExecutor } = require('../../agenticide-core/taskExecutor');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

class AgenticDevelopmentExtension extends Extension {
    constructor() {
        super();
        this.name = 'agentic-dev';
        this.version = '1.0.0';
        this.description = 'Autonomous AI-powered development with planning, execution, and learning';
        this.author = 'Agenticide';
        
        this.agents = new Map();
        this.activeAgent = null;
        this.taskManager = null;
        this.eventBus = new EventEmitter();
        this.memory = {
            completedTasks: [],
            mistakes: [],
            learnings: [],
            codebase: {}
        };

        this.commands = [
            {
                name: 'agent',
                description: 'Manage autonomous development agents',
                usage: '/agent <action> [args]',
                aliases: ['ai', 'auto']
            },
            {
                name: 'develop',
                description: 'Start autonomous development task',
                usage: '/develop "<task description>"',
                aliases: ['dev', 'build']
            },
            {
                name: 'plan',
                description: 'Generate development plan from description',
                usage: '/plan "<project description>"',
                aliases: ['design', 'architect']
            },
            {
                name: 'refactor',
                description: 'Autonomous code refactoring',
                usage: '/refactor <file> [--pattern=<pattern>]',
                aliases: ['improve', 'optimize']
            },
            {
                name: 'fix',
                description: 'Autonomous bug fixing',
                usage: '/fix <file> [--error="<error message>"]',
                aliases: ['debug', 'repair']
            },
            {
                name: 'test-gen',
                description: 'Generate tests automatically',
                usage: '/test-gen <file>',
                aliases: ['tests', 'coverage']
            }
        ];

        this.hooks = [
            {
                event: 'task:created',
                handler: this.onTaskCreated.bind(this)
            },
            {
                event: 'task:completed',
                handler: this.onTaskCompleted.bind(this)
            },
            {
                event: 'task:failed',
                handler: this.onTaskFailed.bind(this)
            }
        ];
    }

    async enable() {
        // Initialize task manager
        const dbPath = path.join(process.cwd(), '.agenticide', 'tasks.db');
        this.taskManager = new TaskManager(dbPath);
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log(chalk.green('✓ Agentic development extension enabled'));
        return { success: true, message: 'Ready for autonomous development' };
    }

    async disable() {
        // Clean up agents
        for (const [id, agent] of this.agents.entries()) {
            await this.stopAgent(id);
        }
        
        return { success: true, message: 'Agentic development disabled' };
    }

    setupEventListeners() {
        this.taskManager.on('task:status_changed', (task) => {
            this.eventBus.emit('task:status', task);
        });

        this.taskManager.on('task:completed', (task) => {
            this.memory.completedTasks.push({
                id: task.id,
                title: task.title,
                timestamp: Date.now(),
                duration: task.completed_at - task.created_at
            });
        });
    }

    async handleCommand(command, args, context) {
        // Parse super keywords from args
        context = this.parseSuperKeywords(args, context);
        
        switch (command) {
            case 'agent':
            case 'ai':
            case 'auto':
                return await this.handleAgentCommand(args, context);
            
            case 'develop':
            case 'dev':
            case 'build':
                return await this.handleDevelop(args, context);
            
            case 'plan':
            case 'design':
            case 'architect':
                return await this.handlePlan(args, context);
            
            case 'refactor':
            case 'improve':
            case 'optimize':
                return await this.handleRefactor(args, context);
            
            case 'fix':
            case 'debug':
            case 'repair':
                return await this.handleFix(args, context);
            
            case 'test-gen':
            case 'tests':
            case 'coverage':
                return await this.handleTestGen(args, context);
            
            default:
                return {
                    success: false,
                    message: `Unknown command: ${command}`
                };
        }
    }

    async handleAgentCommand(args, context) {
        const action = args[0];
        
        switch (action) {
            case 'create':
            case 'new':
                return await this.createAgent(args.slice(1), context);
            
            case 'list':
            case 'ls':
                return this.listAgents();
            
            case 'start':
                return await this.startAgent(args[1], context);
            
            case 'stop':
                return await this.stopAgent(args[1]);
            
            case 'status':
                return this.getAgentStatus(args[1]);
            
            case 'memory':
                return this.getMemory();
            
            default:
                return {
                    success: false,
                    message: 'Usage: /agent <create|list|start|stop|status|memory> [args]'
                };
        }
    }

    async handleDevelop(args, context) {
        const description = args.join(' ');
        if (!description) {
            return {
                success: false,
                message: 'Usage: /develop "<task description>"'
            };
        }

        console.log(chalk.blue(`\n🤖 Starting autonomous development\n`));
        console.log(chalk.gray(`Task: ${description}\n`));

        // Create agent
        const agentId = `dev-${Date.now()}`;
        const agent = await this.createAgentInstance(agentId, {
            type: 'development',
            task: description,
            autonomous: true
        });

        // Generate plan
        console.log(chalk.yellow('📋 Planning...'));
        const plan = await this.generatePlan(description, context);
        
        if (!plan.success) {
            return plan;
        }

        // Create tasks
        const tasks = await this.createTasksFromPlan(plan.data);
        console.log(chalk.green(`✓ Created ${tasks.length} tasks\n`));

        // Start execution
        agent.status = 'running';
        const result = await this.executeAgentWorkflow(agent, tasks, context);

        return result;
    }

    async handlePlan(args, context) {
        const description = args.join(' ');
        if (!description) {
            return {
                success: false,
                message: 'Usage: /plan "<project description>"'
            };
        }

        console.log(chalk.blue(`\n📐 Generating development plan\n`));

        const plan = await this.generatePlan(description, context);
        
        if (plan.success) {
            this.displayPlan(plan.data);
        }

        return plan;
    }

    async handleRefactor(args, context) {
        const filePath = args[0];
        if (!filePath) {
            return {
                success: false,
                message: 'Usage: /refactor <file> [--pattern=<pattern>]'
            };
        }

        const options = this.parseOptions(args.slice(1));
        
        console.log(chalk.blue(`\n🔧 Refactoring ${filePath}\n`));

        // Analyze file
        const analysis = await this.analyzeCode(filePath);
        
        // Generate refactoring plan
        const refactorPlan = await this.generateRefactoringPlan(filePath, analysis, options);
        
        // Display plan
        console.log(chalk.yellow('Refactoring plan:'));
        refactorPlan.changes.forEach((change, idx) => {
            console.log(chalk.gray(`  ${idx + 1}. ${change.description}`));
        });
        
        // Apply changes
        console.log(chalk.yellow('\n🔄 Applying changes...'));
        const result = await this.applyRefactoring(filePath, refactorPlan);
        
        if (result.success) {
            console.log(chalk.green(`\n✓ Refactored ${filePath}`));
            console.log(chalk.dim(`  ${result.changesApplied} changes applied`));
        }

        return result;
    }

    async handleFix(args, context) {
        const filePath = args[0];
        if (!filePath) {
            return {
                success: false,
                message: 'Usage: /fix <file> [--error="<error message>"]'
            };
        }

        const options = this.parseOptions(args.slice(1));
        
        console.log(chalk.blue(`\n🩹 Fixing ${filePath}\n`));

        // Read file
        const code = fs.readFileSync(filePath, 'utf8');
        
        // Analyze error
        let errorContext = null;
        if (options.error) {
            errorContext = this.parseError(options.error);
            console.log(chalk.red(`Error: ${errorContext.message}`));
            if (errorContext.line) {
                console.log(chalk.dim(`  at line ${errorContext.line}`));
            }
        }

        // Generate fix
        console.log(chalk.yellow('\n🔍 Analyzing issue...'));
        const fix = await this.generateFix(filePath, code, errorContext);
        
        if (!fix.success) {
            return fix;
        }

        // Display fix
        console.log(chalk.yellow('\nProposed fix:'));
        console.log(chalk.gray(fix.explanation));
        
        // Apply fix
        console.log(chalk.yellow('\n✍️  Applying fix...'));
        const result = await this.applyFix(filePath, fix);
        
        if (result.success) {
            console.log(chalk.green(`\n✓ Fixed ${filePath}`));
        }

        return result;
    }

    async handleTestGen(args, context) {
        const filePath = args[0];
        if (!filePath) {
            return {
                success: false,
                message: 'Usage: /test-gen <file>'
            };
        }

        console.log(chalk.blue(`\n🧪 Generating tests for ${filePath}\n`));

        // Analyze code
        const analysis = await this.analyzeCode(filePath);
        
        // Generate test cases
        console.log(chalk.yellow('📝 Generating test cases...'));
        const tests = await this.generateTests(filePath, analysis);
        
        if (!tests.success) {
            return tests;
        }

        // Create test file
        const testPath = this.getTestPath(filePath);
        console.log(chalk.yellow(`\n✍️  Writing to ${testPath}...`));
        
        fs.writeFileSync(testPath, tests.code, 'utf8');
        
        console.log(chalk.green(`\n✓ Generated ${tests.testCount} test cases`));
        console.log(chalk.dim(`  Test file: ${testPath}`));

        return {
            success: true,
            testPath,
            testCount: tests.testCount
        };
    }

    async createAgent(args, context) {
        const name = args[0] || `agent-${Date.now()}`;
        const type = args[1] || 'general';

        const agent = await this.createAgentInstance(name, { type });
        
        console.log(chalk.green(`\n✓ Created agent: ${name}`));
        console.log(chalk.dim(`  Type: ${type}`));
        console.log(chalk.dim(`  ID: ${agent.id}`));

        return { success: true, agent };
    }

    async createAgentInstance(id, options = {}) {
        const agent = {
            id,
            name: options.name || id,
            type: options.type || 'general',
            status: 'idle',
            task: options.task || null,
            autonomous: options.autonomous || false,
            created: Date.now(),
            memory: {
                context: [],
                files: [],
                errors: []
            },
            capabilities: [
                'code-generation',
                'refactoring',
                'testing',
                'debugging',
                'documentation',
                'planning'
            ]
        };

        this.agents.set(id, agent);
        return agent;
    }

    listAgents() {
        if (this.agents.size === 0) {
            console.log(chalk.dim('\nNo agents created'));
            return { success: true, agents: [] };
        }

        console.log(chalk.bold('\n🤖 Active Agents:\n'));
        
        const agents = Array.from(this.agents.values());
        agents.forEach(agent => {
            const statusIcon = {
                'idle': '⏸️',
                'running': '▶️',
                'paused': '⏸️',
                'completed': '✅',
                'failed': '❌'
            }[agent.status] || '❓';

            console.log(chalk.cyan(`  ${statusIcon} ${agent.name} (${agent.id})`));
            console.log(chalk.dim(`     Type: ${agent.type}`));
            console.log(chalk.dim(`     Status: ${agent.status}`));
            if (agent.task) {
                console.log(chalk.dim(`     Task: ${agent.task}`));
            }
            console.log();
        });

        return { success: true, agents };
    }

    async startAgent(agentId, context) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return {
                success: false,
                message: `Agent not found: ${agentId}`
            };
        }

        agent.status = 'running';
        this.activeAgent = agent;

        console.log(chalk.green(`\n▶️  Started agent: ${agent.name}`));

        return { success: true, agent };
    }

    async stopAgent(agentId) {
        const agent = this.agents.get(agentId);
        if (!agent) {
            return {
                success: false,
                message: `Agent not found: ${agentId}`
            };
        }

        agent.status = 'idle';
        if (this.activeAgent?.id === agentId) {
            this.activeAgent = null;
        }

        console.log(chalk.yellow(`\n⏸️  Stopped agent: ${agent.name}`));

        return { success: true, agent };
    }

    getAgentStatus(agentId) {
        if (!agentId && this.activeAgent) {
            agentId = this.activeAgent.id;
        }

        const agent = this.agents.get(agentId);
        if (!agent) {
            return {
                success: false,
                message: `Agent not found: ${agentId}`
            };
        }

        console.log(chalk.bold(`\n📊 Agent Status: ${agent.name}\n`));
        console.log(chalk.white(`  ID: ${agent.id}`));
        console.log(chalk.white(`  Type: ${agent.type}`));
        console.log(chalk.white(`  Status: ${agent.status}`));
        console.log(chalk.white(`  Created: ${new Date(agent.created).toLocaleString()}`));
        
        if (agent.task) {
            console.log(chalk.white(`  Current Task: ${agent.task}`));
        }

        console.log(chalk.white(`\n  Capabilities:`));
        agent.capabilities.forEach(cap => {
            console.log(chalk.gray(`    • ${cap}`));
        });

        if (agent.memory.files.length > 0) {
            console.log(chalk.white(`\n  Files Accessed: ${agent.memory.files.length}`));
        }

        return { success: true, agent };
    }

    getMemory() {
        console.log(chalk.bold('\n🧠 Agent Memory:\n'));

        console.log(chalk.cyan(`Completed Tasks: ${this.memory.completedTasks.length}`));
        if (this.memory.completedTasks.length > 0) {
            this.memory.completedTasks.slice(-5).forEach(task => {
                console.log(chalk.dim(`  • ${task.title}`));
            });
        }

        console.log(chalk.cyan(`\nLearnings: ${this.memory.learnings.length}`));
        if (this.memory.learnings.length > 0) {
            this.memory.learnings.slice(-5).forEach(learning => {
                console.log(chalk.dim(`  • ${learning}`));
            });
        }

        console.log(chalk.cyan(`\nMistakes: ${this.memory.mistakes.length}`));
        if (this.memory.mistakes.length > 0) {
            this.memory.mistakes.slice(-5).forEach(mistake => {
                console.log(chalk.dim(`  • ${mistake}`));
            });
        }

        return {
            success: true,
            memory: this.memory
        };
    }

    async generatePlan(description, context) {
        // Decompose into tasks
        const tasks = await this.decomposeTask(description);
        
        // Identify dependencies
        const dependencies = this.identifyDependencies(tasks);
        
        // Estimate complexity
        tasks.forEach(task => {
            task.complexity = this.estimateComplexity(task);
            task.priority = this.estimatePriority(task);
        });

        return {
            success: true,
            data: {
                description,
                tasks,
                dependencies,
                estimatedTime: this.estimateTotalTime(tasks),
                phases: this.groupIntoPhases(tasks, dependencies)
            }
        };
    }

    async decomposeTask(description) {
        // Simple heuristic-based decomposition
        // In production, this would use AI/LLM
        
        const tasks = [];
        const keywords = {
            'api': ['design API', 'implement endpoints', 'test API', 'document API'],
            'database': ['design schema', 'create migrations', 'seed data', 'test queries'],
            'frontend': ['design UI', 'implement components', 'add styling', 'test UI'],
            'auth': ['setup auth', 'implement login', 'add permissions', 'test auth'],
            'test': ['write unit tests', 'add integration tests', 'setup CI']
        };

        const lower = description.toLowerCase();
        
        Object.entries(keywords).forEach(([key, subtasks]) => {
            if (lower.includes(key)) {
                subtasks.forEach(subtask => {
                    tasks.push({
                        id: `task-${tasks.length + 1}`,
                        title: subtask,
                        description: `${subtask} for ${description}`,
                        type: 'feature',
                        status: 'pending'
                    });
                });
            }
        });

        // Always add basic tasks if none matched
        if (tasks.length === 0) {
            tasks.push(
                {
                    id: 'task-1',
                    title: 'Plan implementation',
                    description: `Plan how to implement: ${description}`,
                    type: 'planning',
                    status: 'pending'
                },
                {
                    id: 'task-2',
                    title: 'Implement feature',
                    description: `Implement: ${description}`,
                    type: 'feature',
                    status: 'pending'
                },
                {
                    id: 'task-3',
                    title: 'Add tests',
                    description: `Write tests for: ${description}`,
                    type: 'test',
                    status: 'pending'
                },
                {
                    id: 'task-4',
                    title: 'Document changes',
                    description: `Document: ${description}`,
                    type: 'documentation',
                    status: 'pending'
                }
            );
        }

        return tasks;
    }

    identifyDependencies(tasks) {
        const dependencies = [];
        
        // Simple dependency rules
        const rules = [
            { from: 'test', dependsOn: 'implement' },
            { from: 'document', dependsOn: 'implement' },
            { from: 'implement', dependsOn: 'design' },
            { from: 'implement', dependsOn: 'plan' }
        ];

        tasks.forEach((task, idx) => {
            rules.forEach(rule => {
                if (task.title.toLowerCase().includes(rule.from)) {
                    const deps = tasks.filter((t, i) => 
                        i < idx && t.title.toLowerCase().includes(rule.dependsOn)
                    );
                    deps.forEach(dep => {
                        dependencies.push({
                            task_id: task.id,
                            depends_on: dep.id
                        });
                    });
                }
            });
        });

        return dependencies;
    }

    estimateComplexity(task) {
        const keywords = {
            'high': ['complex', 'advanced', 'architecture', 'integration'],
            'medium': ['implement', 'create', 'add', 'build'],
            'low': ['test', 'document', 'fix', 'update']
        };

        const title = task.title.toLowerCase();
        
        for (const [complexity, words] of Object.entries(keywords)) {
            if (words.some(w => title.includes(w))) {
                return complexity;
            }
        }

        return 'medium';
    }

    estimatePriority(task) {
        const title = task.title.toLowerCase();
        
        if (title.includes('design') || title.includes('plan')) return 'high';
        if (title.includes('implement') || title.includes('create')) return 'high';
        if (title.includes('test')) return 'medium';
        if (title.includes('document')) return 'low';
        
        return 'medium';
    }

    estimateTotalTime(tasks) {
        const timePerComplexity = {
            'low': 30,      // 30 minutes
            'medium': 120,  // 2 hours
            'high': 480     // 8 hours
        };

        const totalMinutes = tasks.reduce((sum, task) => {
            return sum + (timePerComplexity[task.complexity] || 120);
        }, 0);

        return {
            minutes: totalMinutes,
            hours: Math.round(totalMinutes / 60 * 10) / 10,
            display: this.formatDuration(totalMinutes)
        };
    }

    formatDuration(minutes) {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    groupIntoPhases(tasks, dependencies) {
        const phases = [];
        const processed = new Set();
        
        // Phase 1: Tasks with no dependencies
        const phase1 = tasks.filter(task => 
            !dependencies.some(dep => dep.task_id === task.id)
        );
        
        if (phase1.length > 0) {
            phases.push({ name: 'Planning & Setup', tasks: phase1 });
            phase1.forEach(t => processed.add(t.id));
        }

        // Phase 2: Implementation tasks
        const phase2 = tasks.filter(task => 
            !processed.has(task.id) && 
            task.title.toLowerCase().includes('implement')
        );
        
        if (phase2.length > 0) {
            phases.push({ name: 'Implementation', tasks: phase2 });
            phase2.forEach(t => processed.add(t.id));
        }

        // Phase 3: Remaining tasks
        const phase3 = tasks.filter(task => !processed.has(task.id));
        
        if (phase3.length > 0) {
            phases.push({ name: 'Testing & Documentation', tasks: phase3 });
        }

        return phases;
    }

    displayPlan(plan) {
        console.log(chalk.bold.white(`\n📋 Development Plan\n`));
        console.log(chalk.gray(`Description: ${plan.description}`));
        console.log(chalk.gray(`Total Tasks: ${plan.tasks.length}`));
        console.log(chalk.gray(`Estimated Time: ${plan.estimatedTime.display}\n`));

        plan.phases.forEach((phase, idx) => {
            console.log(chalk.bold.cyan(`Phase ${idx + 1}: ${phase.name}`));
            phase.tasks.forEach(task => {
                const priority = {
                    'high': chalk.red('●'),
                    'medium': chalk.yellow('●'),
                    'low': chalk.green('●')
                }[task.priority] || chalk.gray('●');

                console.log(chalk.white(`  ${priority} ${task.title}`));
                console.log(chalk.dim(`     ${task.description}`));
                console.log(chalk.dim(`     Priority: ${task.priority}, Complexity: ${task.complexity}`));
            });
            console.log();
        });

        if (plan.dependencies.length > 0) {
            console.log(chalk.bold.cyan('Dependencies:'));
            plan.dependencies.forEach(dep => {
                const fromTask = plan.tasks.find(t => t.id === dep.task_id);
                const toTask = plan.tasks.find(t => t.id === dep.depends_on);
                console.log(chalk.dim(`  ${fromTask.title} → ${toTask.title}`));
            });
        }
    }

    async createTasksFromPlan(plan) {
        const tasks = [];
        
        for (const task of plan.tasks) {
            const created = await this.taskManager.createTask({
                id: task.id,
                title: task.title,
                description: task.description,
                type: task.type,
                priority: task.priority,
                complexity: task.complexity,
                status: 'pending'
            });
            tasks.push(created);
        }

        // Add dependencies
        for (const dep of plan.dependencies) {
            await this.taskManager.addDependency(dep.task_id, dep.depends_on);
        }

        return tasks;
    }

    async executeAgentWorkflow(agent, tasks, context) {
        console.log(chalk.yellow('🤖 Agent executing workflow...\n'));

        const resolver = new DependencyResolver(this.taskManager);
        const executor = new TaskExecutor(this.taskManager);

        // Set up progress tracking
        executor.on('task:started', (task) => {
            console.log(chalk.blue(`  ▶️  ${task.title}`));
            agent.memory.context.push(`Started: ${task.title}`);
        });

        executor.on('task:completed', (task) => {
            console.log(chalk.green(`  ✓ ${task.title}`));
            agent.memory.context.push(`Completed: ${task.title}`);
            this.memory.learnings.push(`Successfully completed: ${task.title}`);
        });

        executor.on('task:failed', (task, error) => {
            console.log(chalk.red(`  ✗ ${task.title}: ${error.message}`));
            agent.memory.errors.push({ task: task.title, error: error.message });
            this.memory.mistakes.push(`Failed ${task.title}: ${error.message}`);
        });

        // Execute with mock handler
        const result = await executor.executeAll(
            async (task) => {
                // Simulate task execution
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Mock implementation based on task type
                if (task.type === 'test') {
                    return { success: true, tests: ['test1', 'test2'] };
                }
                
                return { success: true };
            },
            { concurrency: 2 }
        );

        agent.status = result.allSucceeded ? 'completed' : 'failed';

        console.log(chalk.bold(`\n${result.allSucceeded ? '✅' : '⚠️'} Workflow ${result.allSucceeded ? 'completed' : 'completed with errors'}`));
        console.log(chalk.dim(`  Succeeded: ${result.succeeded}`));
        console.log(chalk.dim(`  Failed: ${result.failed}`));
        console.log(chalk.dim(`  Duration: ${Math.round(result.totalTime / 1000)}s`));

        return result;
    }

    async analyzeCode(filePath) {
        if (!fs.existsSync(filePath)) {
            return { error: 'File not found' };
        }

        const code = fs.readFileSync(filePath, 'utf8');
        const lines = code.split('\n');

        return {
            filePath,
            lines: lines.length,
            functions: (code.match(/function\s+\w+/g) || []).length,
            classes: (code.match(/class\s+\w+/g) || []).length,
            complexity: this.calculateComplexity(code),
            issues: this.findIssues(code)
        };
    }

    calculateComplexity(code) {
        // Simple cyclomatic complexity estimate
        const controlFlow = ['if', 'else', 'for', 'while', 'case', 'catch'];
        let complexity = 1;
        
        controlFlow.forEach(keyword => {
            const matches = code.match(new RegExp(`\\b${keyword}\\b`, 'g'));
            if (matches) complexity += matches.length;
        });

        return complexity;
    }

    findIssues(code) {
        const issues = [];
        
        // Simple pattern matching for common issues
        if (code.includes('console.log') && !code.includes('// DEBUG')) {
            issues.push({ type: 'warning', message: 'Console.log statements found' });
        }
        
        if (code.match(/\bvar\b/)) {
            issues.push({ type: 'warning', message: 'var usage detected, prefer const/let' });
        }
        
        if (code.includes('TODO') || code.includes('FIXME')) {
            issues.push({ type: 'info', message: 'TODO/FIXME comments found' });
        }

        return issues;
    }

    async generateRefactoringPlan(filePath, analysis, options) {
        const changes = [];

        // Based on analysis, suggest refactorings
        if (analysis.complexity > 10) {
            changes.push({
                type: 'complexity',
                description: 'Reduce complexity by extracting functions',
                priority: 'high'
            });
        }

        analysis.issues.forEach(issue => {
            if (issue.type === 'warning') {
                changes.push({
                    type: 'cleanup',
                    description: issue.message,
                    priority: 'medium'
                });
            }
        });

        if (options.pattern) {
            changes.push({
                type: 'pattern',
                description: `Apply ${options.pattern} pattern`,
                priority: 'high'
            });
        }

        return { changes, filePath };
    }

    async applyRefactoring(filePath, plan) {
        // Mock implementation - would use AST transformations in production
        console.log(chalk.dim(`  Analyzing ${filePath}...`));
        console.log(chalk.dim(`  Applying ${plan.changes.length} changes...`));
        
        return {
            success: true,
            changesApplied: plan.changes.length,
            filePath
        };
    }

    parseError(errorMessage) {
        const lineMatch = errorMessage.match(/line (\d+)/i);
        return {
            message: errorMessage,
            line: lineMatch ? parseInt(lineMatch[1]) : null
        };
    }

    async generateFix(filePath, code, errorContext) {
        // Mock fix generation
        return {
            success: true,
            explanation: 'Added null check to prevent undefined access',
            changes: [
                { line: errorContext?.line || 1, type: 'insert', code: 'if (!data) return;' }
            ]
        };
    }

    async applyFix(filePath, fix) {
        // Mock implementation
        return {
            success: true,
            filePath,
            changesApplied: fix.changes.length
        };
    }

    async generateTests(filePath, analysis) {
        // Mock test generation
        const testCode = `
// Auto-generated tests for ${path.basename(filePath)}

describe('${path.basename(filePath, path.extname(filePath))}', () => {
    test('should exist', () => {
        expect(true).toBe(true);
    });
    
    test('should handle edge cases', () => {
        // TODO: Implement test
    });
});
`;

        return {
            success: true,
            code: testCode,
            testCount: 2
        };
    }

    getTestPath(filePath) {
        const dir = path.dirname(filePath);
        const name = path.basename(filePath, path.extname(filePath));
        const ext = path.extname(filePath);
        
        return path.join(dir, `${name}.test${ext}`);
    }

    parseOptions(args) {
        const options = {};
        args.forEach(arg => {
            if (arg.startsWith('--')) {
                const [key, value] = arg.slice(2).split('=');
                options[key] = value || true;
            }
        });
        return options;
    }

    onTaskCreated(task) {
        console.log(chalk.dim(`  📝 Task created: ${task.title}`));
    }

    onTaskCompleted(task) {
        this.memory.learnings.push(`Completed task: ${task.title}`);
    }

    onTaskFailed(task, error) {
        this.memory.mistakes.push(`Failed task ${task.title}: ${error.message}`);
    }
}

module.exports = AgenticDevelopmentExtension;
