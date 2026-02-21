// Agent and Model Management Handlers
const chalk = require('chalk');

class AgentHandlers {
    constructor(agentManager) {
        this.agentManager = agentManager;
    }

    async handleAgent(args) {
        const agentName = args[0];
        if (!agentName) {
            console.log(chalk.cyan('\n🤖 Available Agents:\n'));
            const agents = this.agentManager.listAgents();
            for (const [name, info] of Object.entries(agents)) {
                const active = info.active ? chalk.green('✓') : ' ';
                console.log(`  ${active} ${name}: ${info.model}`);
            }
            console.log('');
        } else {
            const result = await this.agentManager.switchAgent(agentName);
            if (result.success) {
                console.log(chalk.green(`\n✓ Switched to ${agentName}\n`));
            } else {
                console.log(chalk.red(`\n✗ ${result.error}\n`));
            }
        }
    }

    async handleModel(args) {
        const modelName = args[0];
        if (!modelName) {
            console.log(chalk.yellow('\nUsage: /model <model-name>\n'));
        } else {
            const result = await this.agentManager.switchModel(modelName);
            if (result.success) {
                console.log(chalk.green(`\n✓ Switched to ${modelName}\n`));
            } else {
                console.log(chalk.red(`\n✗ ${result.error}\n`));
            }
        }
    }

    handleStatus() {
        console.log(chalk.cyan('\n📊 Active Agents:\n'));
        const agents = this.agentManager.listAgents();
        for (const [name, info] of Object.entries(agents)) {
            const active = info.active ? chalk.green('✓') : ' ';
            console.log(`  ${active} ${name}: ${info.model}`);
        }
        console.log('');
    }
}

module.exports = AgentHandlers;
