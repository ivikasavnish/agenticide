// Task Management Handlers
const chalk = require('chalk');

class TaskHandlers {
    constructor(loadTasks) {
        this.loadTasks = loadTasks;
    }

    handleTasks(args) {
        const subCmd = args[0];
        const tasks = this.loadTasks();
        
        if (subCmd === 'summary') {
            console.log(chalk.cyan('\n📋 Task Summary:\n'));
            if (tasks.tasks && tasks.tasks.length > 0) {
                const completed = tasks.tasks.filter(t => t.completed).length;
                const pending = tasks.tasks.length - completed;
                console.log(chalk.gray('Total:'), tasks.tasks.length);
                console.log(chalk.green('Completed:'), completed);
                console.log(chalk.yellow('Pending:'), pending);
                console.log('');
            } else {
                console.log(chalk.gray('  No tasks yet\n'));
            }
        } else if (subCmd === 'list') {
            console.log(chalk.cyan('\n📋 All Tasks:\n'));
            if (tasks.tasks && tasks.tasks.length > 0) {
                tasks.tasks.forEach((t, idx) => {
                    const status = t.completed ? chalk.green('✓') : chalk.gray('○');
                    console.log(`  ${status} ${idx + 1}. ${t.description}`);
                });
                console.log('');
            } else {
                console.log(chalk.gray('  No tasks yet\n'));
            }
        } else if (subCmd === 'next') {
            console.log(chalk.cyan('\n📋 Next Tasks:\n'));
            if (tasks.tasks && tasks.tasks.length > 0) {
                const nextTasks = tasks.tasks.filter(t => !t.completed).slice(0, 5);
                if (nextTasks.length > 0) {
                    nextTasks.forEach((t, idx) => {
                        console.log(`  ${idx + 1}. ${t.description}`);
                        if (t.module) {
                            console.log(chalk.gray(`     Module: ${t.module}`));
                        }
                        if (t.function) {
                            console.log(`  ${chalk.bold(t.function)}`);
                        }
                    });
                    const nextTask = nextTasks[0];
                    if (nextTask.function) {
                        console.log(chalk.gray('\n  Use: /implement ' + nextTask.function + '\n'));
                    } else {
                        console.log('');
                    }
                } else {
                    console.log(chalk.green('  🎉 All tasks completed!\n'));
                }
            } else {
                console.log(chalk.gray('  No tasks yet. Use /stub to generate some!\n'));
            }
        } else {
            console.log(chalk.cyan('\n📋 Task Commands:\n'));
            console.log(chalk.gray('  /tasks summary    - Show task summary'));
            console.log(chalk.gray('  /tasks list       - List all tasks'));
            console.log(chalk.gray('  /tasks next       - Show next tasks to implement'));
            console.log('');
        }
    }
}

module.exports = TaskHandlers;
