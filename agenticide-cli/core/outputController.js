// Output Controller - Controls console output based on verbosity level
const chalk = require('chalk');

class OutputController {
    constructor(options = {}) {
        this.mode = options.mode || 'normal';
        this.showBoxes = options.showBoxes !== false;
    }

    setMode(mode) {
        this.mode = mode;
    }

    log(message, level = 'info') {
        if (this.mode === 'quiet' && level !== 'error') return;
        if (this.mode === 'normal' && level === 'debug') return;
        
        const colors = { debug: chalk.gray, info: chalk.cyan, success: chalk.green, warning: chalk.yellow, error: chalk.red };
        console.log((colors[level] || chalk.white)(message));
    }

    debug(msg) { this.log(msg, 'debug'); }
    info(msg) { this.log(msg, 'info'); }
    success(msg) { this.log(msg, 'success'); }
    warning(msg) { this.log(msg, 'warning'); }
    error(msg) { this.log(msg, 'error'); }

    displayBox(content, options = {}) {
        if (!this.showBoxes || this.mode === 'quiet') {
            if (this.mode !== 'quiet') console.log(content);
            return;
        }
        const boxen = require('boxen').default || require('boxen');
        console.log(boxen(content, { padding: 1, borderStyle: 'round', borderColor: 'cyan', ...options }));
    }

    spinner(message) {
        if (this.mode === 'quiet') {
            return { start: () => {}, stop: () => {}, succeed: () => {}, fail: () => {} };
        }
        return require('ora')(message);
    }
}

module.exports = OutputController;
