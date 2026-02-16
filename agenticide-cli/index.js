#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const boxenModule = require('boxen');
const boxen = boxenModule.default || boxenModule;
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// NEW: Import modular components
const OutputController = require('./core/outputController');
const StubOrchestrator = require('./commands/stub/stubOrchestrator');
const PlanEditor = require('./commands/plan/planEditor');
const runtime = require('./utils/runtime');

const program = new Command();

// Package info
const pkg = require('./package.json');

// Configuration
const CONFIG_DIR = path.join(process.env.HOME, '.agenticide');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TASKS_FILE = path.join(process.cwd(), '.agenticide-tasks.json');

// ASCII Art Banner
const runtimeInfo = runtime.getRuntimeInfo();
const runtimeBadge = runtime.isBun ? '⚡ Bun' : 'Node.js';
const banner = `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   █████╗  ██████╗ ███████╗███╗   ██╗████████╗       ║
║  ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝       ║
║  ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║          ║
║  ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║          ║
║  ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║          ║
║  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝          ║
║                                                       ║
║         AGENTICIDE CLI - AI Coding Assistant         ║
║          ACP + MCP | Claude + Copilot                ║
║          Runtime: ${runtimeBadge.padEnd(33)} ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`;

// ACP Client for communicating with agents
class ACPClient {
    constructor() {
        this.agents = new Map();
        this.sessions = new Map();
    }

