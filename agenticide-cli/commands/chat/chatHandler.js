const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const boxen = require('boxen').default || require('boxen');
const fs = require('fs');
const path = require('path');

module.exports = async function chatHandler(context) {
    const {
        options,
        agentManager,
        sessionManager,
        extensionManager,
        CONFIG_DIR,
        banner,
        loadConfig,
        saveConfig,
        loadTasks,
        saveTasks,
        loadProjectContext
    } = context;

    // Handle session loading
    let loadedSession = null;
    let sessionName = options.session;
    
    if (options.continue) {
        const lastSession = sessionManager.getLastSession();
        if (lastSession) {
            const result = sessionManager.loadSession(lastSession);
            if (result.success) {
                loadedSession = result.session;
                sessionName = lastSession;
                console.log(chalk.green(`\n✓ Continuing session: ${chalk.bold(lastSession)}`));
            }
        }
    } else if (sessionName) {
        const result = sessionManager.loadSession(sessionName);
        if (result.success) {
            loadedSession = result.session;
            console.log(chalk.green(`\n✓ Loaded session: ${chalk.bold(sessionName)}`));
        } else {
            console.log(chalk.yellow(`\n⚠️  Session '${sessionName}' not found, starting new session`));
        }
    }

    // Initialize agent
    console.log(chalk.cyan(banner));

    // Delegate to chat loop
    const chatLoop = require('./chatLoop');
    await chatLoop({
        options,
        agentManager,
        sessionManager,
        extensionManager,
        loadedSession,
        sessionName,
        CONFIG_DIR,
        loadConfig,
        saveConfig,
        loadTasks,
        saveTasks,
        loadProjectContext
    });
};
