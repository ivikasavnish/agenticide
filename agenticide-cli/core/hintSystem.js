// Hint System - Intelligent command suggestions and autocomplete
const chalk = require('chalk');

class HintSystem {
    constructor() {
        this.commandHints = new Map();
        this.contextualHints = new Map();
        this.recentCommands = [];
        this.maxRecent = 10;
        
        this.initializeBuiltinHints();
    }

    initializeBuiltinHints() {
        // Core commands
        this.addCommandHint('/stub', {
            description: 'Generate code stubs with AI',
            usage: '/stub <name> <language> <type>',
            examples: [
                '/stub api javascript service',
                '/stub websocket go server --style=google',
                '/stub parser rust library'
            ],
            flags: ['--style', '--test', '--docs'],
            autocomplete: ['api', 'websocket', 'parser', 'service', 'library']
        });

        this.addCommandHint('/process', {
            description: 'Manage background processes',
            usage: '/process <action> [args]',
            examples: [
                '/process start npm run dev',
                '/process list',
                '/process logs 1',
                '/process stop 1'
            ],
            actions: ['start', 'stop', 'list', 'logs', 'status', 'stopall'],
            autocomplete: ['start', 'stop', 'list', 'logs', 'status']
        });

        this.addCommandHint('/api', {
            description: 'Test REST APIs',
            usage: '/api <method> <url> [body] [headers]',
            examples: [
                '/api get https://api.github.com/users/octocat',
                '/api post https://api.example.com/data \'{"key":"value"}\'',
                '/api get http://localhost:3000/api/users -H "Authorization: Bearer token"'
            ],
            actions: ['get', 'post', 'put', 'patch', 'delete', 'history', 'save', 'load'],
            autocomplete: ['get', 'post', 'put', 'patch', 'delete', 'history']
        });

        this.addCommandHint('/sql', {
            description: 'Execute SQL queries',
            usage: '/sql <action> [args]',
            examples: [
                '/sql connect sqlite ./database.db',
                '/sql query SELECT * FROM users LIMIT 10',
                '/sql tables',
                '/sql describe users'
            ],
            actions: ['connect', 'query', 'tables', 'describe', 'disconnect', 'history'],
            autocomplete: ['connect', 'query', 'tables', 'describe', 'disconnect']
        });

        this.addCommandHint('/analyze', {
            description: 'Analyze project with LSP',
            usage: '/analyze [path]',
            examples: [
                '/analyze',
                '/analyze src/',
                '/analyze --deep'
            ]
        });

        this.addCommandHint('/search', {
            description: 'Semantic code search',
            usage: '/search <query>',
            examples: [
                '/search authentication logic',
                '/search error handling',
                '/search database connection'
            ]
        });

        this.addCommandHint('/switch', {
            description: 'Switch between features',
            usage: '/switch <mode>',
            examples: [
                '/switch task',
                '/switch analyze',
                '/switch search'
            ],
            autocomplete: ['task', 'analyze', 'search', 'chat']
        });

        this.addCommandHint('/task', {
            description: 'Task management',
            usage: '/task <action>',
            examples: [
                '/task list',
                '/task add "Implement authentication"',
                '/task done 1',
                '/task export'
            ],
            actions: ['list', 'add', 'done', 'remove', 'export'],
            autocomplete: ['list', 'add', 'done', 'remove', 'export']
        });

        this.addCommandHint('/git', {
            description: 'Git operations',
            usage: '/git <action>',
            examples: [
                '/git status',
                '/git commit "feat: add new feature"',
                '/git branch feature/new-feature',
                '/git push'
            ],
            actions: ['status', 'commit', 'push', 'pull', 'branch', 'checkout'],
            autocomplete: ['status', 'commit', 'push', 'pull', 'branch']
        });

        this.addCommandHint('/extension', {
            description: 'Extension management',
            usage: '/extension <action> [name]',
            examples: [
                '/extension list',
                '/extension enable api',
                '/extension disable browser'
            ],
            actions: ['list', 'enable', 'disable', 'info'],
            autocomplete: ['list', 'enable', 'disable', 'info']
        });
    }

    addCommandHint(command, config) {
        this.commandHints.set(command, config);
    }

    addExtensionHints(extension) {
        if (!extension.commands || extension.commands.length === 0) return;

        extension.commands.forEach(cmd => {
            this.addCommandHint(`/${cmd.name}`, {
                description: cmd.description || 'Extension command',
                usage: cmd.usage || `/${cmd.name} <action>`,
                examples: cmd.examples || [],
                extension: extension.name
            });
        });
    }

    getHint(input) {
        if (!input || !input.startsWith('/')) {
            return this.getContextualHint(input);
        }

        const parts = input.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        const hint = this.commandHints.get(command);
        if (!hint) {
            return this.suggestSimilarCommands(command);
        }

        // If incomplete command, show full hint
        if (args.length === 0) {
            return this.formatCommandHint(command, hint);
        }

        // If has args, show contextual help
        return this.getArgumentHint(command, hint, args);
    }

