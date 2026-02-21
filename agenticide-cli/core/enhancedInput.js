// Enhanced Input Handler with History and Autocomplete
const readline = require('readline');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class EnhancedInput {
    constructor(historyFile = null) {
        this.historyFile = historyFile || path.join(process.env.HOME, '.agenticide', 'chat_history.json');
        this.history = this.loadHistory();
        this.rl = null;
    }

    /**
     * Load command history from file
     */
    loadHistory() {
        try {
            if (fs.existsSync(this.historyFile)) {
                const data = JSON.parse(fs.readFileSync(this.historyFile, 'utf8'));
                return Array.isArray(data) ? data : [];
            }
        } catch (error) {
            // Ignore errors, start with empty history
        }
        return [];
    }

    /**
     * Save command history to file
     */
    saveHistory() {
        try {
            const dir = path.dirname(this.historyFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            // Keep last 500 commands
            const trimmed = this.history.slice(-500);
            fs.writeFileSync(this.historyFile, JSON.stringify(trimmed, null, 2));
        } catch (error) {
            // Silently fail
        }
    }

    /**
     * Add command to history
     */
    addToHistory(command) {
        if (!command || !command.trim()) return;
        
        // Don't add duplicates of last command
        if (this.history.length > 0 && this.history[this.history.length - 1] === command) {
            return;
        }
        
        this.history.push(command);
        this.saveHistory();
    }

    /**
     * Get shell command completions
     */
    getShellCompletions(input) {
        const commonCommands = [
            'ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'echo', 'touch', 'mkdir', 'rm', 'cp', 'mv',
            'git', 'npm', 'node', 'python', 'python3', 'cargo', 'go', 'make', 'docker',
            'kubectl', 'curl', 'wget', 'vim', 'nano', 'code', 'ssh', 'ps', 'kill', 'top',
            'ag', 'rg', 'sed', 'awk', 'tar', 'zip', 'unzip', 'df', 'du', 'head', 'tail'
        ];
        
        const cmd = input.startsWith('!') ? input.slice(1) : input;
        return commonCommands.filter(c => c.startsWith(cmd.split(' ')[0])).slice(0, 20);
    }

    /**
     * Get file path completions
     */
    getFileCompletions(input) {
        try {
            // Extract path from input
            let pathToComplete = '';
            let prefix = '';
            
            if (input.startsWith('@')) {
                // File reference: @path/to/file
                pathToComplete = input.slice(1);
                prefix = '@';
            } else if (input.includes(' ')) {
                // Shell command with file argument: !cat path/to/file
                const parts = input.split(' ');
                pathToComplete = parts[parts.length - 1];
                prefix = parts.slice(0, -1).join(' ') + ' ';
            } else {
                return [];
            }

            // Get directory and partial filename
            const dir = path.dirname(pathToComplete) || '.';
            const partial = path.basename(pathToComplete);
            const fullDir = path.resolve(dir);

            if (!fs.existsSync(fullDir)) {
                return [];
            }

            // Get matching files/directories
            const entries = fs.readdirSync(fullDir, { withFileTypes: true });
            const matches = entries
                .filter(entry => entry.name.startsWith(partial))
                .map(entry => {
                    const fullPath = path.join(dir, entry.name);
                    const suffix = entry.isDirectory() ? '/' : '';
                    return prefix + fullPath + suffix;
                })
                .slice(0, 20);

            return matches;
        } catch (error) {
            return [];
        }
    }

    /**
     * Initialize readline interface (deprecated - now we create per prompt)
     */
    initReadline() {
        // Deprecated - we now create a new readline interface for each prompt
        // to avoid stdin consumption issues
        return null;
    }

    /**
     * Completer function for tab completion
     */
    completer(line) {
        const completions = this.getCompletionsSync(line);
        return [completions, line];
    }

    /**
     * Get completions synchronously for readline
     */
    getCompletionsSync(input) {
        try {
            if (!input) {
                return [];
            }

            if (input.startsWith('!')) {
                // Shell command completions
                const shellCmd = input.slice(1);
                const commonCommands = [
                    'ls', 'cd', 'pwd', 'cat', 'grep', 'find', 'echo', 'touch', 'mkdir', 'rm', 'cp', 'mv',
                    'git', 'npm', 'node', 'python', 'python3', 'cargo', 'go', 'make', 'docker',
                    'kubectl', 'curl', 'wget', 'vim', 'nano', 'code', 'ssh', 'ps', 'kill', 'top'
                ];
                return commonCommands
                    .filter(c => c.startsWith(shellCmd.split(' ')[0]))
                    .map(c => '!' + c)
                    .slice(0, 10);
            }

            if (input.startsWith('@')) {
                // File path completions
                return this.getFileCompletions(input);
            }

            if (input.startsWith('/')) {
                // Slash command completions
                const commands = [
                    '/help', '/agent', '/model', '/status', '/context', '/cache',
                    '/tasks', '/search', '/switch', '/sessions', '/session',
                    '/compact', '/extensions', '/extension',
                    '/stub', '/verify', '/implement', '/flow',
                    '/plan', '/execute', '/diff', '/clarify',
                    '/read', '/write', '/edit', '/debug',
                    '/process', '/design', '/skills'
                ];
                return commands.filter(c => c.startsWith(input));
            }

            return [];
        } catch (error) {
            return [];
        }
    }

    /**
     * Get user input with history and autocomplete
     */
    async prompt(message = 'You:') {
        return new Promise((resolve) => {
            // Create a new readline interface for each prompt to avoid stdin issues
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
                terminal: true,
                historySize: 500,
                completer: (line) => this.completer(line)
            });

            // Load history into readline
            if (this.history.length > 0) {
                rl.history = [...this.history].reverse();
            }
            
            rl.question(chalk.cyan(message + ' '), (answer) => {
                const input = answer.trim();
                if (input) {
                    this.addToHistory(input);
                }
                
                // Close this readline instance
                rl.close();
                
                resolve(input);
            });
        });
    }

    /**
     * Close readline interface (no-op since we create per prompt)
     */
    close() {
        // Nothing to do - we close after each prompt
    }

    /**
     * Get navigation info (for showing in UI)
     */
    getHelpText() {
        return [
            chalk.gray('  ↑/↓ arrows  - Navigate command history'),
            chalk.gray('  Tab         - Autocomplete (commands, files)'),
            chalk.gray('  @<path>     - Attach file (Tab to complete)'),
            chalk.gray('  !<command>  - Execute shell (Tab to complete)'),
            chalk.gray('  /<command>  - Agenticide commands (Tab to complete)'),
            chalk.gray('  Ctrl+C      - Exit')
        ].join('\n');
    }

    /**
     * Clear history
     */
    clearHistory() {
        this.history = [];
        this.saveHistory();
    }

    /**
     * Get history length
     */
    getHistoryLength() {
        return this.history.length;
    }

    /**
     * Get recent history
     */
    getRecentHistory(count = 10) {
        return this.history.slice(-count).reverse();
    }

    /**
     * Show history command
     */
    showHistory(count = 20) {
        const recent = this.getRecentHistory(count);
        if (recent.length === 0) {
            console.log(chalk.yellow('No command history yet'));
            return;
        }
        
        console.log(chalk.cyan(`\n📜 Recent Commands (${recent.length}):\n`));
        recent.forEach((cmd, i) => {
            const num = (this.history.length - i).toString().padStart(4, ' ');
            console.log(chalk.gray(`  ${num}  `) + cmd);
        });
        console.log('');
    }
}

module.exports = EnhancedInput;
