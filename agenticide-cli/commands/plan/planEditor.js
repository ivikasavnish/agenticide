// Plan Editor - Interactive plan management
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class PlanEditor {
    constructor(planPath) {
        this.planPath = planPath || path.join(process.env.HOME, '.copilot/session-state/*/plan.md');
        this.plan = null;
    }

    show() {
        this._loadPlan();
        console.log(chalk.cyan('\n📋 Current Plan:\n'));
        console.log(this.plan);
    }

    check(taskId) {
        this._loadPlan();
        const lines = this.plan.split('\n');
        let checked = 0;
        
        const newLines = lines.map(line => {
            if (line.match(/^- \[ \]/)) {
                checked++;
                if (checked === taskId) {
                    return line.replace('- [ ]', '- [x]');
                }
            }
            return line;
        });
        
        this._savePlan(newLines.join('\n'));
        console.log(chalk.green(`✅ Checked off task #${taskId}`));
    }

    add(task) {
        this._loadPlan();
        const lines = this.plan.split('\n');
        
        // Find last unchecked task and add after it
        let insertIndex = lines.length;
        for (let i = lines.length - 1; i >= 0; i--) {
            if (lines[i].match(/^- \[ \]/)) {
                insertIndex = i + 1;
                break;
            }
        }
        
        lines.splice(insertIndex, 0, `- [ ] ${task}`);
        this._savePlan(lines.join('\n'));
        console.log(chalk.green(`✅ Added task: ${task}`));
    }

    save() {
        console.log(chalk.green('✅ Plan saved'));
    }

    _loadPlan() {
        if (!this.plan) {
            // Find the actual plan file
            const sessionDir = path.join(process.env.HOME, '.copilot/session-state');
            if (fs.existsSync(sessionDir)) {
                const sessions = fs.readdirSync(sessionDir);
                if (sessions.length > 0) {
                    const planFile = path.join(sessionDir, sessions[sessions.length - 1], 'plan.md');
                    if (fs.existsSync(planFile)) {
                        this.planPath = planFile;
                        this.plan = fs.readFileSync(planFile, 'utf8');
                        return;
                    }
                }
            }
            this.plan = '# Plan\n\n- [ ] First task\n';
        }
    }

    _savePlan(content) {
        if (this.planPath) {
            fs.writeFileSync(this.planPath, content, 'utf8');
        }
        this.plan = content;
    }
}

module.exports = PlanEditor;
