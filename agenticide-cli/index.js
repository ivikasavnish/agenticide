#!/usr/bin/env node

const { Command } = require('commander');
const fs = require('fs');
const path = require('path');
const runtime = require('./utils/runtime');

const program = new Command();
const pkg = require('./package.json');

// Configuration
const CONFIG_DIR = path.join(process.env.HOME, '.agenticide');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const TASKS_FILE = path.join(process.cwd(), '.agenticide-tasks.json');

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// ASCII Art Banner
const runtimeBadge = runtime.isBun ? '⚡ Bun' : 'Node.js';
const banner = `
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   █████╗  ██████╗ ███████╗███╗   ██╗████████╗       ║
║  ██╔══██╗██╔════╝ ██╔════╝████╗  ██║╚══██╔══╝       ║
║  ███████║██║  ███╗█████╗  ██╔██╗ ██║   ██║          ║
║  ██╔══██║██║   ██║██╔══╝  ██║╚██╗██║   ██║          ║
║  ██║  ██║╚██████╔╝███████╗██║ ╚████║   ██║          ║
║  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝          ║
║                                                       ║
║         AGENTICIDE CLI - AI Coding Assistant         ║
║          ACP + MCP | Claude + Copilot                ║
║          Runtime: ${runtimeBadge.padEnd(33)} ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`;

// Utility functions
function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    return { defaultProvider: 'copilot', defaultModel: 'copilot-gpt4' };
}

function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

function loadTasks() {
    if (fs.existsSync(TASKS_FILE)) {
        try {
            const data = JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8'));
            // Support both old array format and new object format
            if (Array.isArray(data)) {
                return { modules: [], tasks: data };
            }
            return data;
        } catch (error) {
            return { modules: [], tasks: [] };
        }
    }
    return { modules: [], tasks: [] };
}

function saveTasks(tasks) {
    fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function loadProjectContext(cwd) {
    const contextFile = path.join(cwd, '.agenticide-context.json');
    if (fs.existsSync(contextFile)) {
        return JSON.parse(fs.readFileSync(contextFile, 'utf8'));
    }
    return null;
}

// Program info
program
    .name('agenticide')
    .description('Agenticide CLI - AI Coding Assistant with ACP + MCP')
    .version(pkg.version);

// Create actions with dependencies
const createActions = require('./actions');
const actions = createActions({
    CONFIG_DIR,
    CONFIG_FILE,
    TASKS_FILE,
    banner,
    loadConfig,
    saveConfig,
    loadTasks,
    saveTasks,
    loadProjectContext
});

// ===== COMMAND DEFINITIONS =====

// Init command
program
    .command('init')
    .description('Initialize Agenticide in current directory')
    .action(actions.init);

// Chat command - Still inline (too complex to extract easily)
// TODO: Refactor chat command in next phase
const chatCommand = require('./commands/chatCommand');
program
    .command('chat')
    .description('Start interactive AI chat with multiple agents')
    .option('-p, --provider <provider>', 'AI provider (claude|copilot|openai|local|auto)', 'copilot')
    .option('-m, --model <model>', 'Specific model to use')
    .option('--list-models', 'List all available models')
    .option('--no-context', 'Disable context sharing')
    .option('-s, --session <name>', 'Named session to save/resume')
    .option('-c, --continue', 'Continue from last session')
    .option('--no-compact', 'Skip auto-compaction on startup')
    .action(chatCommand({
        CONFIG_DIR,
        banner,
        loadConfig,
        saveConfig,
        loadTasks,
        saveTasks,
        loadProjectContext
    }));

// Task commands
program
    .command('task:add <description>')
    .description('Add a new task')
    .action(actions.taskAdd);

program
    .command('task:list')
    .description('List all tasks')
    .action(actions.taskList);

program
    .command('task:complete <id>')
    .description('Mark task as complete')
    .action(actions.taskComplete);

// Config commands
program
    .command('config:set <key> <value>')
    .description('Set configuration value')
    .action(actions.configSet);

program
    .command('config:show')
    .description('Show configuration')
    .action(actions.configShow);

// Analyze command
program
    .command('analyze')
    .description('Analyze current project with LSP and build symbol index')
    .option('--skip-index', 'Skip semantic indexing')
    .action(actions.analyze);

// Status command - Keep inline (simple)
program
    .command('status')
    .description('Show Agenticide status')
    .action(async () => {
        const chalk = require('chalk');
        console.log(chalk.cyan('\n📊 Agenticide Status:\n'));
        console.log(`  Config: ${CONFIG_DIR}`);
        console.log(`  Tasks: ${loadTasks().length}`);
        const context = loadProjectContext(process.cwd());
        if (context) {
            console.log(`  Symbols: ${context.symbols?.length || 0} indexed`);
        }
        console.log('');
    });

// Additional commands from original index.js
require('./commands/additionalCommands')(program, {
    CONFIG_DIR,
    loadConfig,
    saveConfig,
    loadTasks,
    saveTasks,
    loadProjectContext
});

// Help
program.on('--help', () => {
    const chalk = require('chalk');
    console.log('');
    console.log(chalk.cyan('Examples:'));
    console.log('  $ agenticide init');
    console.log('  $ agenticide chat');
    console.log('  $ agenticide task:add "Implement login feature"');
    console.log('  $ agenticide analyze');
    console.log('');
});

// Parse arguments
program.parse(process.argv);

// Default to chat mode if no command specified
if (process.argv.length === 2) {
    const chalk = require('chalk');
    console.log(chalk.cyan(banner));
    console.log(chalk.green('💬 Starting default chat mode...\n'));
    console.log(chalk.gray('Tip: Use "agenticide help" to see all commands\n'));
    
    const chatCommand = program.commands.find(cmd => cmd.name() === 'chat');
    if (chatCommand) {
        chatCommand._actionHandler({
            provider: 'copilot',
            context: true,
            compact: true
        });
    }
}

// Cleanup on exit
process.on('exit', () => {
    // Cleanup code if needed
});

process.on('SIGINT', () => {
    console.log('\n👋 Goodbye!');
    process.exit(0);
});
