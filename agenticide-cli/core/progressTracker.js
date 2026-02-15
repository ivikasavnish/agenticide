// Enhanced Progress Tracker with better visual feedback
const chalk = require('chalk');
const ora = require('ora');

class ProgressTracker {
    constructor() {
        this.tasks = new Map();
        this.currentSpinner = null;
    }

    /**
     * Get status icon with color
     */
    getStatusIcon(status) {
        const icons = {
            'pending': chalk.gray('⏸️  Pending'),
            'queued': chalk.blue('⏳ Queued'),
            'starting': chalk.cyan('🚀 Starting'),
            'in_progress': chalk.yellow('⚙️  In Progress'),
            'completing': chalk.green('🔄 Completing'),
            'done': chalk.green('✓ Done'),
            'success': chalk.green('✅ Success'),
            'failed': chalk.red('✗ Failed'),
            'error': chalk.red('❌ Error'),
            'skipped': chalk.gray('⊘ Skipped'),
            'cancelled': chalk.gray('⊗ Cancelled')
        };
        return icons[status] || chalk.gray(`○ ${status}`);
    }

    /**
     * Start tracking a task
     */
    start(taskId, description, options = {}) {
        const task = {
            id: taskId,
            description,
            status: 'starting',
            startTime: Date.now(),
            steps: [],
            currentStep: null,
            ...options
        };
        
        this.tasks.set(taskId, task);
        
        // Show starting message
        console.log(`${this.getStatusIcon('starting')} ${chalk.bold(description)}`);
        
        return task;
    }

    /**
     * Update task progress with step
     */
    update(taskId, status, step = null, details = null) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        const previousStatus = task.status;
        task.status = status;
        task.currentStep = step;
        
        if (step) {
            task.steps.push({
                step,
                status,
                details,
                timestamp: Date.now()
            });
        }

        // Only show update if status changed or there's a new step
        if (previousStatus !== status || step) {
            const icon = this.getStatusIcon(status);
            const message = step ? `${task.description} - ${step}` : task.description;
            const detailsStr = details ? chalk.gray(` (${details})`) : '';
            
            console.log(`${icon} ${message}${detailsStr}`);
        }
    }

    /**
     * Complete a task
     */
    complete(taskId, finalStatus = 'done', message = null) {
        const task = this.tasks.get(taskId);
        if (!task) return;

        task.status = finalStatus;
        task.endTime = Date.now();
        task.duration = task.endTime - task.startTime;

        const icon = this.getStatusIcon(finalStatus);
        const desc = message || task.description;
        const durationStr = chalk.gray(` (${this.formatDuration(task.duration)})`);
        
        console.log(`${icon} ${chalk.bold(desc)}${durationStr}`);
        
        this.tasks.delete(taskId);
    }

    /**
     * Show progress bar
     */
    showProgress(current, total, label = 'Progress') {
        const percentage = Math.round((current / total) * 100);
        const barLength = 30;
        const filled = Math.round((current / total) * barLength);
        const empty = barLength - filled;
        
        const filledBar = chalk.green('█'.repeat(filled));
        const emptyBar = chalk.gray('░'.repeat(empty));
        const percentStr = chalk.bold(`${percentage}%`);
        const countStr = chalk.gray(`(${current}/${total})`);
        
        console.log(`${label}: ${filledBar}${emptyBar} ${percentStr} ${countStr}`);
    }

    /**
     * Show task summary
     */
    showSummary(tasks) {
        const total = tasks.length;
        const done = tasks.filter(t => t.status === 'done').length;
        const inProgress = tasks.filter(t => t.status === 'in_progress').length;
        const pending = tasks.filter(t => t.status === 'todo').length;
        const failed = tasks.filter(t => t.status === 'failed').length;

        console.log(chalk.bold('\n📊 Task Summary:'));
        console.log(`  ${chalk.green('✓')} Completed:    ${chalk.bold(done)}/${total}`);
        
        if (inProgress > 0) {
            console.log(`  ${chalk.yellow('⚙️')}  In Progress:  ${chalk.bold(inProgress)}`);
        }
        
        if (pending > 0) {
            console.log(`  ${chalk.gray('⏸️')}  Pending:      ${chalk.bold(pending)}`);
        }
        
        if (failed > 0) {
            console.log(`  ${chalk.red('✗')} Failed:       ${chalk.bold(failed)}`);
        }

        // Show progress bar
        if (total > 0) {
            console.log();
            this.showProgress(done, total, '  Overall');
        }
    }

    /**
     * Show live task list
     */
    showTaskList(tasks, options = {}) {
        const showAll = options.showAll || false;
        const maxDisplay = options.maxDisplay || 10;

        console.log(chalk.bold('\n📋 Tasks:\n'));

        const displayTasks = showAll ? tasks : tasks.slice(0, maxDisplay);
        
        displayTasks.forEach((task, index) => {
            const icon = this.getStatusIcon(task.status);
            const number = chalk.gray(`${index + 1}.`);
            const func = chalk.cyan(task.function);
            const file = chalk.gray(`(${task.file})`);
            
            console.log(`  ${number} ${icon} ${func} ${file}`);
        });

        if (!showAll && tasks.length > maxDisplay) {
            const remaining = tasks.length - maxDisplay;
            console.log(chalk.gray(`\n  ... and ${remaining} more tasks`));
        }
    }

    /**
     * Format duration
     */
    formatDuration(ms) {
        if (ms < 1000) return `${ms}ms`;
        if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
        return `${(ms / 60000).toFixed(1)}m`;
    }

    /**
     * Create spinner for long operations
     */
    startSpinner(text) {
        if (this.currentSpinner) {
            this.currentSpinner.stop();
        }
        this.currentSpinner = ora(text).start();
        return this.currentSpinner;
    }

    /**
     * Stop current spinner
     */
    stopSpinner(success = true, text = null) {
        if (this.currentSpinner) {
            if (success) {
                this.currentSpinner.succeed(text);
            } else {
                this.currentSpinner.fail(text);
            }
            this.currentSpinner = null;
        }
    }
}

module.exports = ProgressTracker;
