/**
 * Diff Visualizer - Shows beautiful diffs with colors
 */

const chalk = require('chalk');

class DiffVisualizer {
    /**
     * Display diff with line numbers and colors
     */
    static display(diff, options = {}) {
        const {
            maxLines = 50,
            context = 3,
            showLineNumbers = true
        } = options;

        const diffData = typeof diff === 'string' ? JSON.parse(diff) : diff;
        
        console.log(chalk.bold('\n📊 Changes:\n'));
        
        let lineNum = 1;
        for (const change of diffData) {
            if (change.type === 'same') {
                if (showLineNumbers) {
                    console.log(chalk.gray(`  ${lineNum.toString().padStart(4)} │ ${change.line}`));
                }
                lineNum++;
            } else if (change.type === 'add') {
                console.log(chalk.green(`+ ${lineNum.toString().padStart(4)} │ ${change.line}`));
                lineNum++;
            } else if (change.type === 'remove') {
                console.log(chalk.red(`- ${lineNum.toString().padStart(4)} │ ${change.line}`));
            }
        }
        
        console.log('');
    }

    /**
     * Display compact diff summary
     */
    static displaySummary(stats) {
        const { added, removed, files } = stats;
        
        console.log(chalk.bold('\n📈 Summary:\n'));
        console.log(chalk.green(`  + ${added} lines added`));
        console.log(chalk.red(`  - ${removed} lines removed`));
        if (files) {
            console.log(chalk.cyan(`  📁 ${files} files changed`));
        }
        console.log('');
    }

    /**
     * Display side-by-side diff
     */
    static displaySideBySide(oldContent, newContent, width = 40) {
        const oldLines = (oldContent || '').split('\n');
        const newLines = (newContent || '').split('\n');
        
        console.log(chalk.bold('\n📊 Side-by-Side Comparison:\n'));
        console.log(chalk.red('OLD').padEnd(width) + ' │ ' + chalk.green('NEW'));
        console.log('─'.repeat(width) + '─┼─' + '─'.repeat(width));
        
        const maxLen = Math.max(oldLines.length, newLines.length);
        
        for (let i = 0; i < Math.min(maxLen, 30); i++) {
            const oldLine = (oldLines[i] || '').substring(0, width - 2);
            const newLine = (newLines[i] || '').substring(0, width - 2);
            
            const oldColor = oldLines[i] !== newLines[i] ? chalk.red : chalk.gray;
            const newColor = oldLines[i] !== newLines[i] ? chalk.green : chalk.gray;
            
            console.log(
                oldColor(oldLine.padEnd(width)) + ' │ ' +
                newColor(newLine.padEnd(width))
            );
        }
        
        if (maxLen > 30) {
            console.log(chalk.gray(`\n... (${maxLen - 30} more lines)`));
        }
        
        console.log('');
    }
}

module.exports = { DiffVisualizer };
