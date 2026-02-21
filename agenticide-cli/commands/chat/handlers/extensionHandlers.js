// Extension Management Handlers
const chalk = require('chalk');

class ExtensionHandlers {
    constructor(extensionManager) {
        this.extensionManager = extensionManager;
    }

    handleExtensions() {
        this.extensionManager.displayExtensions();
    }

    async handleExtension(args) {
        const subCmd = args[0];
        const extName = args[1];
        
        if (subCmd === 'enable') {
            if (!extName) {
                console.log(chalk.red('\n✗ Please specify an extension name\n'));
            } else {
                const result = await this.extensionManager.enableExtension(extName);
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
                const result = await this.extensionManager.disableExtension(extName);
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
                const ext = this.extensionManager.getExtension(extName);
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
    }

    async handleExtensionCommand(cmd, args, userInput) {
        const ext = this.extensionManager.getExtension(cmd);
        
        if (!ext) {
            console.log(chalk.red(`\n✗ Extension '${cmd}' not found\n`));
            return null;
        }
        
        if (!ext.enabled) {
            console.log(chalk.yellow(`\n⚠️  Extension '${cmd}' is disabled. Enable with: /extension enable ${cmd}\n`));
            return null;
        }
        
        try {
            const result = await ext.execute(args);
            if (result.output) {
                console.log(result.output);
            }
            return result.response;
        } catch (error) {
            console.log(chalk.red(`\n✗ Extension error: ${error.message}\n`));
            return null;
        }
    }
}

module.exports = ExtensionHandlers;
