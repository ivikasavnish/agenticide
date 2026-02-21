// Lovable Design Extension - Entry Point
const Extension = require('../../core/extensionManager').Extension;
const DesignServer = require('./server/DesignServer');
const chalk = require('chalk');
const path = require('path');

class LovableDesignExtension extends Extension {
    constructor() {
        super();
        this.name = 'lovable-design';
        this.version = '1.0.0';
        this.description = 'AI-powered browser-based UI design server';
        this.author = 'Agenticide';
        this.enabled = true;
        this.commands = [
            { name: 'design', description: 'Lovable Design UI server' },
            { name: 'ui', description: 'Alias for design' },
            { name: 'preview', description: 'Alias for design' }
        ];
        this.server = null;
        this.agentManager = null;
    }

    /**
     * Install extension (one-time setup)
     */
    async install() {
        return { success: true, message: 'Lovable Design extension installed' };
    }

    /**
     * Enable extension
     */
    async enable() {
        this.enabled = true;
        return { success: true, message: 'Lovable Design extension enabled' };
    }

    /**
     * Disable extension
     */
    async disable() {
        this.enabled = false;
        if (this.server) {
            await this.stopServer();
        }
        return { success: true, message: 'Lovable Design extension disabled' };
    }

    /**
     * Execute command
     */
    async execute(command, args, context) {
        switch (command) {
            case 'start':
            case 'serve':
                return await this.startServer(args, context);
            
            case 'stop':
                return await this.stopServer();
            
            case 'status':
                return this.getStatus();
            
            case 'open':
                return await this.openBrowser();
            
            case 'help':
            default:
                return this.showHelp();
        }
    }

    /**
     * Start design server
     */
    async startServer(args, context) {
        if (this.server) {
            return {
                success: false,
                message: 'Server already running',
                url: `http://localhost:${this.server.port}`
            };
        }

        try {
            // Store agentManager from context
            if (context && context.agentManager) {
                this.agentManager = context.agentManager;
            }
            
            // Parse options
            const options = {
                port: this.parseOption(args, '--port', 3456),
                autoOpen: !args.includes('--no-open'),
                workDir: this.parseOption(args, '--dir', path.join(process.cwd(), '.lovable'))
            };

            console.log(chalk.cyan('\n🚀 Starting Lovable Design server...'));

            // Create and start server
            this.server = new DesignServer(this.agentManager, options);
            const result = await this.server.start();

            return {
                success: true,
                message: 'Design server started',
                ...result
            };
        } catch (error) {
            console.error(chalk.red(`Error starting server: ${error.message}`));
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Stop design server
     */
    async stopServer() {
        if (!this.server) {
            return {
                success: false,
                message: 'Server not running'
            };
        }

        try {
            await this.server.stop();
            this.server = null;

            return {
                success: true,
                message: 'Server stopped'
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Get server status
     */
    getStatus() {
        if (!this.server) {
            console.log(chalk.yellow('\n❌ Design server is not running'));
            console.log(chalk.gray('   Start with: /design start\n'));
            return {
                running: false
            };
        }

        console.log(chalk.green('\n✓ Design server is running'));
        console.log(chalk.cyan(`  URL: http://localhost:${this.server.port}`));
        console.log(chalk.gray(`  Work dir: ${this.server.workDir}`));
        console.log(chalk.gray(`  Connected clients: ${this.server.clients.size}\n`));

        return {
            running: true,
            port: this.server.port,
            workDir: this.server.workDir,
            clients: this.server.clients.size
        };
    }

    /**
     * Open browser
     */
    async openBrowser() {
        if (!this.server) {
            return {
                success: false,
                message: 'Server not running. Start with: /design start'
            };
        }

        if (!open) {
            console.log(chalk.yellow('⚠️  open package not available'));
            console.log(chalk.cyan(`   Visit: http://localhost:${this.server.port}`));
            return {
                success: false,
                message: 'open package not installed'
            };
        }

        await open(`http://localhost:${this.server.port}`);

        return {
            success: true,
            message: 'Opened browser'
        };
    }

    /**
     * Show help
     */
    showHelp() {
        console.log(chalk.cyan('\n╔═══════════════════════════════════════════════════╗'));
        console.log(chalk.cyan('║         Lovable Design - AI-Powered UI           ║'));
        console.log(chalk.cyan('╚═══════════════════════════════════════════════════╝\n'));

        console.log(chalk.bold('Commands:\n'));
        
        console.log(chalk.cyan('  /design start [options]'));
        console.log(chalk.gray('    Start the design server'));
        console.log(chalk.gray('    Options:'));
        console.log(chalk.gray('      --port <number>    Port number (default: 3456)'));
        console.log(chalk.gray('      --dir <path>       Work directory (default: .lovable)'));
        console.log(chalk.gray('      --no-open          Don\'t auto-open browser\n'));

        console.log(chalk.cyan('  /design stop'));
        console.log(chalk.gray('    Stop the design server\n'));

        console.log(chalk.cyan('  /design status'));
        console.log(chalk.gray('    Show server status\n'));

        console.log(chalk.cyan('  /design open'));
        console.log(chalk.gray('    Open design in browser\n'));

        console.log(chalk.bold('Features:\n'));
        console.log(chalk.green('  ✓ Live preview with hot reload'));
        console.log(chalk.green('  ✓ AI-powered UI generation'));
        console.log(chalk.green('  ✓ Console monitoring & debugging'));
        console.log(chalk.green('  ✓ Real-time updates via WebSocket'));
        console.log(chalk.green('  ✓ Export designs to files\n'));

        console.log(chalk.bold('Quick Start:\n'));
        console.log(chalk.gray('  1. Start server:    /design start'));
        console.log(chalk.gray('  2. Browser opens automatically'));
        console.log(chalk.gray('  3. Click "Ask AI" to create/modify UI'));
        console.log(chalk.gray('  4. Changes appear instantly'));
        console.log(chalk.gray('  5. Export when done\n'));

        return {
            success: true,
            message: 'Help displayed'
        };
    }

    /**
     * Parse command line option
     */
    parseOption(args, option, defaultValue) {
        const index = args.indexOf(option);
        if (index !== -1 && args[index + 1]) {
            const value = args[index + 1];
            return isNaN(value) ? value : parseInt(value);
        }
        return defaultValue;
    }

    /**
     * Cleanup on exit
     */
    async cleanup() {
        if (this.server) {
            await this.stopServer();
        }
    }
}

module.exports = LovableDesignExtension;