    async initializeClaudeAgent() {
        const spinner = ora('Initializing Claude Code agent...').start();
        
        try {
            const claudePath = await this.findClaudePath();
            if (!claudePath) {
                spinner.fail('Claude Code not found');
                console.log(chalk.yellow('\nInstall Claude Code:'));
                console.log(chalk.cyan('  curl -fsSL https://claude.ai/install.sh | bash\n'));
                return false;
            }

            // Start Claude Code in ACP mode
            const agent = spawn(claudePath, ['--acp'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            this.agents.set('claude', { process: agent, type: 'acp' });
            
            spinner.succeed('Claude Code agent ready');
            return true;
        } catch (error) {
            spinner.fail(`Failed: ${error.message}`);
            return false;
        }
    }

    async findClaudePath() {
        const possiblePaths = [
            '/usr/local/bin/claude',
            '/opt/homebrew/bin/claude',
            path.join(process.env.HOME, '.local/bin/claude')
        ];

        for (const p of possiblePaths) {
            if (fs.existsSync(p)) {
                return p;
            }
        }

        return null;
    }

    async sendPrompt(agentName, prompt, context = {}) {
        const agent = this.agents.get(agentName);
        if (!agent) {
            return `Agent '${agentName}' not initialized`;
        }

        // Create session if needed
        let sessionId = this.sessions.get(agentName);
        if (!sessionId) {
            sessionId = `session-${Date.now()}`;
            this.sessions.set(agentName, sessionId);
        }

        // Send ACP request via JSON-RPC
        const request = {
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'session/prompt',
            params: {
                sessionId,
                prompt,
                context
            }
        };

        return new Promise((resolve) => {
            agent.process.stdin.write(JSON.stringify(request) + '\n');
            
            // Listen for response
            let buffer = '';
            const responseHandler = (data) => {
                buffer += data.toString();
                
                // Try to parse response
                try {
                    const lines = buffer.split('\n');
                    for (const line of lines) {
                        if (line.trim()) {
                            const response = JSON.parse(line);
                            if (response.id === request.id) {
                                agent.process.stdout.removeListener('data', responseHandler);
                                resolve(response.result?.content || response.result || 'No response');
                                return;
                            }
                        }
                    }
                } catch (e) {
                    // Not complete JSON yet, keep buffering
                }
            };

            agent.process.stdout.on('data', responseHandler);
            
            // Timeout after 30 seconds
            setTimeout(() => {
                agent.process.stdout.removeListener('data', responseHandler);
                resolve('Request timeout');
            }, 30000);
        });
    }

    dispose() {
        for (const [name, agent] of this.agents.entries()) {
            if (agent.process) {
                agent.process.kill();
            }
        }
        this.agents.clear();
    }
}

// Global ACP client
let acpClient = null;

// Load config
function loadConfig() {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    
    return {
        defaultProvider: 'claude',
        useACP: true,
        claudeApiKey: '',
        mcpServers: []
    };
}

// Save config
function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Load tasks
function loadTasks() {
    if (fs.existsSync(TASKS_FILE)) {
        return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
    }
    return [];
}

// Save tasks
function saveTasks(tasks) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

// Commands

// Init command
program
    .command('init')
    .description('Initialize Agenticide in current directory')
    .action(async () => {
        console.log(chalk.cyan(banner));
        
        const spinner = ora('Initializing...').start();
        
        // Create config
        const config = loadConfig();
        
        // Initialize tasks file
        saveTasks([]);
        
        spinner.succeed('Initialized successfully!');
        console.log(chalk.green('\n✅ Agenticide ready in this directory'));
        console.log(chalk.gray('\nRun: agenticide chat'));
    });

// Chat command with multi-agent support
program
    .command('chat')
    .description('Start interactive AI chat with multiple agents')
    .option('-p, --provider <provider>', 'AI provider (claude|copilot|openai|local|auto)', 'copilot')
    .option('-m, --model <model>', 'Specific model to use')
    .option('--list-models', 'List all available models')
    .option('--no-context', 'Disable context sharing')
    .option('-s, --session <name>', 'Named session to save/resume')
    .option('-c, --continue', 'Continue from last session')
    .option('--no-compact', 'Skip auto-compaction on startup')
    .action(async (options) => {
        const { AIAgentManager } = require('./aiAgents');
        const Database = require('better-sqlite3');
        const SessionManager = require('./core/sessionManager');
        const AutoCompaction = require('./core/autoCompaction');
        
        const agentManager = new AIAgentManager();
        const sessionManager = new SessionManager();
        
        // Run auto-compaction on startup (unless disabled)
        if (options.compact !== false) {
            const dbPath = path.join(CONFIG_DIR, 'cli.db');
            const sessionsDir = sessionManager.sessionsDir;
            
            await AutoCompaction.runOnStartup({
                gitRepoPath: process.cwd(),
                dbPath: fs.existsSync(dbPath) ? dbPath : null,
                sessionsDir
            });
        }
        
        // Handle session loading
        let loadedSession = null;
        let sessionName = options.session;
        
        if (options.continue) {
            // Load last session
            const lastSession = sessionManager.getLastSession();
            if (lastSession) {
                const result = sessionManager.loadSession(lastSession);
                if (result.success) {
                    loadedSession = result.session;
                    sessionName = lastSession;
                    console.log(chalk.green(`\n✓ Continuing session: ${chalk.bold(lastSession)}`));
                }
            }
        } else if (sessionName) {
            // Load named session
            const result = sessionManager.loadSession(sessionName);
            if (result.success) {
                loadedSession = result.session;
                console.log(chalk.green(`\n✓ Loaded session: ${chalk.bold(sessionName)}`));
            } else {
                console.log(chalk.yellow(`\n⚠️  Session '${sessionName}' not found, starting new session`));
            }
        }
        
        // List models and exit
        if (options.listModels) {
            const models = agentManager.listModels();
            console.log(chalk.cyan('\n🤖 Available AI Models:\n'));
            
            let currentCategory = '';
            models.forEach(m => {
                if (m.category !== currentCategory) {
                    currentCategory = m.category;
                    console.log(chalk.bold(`\n${currentCategory.toUpperCase()}:`));
                }
                const tier = m.tier === 'premium' ? chalk.yellow('⭐') : 
                            m.tier === 'local' ? chalk.green('💻') : 
                            chalk.blue('✓');
                console.log(`  ${tier} ${m.id.padEnd(20)} - ${m.name}`);
            });
            console.log('\nUsage: agenticide chat --provider <provider> --model <model>');
            console.log('');
            return;
        }
        
        console.log(chalk.cyan(banner));
        console.log(chalk.cyan('\n💬 Initializing AI chat...\n'));
        
        const spinner = ora('Setting up agents...').start();
        
        try {
            // Initialize requested provider
            let initialized = false;
            const provider = options.provider.toLowerCase();
            
            if (provider === 'copilot' || provider === 'auto') {
                initialized = await agentManager.initCopilotAgent();
                if (initialized) {
                    agentManager.setActiveAgent('copilot');
                    spinner.succeed('GitHub Copilot ready');
                }
            }
            
            if (!initialized && (provider === 'claude' || provider === 'auto')) {
                initialized = await agentManager.initClaudeAgent();
                if (initialized) {
                    agentManager.setActiveAgent('claude');
                    spinner.succeed('Claude ready');
                }
            }
            
            if (!initialized && (provider === 'openai')) {
                initialized = await agentManager.initOpenAIAgent();
                if (initialized) {
                    agentManager.setActiveAgent('openai');
                    spinner.succeed('OpenAI ready');
                }
            }
            
            if (!initialized && (provider === 'local')) {
                const model = options.model || 'codellama';
                initialized = await agentManager.initLocalAgent(model);
                if (initialized) {
                    agentManager.setActiveAgent('local');
                    spinner.succeed(`Local model (${model}) ready`);
                }
            }
            
            if (!initialized) {
                spinner.fail('No AI agents available');
                console.log(chalk.yellow('\n⚡ Quick Setup:\n'));
                console.log(chalk.gray('Option 1 - OpenAI (Easiest):'));
                console.log('  export OPENAI_API_KEY="sk-..."');
                console.log('  agenticide chat --provider copilot\n');
                console.log(chalk.gray('Option 2 - Claude:'));
                console.log('  export ANTHROPIC_API_KEY="sk-ant-..."');
                console.log('  agenticide chat --provider claude\n');
                console.log(chalk.gray('Option 3 - Local (No API key):'));
                console.log('  brew install ollama');
                console.log('  ollama pull codellama');
                console.log('  agenticide chat --provider local\n');
                console.log(chalk.gray('The system will automatically use the best available option!'));
                return;
            }
            
            // Load context if enabled
            let projectContext = null;
            if (options.context !== false) {
                try {
                    const dbPath = path.join(CONFIG_DIR, 'cli.db');
                    const db = new Database(dbPath);
                    
                    // Get project symbols
                    const symbols = db.prepare(`
                        SELECT name, kind, file_path 
                        FROM code_symbols 
                        WHERE file_path LIKE ? 
                        LIMIT 50
                    `).all(`%${process.cwd()}%`);
                    
                    // Get tasks
                    const tasks = loadTasks();
                    
                    projectContext = {
                        cwd: process.cwd(),
                        symbols: symbols.length,
                        tasks: tasks.length,
                        pendingTasks: tasks.filter(t => !t.completed).length,
                        topSymbols: symbols.slice(0, 10).map(s => `${s.name} (${s.kind})`)
                    };
                    
                    db.close();
                } catch (error) {
                    console.log(chalk.gray('Note: Context sharing unavailable'));
                }
            }
            
            // Show status
            const status = agentManager.getStatus();
            console.log(chalk.cyan('\n📊 Active Agents:\n'));
            for (const [name, info] of Object.entries(status)) {
                const active = info.active ? chalk.green('✓ Active') : chalk.gray('  Ready');
                console.log(`  ${active} ${name.padEnd(10)} - ${info.model}`);
            }
            
            if (projectContext) {
                console.log(chalk.cyan('\n📦 Context Loaded:\n'));
                console.log(`  ${chalk.gray('Directory:')} ${projectContext.cwd}`);
                console.log(`  ${chalk.gray('Symbols:')} ${projectContext.symbols} indexed`);
                console.log(`  ${chalk.gray('Tasks:')} ${projectContext.pendingTasks}/${projectContext.tasks} pending`);
            }
            
            // Show session info if loaded
            if (loadedSession) {
                console.log(chalk.cyan('\n💾 Session Info:\n'));
                console.log(`  ${chalk.gray('Name:')} ${chalk.bold(sessionName)}`);
                console.log(`  ${chalk.gray('Messages:')} ${loadedSession.messageCount}`);
                console.log(`  ${chalk.gray('Created:')} ${new Date(loadedSession.createdAt).toLocaleString()}`);
            }
            
            // Initialize chat history
            let chatHistory = loadedSession ? loadedSession.messages : [];
            
            // Interactive chat
            console.log(chalk.green('\n💬 Chat started. Commands:'));
            console.log(chalk.gray('  /agent <name>     - Switch agent'));
            console.log(chalk.gray('  /model <model>    - Switch model'));
            console.log(chalk.gray('  /status           - Show agent status'));
            console.log(chalk.gray('  /context          - Show context'));
            console.log(chalk.gray('  /cache [stats]    - Cache management'));
            console.log(chalk.gray('  /tasks [summary|list|next] - Task management with progress'));
            console.log(chalk.gray('  /search <query>   - Search code'));
            console.log(chalk.green('\n  💾 Session Management:'));
            console.log(chalk.green('  /sessions         - List all sessions'));
            console.log(chalk.green('  /session save [name] - Save current session'));
            console.log(chalk.green('  /session load <name> - Load a session'));
            console.log(chalk.green('  /compact          - Run auto-compaction'));
            console.log(chalk.magentaBright('\n  🔨 Stub-First Workflow (Professional):'));
            console.log(chalk.magenta('  /stub <module> <lang> [options]   - Generate with tests + annotations'));
            console.log(chalk.gray('    Options: --style=google|airbnb|uber  --no-tests  --no-annotations'));
            console.log(chalk.magenta('  /verify [target]                  - Validate structure'));
            console.log(chalk.magenta('  /implement <function>             - Fill implementation'));
            console.log(chalk.magenta('  /flow [module]                    - Visualize architecture'));
            console.log(chalk.yellow('\n  📋 Planning:'));
            console.log(chalk.yellow('  /plan <goal>      - Create execution plan'));
            console.log(chalk.yellow('  /execute [id]     - Execute plan'));
            console.log(chalk.yellow('  /diff [task]      - Show changes'));
            console.log(chalk.cyan('\n  📄 File Operations:'));
            console.log(chalk.cyan('  /read <file>      - Read file'));
            console.log(chalk.cyan('  /write <file> ... - Write file'));
            console.log(chalk.cyan('  /edit <file> ...  - Edit with AI'));
            console.log(chalk.cyan('  /debug <target>   - Debug code/error'));
            console.log(chalk.blue('\n  ⚡ Shell Commands:'));
            console.log(chalk.blue('  !<command>        - Execute shell command'));
            console.log(chalk.blue('  !python <code>    - Execute Python'));
            console.log(chalk.blue('  !node <code>      - Execute Node.js'));
            console.log(chalk.blue('  !~<command>       - Background execution'));
            console.log(chalk.gray('  exit              - Quit\n'));
            
            // Interactive chat loop
            while (true) {
                const { message } = await inquirer.default.prompt([
                    {
                        type: 'input',
                        name: 'message',
                        message: chalk.cyan('You:'),
                        prefix: ''
                    }
                ]);
                
                const trimmed = message.trim();
                
                if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
                    break;
                }
                
                // Handle commands
                if (trimmed.startsWith('/')) {
                    const [cmd, ...args] = trimmed.slice(1).split(' ');
                    
                    if (cmd === 'agent') {
                        try {
                            agentManager.setActiveAgent(args[0]);
                            console.log(chalk.green(`✓ Switched to ${args[0]}\n`));
                        } catch (error) {
                            console.log(chalk.red(`✗ ${error.message}\n`));
                        }
                    } else if (cmd === 'model') {
                        console.log(chalk.yellow('Model switching in current session not yet supported\n'));
                    } else if (cmd === 'status') {
                        const status = agentManager.getStatus();
                        console.log(chalk.cyan('\n📊 Agent Status:\n'));
                        for (const [name, info] of Object.entries(status)) {
                            const active = info.active ? chalk.green('✓') : ' ';
                            console.log(`  ${active} ${name}: ${info.model}`);
                        }
                        console.log('');
                    } else if (cmd === 'context' && projectContext) {
                        console.log(chalk.cyan('\n📦 Project Context:\n'));
                        console.log(chalk.gray('Directory:'), projectContext.cwd);
                        console.log(chalk.gray('Symbols:'), projectContext.symbols);
                        console.log(chalk.gray('Top symbols:'));
                        projectContext.topSymbols.forEach(s => {
                            console.log(chalk.gray(`  • ${s}`));
                        });
                        console.log('');
                    } else if (cmd === 'cache') {
                        // Cache statistics and management
                        const subCmd = args[0];
                        
                        if (subCmd === 'stats') {
                            const stats = await agentManager.cache.getStats();
                            console.log(chalk.cyan('\n📊 Cache Statistics:\n'));
                            if (stats.enabled) {
                                console.log(chalk.gray('Status:'), chalk.green('Enabled'));
                                console.log(chalk.gray('Total Keys:'), stats.totalKeys);
                                console.log(chalk.gray('Cache Hits:'), stats.hits);
                                console.log(chalk.gray('Cache Misses:'), stats.misses);
                                console.log(chalk.gray('Hit Rate:'), stats.hitRate);
                            } else {
                                console.log(chalk.yellow('Redis not available'));
                                console.log(chalk.gray('Install: npm install redis'));
                                console.log(chalk.gray('Start: brew services start redis'));
                            }
                            console.log('');
                        } else if (subCmd === 'clear') {
                            const success = await agentManager.cache.clear();
                            if (success) {
                                console.log(chalk.green('✅ Cache cleared\n'));
                            } else {
                                console.log(chalk.yellow('⚠️  Cache not available\n'));
                            }
                        } else {
                            console.log(chalk.cyan('\n💾 Cache Commands:\n'));
                            console.log(chalk.gray('  /cache stats  - Show cache statistics'));
                            console.log(chalk.gray('  /cache clear  - Clear all cached data'));
                            console.log('');
                        }
                    } else if (cmd === 'tasks') {
                        // Enhanced task display
                        const { TaskTracker } = require('./taskTracker');
                        const tracker = new TaskTracker();
                        
                        const subCmd = args[0];
                        
                        if (subCmd === 'summary' || !subCmd) {
                            tracker.displaySummary();
                        } else if (subCmd === 'list') {
                            const showAll = args.includes('--all');
                            tracker.displayTasks({ showAll, maxDisplay: 20 });
                        } else if (subCmd === 'next') {
                            const nextTask = tracker.getNextTask();
                            if (nextTask) {
                                console.log(chalk.cyan('\n🎯 Next Task:\n'));
                                console.log(`  ${chalk.bold(nextTask.function)}`);
                                console.log(`  ${chalk.gray('File:')} ${nextTask.file}`);
                                console.log(`  ${chalk.gray('Line:')} ${nextTask.line}`);
                                console.log(chalk.gray('\n  Use: /implement ' + nextTask.function + '\n'));
                            } else {
                                console.log(chalk.green('\n✅ All tasks complete!\n'));
                            }
                        } else {
                            console.log(chalk.cyan('\n📋 Task Commands:\n'));
                            console.log(chalk.gray('  /tasks          - Show summary with progress'));
                            console.log(chalk.gray('  /tasks list     - List all tasks'));
                            console.log(chalk.gray('  /tasks list --all - List all tasks (no limit)'));
                            console.log(chalk.gray('  /tasks next     - Show next task to implement'));
                            console.log('');
                        }
                    } else if (cmd === 'sessions') {
                        // List all sessions
                        const sessions = sessionManager.listSessions();
                        sessionManager.displaySessions(sessions);
                    } else if (cmd === 'session') {
                        // Session management
                        const subCmd = args[0];
                        const sessionArg = args[1];
                        
                        if (subCmd === 'save') {
                            const name = sessionArg || sessionManager.generateSessionName();
                            const result = sessionManager.saveSession(name, {
                                messages: chatHistory || [],
                                context: projectContext,
                                tasks: loadTasks()
                            });
                            
                            if (result.success) {
                                console.log(chalk.green(`\n✓ Session saved: ${chalk.bold(result.sessionName)}\n`));
                            } else {
                                console.log(chalk.red(`\n✗ Failed to save session: ${result.error}\n`));
                            }
                        } else if (subCmd === 'load') {
                            if (!sessionArg) {
                                console.log(chalk.red('\n✗ Please specify a session name\n'));
                                console.log(chalk.gray('Usage: /session load <name>\n'));
                            } else {
                                const result = sessionManager.loadSession(sessionArg);
                                if (result.success) {
                                    loadedSession = result.session;
                                    chatHistory = result.session.messages || [];
                                    console.log(chalk.green(`\n✓ Session loaded: ${chalk.bold(sessionArg)}\n`));
                                    console.log(chalk.gray(`  ${result.session.messageCount} messages restored\n`));
                                } else {
                                    console.log(chalk.red(`\n✗ ${result.error}\n`));
                                }
                            }
                        } else {
                            console.log(chalk.cyan('\n💾 Session Commands:\n'));
                            console.log(chalk.gray('  /session save [name]  - Save current session'));
                            console.log(chalk.gray('  /session load <name>  - Load a session'));
                            console.log(chalk.gray('  /sessions             - List all sessions'));
                            console.log('');
                        }
                    } else if (cmd === 'compact') {
                        // Run manual compaction
                        const AutoCompaction = require('./core/autoCompaction');
                        const compaction = new AutoCompaction({
                            verbose: true,
                            gitRepoPath: process.cwd(),
                            dbPath: path.join(CONFIG_DIR, 'cli.db'),
                            sessionsDir: sessionManager.sessionsDir
                        });
                        
                        const results = await compaction.runAll();
                        compaction.displayResults(results);
                    } else if (cmd === 'search') {
                        const query = args.join(' ');
                        if (query) {
                            try {
                                const Database = require('better-sqlite3');
                                const SemanticSearch = require('../agenticide-core/semanticSearch');
                                const dbPath = path.join(CONFIG_DIR, 'cli.db');
                                const db = new Database(dbPath);
                                const search = new SemanticSearch(db);
                                
                                const results = search.search(query, 3);
                                console.log(chalk.cyan(`\n🔎 Search: "${query}"\n`));
                                results.forEach((r, i) => {
                                    console.log(chalk.bold(`${i + 1}. ${r.symbol_name}`));
                                    console.log(chalk.gray(`   ${r.file_path}`));
                                });
                                console.log('');
                                db.close();
                            } catch (error) {
                                console.log(chalk.red(`Search error: ${error.message}\n`));
                            }
                        }
                    } else if (cmd === 'write' || cmd === 'create') {
                        // Write file: /write <path> <content>
                        const filePath = args[0];
                        const content = args.slice(1).join(' ');
                        
                        if (!filePath || !content) {
                            console.log(chalk.red('Usage: /write <path> <content>\n'));
                        } else {
                            try {
                                const fs = require('fs');
                                const fullPath = path.resolve(filePath);
                                const dir = path.dirname(fullPath);
                                
                                if (!fs.existsSync(dir)) {
                                    fs.mkdirSync(dir, { recursive: true });
                                }
                                
                                fs.writeFileSync(fullPath, content, 'utf8');
                                console.log(chalk.green(`✅ Created: ${filePath}\n`));
                            } catch (error) {
                                console.log(chalk.red(`Error: ${error.message}\n`));
                            }
                        }
                    } else if (cmd === 'read' || cmd === 'cat') {
                        // Read file: /read <path>
                        const filePath = args[0];
                        
                        if (!filePath) {
                            console.log(chalk.red('Usage: /read <path>\n'));
                        } else {
                            try {
                                const fs = require('fs');
                                const fullPath = path.resolve(filePath);
                                const content = fs.readFileSync(fullPath, 'utf8');
                                
                                console.log(chalk.cyan(`\n📄 ${filePath}:\n`));
                                console.log(boxen(content, {
                                    padding: 1,
                                    margin: 0,
                                    borderStyle: 'round',
                                    borderColor: 'cyan'
                                }));
                                console.log('');
                            } catch (error) {
                                console.log(chalk.red(`Error: ${error.message}\n`));
                            }
                        }
                    } else if (cmd === 'edit') {
                        // Edit file with AI: /edit <path> <instructions>
                        const filePath = args[0];
                        const instructions = args.slice(1).join(' ');
                        
                        if (!filePath || !instructions) {
                            console.log(chalk.red('Usage: /edit <path> <instructions>\n'));
                        } else {
                            try {
                                const fs = require('fs');
                                const fullPath = path.resolve(filePath);
                                
                                if (!fs.existsSync(fullPath)) {
                                    console.log(chalk.red(`File not found: ${filePath}\n`));
                                } else {
                                    const content = fs.readFileSync(fullPath, 'utf8');
                                    
                                    console.log(chalk.cyan(`\n✏️  Editing: ${filePath}...\n`));
                                    
                                    const thinking = ora('Thinking...').start();
                                    
                                    const messageContext = projectContext ? {
                                        ...projectContext,
                                        tasks: loadTasks()
                                    } : { cwd: process.cwd() };
                                    
                                    const prompt = `Edit this file according to the instructions.

File: ${filePath}
Current content:
\`\`\`
${content}
\`\`\`

Instructions: ${instructions}

Provide ONLY the complete updated file content, no explanations.`;
                                    
                                    const response = await agentManager.sendMessage(prompt, {
                                        context: messageContext
                                    });
                                    
                                    thinking.stop();
                                    
                                    // Extract code from response if wrapped in backticks
                                    let newContent = response;
                                    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
                                    if (codeBlockMatch) {
                                        newContent = codeBlockMatch[1];
                                    }
                                    
                                    // Write updated file
                                    fs.writeFileSync(fullPath, newContent, 'utf8');
                                    console.log(chalk.green(`✅ Updated: ${filePath}\n`));
                                }
                            } catch (error) {
                                thinking.fail(`Error: ${error.message}`);
                                console.log('');
                            }
                        }
                    } else if (cmd === 'debug') {
                        // Debug code: /debug <file_or_error>
                        const target = args.join(' ');
                        
                        if (!target) {
                            console.log(chalk.red('Usage: /debug <file_or_error>\n'));
                        } else {
                            console.log(chalk.cyan(`\n🐛 Debugging: ${target}...\n`));
                            
                            const thinking = ora('Analyzing...').start();
                            
                            const messageContext = projectContext ? {
                                ...projectContext,
                                tasks: loadTasks()
                            } : { cwd: process.cwd() };
                            
                            let prompt = `Debug this code/error:

${target}

Analyze the issue and provide:
1. Root cause
2. Fix
3. Explanation`;
                            
                            // If it's a file path, read the file
                            try {
                                const fs = require('fs');
                                if (fs.existsSync(target)) {
                                    const content = fs.readFileSync(target, 'utf8');
                                    prompt = `Debug this file:

File: ${target}
\`\`\`
${content}
\`\`\`

Analyze for bugs, errors, and improvements. Provide specific issues and fixes.`;
                                }
                            } catch (e) {
                                // Not a file, treat as error message
                            }
                            
                            const response = await agentManager.sendMessage(prompt, {
                                context: messageContext
                            });
                            
                            thinking.stop();
                            console.log(chalk.red(`\n🐛 Debug Analysis:\n`));
                            console.log(boxen(response, {
                                padding: 1,
                                margin: 0,
                                borderStyle: 'round',
                                borderColor: 'red'
                            }));
                            console.log('');
                        }
                    } else if (cmd === 'stub') {
                        // NEW: Use StubOrchestrator for full integration (AI → Git → Tasks → Display)
                        const args = trimmed.split(' ').slice(1);
                        const moduleName = args[0];
                        const language = args[1];
                        
                        // Parse options
                        const options = {
                            type: 'service',
                            style: null,
                            withTests: true,
                            withAnnotations: true,
                            requirements: []
                        };
                        
                        for (let i = 2; i < args.length; i++) {
                            const arg = args[i];
                            if (arg.startsWith('--style=')) {
                                options.style = arg.split('=')[1];
                            } else if (arg === '--no-tests') {
                                options.withTests = false;
                            } else if (arg === '--no-annotations') {
                                options.withAnnotations = false;
                            } else if (arg === 'service' || arg === 'api' || arg === 'library') {
                                options.type = arg;
                            } else {
                                options.requirements.push(arg);
                            }
                        }
                        
                        const requirements = options.requirements.length > 0 ? options.requirements.join(' ') : null;
                        
                        if (!moduleName || !language) {
                            console.log(chalk.red('Usage: /stub <module> <language> [type] [options] [requirements]\n'));
                            console.log(chalk.gray('Examples:'));
                            console.log(chalk.gray('  /stub user go'));
                            console.log(chalk.gray('  /stub auth rust service'));
                            console.log(chalk.gray('  /stub payment typescript api --style=airbnb'));
                            console.log(chalk.gray('  /stub logger python library --no-tests'));
                            console.log(chalk.gray('  /stub api go service --style=uber with JWT auth\n'));
                            console.log(chalk.gray('Types: service, api, library'));
                            console.log(chalk.gray('Languages: go, rust, typescript, javascript, python, java, csharp'));
                            console.log(chalk.gray('\nCoding Styles:'));
                            console.log(chalk.gray('  google  - Google Style Guide (Go, Python, Java, C++)'));
                            console.log(chalk.gray('  airbnb  - Airbnb JavaScript Style (JS, TS, React)'));
                            console.log(chalk.gray('  uber    - Uber Go Style Guide'));
                            console.log(chalk.gray('  microsoft - Microsoft Conventions (C#, TS)'));
                            console.log(chalk.gray('  rust    - Rust API Guidelines'));
                            console.log(chalk.gray('  pep8    - PEP 8 Python Style'));
                            console.log(chalk.gray('\nOptions:'));
                            console.log(chalk.gray('  --style=<name>     - Use specific coding style'));
                            console.log(chalk.gray('  --no-tests         - Skip test generation'));
                            console.log(chalk.gray('  --no-annotations   - Skip API annotations\n'));
                        } else {
                            // NEW: Use StubOrchestrator for full workflow
                            const orchestrator = new StubOrchestrator(agentManager, process.cwd());
                            
                            try {
                                const result = await orchestrator.generate({
                                    moduleName,
                                    language,
                                    type: options.type,
                                    requirements,
                                    style: options.style,
                                    withTests: options.withTests,
                                    withAnnotations: options.withAnnotations
                                });
                                
                                console.log(chalk.green('\n✅ Complete! Stubs generated, Git committed, tasks created.\n'));
                                console.log(chalk.cyan('\n📋 Next Steps:'));
                                console.log(chalk.gray(`  1. /verify ${moduleName}     - Validate structure`));
                                console.log(chalk.gray(`  2. /flow ${moduleName}       - Visualize architecture`));
                                console.log(chalk.gray(`  3. /implement <function>  - Fill implementation\n`));
                                
                            } catch (error) {
                                console.log(chalk.red(`\n❌ Error: ${error.message}\n`));
                            }
                        }
                    } else if (cmd === 'plan') {
                        // NEW: Interactive plan management
                        const subCmd = args[0];
                        const planEditor = new PlanEditor();
                        
                        if (!subCmd || subCmd === 'show') {
                            // Show plan
                            try {
                                await planEditor.show();
                            } catch (error) {
                                console.log(chalk.yellow('\nNo plan found. Create one with:'));
                                console.log(chalk.gray('  [[PLAN]] <your requirements>\n'));
                            }
                        } else if (subCmd === 'check') {
                            // Check off task
                            const taskId = parseInt(args[1]);
                            if (!taskId) {
                                console.log(chalk.red('Usage: /plan check <task_id>\n'));
                            } else {
                                try {
                                    await planEditor.check(taskId);
                                    console.log(chalk.green(`✅ Checked off task #${taskId}\n`));
                                } catch (error) {
                                    console.log(chalk.red(`Error: ${error.message}\n`));
                                }
                            }
                        } else if (subCmd === 'add') {
                            // Add task
                            const task = args.slice(1).join(' ');
                            if (!task) {
                                console.log(chalk.red('Usage: /plan add <task description>\n'));
                            } else {
                                try {
                                    await planEditor.add(task);
                                    console.log(chalk.green(`✅ Added task: ${task}\n`));
                                } catch (error) {
                                    console.log(chalk.red(`Error: ${error.message}\n`));
                                }
                            }
                        } else {
                            console.log(chalk.red('Usage: /plan [show|check <id>|add <task>]\n'));
                            console.log(chalk.gray('Examples:'));
                            console.log(chalk.gray('  /plan              - Show current plan'));
                            console.log(chalk.gray('  /plan show         - Show current plan'));
                            console.log(chalk.gray('  /plan check 3      - Check off task #3'));
                            console.log(chalk.gray('  /plan add "..."    - Add new task\n'));
                        }
                    } else if (cmd === 'verify') {
                        // Verify stubs: /verify [module|file]
                        const target = args.join(' ') || '.';
                        
                        console.log(chalk.cyan(`\n🔍 Verifying: ${target}\n`));
                        
                        const spinner = ora('Checking structure...').start();
                        
                        try {
                            const { StubGenerator } = require('./stubGenerator');
                            const stubGen = new StubGenerator(agentManager);
                            
                            // Check if target is a file or directory
                            const targetPath = path.resolve(target);
                            let stubs;
                            
                            if (fs.existsSync(targetPath)) {
                                if (fs.statSync(targetPath).isDirectory()) {
                                    stubs = stubGen.listStubs(targetPath);
                                } else {
                                    stubs = [{ file: targetPath, stubs: stubGen.detectStubs(targetPath) }];
                                }
                            } else {
                                // Try as module name
                                const moduleDir = path.join(process.cwd(), 'src', target);
                                if (fs.existsSync(moduleDir)) {
                                    stubs = stubGen.listStubs(moduleDir);
                                } else {
                                    throw new Error(`Target not found: ${target}`);
                                }
                            }
                            
                            spinner.stop();
                            
                            // Count stats
                            const totalFiles = stubs.length;
                            const totalStubs = stubs.reduce((sum, s) => sum + s.stubs.length, 0);
                            const implemented = stubs.reduce((sum, s) => sum + s.stubs.filter(st => st.implemented).length, 0);
                            const pending = totalStubs - implemented;
                            
                            console.log(boxen(
                                chalk.green(`✅ Verification: ${path.basename(target)}\n\n`) +
                                chalk.cyan(`Files: ${totalFiles}\n`) +
                                chalk.cyan(`Total Functions: ${totalStubs}\n`) +
                                chalk.yellow(`⚠️  Pending: ${pending}\n`) +
                                chalk.green(`✓ Implemented: ${implemented}\n\n`) +
                                chalk.gray(`Progress: ${totalStubs > 0 ? Math.round(implemented / totalStubs * 100) : 0}%`),
                                { padding: 1, margin: 0, borderStyle: 'round', borderColor: 'cyan' }
                            ));
                            
                            if (pending > 0) {
                                console.log(chalk.yellow('\n⚠️  Pending Stubs:\n'));
                                stubs.forEach(fileStub => {
                                    const pendingStubs = fileStub.stubs.filter(s => !s.implemented);
                                    if (pendingStubs.length > 0) {
                                        console.log(chalk.cyan(`  ${path.basename(fileStub.file)}:`));
                                        pendingStubs.slice(0, 5).forEach(stub => {
                                            console.log(chalk.gray(`    • ${stub.name} (line ${stub.line})`));
                                        });
                                        if (pendingStubs.length > 5) {
                                            console.log(chalk.gray(`    ... and ${pendingStubs.length - 5} more`));
                                        }
                                    }
                                });
                            }
                            
                            console.log(chalk.cyan('\n💡 Tip: Use /implement <function> to fill stubs\n'));
                            
                        } catch (error) {
                            spinner.fail(`Error: ${error.message}`);
                            console.log('');
                        }
                    } else if (cmd === 'implement') {
                        // Implement function: /implement <function> [--with-tests]
                        const functionName = args[0];
                        const withTests = args.includes('--with-tests');
                        
                        if (!functionName) {
                            console.log(chalk.red('Usage: /implement <function> [--with-tests]\n'));
                            console.log(chalk.gray('Examples:'));
                            console.log(chalk.gray('  /implement CreateUser'));
                            console.log(chalk.gray('  /implement GetUser --with-tests\n'));
                        } else {
                            console.log(chalk.cyan(`\n⚙️  Implementing: ${functionName}\n`));
                            
                            const spinner = ora('Finding function stub...').start();
                            
                            try {
                                const { StubGenerator } = require('./stubGenerator');
                                const stubGen = new StubGenerator(agentManager);
                                
                                // Find the function in project
                                const stubs = stubGen.listStubs(process.cwd());
                                let targetFile = null;
                                let targetStub = null;
                                
                                for (const fileStub of stubs) {
                                    const stub = fileStub.stubs.find(s => 
                                        s.name.toLowerCase() === functionName.toLowerCase() && !s.implemented
                                    );
                                    if (stub) {
                                        targetFile = fileStub.file;
                                        targetStub = stub;
                                        break;
                                    }
                                }
                                
                                if (!targetFile) {
                                    spinner.fail(`Function stub not found: ${functionName}`);
                                    console.log(chalk.gray('\nTip: Use /verify to see available stubs\n'));
                                    return;
                                }
                                
                                spinner.text = 'Reading context...';
                                
                                // Read the file
                                const fileContent = fs.readFileSync(targetFile, 'utf8');
                                const lines = fileContent.split('\n');
                                
                                // Extract function context (10 lines before and after)
                                const startLine = Math.max(0, targetStub.line - 10);
                                const endLine = Math.min(lines.length, targetStub.line + 10);
                                const context = lines.slice(startLine, endLine).join('\n');
                                
                                spinner.text = 'Generating implementation...';
                                
                                // Build prompt for AI
                                const prompt = `Implement the function ${functionName} in this file.

FILE: ${path.basename(targetFile)}

CONTEXT (around line ${targetStub.line}):
\`\`\`
${context}
\`\`\`

FULL FILE:
\`\`\`
${fileContent}
\`\`\`

REQUIREMENTS:
1. Implement ONLY the ${functionName} function
2. Keep all other stubs unchanged
3. Use proper error handling
4. Follow the language conventions
5. Make it production-ready
${withTests ? '6. Also generate a test file for this function' : ''}

OUTPUT: Provide the COMPLETE updated file content.${withTests ? ' If generating tests, use format:\n=== FILE: <test_filename> ===\n<test content>' : ''}`;

                                const response = await agentManager.sendMessage(prompt, {
                                    context: { cwd: process.cwd() }
                                });
                                
                                spinner.text = 'Updating files...';
                                
                                // Extract code from response
                                let newContent = response;
                                
                                // Check for multiple files (if tests included)
                                if (withTests && response.includes('=== FILE:')) {
                                    const fileRegex = /=== FILE: ([^\s]+) ===\s*\n([\s\S]*?)(?=\n=== FILE:|$)/g;
                                    let match;
                                    let mainFileUpdated = false;
                                    
                                    while ((match = fileRegex.exec(response)) !== null) {
                                        const filename = match[1];
                                        let content = match[2].trim().replace(/^```[\w]*\n|```$/g, '').trim();
                                        
                                        if (filename === path.basename(targetFile)) {
                                            fs.writeFileSync(targetFile, content);
                                            mainFileUpdated = true;
                                        } else {
                                            // Test file
                                            const testPath = path.join(path.dirname(targetFile), filename);
                                            fs.writeFileSync(testPath, content);
                                            spinner.succeed(`Implemented ${functionName} with tests!`);
                                            console.log(chalk.green(`\n✅ Updated: ${path.basename(targetFile)}`));
                                            console.log(chalk.green(`✅ Created: ${filename}\n`));
                                        }
                                    }
                                    
                                    if (!mainFileUpdated) {
                                        throw new Error('Main file not found in response');
                                    }
                                } else {
                                    // Single file update
                                    const codeBlockMatch = response.match(/```[\w]*\n([\s\S]*?)\n```/);
                                    if (codeBlockMatch) {
                                        newContent = codeBlockMatch[1];
                                    }
                                    
                                    fs.writeFileSync(targetFile, newContent);
                                    spinner.succeed(`Implemented ${functionName}!`);
                                    console.log(chalk.green(`\n✅ Updated: ${path.basename(targetFile)}\n`));
                                }
                                
                                console.log(chalk.cyan('📊 Next Steps:'));
                                console.log(chalk.gray(`  1. /verify - Check remaining stubs`));
                                console.log(chalk.gray(`  2. Test the implementation`));
                                console.log(chalk.gray(`  3. /implement <next_function>\n`));
                                
                            } catch (error) {
                                spinner.fail(`Error: ${error.message}`);
                                console.log('');
                            }
                        }
                    } else if (cmd === 'flow') {
                        // Visualize architecture: /flow [module]
                        const module = args.join(' ') || '.';
                        
                        console.log(chalk.cyan(`\n🌊 Architecture Flow: ${module}\n`));
                        
                        const spinner = ora('Analyzing structure...').start();
                        
                        try {
                            const { StubGenerator } = require('./stubGenerator');
                            const stubGen = new StubGenerator(agentManager);
                            
                            // Get stubs
                            const targetPath = module === '.' ? process.cwd() : path.join(process.cwd(), 'src', module);
                            const stubs = stubGen.listStubs(targetPath);
                            
                            if (stubs.length === 0) {
                                spinner.fail('No stubs found');
                                console.log(chalk.gray('\nTip: Use /stub to generate module structure\n'));
                                return;
                            }
                            
                            spinner.stop();
                            
                            // Build flow diagram
                            console.log(boxen(
                                chalk.bold(`📊 Flow Diagram: ${path.basename(module)}\n\n`) +
                                stubs.map(fileStub => {
                                    const basename = path.basename(fileStub.file, path.extname(fileStub.file));
                                    const implemented = fileStub.stubs.filter(s => s.implemented).length;
                                    const total = fileStub.stubs.length;
                                    const symbol = implemented === total ? chalk.green('✓') : 
                                                  implemented === 0 ? chalk.yellow('⚠️') : chalk.cyan('◐');
                                    
                                    return chalk.cyan(`${symbol} ${basename}\n`) +
                                           fileStub.stubs.map(s => {
                                               const status = s.implemented ? chalk.green('✓') : chalk.yellow('○');
                                               return `   ${status} ${s.name}`;
                                           }).join('\n');
                                }).join('\n\n') +
                                '\n\n' +
                                chalk.gray('Legend: ✓ Implemented | ◐ Partial | ⚠️  All stubs | ○ Pending'),
                                { padding: 1, margin: 0, borderStyle: 'round', borderColor: 'cyan' }
                            ));
                            
                            console.log('');
                            
                        } catch (error) {
                            spinner.fail(`Error: ${error.message}`);
                            console.log('');
                        }
                    } else if (cmd === 'plan') {
                        // Create execution plan: /plan <goal>
                        const goal = args.join(' ');
                        
                        if (!goal) {
                            console.log(chalk.red('Usage: /plan <goal>\n'));
                        } else {
                            console.log(chalk.cyan(`\n📋 Creating execution plan for: ${goal}\n`));
                            
                            const thinking = ora('Planning...').start();
                            
                            const messageContext = projectContext ? {
                                ...projectContext,
                                tasks: loadTasks()
                            } : { cwd: process.cwd() };
                            
                            const prompt = `Create a detailed execution plan for: "${goal}"

Context:
- Project: ${messageContext.cwd}
- Symbols: ${messageContext.symbols || 0} indexed
${messageContext.topSymbols ? '- Key files: ' + messageContext.topSymbols.slice(0, 5).join(', ') : ''}

Provide a structured plan in this format:

## Plan: [Name]

### Phase 1: [Phase Name]
- [ ] Task 1: [Type] [Target] - Description
  - Context: [which files/modules]
  - Dependencies: [other tasks]
  - Execution: [single/batch/parallel]

### Phase 2: [Phase Name]
...

Types: create_file, update_file, delete_file, create_function, update_function, test, refactor

Be specific, minimal, and test-oriented. Identify parallel work opportunities.`;
                            
                            const response = await agentManager.sendMessage(prompt, {
                                context: messageContext
                            });
                            
                            thinking.stop();
                            
                            // Parse and store plan
                            const { TaskPlanner } = require('../agenticide-core/taskPlanner');
                            const planner = new TaskPlanner(path.join(CONFIG_DIR, 'cli.db'));
                            
                            const planId = planner.createPlan(goal, response, goal);
                            
                            console.log(chalk.green(`\n✅ Plan created: #${planId}\n`));
                            console.log(boxen(response, {
                                padding: 1,
                                margin: 0,
                                borderStyle: 'round',
                                borderColor: 'yellow',
                                title: `📋 Plan #${planId}`,
                                titleAlignment: 'left'
                            }));
                            console.log('');
                            console.log(chalk.gray('Use /execute to start execution\n'));
                            
                            planner.close();
                        }
                    } else if (cmd === 'execute') {
                        // Execute plan: /execute [plan_id]
                        const planIdArg = args[0];
                        
                        if (!planIdArg) {
                            console.log(chalk.red('Usage: /execute <plan_id>\n'));
                        } else {
                            const { TaskPlanner } = require('../agenticide-core/taskPlanner');
                            const planner = new TaskPlanner(path.join(CONFIG_DIR, 'cli.db'));
                            
                            const plan = planner.getPlan(parseInt(planIdArg));
                            
                            if (!plan) {
                                console.log(chalk.red(`Plan #${planIdArg} not found\n`));
                            } else {
                                console.log(chalk.cyan(`\n🚀 Executing Plan #${planIdArg}: ${plan.name}\n`));
                                
                                // TODO: Implement execution engine
                                console.log(chalk.yellow('Execution engine coming soon!\n'));
                                console.log(chalk.gray(`Tasks: ${plan.tasks.length}`));
                                console.log(chalk.gray(`Status: ${plan.status}\n`));
                            }
                            
                            planner.close();
                        }
                    } else if (cmd === 'diff') {
                        // Show diff: /diff [task_id]
                        const taskIdArg = args[0];
                        
                        if (!taskIdArg) {
                            console.log(chalk.red('Usage: /diff <task_id>\n'));
                        } else {
                            const { TaskPlanner } = require('../agenticide-core/taskPlanner');
                            const { DiffVisualizer } = require('../agenticide-core/diffVisualizer');
                            const planner = new TaskPlanner(path.join(CONFIG_DIR, 'cli.db'));
                            
                            // TODO: Fetch and display diff
                            console.log(chalk.cyan(`\n📊 Diff for task #${taskIdArg}\n`));
                            console.log(chalk.yellow('Diff display coming soon!\n'));
                            
                            planner.close();
                        }
                    } else {
                        console.log(chalk.yellow(`Unknown command: ${cmd}\n`));
                    }
                    
                    continue;
                }
                
                // Handle Jupyter-style command execution
                if (trimmed.startsWith('!')) {
                    const cmdLine = trimmed.slice(1);
                    let executor = 'bash';
                    let command = cmdLine;
                    let background = false;
                    
                    // Check for specific executors
                    if (cmdLine.startsWith('~')) {
                        // Background bash
                        background = true;
                        command = cmdLine.slice(1).trim();
                        executor = 'bash';
                    } else if (cmdLine.startsWith('sh ') || cmdLine.startsWith('bash ')) {
                        // Explicit shell
                        const parts = cmdLine.split(' ');
                        executor = parts[0];
                        command = parts.slice(1).join(' ');
                    } else if (cmdLine.startsWith('python ')) {
                        // Python
                        executor = 'python';
                        command = cmdLine.slice(7);
                    } else if (cmdLine.startsWith('node ')) {
                        // Node.js
                        executor = 'node';
                        command = cmdLine.slice(5);
                    } else {
                        // Default: bash
                        executor = 'bash';
                        command = cmdLine;
                    }
                    
                    try {
                        const { execSync, spawn: spawnProcess } = require('child_process');
                        
                        if (background) {
                            // Background execution
                            console.log(chalk.cyan(`🚀 Running in background: ${command}\n`));
                            const child = spawnProcess(executor, ['-c', command], {
                                detached: true,
                                stdio: 'ignore',
                                shell: true,
                                cwd: process.cwd()
                            });
                            child.unref();
                            console.log(chalk.gray(`   PID: ${child.pid}\n`));
                        } else {
                            // Foreground execution
                            console.log(chalk.cyan(`⚡ Executing: ${command}\n`));
                            let output;
                            
                            if (executor === 'python') {
                                // Escape quotes for Python
                                const escapedCommand = command.replace(/"/g, '\\"');
                                output = execSync(`python -c "${escapedCommand}"`, {
                                    encoding: 'utf8',
                                    cwd: process.cwd(),
                                    maxBuffer: 10 * 1024 * 1024,
                                    shell: '/bin/bash'
                                });
                            } else if (executor === 'node') {
                                // Escape quotes for Node
                                const escapedCommand = command.replace(/"/g, '\\"');
                                output = execSync(`node -e "${escapedCommand}"`, {
                                    encoding: 'utf8',
                                    cwd: process.cwd(),
                                    maxBuffer: 10 * 1024 * 1024,
                                    shell: '/bin/bash'
                                });
                            } else {
                                output = execSync(command, {
                                    encoding: 'utf8',
                                    shell: '/bin/bash',
                                    cwd: process.cwd(),
                                    maxBuffer: 10 * 1024 * 1024
                                });
                            }
                            
                            if (output) {
                                console.log(boxen(output.trim(), {
                                    padding: 1,
                                    margin: 0,
                                    borderStyle: 'round',
                                    borderColor: 'cyan',
                                    title: `📟 ${executor}`,
                                    titleAlignment: 'left'
                                }));
                                console.log('');
                            }
                        }
                    } catch (error) {
                        console.log(chalk.red(`\n✖ Error: ${error.message}\n`));
                        if (error.stderr) {
                            console.log(chalk.gray(error.stderr.trim()));
                            console.log('');
                        }
                    }
                    
                    continue;
                }
                
                // Send message to agent
                if (trimmed) {
                    const thinking = ora('Thinking...').start();
                    
                    try {
                        // Build context for message
                        const messageContext = projectContext ? {
                            ...projectContext,
                            tasks: loadTasks()
                        } : { cwd: process.cwd() };
                        
                        const response = await agentManager.sendMessage(trimmed, {
                            context: messageContext
                        });
                        
                        thinking.stop();
                        console.log(chalk.green(`\n🤖 ${agentManager.activeAgent}:\n`));
                        console.log(boxen(response, {
                            padding: 1,
                            margin: 0,
                            borderStyle: 'round',
                            borderColor: 'green'
                        }));
                        console.log('');
                    } catch (error) {
                        thinking.fail(`Error: ${error.message}`);
                        console.log('');
                    }
                }
            }
            
            console.log(chalk.yellow('\nGoodbye! 👋\n'));
            agentManager.dispose();
            process.exit(0);
            
        } catch (error) {
            spinner.fail('Failed to initialize');
            console.error(chalk.red(`\n${error.message}\n`));
        }
    });

// Task commands
program
    .command('task:add <description>')
    .description('Add a new task')
    .action((description) => {
        const tasks = loadTasks();
        tasks.push({
            id: Date.now(),
            description,
            completed: false,
            createdAt: new Date().toISOString()
        });
        saveTasks(tasks);
        console.log(chalk.green('✅ Task added: ' + description));
    });

program
    .command('task:list')
    .description('List all tasks')
    .action(() => {
        const tasks = loadTasks();
        
        if (tasks.length === 0) {
            console.log(chalk.yellow('No tasks yet. Add one with: agenticide task:add "description"'));
            return;
        }
        
        console.log(chalk.cyan('\n📋 Tasks:\n'));
        tasks.forEach((task, index) => {
            const status = task.completed ? chalk.green('✓') : chalk.gray('○');
            const text = task.completed ? chalk.gray(task.description) : task.description;
            console.log(`  ${status} ${index + 1}. ${text}`);
        });
        console.log('');
    });

program
    .command('task:complete <id>')
    .description('Mark task as complete')
    .action((id) => {
        const tasks = loadTasks();
        const taskId = parseInt(id);
        const task = tasks.find(t => t.id === taskId);
        
        if (!task) {
            console.log(chalk.red('Task not found'));
            return;
        }
        
        task.completed = true;
        saveTasks(tasks);
        console.log(chalk.green('✅ Task completed: ' + task.description));
    });

// Code commands
program
    .command('explain <file>')
    .description('Explain code in file')
    .action(async (file) => {
        if (!fs.existsSync(file)) {
            console.log(chalk.red('File not found: ' + file));
            return;
        }
        
        const code = fs.readFileSync(file, 'utf8');
        const spinner = ora('Analyzing code...').start();
        
        acpClient = new ACPClient();
        await acpClient.initializeClaudeAgent();
        
        const response = await acpClient.sendPrompt('claude', 
            `Explain this code:\n\n${code}`, 
            { file, language: path.extname(file) }
        );
        
        spinner.stop();
        console.log(chalk.green('\n📖 Explanation:\n'));
        console.log(boxen(response, {
            padding: 1,
            margin: 1,
            borderStyle: 'round'
        }));
        
        acpClient.dispose();
    });

// Config commands
program
    .command('config:set <key> <value>')
    .description('Set configuration value')
    .action((key, value) => {
        const config = loadConfig();
        config[key] = value;
        saveConfig(config);
        console.log(chalk.green(`✅ Set ${key} = ${value}`));
    });

program
    .command('config:show')
    .description('Show configuration')
    .action(() => {
        const config = loadConfig();
        console.log(chalk.cyan('\n⚙️  Configuration:\n'));
        console.log(boxen(JSON.stringify(config, null, 2), {
            padding: 1,
            borderStyle: 'round'
        }));
    });

// Status command
program
    .command('status')
    .description('Show Agenticide status')
    .action(async () => {
        console.log(chalk.cyan(banner));
        
        const config = loadConfig();
        const tasks = loadTasks();
        
        const spinner = ora('Checking agents...').start();
        
        // Check Claude Code
        const acpClient = new ACPClient();
        const claudeReady = await acpClient.initializeClaudeAgent();
        
        spinner.stop();
        
        console.log(chalk.cyan('\n📊 Status:\n'));
        console.log(`  ${claudeReady ? chalk.green('✅') : chalk.red('❌')} Claude Code (ACP)`);
        console.log(`  ${chalk.cyan('ℹ️')}  Tasks: ${tasks.length} (${tasks.filter(t => !t.completed).length} pending)`);
        console.log(`  ${chalk.cyan('ℹ️')}  Provider: ${config.defaultProvider}`);
        console.log(`  ${chalk.cyan('ℹ️')}  Directory: ${process.cwd()}`);
        console.log('');
        
        acpClient.dispose();
    });

// ========== INTELLIGENT ANALYSIS ==========

program
    .command("analyze")
    .description("Analyze current project with LSP and build symbol index")
    .option("--verbose", "Show detailed output")
    .action(async (options) => {
        try {
            const Database = require("better-sqlite3");
            const IntelligentAnalyzer = require("../agenticide-core/intelligentAnalyzer");
            const dbPath = path.join(CONFIG_DIR, "cli.db");
            const db = new Database(dbPath);
            const analyzer = new IntelligentAnalyzer(db);
            
            console.log(chalk.cyan("\n🔍 Analyzing project...\n"));
            const results = await analyzer.analyzeProject(1, process.cwd());
            
            if (results) {
                console.log(chalk.green(`\n✅ Analysis complete!`));
                console.log(chalk.gray(`   Files: ${results.newFiles + results.changedFiles} analyzed`));
                console.log(chalk.gray(`   Symbols: ${results.totalSymbols || 0} found\n`));
            }
            
            analyzer.close();
            db.close();
        } catch (e) { 
            console.error(chalk.red(`\n❌ Error: ${e.message}\n`));
            if (options.verbose) console.error(e.stack);
        }
    });

program
    .command("index")
    .description("Build semantic search index from analyzed code")
    .action(async () => {
        try {
            const Database = require("better-sqlite3");
            const SemanticSearch = require("../agenticide-core/semanticSearch");
            const dbPath = path.join(CONFIG_DIR, "cli.db");
            const db = new Database(dbPath);
            const search = new SemanticSearch(db);
            
            console.log(chalk.cyan("\n📚 Building search index...\n"));
            await search.indexProject(1);
            console.log(chalk.green("\n✅ Index built successfully!\n"));
            
            db.close();
        } catch (e) { 
            console.error(chalk.red(`\n❌ Error: ${e.message}\n`));
        }
    });

program
    .command("search <query>")
    .description("Search code semantically")
    .option("-n, --limit <number>", "Number of results", "5")
    .action(async (query, options) => {
        try {
            const Database = require("better-sqlite3");
            const SemanticSearch = require("../agenticide-core/semanticSearch");
            const dbPath = path.join(CONFIG_DIR, "cli.db");
            const db = new Database(dbPath);
            const search = new SemanticSearch(db);
            
            console.log(chalk.cyan(`\n🔎 Searching for: "${query}"\n`));
            const results = search.search(query, parseInt(options.limit));
            
            if (results.length === 0) {
                console.log(chalk.yellow("No results found. Try running 'agenticide index' first.\n"));
            } else {
                results.forEach((r, i) => {
                    const score = (r.similarity * 100).toFixed(0);
                    console.log(chalk.bold(`${i + 1}. ${r.symbol_name}`) + chalk.gray(` [${score}%]`));
                    console.log(chalk.dim(`   ${r.file_path}:${r.symbol_kind}`));
                    if (r.description) {
                        console.log(chalk.gray(`   ${r.description.substring(0, 80)}...`));
                    }
                    console.log();
                });
            }
            
            db.close();
        } catch (e) { 
            console.error(chalk.red(`\n❌ Error: ${e.message}\n`));
        }
    });

program
    .command("search-stats")
    .description("Show semantic search statistics")
    .action(async () => {
        try {
            const Database = require("better-sqlite3");
            const dbPath = path.join(CONFIG_DIR, "cli.db");
            const db = new Database(dbPath);
            
            const embeddings = db.prepare("SELECT COUNT(*) as count FROM code_embeddings").get();
            const symbols = db.prepare("SELECT COUNT(*) as count FROM code_symbols").get();
            const searches = db.prepare("SELECT COUNT(*) as count FROM search_history").get();
            
            console.log(chalk.cyan("\n📊 Search Statistics:\n"));
            console.log(chalk.gray(`   Indexed symbols: ${embeddings?.count || 0}`));
            console.log(chalk.gray(`   Total symbols: ${symbols?.count || 0}`));
            console.log(chalk.gray(`   Search history: ${searches?.count || 0}\n`));
            
            db.close();
        } catch (e) { 
            console.error(chalk.red(`\n❌ Error: ${e.message}\n`));
        }
    });

// Version
program
    .version(pkg.version, '-v, --version', 'Output the version number')
    .description(chalk.cyan('Agenticide CLI - AI Coding Assistant with ACP + MCP'));

// Help
program.on('--help', () => {
    console.log('');
    console.log(chalk.cyan('Examples:'));
    console.log('  $ agenticide init');
    console.log('  $ agenticide chat');
    console.log('  $ agenticide task:add "Implement login feature"');
    console.log('  $ agenticide explain src/app.js');
    console.log('  $ agenticide status');
    console.log('');
});

// Parse arguments
program.parse(process.argv);

// Show help if no command
if (!process.argv.slice(2).length) {
    console.log(chalk.cyan(banner));
    program.outputHelp();
}

// Cleanup on exit
process.on('exit', () => {
    if (acpClient) {
        acpClient.dispose();
    }
});

process.on('SIGINT', () => {
    if (acpClient) {
        acpClient.dispose();
    }
    process.exit(0);
});

// Agent management commands
program
    .command('agent')
    .description('Manage AI agents')
    .option('-l, --list', 'List available agents')
    .option('-i, --init <provider>', 'Initialize agent (claude|copilot|openai|local)')
    .option('-s, --status', 'Show agent status')
    .option('-m, --models', 'List available models')
    .action(async (options) => {
        const { AIAgentManager } = require('./aiAgents');
        const agentManager = new AIAgentManager();
        
        if (options.models || options.list) {
            const models = agentManager.listModels();
            console.log(chalk.cyan('\n🤖 Available AI Models:\n'));
            
            let currentCategory = '';
            models.forEach(m => {
                if (m.category !== currentCategory) {
                    currentCategory = m.category;
                    console.log(chalk.bold(`\n${currentCategory.toUpperCase()}:`));
                }
                const tier = m.tier === 'premium' ? chalk.yellow('⭐ Premium') : 
                            m.tier === 'local' ? chalk.green('💻 Local') : 
                            chalk.blue('✓ Standard');
                console.log(`  ${m.id.padEnd(20)} - ${m.name.padEnd(25)} [${tier}]`);
            });
            
            console.log(chalk.cyan('\n📚 Usage Examples:\n'));
            console.log('  agenticide chat --provider copilot');
            console.log('  agenticide chat --provider claude');
            console.log('  agenticide chat --provider openai --model gpt-4');
            console.log('  agenticide chat --provider local --model codellama\n');
            return;
        }
        
        if (options.init) {
            const spinner = ora(`Initializing ${options.init}...`).start();
            let success = false;
            
            try {
                switch (options.init.toLowerCase()) {
                    case 'copilot':
                        success = await agentManager.initCopilotAgent();
                        break;
                    case 'claude':
                        success = await agentManager.initClaudeAgent();
                        break;
                    case 'openai':
                        success = await agentManager.initOpenAIAgent();
                        break;
                    case 'local':
                        success = await agentManager.initLocalAgent();
                        break;
                    default:
                        throw new Error(`Unknown provider: ${options.init}`);
                }
                
                if (success) {
                    spinner.succeed(`${options.init} initialized successfully`);
                } else {
                    spinner.fail(`Failed to initialize ${options.init}`);
                }
            } catch (error) {
                spinner.fail(error.message);
            }
            return;
        }
        
        // Default: show help
        console.log(chalk.cyan('\n🤖 Agent Manager\n'));
        console.log('Commands:');
        console.log('  --list, -l      List all available agents and models');
        console.log('  --models, -m    Show detailed model information');
        console.log('  --init <name>   Initialize specific agent');
        console.log('  --status, -s    Show agent status\n');
        console.log('Quick start:');
        console.log('  agenticide agent --list');
        console.log('  agenticide chat --provider copilot\n');
    });

// Model selection command
program
    .command('model')
    .description('Manage AI models')
    .option('-l, --list', 'List all models')
    .option('-s, --set <model>', 'Set default model')
    .option('-g, --get', 'Get current default model')
    .action((options) => {
        const config = loadConfig();
        
        if (options.list) {
            const { AIAgentManager } = require('./aiAgents');
            const agentManager = new AIAgentManager();
            const models = agentManager.listModels();
            
            console.log(chalk.cyan('\n🤖 Available Models:\n'));
            models.forEach(m => {
                const current = config.defaultModel === m.id ? chalk.green(' ← current') : '';
                console.log(`  ${m.id} (${m.provider})${current}`);
            });
            console.log('');
            return;
        }
        
        if (options.set) {
            config.defaultModel = options.set;
            saveConfig(config);
            console.log(chalk.green(`✓ Default model set to: ${options.set}\n`));
            return;
        }
        
        if (options.get) {
            const model = config.defaultModel || 'copilot-gpt4';
            console.log(chalk.cyan(`Current model: ${model}\n`));
            return;
        }
        
        // Show help
        console.log(chalk.cyan('\n🎯 Model Manager\n'));
        console.log('Options:');
        console.log('  --list, -l           List all available models');
        console.log('  --set <model>, -s    Set default model');
        console.log('  --get, -g            Show current default\n');
    });

// Workflow commands
program
    .command('workflow <action> [name]')
    .description('Manage development workflows')
    .option('-t, --type <type>', 'Workflow type (full, prototype, custom)')
    .option('-l, --language <lang>', 'Programming language')
    .option('-f, --file <file>', 'Workflow file')
    .option('-o, --output <format>', 'Export format (makefile, taskfile, json)')
    .action(async (action, name, options) => {
        const { Workflow, WorkflowExecutor, StubWorkflows } = require('./workflow');
        const workflowsDir = path.join(CONFIG_DIR, 'workflows');
        
        if (!fs.existsSync(workflowsDir)) {
            fs.mkdirSync(workflowsDir, { recursive: true });
        }
        
        if (action === 'create') {
            if (!name || !options.language) {
                console.log(chalk.red('Usage: agenticide workflow create <name> --language <lang> [--type <type>]\n'));
                console.log(chalk.gray('Example: agenticide workflow create user --language go --type full'));
                return;
            }
            
            const type = options.type || 'full';
            let workflow;
            
            if (type === 'full') {
                workflow = StubWorkflows.createFullWorkflow(name, options.language);
            } else if (type === 'prototype') {
                workflow = StubWorkflows.createPrototypeWorkflow(name, options.language);
            } else {
                workflow = new Workflow(name, `Custom workflow for ${name}`);
            }
            
            const filename = path.join(workflowsDir, `${workflow.name}.json`);
            fs.writeFileSync(filename, JSON.stringify(workflow.toJSON(), null, 2));
            
            console.log(chalk.green(`\n✅ Created workflow: ${workflow.name}`));
            console.log(chalk.cyan(`   Steps: ${workflow.steps.length}`));
            console.log(chalk.cyan(`   File: ${filename}\n`));
            
        } else if (action === 'run') {
            if (!name) {
                console.log(chalk.red('Usage: agenticide workflow run <name>\n'));
                return;
            }
            
            const filename = path.join(workflowsDir, `${name}.json`);
            if (!fs.existsSync(filename)) {
                console.log(chalk.red(`Workflow not found: ${name}\n`));
                return;
            }
            
            const json = JSON.parse(fs.readFileSync(filename, 'utf8'));
            const workflow = Workflow.fromJSON(json);
            const executor = new WorkflowExecutor(workflow, {
                verbose: true,
                stopOnError: true
            });
            
            const result = await executor.execute((progress) => {
                // Progress updates are already shown by executor
            });
            
            if (result.status === 'completed') {
                console.log(chalk.green(`\n✅ Workflow completed successfully!`));
            } else {
                console.log(chalk.red(`\n❌ Workflow ${result.status}`));
            }
            console.log(chalk.cyan(`   Success: ${result.summary.success}/${result.summary.total}`));
            console.log(chalk.cyan(`   Duration: ${(result.duration / 1000).toFixed(2)}s\n`));
            
        } else if (action === 'export') {
            if (!name || !options.output) {
                console.log(chalk.red('Usage: agenticide workflow export <name> --output <format>\n'));
                console.log(chalk.gray('Formats: makefile, taskfile, json\n'));
                return;
            }
            
            const filename = path.join(workflowsDir, `${name}.json`);
            if (!fs.existsSync(filename)) {
                console.log(chalk.red(`Workflow not found: ${name}\n`));
                return;
            }
            
            const json = JSON.parse(fs.readFileSync(filename, 'utf8'));
            const workflow = Workflow.fromJSON(json);
            
            let output = '';
            let outputFile = '';
            
            if (options.output === 'makefile') {
                output = workflow.toMakefile();
                outputFile = 'Makefile';
            } else if (options.output === 'taskfile') {
                output = workflow.toTaskfile();
                outputFile = 'Taskfile.yml';
            } else if (options.output === 'json') {
                output = JSON.stringify(workflow.toJSON(), null, 2);
                outputFile = `${name}.json`;
            } else {
                console.log(chalk.red(`Unknown format: ${options.output}\n`));
                return;
            }
            
            fs.writeFileSync(outputFile, output);
            console.log(chalk.green(`\n✅ Exported to ${outputFile}\n`));
            
        } else if (action === 'list') {
            const files = fs.readdirSync(workflowsDir).filter(f => f.endsWith('.json'));
            
            if (files.length === 0) {
                console.log(chalk.yellow('\nNo workflows found. Create one with:\n'));
                console.log(chalk.gray('  agenticide workflow create <name> --language <lang>\n'));
                return;
            }
            
            console.log(chalk.cyan('\n📋 Available Workflows:\n'));
            files.forEach(file => {
                const json = JSON.parse(fs.readFileSync(path.join(workflowsDir, file), 'utf8'));
                console.log(`  ${chalk.green('•')} ${json.name}`);
                console.log(chalk.gray(`    ${json.description || 'No description'}`));
                console.log(chalk.gray(`    Steps: ${json.steps.length}\n`));
            });
            
        } else if (action === 'show') {
            if (!name) {
                console.log(chalk.red('Usage: agenticide workflow show <name>\n'));
                return;
            }
            
            const filename = path.join(workflowsDir, `${name}.json`);
            if (!fs.existsSync(filename)) {
                console.log(chalk.red(`Workflow not found: ${name}\n`));
                return;
            }
            
            const json = JSON.parse(fs.readFileSync(filename, 'utf8'));
            const workflow = Workflow.fromJSON(json);
            
            console.log(chalk.cyan(`\n📋 Workflow: ${workflow.name}`));
            console.log(chalk.gray(workflow.description + '\n'));
            
            workflow.steps.forEach((step, i) => {
                console.log(`  ${i + 1}. ${chalk.green(step.name)}`);
                console.log(chalk.gray(`     Type: ${step.type}`));
                console.log(chalk.gray(`     Command: ${step.command}\n`));
            });
            
        } else {
            console.log(chalk.red(`Unknown action: ${action}\n`));
            console.log(chalk.gray('Actions: create, run, export, list, show\n'));
        }
    });

// Tasks command
program
    .command('tasks [module]')
    .description('View and manage tasks')
    .option('-s, --status <status>', 'Filter by status (pending, in_progress, completed)')
    .action((module, options) => {
        const { TaskTracker } = require('./taskTracker');
        const tracker = new TaskTracker(process.cwd());
        
        if (!fs.existsSync(TASKS_FILE)) {
            console.log(chalk.yellow('\nNo tasks found. Generate stubs first:\n'));
            console.log(chalk.gray('  /stub <module> <language>\n'));
            return;
        }
        
        const summary = tracker.getProjectSummary();
        
        console.log(chalk.cyan('\n📋 Task Summary\n'));
        console.log(boxen(
            `${chalk.cyan('Total Modules:')} ${summary.totalModules}\n` +
            `${chalk.cyan('Total Tasks:')} ${summary.totalTasks}\n` +
            `${chalk.green('Completed:')} ${summary.completed}\n` +
            `${chalk.yellow('In Progress:')} ${summary.inProgress}\n` +
            `${chalk.gray('Pending:')} ${summary.pending}\n` +
            `${chalk.cyan('Progress:')} ${summary.progress.toFixed(1)}%`,
            { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
        ));
        
        if (module) {
            const tasks = tracker.getModuleTasks(module);
            if (!tasks || tasks.length === 0) {
                console.log(chalk.yellow(`\nNo tasks found for module: ${module}\n`));
                return;
            }
            
            const { CodeDisplay } = require('./codeDisplay');
            CodeDisplay.displayTaskList(tasks, `Tasks for ${module}`);
        } else {
            console.log(chalk.cyan('\n📝 Next Tasks:\n'));
            const nextTasks = [];
            summary.modules.forEach(mod => {
                const modTasks = tracker.getModuleTasks(mod.name);
                const pending = modTasks.filter(t => t.status === 'pending').slice(0, 2);
                nextTasks.push(...pending.map(t => ({ ...t, module: mod.name })));
            });
            
            nextTasks.slice(0, 5).forEach((task, i) => {
                console.log(`  ${i + 1}. ${chalk.cyan(task.module)} → ${task.function}`);
                console.log(chalk.gray(`     ${task.file}:${task.line}`));
                if (i < 4) console.log('');
            });
            
            if (nextTasks.length > 5) {
                console.log(chalk.gray(`\n  ... and ${nextTasks.length - 5} more\n`));
            }
        }
        
        console.log(chalk.gray('\nUse: /implement <function> to start working\n'));
    });

