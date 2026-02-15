// Code Display - Format and display code with copy support
const chalk = require('chalk');
const boxenModule = require('boxen');
const boxen = boxenModule.default || boxenModule;

class CodeDisplay {
    /**
     * Display code file with syntax highlighting
     */
    static displayFile(filename, content, options = {}) {
        const ext = filename.split('.').pop();
        const lineNumbers = options.lineNumbers !== false;
        
        // Add line numbers if requested
        let displayContent = content;
        if (lineNumbers) {
            const lines = content.split('\n');
            const maxLineNumWidth = String(lines.length).length;
            displayContent = lines.map((line, i) => {
                const lineNum = String(i + 1).padStart(maxLineNumWidth, ' ');
                return chalk.gray(`${lineNum} │ `) + line;
            }).join('\n');
        }

        console.log(boxen(
            chalk.cyan(`📄 ${filename}\n\n`) + displayContent,
            {
                padding: 1,
                margin: { top: 0, bottom: 1, left: 0, right: 0 },
                borderStyle: 'round',
                borderColor: 'cyan',
                title: options.title || undefined,
                titleAlignment: 'left'
            }
        ));

        // Show copy instructions
        if (options.showCopyInstructions !== false) {
            console.log(chalk.gray('  💡 Tip: Select and copy the code above\n'));
        }
    }

    /**
     * Display multiple files in summary
     */
    static displayFileSummary(files) {
        console.log(chalk.green('\n📦 Generated Files:\n'));
        
        const sourceFiles = files.filter(f => !this.isTestFile(f.name));
        const testFiles = files.filter(f => this.isTestFile(f.name));

        if (sourceFiles.length > 0) {
            console.log(chalk.cyan('  Source Files:\n'));
            sourceFiles.forEach(file => {
                console.log(`  ${chalk.yellow('✓')} ${file.name} (${file.stubs} stubs)`);
                if (file.stubList && file.stubList.length > 0) {
                    file.stubList.slice(0, 3).forEach(stub => {
                        console.log(chalk.gray(`      • ${stub.name}()`));
                    });
                    if (file.stubList.length > 3) {
                        console.log(chalk.gray(`      ... and ${file.stubList.length - 3} more`));
                    }
                }
            });
        }

        if (testFiles.length > 0) {
            console.log(chalk.cyan('\n  Test Files:\n'));
            testFiles.forEach(file => {
                console.log(`  ${chalk.green('✓')} ${file.name} (${file.stubs} tests)`);
            });
        }
    }

    /**
     * Check if file is a test file
     */
    static isTestFile(filename) {
        return filename.includes('_test') || 
               filename.includes('.test') || 
               filename.startsWith('test_');
    }

    /**
     * Display diff
     */
    static displayDiff(oldContent, newContent, filename) {
        console.log(chalk.cyan(`\n📝 Changes to ${filename}:\n`));
        
        // Simple diff display (can be enhanced)
        const oldLines = oldContent.split('\n');
        const newLines = newContent.split('\n');
        
        let additions = 0;
        let deletions = 0;
        
        newLines.forEach((line, i) => {
            if (i >= oldLines.length || line !== oldLines[i]) {
                if (line.trim()) {
                    console.log(chalk.green(`+ ${line}`));
                    additions++;
                }
            }
        });

        oldLines.forEach((line, i) => {
            if (i >= newLines.length || line !== newLines[i]) {
                if (line.trim() && !newLines.some(nl => nl === line)) {
                    console.log(chalk.red(`- ${line}`));
                    deletions++;
                }
            }
        });

        console.log(chalk.gray(`\n  +${additions} -${deletions}\n`));
    }

    /**
     * Create pasteable code block
     */
    static createPasteableBlock(filename, content) {
        const separator = '─'.repeat(60);
        return `
${separator}
FILE: ${filename}
${separator}

${content}

${separator}
`;
    }

    /**
     * Display with copy-friendly format
     */
    static displayCopyFriendly(filename, content) {
        console.log(this.createPasteableBlock(filename, content));
        console.log(chalk.gray('💡 Copy the block above (including separators) to paste elsewhere\n'));
    }

    /**
     * Save code to clipboard (if pbcopy available on macOS)
     */
    static async copyToClipboard(content) {
        try {
            const { spawn } = require('child_process');
            const proc = spawn('pbcopy');
            proc.stdin.write(content);
            proc.stdin.end();
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Display code with copy option
     */
    static async displayWithCopyOption(filename, content) {
        this.displayFile(filename, content);
        
        console.log(chalk.cyan('\n📋 Copy Options:\n'));
        console.log(chalk.gray('  1. Select text above and copy manually'));
        
        // Try to copy to clipboard on macOS
        const copied = await this.copyToClipboard(content);
        if (copied) {
            console.log(chalk.green('  2. ✓ Copied to clipboard automatically!'));
        } else {
            console.log(chalk.gray('  2. Auto-copy not available on this system'));
        }
        console.log('');
    }

    /**
     * Display task list
     */
    static displayTaskList(tasks, title = 'Tasks') {
        console.log(chalk.cyan(`\n📋 ${title}:\n`));
        
        if (tasks.length === 0) {
            console.log(chalk.gray('  No tasks\n'));
            return;
        }

        tasks.forEach((task, i) => {
            const checkbox = task.status === 'done' ? chalk.green('✓') : 
                           task.status === 'in_progress' ? chalk.yellow('◐') : 
                           chalk.gray('○');
            const status = task.status === 'done' ? chalk.green('done') :
                          task.status === 'in_progress' ? chalk.yellow('in progress') :
                          chalk.gray('todo');
            
            console.log(`  ${checkbox} ${task.function} (${status})`);
            if (task.file) {
                console.log(chalk.gray(`      ${task.file}:${task.line || '?'}`));
            }
        });
        console.log('');
    }

    /**
     * Display progress bar
     */
    static displayProgress(current, total, label = 'Progress') {
        const percentage = Math.round((current / total) * 100);
        const barLength = 30;
        const filledLength = Math.round((percentage / 100) * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        const color = percentage === 100 ? chalk.green :
                     percentage >= 50 ? chalk.yellow :
                     chalk.red;
        
        console.log(color(`\n${label}: [${bar}] ${percentage}% (${current}/${total})\n`));
    }
}

module.exports = { CodeDisplay };
