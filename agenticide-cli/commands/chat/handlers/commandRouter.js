// Command Router - Routes commands to appropriate handlers
const chalk = require('chalk');
const AgentHandlers = require('./agentHandlers');
const PlanHandlers = require('./planHandlers');
const SessionHandlers = require('./sessionHandlers');
const CacheHandlers = require('./cacheHandlers');
const TaskHandlers = require('./taskHandlers');
const ExtensionHandlers = require('./extensionHandlers');

class CommandRouter {
    constructor(dependencies) {
        const { agentManager, sessionManager, extensionManager, clarifier, loadTasks } = dependencies;
        
        this.agentHandlers = new AgentHandlers(agentManager);
        this.planHandlers = new PlanHandlers(clarifier);
        this.sessionHandlers = new SessionHandlers(sessionManager);
        this.cacheHandlers = new CacheHandlers(agentManager);
        this.taskHandlers = new TaskHandlers(loadTasks);
        this.extensionHandlers = new ExtensionHandlers(extensionManager);
        
        this.projectContext = dependencies.projectContext;
        this.enhancedInput = dependencies.enhancedInput;
    }

    /**
     * Route command to appropriate handler
     * @param {string} cmd - Command name
     * @param {Array} args - Command arguments
     * @param {string} userInput - Full user input
     * @param {Array} conversationHistory - Conversation history
     * @returns {Promise<Object>} - { handled: boolean, response: any, history: Array }
     */
    async route(cmd, args, userInput, conversationHistory) {
        let handled = true;
        let response = null;
        let newHistory = conversationHistory;

        try {
            switch (cmd) {
                // Agent management
                case 'agent':
                    await this.agentHandlers.handleAgent(args);
                    break;
                
                case 'model':
                    await this.agentHandlers.handleModel(args);
                    break;
                
                case 'status':
                    this.agentHandlers.handleStatus();
                    break;
                
                // Context
                case 'context':
                    this._handleContext();
                    break;
                
                // History
                case 'history':
                    this._handleHistory(args);
                    break;
                
                // Cache
                case 'cache':
                    await this.cacheHandlers.handleCache(args);
                    break;
                
                // Tasks
                case 'tasks':
                    this.taskHandlers.handleTasks(args);
                    break;
                
                // Sessions
                case 'sessions':
                    this.sessionHandlers.handleSessions();
                    break;
                
                case 'session':
                    newHistory = await this.sessionHandlers.handleSession(args, conversationHistory) || conversationHistory;
                    break;
                
                // Planning
                case 'plan':
                    await this.planHandlers.handlePlan(args);
                    break;
                
                case 'clarify':
                    await this.planHandlers.handleClarify();
                    break;
                
                // Extensions
                case 'extensions':
                    this.extensionHandlers.handleExtensions();
                    break;
                
                case 'extension':
                case 'ext':
                    await this.extensionHandlers.handleExtension(args);
                    break;
                
                // Extension commands (browser, docker, debug, etc.)
                case 'browser':
                case 'docker':
                case 'debug':
                case 'cli':
                case 'mcp':
                case 'qa':
                case 'process':
                    response = await this.extensionHandlers.handleExtensionCommand(cmd, args, userInput);
                    break;
                
                // Other commands
                case 'switch':
                case 'mode':
                    this._handleSwitch(args);
                    break;
                
                case 'compact':
                    await this._handleCompact();
                    break;
                
                default:
                    // Command not handled by router
                    handled = false;
            }
        } catch (error) {
            console.log(chalk.red(`\n✗ Error handling command: ${error.message}\n`));
            handled = true; // Mark as handled to prevent further processing
        }

        return { handled, response, history: newHistory };
    }

    _handleContext() {
        if (this.projectContext) {
            console.log(chalk.cyan('\n📦 Project Context:\n'));
            console.log(chalk.gray('Directory:'), this.projectContext.cwd);
            console.log(chalk.gray('Symbols:'), this.projectContext.symbols);
            console.log(chalk.gray('Top symbols:'));
            this.projectContext.topSymbols.forEach(s => {
                console.log(chalk.gray(`  • ${s}`));
            });
            console.log('');
        } else {
            console.log(chalk.yellow('\n⚠️  No project context loaded\n'));
        }
    }

    _handleHistory(args) {
        const count = parseInt(args[0]) || 20;
        this.enhancedInput.showHistory(count);
    }

    _handleSwitch(args) {
        const targetCmd = args[0];
        
        if (!targetCmd) {
            console.log(chalk.cyan('\n🔄 Available Commands:\n'));
            console.log(chalk.gray('  /switch analyze   - Switch to analyze mode'));
            console.log(chalk.gray('  /switch search    - Switch to search mode'));
            console.log(chalk.gray('  /switch task      - Switch to task mode'));
            console.log('');
        } else {
            console.log(chalk.gray(`\nTo use ${targetCmd} command:`));
            
            if (targetCmd === 'analyze' || targetCmd === 'analyse') {
                console.log(chalk.cyan('  agenticide analyze'));
                console.log(chalk.gray('Example: agenticide analyze --deep\n'));
            } else if (targetCmd === 'search') {
                console.log(chalk.cyan('  agenticide search "<query>"'));
                console.log(chalk.gray('Example: agenticide search "authentication function"\n'));
            } else if (targetCmd === 'status') {
                console.log(chalk.cyan('  agenticide status\n'));
            } else if (targetCmd === 'task') {
                console.log(chalk.cyan('  agenticide task:add "<description>"'));
                console.log(chalk.cyan('  agenticide task:list'));
                console.log(chalk.cyan('  agenticide task:complete <id>'));
                console.log('');
            } else {
                console.log(chalk.yellow(`  Unknown command: ${targetCmd}\n`));
            }
        }
    }

    async _handleCompact() {
        const AutoCompaction = require('../../../core/autoCompaction');
        console.log(chalk.cyan('\n🗜️  Running compaction...\n'));
        
        try {
            await AutoCompaction.runManual({
                gitRepoPath: process.cwd()
            });
            console.log(chalk.green('✅ Compaction complete\n'));
        } catch (error) {
            console.log(chalk.red(`\n✗ Compaction failed: ${error.message}\n`));
        }
    }
}

module.exports = CommandRouter;
