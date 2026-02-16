// CLI Extension - Enhanced terminal commands
const { Extension } = require('../core/extensionManager');
const { exec, execSync } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

class CLIExtension extends Extension {
    constructor() {
        super();
        this.name = 'cli';
        this.version = '1.0.0';
        this.description = 'Enhanced terminal commands with history and shortcuts';
        this.author = 'Agenticide';
        this.commandHistory = [];
        this.aliases = new Map();
        this.commands = [{ name: 'cli', description: 'CLI utilities', usage: '/cli <action>' }];
    }

    async install() {
        // Load aliases
        this.aliases.set('ll', 'ls -la');
        this.aliases.set('gst', 'git status');
        this.aliases.set('glog', 'git log --oneline --graph --all');
        return { success: true };
    }

    async enable() {
        await this.install();
        this.enabled = true;
        return { success: true };
    }

    async execute(action, args) {
        try {
            switch (action) {
                case 'run':
                    return await this.runCommand(args.join(' '));
                case 'history':
                    return this.getHistory();
                case 'alias':
                    return this.manageAlias(args[0], args.slice(1).join(' '));
                case 'which':
                    return this.whichCommand(args[0]);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async runCommand(cmd) {
        // Check for alias
        const firstWord = cmd.split(' ')[0];
        if (this.aliases.has(firstWord)) {
            const aliasCmd = this.aliases.get(firstWord);
            cmd = cmd.replace(firstWord, aliasCmd);
        }

        this.commandHistory.push({ cmd, timestamp: new Date().toISOString() });

        try {
            const { stdout, stderr } = await execAsync(cmd);
            return {
                success: true,
                stdout: stdout || '',
                stderr: stderr || ''
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                stdout: error.stdout || '',
                stderr: error.stderr || ''
            };
        }
    }

    getHistory() {
        return {
            success: true,
            history: this.commandHistory.slice(-20) // Last 20 commands
        };
    }

    manageAlias(name, command) {
        if (!command) {
            // Get alias
            if (this.aliases.has(name)) {
                return {
                    success: true,
                    alias: name,
                    command: this.aliases.get(name)
                };
            } else {
                return { success: false, error: `Alias '${name}' not found` };
            }
        } else {
            // Set alias
            this.aliases.set(name, command);
            return {
                success: true,
                message: `Alias set: ${name} = ${command}`
            };
        }
    }

    whichCommand(cmd) {
        try {
            const result = execSync(`which ${cmd}`, { encoding: 'utf8' });
            return {
                success: true,
                path: result.trim()
            };
        } catch (error) {
            return {
                success: false,
                error: `Command '${cmd}' not found`
            };
        }
    }
}

module.exports = CLIExtension;
