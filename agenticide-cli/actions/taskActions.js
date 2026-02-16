const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

function createTaskAddAction(TASKS_FILE, loadTasks, saveTasks) {
    return (description) => {
        const tasks = loadTasks();
        tasks.push({
            id: Date.now(),
            description,
            status: 'pending',
            created: new Date().toISOString()
        });
        saveTasks(tasks);
        console.log(chalk.green(`\n✅ Task added: ${description}\n`));
    };
}

function createTaskListAction(TASKS_FILE, loadTasks) {
    return () => {
        const tasks = loadTasks();
        if (tasks.length === 0) {
            console.log(chalk.yellow('\n📋 No tasks found\n'));
            return;
        }
        
        console.log(chalk.cyan('\n📋 Tasks:\n'));
        tasks.forEach((task, i) => {
            const status = task.status === 'completed' ? chalk.green('✓') : chalk.yellow('○');
            console.log(`  ${status} ${task.description}`);
        });
        console.log('');
    };
}

function createTaskCompleteAction(TASKS_FILE, loadTasks, saveTasks) {
    return (id) => {
        const tasks = loadTasks();
        const task = tasks.find(t => t.id === parseInt(id));
        
        if (!task) {
            console.log(chalk.red(`\n✗ Task not found: ${id}\n`));
            return;
        }
        
        task.status = 'completed';
        task.completed = new Date().toISOString();
        saveTasks(tasks);
        console.log(chalk.green(`\n✅ Task completed: ${task.description}\n`));
    };
}

module.exports = {
    createTaskAddAction,
    createTaskListAction,
    createTaskCompleteAction
};
