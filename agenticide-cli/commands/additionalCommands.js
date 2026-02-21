// Additional commands extracted from index.js
// These are less frequently used commands

const chalk = require('chalk');
const path = require('path');

module.exports = function(program, dependencies) {
    const { CONFIG_DIR, loadConfig, saveConfig, loadTasks, saveTasks, loadProjectContext } = dependencies;

    // Index command
    program
        .command('index')
        .description('Build semantic search index from analyzed code')
        .action(async () => {
            const ora = require('ora');
            const Database = require('better-sqlite3');
            const SemanticSearch = require('../../agenticide-core/semanticSearch');
            
            const spinner = ora('Building semantic index...').start();
            
            try {
                const dbPath = path.join(CONFIG_DIR, 'cli.db');
                const db = new Database(dbPath);
                const search = new SemanticSearch(db);
                
                await search.buildIndex();
                db.close();
                
                spinner.succeed('Semantic index built!');
            } catch (error) {
                spinner.fail(`Failed to build index: ${error.message}`);
            }
        });

    // Search command
    program
        .command('search <query>')
        .description('Search code semantically')
        .option('-n, --num <number>', 'Number of results', '5')
        .action(async (query, options) => {
            const Database = require('better-sqlite3');
            const SemanticSearch = require('../../agenticide-core/semanticSearch');
            
            try {
                const dbPath = path.join(CONFIG_DIR, 'cli.db');
                const db = new Database(dbPath);
                const search = new SemanticSearch(db);
                
                const results = search.search(query, parseInt(options.num));
                
                console.log(chalk.cyan(`\n🔎 Search: "${query}"\n`));
                results.forEach((r, i) => {
                    console.log(chalk.bold(`${i + 1}. ${r.symbol_name}`));
                    console.log(chalk.gray(`   ${r.file_path}:${r.line_number || 'N/A'}`));
                    if (r.score) console.log(chalk.gray(`   Score: ${r.score.toFixed(2)}`));
                });
                console.log('');
                
                db.close();
            } catch (error) {
                console.error(chalk.red(`\n✗ Search failed: ${error.message}\n`));
            }
        });

    // Search stats command
    program
        .command('search-stats')
        .description('Show semantic search statistics')
        .action(async () => {
            const Database = require('better-sqlite3');
            
            try {
                const dbPath = path.join(CONFIG_DIR, 'cli.db');
                const db = new Database(dbPath);
                
                const stats = db.prepare('SELECT COUNT(*) as count FROM symbols').get();
                
                console.log(chalk.cyan('\n📊 Search Statistics:\n'));
                console.log(`  Indexed symbols: ${stats.count}`);
                console.log('');
                
                db.close();
            } catch (error) {
                console.error(chalk.red(`\n✗ Failed to get stats: ${error.message}\n`));
            }
        });

    // Explain command
    program
        .command('explain <file>')
        .description('Explain code in file')
        .action(async (file) => {
            const fs = require('fs');
            const ora = require('ora');
            const { AIAgentManager } = require('../aiAgents');
            
            if (!fs.existsSync(file)) {
                console.log(chalk.red(`\n✗ File not found: ${file}\n`));
                return;
            }
            
            const content = fs.readFileSync(file, 'utf8');
            const spinner = ora('Analyzing code...').start();
            
            try {
                const agentManager = new AIAgentManager();
                await agentManager.initCopilotAgent();
                
                const response = await agentManager.sendMessage(
                    `Explain this code:\n\n\`\`\`\n${content}\n\`\`\``,
                    { context: { file } }
                );
                
                spinner.stop();
                console.log(chalk.cyan('\n📝 Explanation:\n'));
                console.log(response);
                console.log('');
            } catch (error) {
                spinner.fail(`Failed: ${error.message}`);
            }
        });

    // Agent command
    program
        .command('agent')
        .description('Manage AI agents')
        .option('-l, --list', 'List all available agents')
        .option('-m, --models', 'Show available models')
        .option('-i, --init <name>', 'Initialize specific agent')
        .option('-s, --status', 'Show agent status')
        .action(async (options) => {
            const { AIAgentManager } = require('../aiAgents');
            const agentManager = new AIAgentManager();
            
            if (options.list) {
                const agents = agentManager.listAgents();
                console.log(chalk.cyan('\n🤖 Available Agents:\n'));
                agents.forEach(a => {
                    const status = a.available ? chalk.green('✓') : chalk.gray('○');
                    console.log(`  ${status} ${a.name} - ${a.description}`);
                });
                console.log('');
                return;
            }
            
            if (options.models) {
                const models = agentManager.listModels();
                console.log(chalk.cyan('\n🎯 Available Models:\n'));
                models.forEach(m => {
                    console.log(`  ${chalk.bold(m.id)} (${m.provider})`);
                    console.log(chalk.gray(`    ${m.description || 'No description'}`));
                });
                console.log('');
                return;
            }
            
            if (options.status) {
                agentManager.displayAgentStatus();
                return;
            }
            
            // Default: show help
            console.log(chalk.cyan('\n🤖 Agent Manager\n'));
            console.log('Commands:');
            console.log('  --list, -l      List all available agents and models');
            console.log('  --models, -m    Show detailed model information');
            console.log('  --status, -s    Show agent status\n');
        });

    // Model command
    program
        .command('model')
        .description('Manage AI models')
        .option('-l, --list', 'List all models')
        .option('-s, --set <model>', 'Set default model')
        .option('-g, --get', 'Get current default model')
        .action((options) => {
            const config = loadConfig();
            
            if (options.list) {
                const { AIAgentManager } = require('../aiAgents');
                const agentManager = new AIAgentManager();
                const models = agentManager.listModels();
                
                console.log(chalk.cyan('\n🤖 Available Models:\n'));
                models.forEach(m => {
                    const current = config.defaultModel === m.id ? chalk.green(' ← current') : '';
                    console.log(`  ${m.id} (${m.provider})${current}`);
                });
                console.log('');
                return;
            }
            
            if (options.set) {
                config.defaultModel = options.set;
                saveConfig(config);
                console.log(chalk.green(`✓ Default model set to: ${options.set}\n`));
                return;
            }
            
            if (options.get) {
                const model = config.defaultModel || 'copilot-gpt4';
                console.log(chalk.cyan(`Current model: ${model}\n`));
                return;
            }
            
            // Show help
            console.log(chalk.cyan('\n🎯 Model Manager\n'));
            console.log('Options:');
            console.log('  --list, -l           List all available models');
            console.log('  --set <model>, -s    Set default model');
            console.log('  --get, -g            Show current default\n');
        });

    // Workflow command
    program
        .command('workflow <action> [name]')
        .description('Manage development workflows')
        .option('-t, --type <type>', 'Workflow type (full, prototype, custom)')
        .option('-l, --language <lang>', 'Programming language')
        .option('-f, --file <file>', 'Workflow file')
        .option('-o, --output <format>', 'Export format (makefile, taskfile, json)')
        .action(async (action, name, options) => {
            // Workflow implementation (if needed)
            console.log(chalk.yellow('\n⚠️  Workflow command not yet implemented\n'));
        });

    // Next command (task workflow)
    program
        .command('next [module]')
        .description('Show next tasks to implement')
        .action((module, options) => {
            const { TaskTracker } = require('../taskTracker');
            const tracker = new TaskTracker();
            
            if (module) {
                const tasks = tracker.getModuleTasks(module);
                if (!tasks || tasks.length === 0) {
                    console.log(chalk.yellow(`\nNo tasks found for module: ${module}\n`));
                    return;
                }
                
                const { CodeDisplay } = require('../codeDisplay');
                CodeDisplay.displayTaskList(tasks, `Tasks for ${module}`);
            } else {
                console.log(chalk.cyan('\n📝 Next Tasks:\n'));
                const summary = tracker.getSummary();
                const nextTasks = [];
                summary.modules.forEach(mod => {
                    const modTasks = tracker.getModuleTasks(mod.name);
                    const pending = modTasks.filter(t => t.status === 'pending').slice(0, 2);
                    nextTasks.push(...pending.map(t => ({ ...t, module: mod.name })));
                });
                
                nextTasks.slice(0, 5).forEach((task, i) => {
                    console.log(`  ${i + 1}. ${chalk.cyan(task.module)} → ${task.function}`);
                    console.log(chalk.gray(`     ${task.file}:${task.line}`));
                    if (i < 4) console.log('');
                });
                
                if (nextTasks.length > 5) {
                    console.log(chalk.gray(`\n  ... and ${nextTasks.length - 5} more\n`));
                }
            }
            
            console.log(chalk.gray('\nUse: /implement <function> to start working\n'));
        });
};
