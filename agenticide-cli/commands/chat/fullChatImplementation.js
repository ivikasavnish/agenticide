// Full chat implementation extracted from index.js
// This contains all the interactive chat logic

module.exports = async function(options, dependencies) {
    const { CONFIG_DIR, banner, loadConfig, saveConfig, loadTasks, saveTasks, loadProjectContext } = dependencies;
    const chalk = require('chalk');
    const path = require('path');
    const fs = require('fs');
    
    // Original chat action code starts here
        const { AIAgentManager } = require('./aiAgents');
        const Database = require('better-sqlite3');
        const SessionManager = require('./core/sessionManager');
        const AutoCompaction = require('./core/autoCompaction');
        const { ExtensionManager } = require('./core/extensionManager');
        
        const agentManager = new AIAgentManager();
        const sessionManager = new SessionManager();
        const extensionManager = new ExtensionManager();
        
        // Load extensions
        await extensionManager.loadExtensions();
        
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
            console.log(chalk.gray('  /switch <cmd>     - Switch to other commands (analyze, search, task)'));
            console.log(chalk.green('\n  💾 Session Management:'));
            console.log(chalk.green('  /sessions         - List all sessions'));
            console.log(chalk.green('  /session save [name] - Save current session'));
            console.log(chalk.green('  /session load <name> - Load a session'));
            console.log(chalk.green('  /compact          - Run auto-compaction'));
            console.log(chalk.green('  /extensions       - List available extensions'));
            console.log(chalk.green('  /extension enable <name> - Enable extension'));
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
            console.log(chalk.blue('\n  ⚡ Shell & Process Management:'));
            console.log(chalk.blue('  !<command>        - Execute shell command'));
            console.log(chalk.blue('  !python <code>    - Execute Python'));
            console.log(chalk.blue('  !node <code>      - Execute Node.js'));
            console.log(chalk.blue('  !~<command>       - Background execution'));
            console.log(chalk.blue('  /process start <cmd> - Start background process'));
            console.log(chalk.blue('  /process list     - List all processes'));
            console.log(chalk.blue('  /process logs <id> - View process output'));
            console.log(chalk.blue('  /process stop <id> - Stop a process'));
            console.log(chalk.gray('  exit              - Quit\n'));
            
            // Show enabled extensions
            const enabledExts = extensionManager.listExtensions().filter(e => e.enabled);
            if (enabledExts.length > 0) {
                console.log(chalk.magenta('\n  🧩 Enabled Extensions:'));
                enabledExts.forEach(ext => {
                    console.log(chalk.magenta(`  /${ext.commands[0] || ext.name}              - ${ext.description}`));
                });
                console.log();
            }
            
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
                    } else if (cmd === 'switch' || cmd === 'mode') {
                        // Switch to different agenticide commands
                        const targetCmd = args[0];
                        
                        if (!targetCmd) {
                            console.log(chalk.cyan('\n🔄 Switch Commands:\n'));
                            console.log(chalk.gray('  /switch analyze  - Analyze project with LSP'));
                            console.log(chalk.gray('  /switch search   - Semantic code search'));
                            console.log(chalk.gray('  /switch status   - Show agenticide status'));
                            console.log(chalk.gray('  /switch task     - Task management'));
                            console.log(chalk.gray('\nOr exit chat and run: agenticide <command>\n'));
                        } else if (targetCmd === 'analyze') {
                            console.log(chalk.cyan('\n🔍 Analyzing project...\n'));
                            console.log(chalk.gray('Tip: Run "agenticide analyze" for full LSP analysis'));
                            console.log(chalk.gray('For now, showing project context:\n'));
                            
                            if (projectContext) {
                                console.log(`  Directory: ${projectContext.cwd}`);
                                console.log(`  Symbols: ${projectContext.symbols?.length || 0} indexed`);
                                console.log(`  Language: ${projectContext.language || 'unknown'}`);
                            } else {
                                console.log(chalk.yellow('  No context loaded. Run: agenticide analyze'));
                            }
                            console.log('');
                        } else if (targetCmd === 'search') {
                            console.log(chalk.cyan('\n🔍 Semantic Search:\n'));
                            console.log(chalk.gray('Usage: /search <query>'));
                            console.log(chalk.gray('Example: /search authentication function\n'));
                        } else if (targetCmd === 'status') {
                            // Already handled above
                            agentManager.displayAgentStatus();
                        } else if (targetCmd === 'task') {
                            const tasks = loadTasks();
                            console.log(chalk.cyan('\n📋 Tasks:\n'));
                            console.log(`  Total: ${tasks.length}`);
                            console.log(`  Pending: ${tasks.filter(t => t.status === 'pending').length}`);
                            console.log(`  Complete: ${tasks.filter(t => t.status === 'completed').length}`);
                            console.log(chalk.gray('\nUse /tasks for more details\n'));
                        } else {
                            console.log(chalk.yellow(`\n⚠️  Unknown command: ${targetCmd}\n`));
                            console.log(chalk.gray('Available: analyze, search, status, task\n'));
                        }
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
                    } else if (cmd === 'extensions') {
                        // List extensions
                        extensionManager.displayExtensions();
                    } else if (cmd === 'extension' || cmd === 'ext') {
                        // Extension management
                        const subCmd = args[0];
                        const extName = args[1];
                        
                        if (subCmd === 'enable') {
                            if (!extName) {
                                console.log(chalk.red('\n✗ Please specify an extension name\n'));
                            } else {
                                const result = await extensionManager.enableExtension(extName);
                                if (result.success) {
                                    console.log(chalk.green(`\n✓ Extension '${extName}' enabled\n`));
                                } else {
                                    console.log(chalk.red(`\n✗ ${result.error}\n`));
                                }
                            }
                        } else if (subCmd === 'disable') {
                            if (!extName) {
                                console.log(chalk.red('\n✗ Please specify an extension name\n'));
                            } else {
                                const result = await extensionManager.disableExtension(extName);
                                if (result.success) {
                                    console.log(chalk.yellow(`\n○ Extension '${extName}' disabled\n`));
                                } else {
                                    console.log(chalk.red(`\n✗ ${result.error}\n`));
                                }
                            }
                        } else if (subCmd === 'info') {
                            if (!extName) {
                                console.log(chalk.red('\n✗ Please specify an extension name\n'));
                            } else {
                                const ext = extensionManager.getExtension(extName);
                                if (ext) {
                                    const info = ext.getInfo();
                                    console.log(chalk.cyan(`\n🧩 ${info.name} v${info.version}\n`));
                                    console.log(`  ${chalk.gray('Description:')} ${info.description}`);
                                    console.log(`  ${chalk.gray('Author:')} ${info.author}`);
                                    console.log(`  ${chalk.gray('Status:')} ${info.enabled ? chalk.green('Enabled') : chalk.gray('Disabled')}`);
                                    console.log(`  ${chalk.gray('Commands:')} ${info.commands.join(', ')}`);
                                    console.log();
                                } else {
                                    console.log(chalk.red(`\n✗ Extension '${extName}' not found\n`));
                                }
                            }
                        } else {
                            console.log(chalk.cyan('\n🧩 Extension Commands:\n'));
                            console.log(chalk.gray('  /extensions              - List all extensions'));
                            console.log(chalk.gray('  /extension enable <name> - Enable an extension'));
                            console.log(chalk.gray('  /extension disable <name> - Disable an extension'));
                            console.log(chalk.gray('  /extension info <name>   - Show extension details'));
                            console.log('');
                        }
                    } else if (cmd === 'browser' || cmd === 'docker' || cmd === 'debug' || cmd === 'cli' || cmd === 'mcp' || cmd === 'qa' || cmd === 'process') {
                        // Handle extension commands
                        const ext = extensionManager.getExtension(cmd);
                        
                        if (!ext) {
                            console.log(chalk.red(`\n✗ Extension '${cmd}' not found\n`));
                        } else if (!ext.enabled) {
                            console.log(chalk.yellow(`\n⚠️  Extension '${cmd}' is disabled. Enable with: /extension enable ${cmd}\n`));
                        } else {
                            try {
                                const result = await ext.execute(args[0] || 'help', args.slice(1));
                                
                                if (result.success) {
                                    if (result.message) {
                                        console.log(chalk.green(`\n✓ ${result.message}`));
                                    }
                                    if (result.output) {
                                        console.log(result.output);
                                    }
                                    if (result.processes) {
                                        // Special handling for process list
                                        console.log(chalk.cyan('\n📊 Running Processes:\n'));
                                        console.log(chalk.gray('  ID  PID     STATUS    UPTIME  COMMAND'));
                                        console.log(chalk.gray('  ' + '─'.repeat(60)));
                                        for (const proc of result.processes) {
                                            const statusColor = proc.status === 'running' ? 'green' : 'gray';
                                            console.log(`  ${String(proc.id).padEnd(4)}${String(proc.pid).padEnd(8)}${chalk[statusColor](proc.status.padEnd(10))}${proc.uptime.padEnd(8)}${proc.command}`);
                                        }
                                        console.log();
                                    }
                                    if (result.process) {
                                        // Single process status
                                        console.log(chalk.cyan('\n📊 Process Status:\n'));
                                        const p = result.process;
                                        console.log(`  ${chalk.gray('ID:')}       ${p.id}`);
                                        console.log(`  ${chalk.gray('PID:')}      ${p.pid}`);
                                        console.log(`  ${chalk.gray('Status:')}   ${p.status === 'running' ? chalk.green(p.status) : chalk.gray(p.status)}`);
                                        console.log(`  ${chalk.gray('Command:')}  ${p.command}`);
                                        if (p.uptime) console.log(`  ${chalk.gray('Uptime:')}   ${p.uptime}`);
                                        if (p.exitCode !== null) console.log(`  ${chalk.gray('Exit:')}     ${p.exitCode}`);
                                        console.log();
                                    }
                                    if (result.result) {
                                        console.log(chalk.gray('\nResult:'), result.result);
                                    }
                                    if (!result.message && !result.output && !result.processes && !result.process) {
                                        console.log();
                                    }
                                } else {
                                    console.log(chalk.red(`\n✗ ${result.error}\n`));
                                }
                            } catch (error) {
                                console.log(chalk.red(`\n✗ Extension error: ${error.message}\n`));
                            }
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
                        
                        // Detect language from known keywords
                        const languages = ['go', 'rust', 'typescript', 'javascript', 'python', 'java', 'csharp', 'cpp', 'c++'];
                        let language = null;
                        let moduleName = null;
                        
                        for (const lang of languages) {
                            const idx = args.findIndex(a => a.toLowerCase() === lang);
                            if (idx !== -1) {
                                language = lang;
                                args.splice(idx, 1);
                                break;
                            }
                        }
                        
                        // Parse options
                        const options = {
                            type: 'service',
                            style: null,
                            withTests: true,
                            withAnnotations: true,
                            requirements: []
                        };
                        
                        const filteredArgs = [];
                        for (let i = 0; i < args.length; i++) {
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
                                filteredArgs.push(arg);
                            }
                        }
                        
                        // First non-option arg is module name, rest is requirements
                        if (filteredArgs.length > 0) {
                            moduleName = filteredArgs[0];
                            options.requirements = filteredArgs.slice(1);
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

};