    formatCommandHint(command, hint) {
        const lines = [];
        
        lines.push(chalk.cyan(`${command}`) + chalk.gray(` - ${hint.description}`));
        lines.push(chalk.gray(`Usage: ${hint.usage}`));
        
        if (hint.actions && hint.actions.length > 0) {
            lines.push(chalk.yellow(`Actions: ${hint.actions.join(', ')}`));
        }
        
        if (hint.examples && hint.examples.length > 0) {
            lines.push(chalk.green('Examples:'));
            hint.examples.forEach(ex => {
                lines.push(chalk.gray(`  ${ex}`));
            });
        }

        if (hint.flags && hint.flags.length > 0) {
            lines.push(chalk.blue(`Flags: ${hint.flags.join(', ')}`));
        }

        return lines.join('\n');
    }

    getArgumentHint(command, hint, args) {
        const currentArg = args[args.length - 1];
        
        // Suggest actions if first arg
        if (args.length === 1 && hint.actions) {
            const matches = hint.actions.filter(a => 
                a.toLowerCase().startsWith(currentArg.toLowerCase())
            );
            
            if (matches.length > 0) {
                return chalk.yellow('Suggestions: ') + matches.map(m => 
                    chalk.cyan(m)
                ).join(', ');
            }
        }

        // Show relevant example
        if (hint.examples && hint.examples.length > 0) {
            const relevantExample = hint.examples.find(ex => 
                ex.toLowerCase().includes(args[0].toLowerCase())
            );
            
            if (relevantExample) {
                return chalk.green('Example: ') + chalk.gray(relevantExample);
            }
        }

        return null;
    }

    getContextualHint(input) {
        if (!input || input.trim() === '') {
            return this.getQuickStart();
        }

        // Check for common patterns
        if (input.includes('http://') || input.includes('https://')) {
            return chalk.cyan('💡 Tip: Use /api get <url> to test this endpoint');
        }

        if (input.toLowerCase().includes('sql') || input.toLowerCase().includes('database')) {
            return chalk.cyan('💡 Tip: Use /sql connect to work with databases');
        }

        if (input.toLowerCase().includes('process') || input.toLowerCase().includes('background')) {
            return chalk.cyan('💡 Tip: Use /process start <command> to run processes');
        }

        return null;
    }

    getQuickStart() {
        return [
            chalk.bold.cyan('\n💡 Quick Tips:'),
            chalk.gray('  • Type /help to see all commands'),
            chalk.gray('  • Use /stub to generate code'),
            chalk.gray('  • Use /api to test REST APIs'),
            chalk.gray('  • Use /sql to query databases'),
            chalk.gray('  • Use /process to manage background tasks'),
            chalk.gray('  • Press Tab for autocomplete'),
            ''
        ].join('\n');
    }

    suggestSimilarCommands(input) {
        const commands = Array.from(this.commandHints.keys());
        const similar = commands.filter(cmd => 
            this.levenshteinDistance(input.toLowerCase(), cmd.toLowerCase()) <= 2
        );

        if (similar.length > 0) {
            return chalk.yellow('Did you mean: ') + similar.map(s => 
                chalk.cyan(s)
            ).join(', ') + '?';
        }

        return chalk.gray('Unknown command. Type /help for available commands.');
    }

    getAutocomplete(input) {
        if (!input.startsWith('/')) return [];

        const parts = input.trim().split(/\s+/);
        const command = parts[0];
        const args = parts.slice(1);

        // Command autocomplete
        if (args.length === 0) {
            const commands = Array.from(this.commandHints.keys());
            return commands.filter(cmd => 
                cmd.startsWith(command)
            );
        }

        // Argument autocomplete
        const hint = this.commandHints.get(command);
        if (!hint) return [];

        const currentArg = args[args.length - 1] || '';

        // Action autocomplete
        if (hint.actions && args.length === 1) {
            return hint.actions.filter(action => 
                action.toLowerCase().startsWith(currentArg.toLowerCase())
            ).map(action => `${command} ${action}`);
        }

        // Custom autocomplete
        if (hint.autocomplete) {
            return hint.autocomplete.filter(item => 
                item.toLowerCase().startsWith(currentArg.toLowerCase())
            ).map(item => `${command} ${args.slice(0, -1).join(' ')} ${item}`.trim());
        }

        return [];
    }

    recordCommand(command) {
        this.recentCommands.unshift(command);
        if (this.recentCommands.length > this.maxRecent) {
            this.recentCommands = this.recentCommands.slice(0, this.maxRecent);
        }
    }

    getRecentCommands(limit = 5) {
        return this.recentCommands.slice(0, limit);
    }

    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    }

    showAllCommands() {
        const commands = Array.from(this.commandHints.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));

        const lines = [
            chalk.bold.cyan('\n📚 Available Commands:\n')
        ];

        commands.forEach(([cmd, hint]) => {
            lines.push(
                chalk.cyan(cmd.padEnd(15)) + 
                chalk.gray(hint.description) +
                (hint.extension ? chalk.yellow(` [${hint.extension}]`) : '')
            );
        });

        lines.push(chalk.gray('\nType any command for detailed help and examples.'));
        
        return lines.join('\n');
    }
}

module.exports = HintSystem;
