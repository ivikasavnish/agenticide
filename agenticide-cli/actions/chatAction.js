const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const boxen = require('boxen').default || require('boxen');
const fs = require('fs');
const path = require('path');

module.exports = function chatAction(dependencies) {
    const {
        CONFIG_DIR,
        banner,
        loadConfig,
        saveConfig,
        loadTasks,
        saveTasks,
        loadProjectContext
    } = dependencies;

    return async (options) => {
        const { AIAgentManager } = require('../aiAgents');
        const Database = require('better-sqlite3');
        const SessionManager = require('../core/sessionManager');
        const AutoCompaction = require('../core/autoCompaction');
        const { ExtensionManager } = require('../core/extensionManager');
        
        const agentManager = new AIAgentManager();
        const sessionManager = new SessionManager();
        const extensionManager = new ExtensionManager();
        
        // Load extensions
        await extensionManager.loadExtensions();
        
        // Run auto-compaction on startup (unless disabled)
        if (options.compact !== false) {
            const dbPath = path.join(CONFIG_DIR, 'cli.db');
            const sessionsDir = sessionManager.sessionsDir;
            
            await AutoCompaction.runOnStartup({
                gitRepoPath: process.cwd(),
                dbPath: fs.existsSync(dbPath) ? dbPath : null,
                sessionsDir
            });
        }

        // Delegate to chat handler module
        const chatHandler = require('../commands/chat/chatHandler');
        await chatHandler({
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
        });
    };
};
