// Task Cancellation Handler - ESC key support
const readline = require('readline');
const chalk = require('chalk');

class TaskCancellation {
    constructor() {
        this.cancelRequested = false;
        this.currentTask = null;
        this.keyListener = null;
        this.cleanupFns = [];
    }

    /**
     * Start listening for ESC key during a task
     */
    startListening(taskName) {
        this.cancelRequested = false;
        this.currentTask = taskName;

        // Set raw mode to capture ESC key
        if (process.stdin.isTTY) {
            readline.emitKeypressEvents(process.stdin);
            process.stdin.setRawMode(true);

            this.keyListener = (str, key) => {
                // ESC key pressed
                if (key && key.name === 'escape') {
                    this.requestCancel();
                }
                // Ctrl+C as fallback
                if (key && key.ctrl && key.name === 'c') {
                    console.log(chalk.red('\n\n⚠️  Force exit (Ctrl+C)'));
                    process.exit(0);
                }
            };

            process.stdin.on('keypress', this.keyListener);
        }
    }

    /**
     * Stop listening for keys
     */
    stopListening() {
        if (process.stdin.isTTY) {
            if (this.keyListener) {
                process.stdin.removeListener('keypress', this.keyListener);
                this.keyListener = null;
            }
            
            try {
                process.stdin.setRawMode(false);
            } catch (error) {
                // Ignore errors if stdin is already in normal mode
            }
        }
        
        this.currentTask = null;
    }

    /**
     * Request cancellation
     */
    requestCancel() {
        if (!this.cancelRequested && this.currentTask) {
            this.cancelRequested = true;
            console.log(chalk.yellow(`\n\n⚠️  Canceling task: ${this.currentTask}...`));
            console.log(chalk.gray('(Please wait for cleanup)'));
            
            // Run cleanup functions
            this.runCleanup();
        }
    }

    /**
     * Check if cancellation was requested
     */
    isCancelRequested() {
        return this.cancelRequested;
    }

    /**
     * Reset cancellation state
     */
    reset() {
        this.cancelRequested = false;
        this.currentTask = null;
        this.cleanupFns = [];
    }

    /**
     * Register a cleanup function to run on cancellation
     */
    onCancel(cleanupFn) {
        if (typeof cleanupFn === 'function') {
            this.cleanupFns.push(cleanupFn);
        }
    }

    /**
     * Run all cleanup functions
     */
    runCleanup() {
        for (const fn of this.cleanupFns) {
            try {
                fn();
            } catch (error) {
                // Silently handle cleanup errors
            }
        }
        this.cleanupFns = [];
    }

    /**
     * Wrap an async task with cancellation support
     */
    async withCancellation(taskName, taskFn, options = {}) {
        const { cleanupFn, checkInterval = 100 } = options;

        // Register cleanup if provided
        if (cleanupFn) {
            this.onCancel(cleanupFn);
        }

        // Start listening
        this.startListening(taskName);

        try {
            // For Promise-based tasks, we can't truly interrupt them
            // But we can check periodically if it's an iterative task
            const result = await taskFn(() => this.isCancelRequested());
            
            if (this.isCancelRequested()) {
                return { canceled: true, result: null };
            }
            
            return { canceled: false, result };
        } catch (error) {
            if (this.isCancelRequested()) {
                return { canceled: true, error: 'Task canceled by user' };
            }
            throw error;
        } finally {
            this.stopListening();
            this.reset();
        }
    }

    /**
     * Create a cancelable spinner
     */
    createCancelableSpinner(ora, text, taskName) {
        const spinner = ora(text).start();
        
        this.startListening(taskName);
        
        // Add ESC hint to spinner
        spinner.text = `${text} ${chalk.gray('(Press ESC to cancel)')}`;

        const originalStop = spinner.stop.bind(spinner);
        const originalSucceed = spinner.succeed.bind(spinner);
        const originalFail = spinner.fail.bind(spinner);

        // Override stop methods to cleanup listener
        spinner.stop = () => {
            this.stopListening();
            this.reset();
            return originalStop();
        };

        spinner.succeed = (text) => {
            this.stopListening();
            this.reset();
            return originalSucceed(text);
        };

        spinner.fail = (text) => {
            this.stopListening();
            this.reset();
            return originalFail(text);
        };

        return spinner;
    }

    /**
     * Show cancellation hint message
     */
    showHint() {
        return chalk.gray('  Press ESC to cancel, Ctrl+C to force exit');
    }
}

module.exports = TaskCancellation;
