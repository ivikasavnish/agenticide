// Help Menu Display
const chalk = require('chalk');

class HelpMenu {
    constructor(extensionManager, enhancedInput) {
        this.extensionManager = extensionManager;
        this.enhancedInput = enhancedInput;
    }

    display() {
        console.log(chalk.bold(chalk.cyan('\n💬 Agenticide Chat - Command Reference\n')));
        
        this._showAgentCommands();
        this._showPlanningCommands();
        this._showContextCommands();
        this._showStubWorkflow();
        this._showFileOps();
        this._showShellCommands();
        this._showInputNavigation();
        this._showExtensions();
        
        console.log(chalk.cyan('  exit              - Quit\n'));
    }

    _showAgentCommands() {
        console.log(chalk.yellow('  💬 Agent & Model:'));
        console.log('  /agent <name>     - Switch agent');
        console.log('  /model <model>    - Switch model');
        console.log('  /status           - Show agent status');
    }

    _showPlanningCommands() {
        console.log(chalk.yellow('\n  📋 Planning:'));
        console.log('  /plan [create|show|edit|update] - Manage execution plan');
        console.log('  /clarify                        - Ask clarifying questions');
        console.log('  /execute [id]                   - Execute plan');
        console.log('  /diff [task]                    - Show changes');
    }

    _showContextCommands() {
        console.log(chalk.cyan('\n  📦 Context & Tasks:'));
        console.log('  /context          - Show project context');
        console.log('  /cache [stats]    - Cache management');
        console.log('  /tasks [summary|list|next] - Task management');
        console.log('  /search <query>   - Search code');
        console.log('  /switch <cmd>     - Switch to other commands');
        console.log('  /history          - View command history');
        console.log('  /sessions         - List all sessions');
        console.log('  /session save|load <name> - Manage sessions');
    }

    _showStubWorkflow() {
        console.log(chalk.magenta('\n  🔨 Stub-First Workflow:'));
        console.log(chalk.magenta('  /stub <module> <lang> [options]   - Generate with tests + annotations'));
        console.log(chalk.gray('    Options: --style=google|airbnb|uber  --no-tests  --no-annotations'));
        console.log(chalk.magenta('  /verify [target]                  - Validate structure'));
        console.log(chalk.magenta('  /implement <function>             - Fill implementation'));
        console.log(chalk.magenta('  /flow [module]                    - Visualize architecture'));
    }

    _showFileOps() {
        console.log(chalk.cyan('\n  📄 File Operations:'));
        console.log('  /read <file>      - Read file');
        console.log('  /write <file> ... - Write file');
        console.log('  /edit <file> ...  - Edit with AI');
        console.log('  /debug <target>   - Debug code/error');
    }

    _showShellCommands() {
        console.log(chalk.blue('\n  ⚡ Shell & Process:'));
        console.log('  !<command>        - Execute shell command');
        console.log('  !python <code>    - Execute Python');
        console.log('  !node <code>      - Execute Node.js');
        console.log('  !~<command>       - Background execution');
        console.log('  /process start|list|logs|stop - Manage processes');
    }

    _showInputNavigation() {
        console.log(chalk.green('\n  📎 Context Attachments:'));
        console.log('  @filename         - Attach file to message (e.g., @src/app.js)');
        console.log('  @"file name.txt"  - Attach file with spaces');
        console.log('  Paste content     - Multi-line paste automatically saved');
        console.log(chalk.gray('    Files are tracked with git info (branch@commit)'));
        
        if (this.enhancedInput) {
            console.log(chalk.gray('\n  ⌨️  Input Navigation:'));
            console.log(this.enhancedInput.getHelpText());
        }
    }

    _showExtensions() {
        const enabledExts = this.extensionManager.listExtensions().filter(e => e.enabled);
        if (enabledExts.length > 0) {
            console.log(chalk.magenta('\n  �� Enabled Extensions:'));
            enabledExts.forEach(ext => {
                console.log(chalk.magenta(`  /${ext.commands[0] || ext.name}              - ${ext.description}`));
            });
        }
        
        console.log(chalk.gray('\n  🧩 Extension Management:'));
        console.log('  /extensions       - List all extensions');
        console.log('  /extension enable <name> - Enable extension');
    }
}

module.exports = HelpMenu;
