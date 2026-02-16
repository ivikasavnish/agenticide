const chalk = require('chalk');

function createConfigSetAction(loadConfig, saveConfig) {
    return (key, value) => {
        const config = loadConfig();
        config[key] = value;
        saveConfig(config);
        console.log(chalk.green(`\n✓ Set ${key} = ${value}\n`));
    };
}

function createConfigShowAction(loadConfig) {
    return () => {
        const config = loadConfig();
        console.log(chalk.cyan('\n⚙️  Configuration:\n'));
        Object.entries(config).forEach(([key, value]) => {
            console.log(`  ${chalk.bold(key)}: ${value}`);
        });
        console.log('');
    };
}

module.exports = {
    createConfigSetAction,
    createConfigShowAction
};
