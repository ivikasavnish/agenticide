const chalk = require('chalk');
const ora = require('ora');

module.exports = function initAction(banner, loadConfig, saveTasks) {
    return async () => {
        console.log(chalk.cyan(banner));
        
        const spinner = ora('Initializing...').start();
        
        // Create config
        const config = loadConfig();
        
        // Initialize tasks file
        saveTasks([]);
        
        spinner.succeed('Initialized successfully!');
        console.log(chalk.green('\n✅ Agenticide ready in this directory'));
        console.log(chalk.gray('\nRun: agenticide chat'));
    };
};
