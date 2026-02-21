// Command Matcher - Fuzzy matching and suggestions for commands
const chalk = require('chalk');

class CommandMatcher {
    constructor() {
        this.commands = new Map();
    }

    /**
     * Register a command
     */
    register(command, description, aliases = []) {
        this.commands.set(command, {
            name: command,
            description,
            aliases: aliases.filter(a => a !== command)
        });
        
        // Register aliases
        aliases.forEach(alias => {
            if (alias !== command) {
                this.commands.set(alias, {
                    name: command,
                    description: `Alias for ${command}`,
                    aliases: [],
                    isAlias: true
                });
            }
        });
    }

    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const m = str1.length;
        const n = str2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (str1[i - 1] === str2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = Math.min(
                        dp[i - 1][j - 1] + 1, // substitution
                        dp[i - 1][j] + 1,     // deletion
                        dp[i][j - 1] + 1      // insertion
                    );
                }
            }
        }

        return dp[m][n];
    }

    /**
     * Calculate similarity score (0-1)
     */
    similarity(str1, str2) {
        const maxLen = Math.max(str1.length, str2.length);
        if (maxLen === 0) return 1.0;
        const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
        return 1.0 - (distance / maxLen);
    }

    /**
     * Find matching commands
     */
    findMatches(input, threshold = 0.6) {
        const matches = [];
        
        // Exact match first
        if (this.commands.has(input)) {
            const cmd = this.commands.get(input);
            matches.push({
                command: cmd.name,
                score: 1.0,
                type: 'exact',
                description: cmd.description
            });
            return matches;
        }

        // Partial matches
        for (const [cmdName, cmdInfo] of this.commands.entries()) {
            // Skip aliases in fuzzy search
            if (cmdInfo.isAlias) continue;

            let score = this.similarity(input, cmdName);
            
            // Boost score for prefix matches
            if (cmdName.startsWith(input)) {
                score = Math.max(score, 0.8);
            }
            
            // Check if input is contained
            if (cmdName.includes(input) && input.length >= 2) {
                score = Math.max(score, 0.7);
            }

            if (score >= threshold) {
                matches.push({
                    command: cmdInfo.name,
                    score,
                    type: 'fuzzy',
                    description: cmdInfo.description
                });
            }
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);
        
        return matches.slice(0, 5); // Top 5 matches
    }

    /**
     * Get suggestions for unknown command
     */
    getSuggestions(input) {
        const matches = this.findMatches(input, 0.5);
        return matches.map(m => ({
            command: m.command,
            score: m.score,
            description: m.description
        }));
    }

    /**
     * Ask user which command they meant (async)
     */
    async askCorrection(input) {
        const suggestions = this.getSuggestions(input);
        
        if (suggestions.length === 0) {
            console.log(chalk.red(`\n❌ Unknown command: ${input}`));
            console.log(chalk.gray('Type /help to see available commands\n'));
            return null;
        }

        console.log(chalk.yellow(`\n⚠️  Unknown command: ${input}`));
        console.log(chalk.gray('Did you mean:\n'));

        // Show suggestions
        suggestions.forEach((s, i) => {
            console.log(`  ${chalk.cyan(`${i + 1}.`)} ${chalk.white(s.command.padEnd(20))} ${chalk.gray(`- ${s.description}`)}`);
        });
        console.log(`  ${chalk.gray(`${suggestions.length + 1}. Cancel`)}\n`);

        // Simple readline prompt
        const readline = require('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        return new Promise((resolve) => {
            rl.question(chalk.cyan('Select number (or press Enter to cancel): '), (answer) => {
                rl.close();
                
                const choice = parseInt(answer, 10);
                if (!choice || choice < 1 || choice > suggestions.length) {
                    console.log(chalk.gray('\nCancelled\n'));
                    resolve(null);
                } else {
                    resolve(suggestions[choice - 1].command);
                }
            });
        });
    }

    /**
     * Check if command exists
     */
    exists(command) {
        return this.commands.has(command);
    }

    /**
     * Get all commands
     */
    getAllCommands() {
        const commands = [];
        for (const [name, info] of this.commands.entries()) {
            if (!info.isAlias) {
                commands.push({
                    name,
                    description: info.description,
                    aliases: info.aliases
                });
            }
        }
        return commands.sort((a, b) => a.name.localeCompare(b.name));
    }

    /**
     * Initialize with default commands
     */
    initializeDefaultCommands() {
        // Agent & Model
        this.register('agent', 'Switch AI agent', ['ag']);
        this.register('model', 'Switch model', ['mod']);
        this.register('status', 'Show agent status', ['stat', 'st']);
        
        // Context & Info
        this.register('context', 'Show context', ['ctx']);
        this.register('history', 'Show command history', ['hist']);
        this.register('help', 'Show help', ['h', '?']);
        
        // Cache
        this.register('cache', 'Cache management', []);
        
        // Tasks
        this.register('tasks', 'Task management', ['task']);
        
        // Search
        this.register('search', 'Search code', ['find', 'grep']);
        this.register('switch', 'Switch to other commands', ['sw']);
        
        // Sessions
        this.register('sessions', 'List sessions', ['sess']);
        this.register('session', 'Session management', []);
        this.register('compact', 'Run auto-compaction', []);
        
        // Extensions
        this.register('extensions', 'List extensions', ['exts', 'ext']);
        this.register('extension', 'Extension management', []);
        
        // Stub workflow
        this.register('stub', 'Generate stubs', []);
        this.register('verify', 'Validate structure', ['val']);
        this.register('implement', 'Fill implementation', ['impl']);
        this.register('flow', 'Visualize architecture', []);
        
        // Planning
        this.register('plan', 'Manage execution plan', []);
        this.register('clarify', 'Ask clarifying questions', ['ask']);
        this.register('execute', 'Execute plan', ['exec', 'run']);
        this.register('diff', 'Show changes', []);
        
        // File operations
        this.register('read', 'Read file', ['cat', 'view']);
        this.register('write', 'Write file', []);
        this.register('edit', 'Edit with AI', ['modify']);
        this.register('debug', 'Debug code/error', ['dbg']);
        
        // Process management
        this.register('process', 'Process management', ['proc', 'ps']);
        
        // Design extension
        this.register('design', 'Lovable Design UI server', ['ui', 'preview']);
        
        // Skills
        this.register('skills', 'Skills management', ['skill']);
    }
}

module.exports = CommandMatcher;
