#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const boxen = require('boxen');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const program = new Command();

// Package info
const pkg = require('./package.json');

// Configuration
const CONFIG_DIR = path.join(process.env.HOME, '.agenticide');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TASKS_FILE = path.join(process.cwd(), '.agenticide-tasks.json');

// ASCII Art Banner
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
    .action(async (options) => {
        const { AIAgentManager } = require('./aiAgents');
        const Database = require('better-sqlite3');
        
        const agentManager = new AIAgentManager();
        
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
                console.log(chalk.yellow('\nTry:'));
                console.log('  • Install GitHub CLI: brew install gh');
                console.log('  • Install Copilot: gh extension install github/gh-copilot');
                console.log('  • Install Claude: https://claude.ai/download');
                console.log('  • Set OPENAI_API_KEY for OpenAI');
                console.log('  • Install Ollama: brew install ollama (for local models)');
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
            
            // Interactive chat
            console.log(chalk.green('\n💬 Chat started. Commands:'));
            console.log(chalk.gray('  /agent <name>     - Switch agent'));
            console.log(chalk.gray('  /model <model>    - Switch model'));
            console.log(chalk.gray('  /status           - Show agent status'));
            console.log(chalk.gray('  /context          - Show context'));
            console.log(chalk.gray('  /tasks            - Show tasks'));
            console.log(chalk.gray('  /search <query>   - Search code'));
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
                    } else if (cmd === 'tasks') {
                        const tasks = loadTasks();
                        console.log(chalk.cyan('\n📋 Tasks:\n'));
                        if (tasks.length === 0) {
                            console.log(chalk.gray('  No tasks\n'));
                        } else {
                            tasks.forEach(t => {
                                const status = t.completed ? chalk.green('✓') : chalk.yellow('○');
                                console.log(`  ${status} ${t.description}`);
                            });
                            console.log('');
                        }
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
                    } else {
                        console.log(chalk.yellow(`Unknown command: ${cmd}\n`));
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

