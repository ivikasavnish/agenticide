// Plan Editor - Interactive plan management
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const inquirer = require('inquirer');

class PlanEditor {
    constructor(planPath) {
        this.planPath = planPath || path.join(process.env.HOME, '.copilot/session-state/*/plan.md');
        this.plan = null;
        this.metadata = {
            created: null,
            updated: null,
            version: 1,
            clarifications: []
        };
    }

    /**
     * Show current plan
     */
    show() {
        this._loadPlan();
        console.log(chalk.cyan('\n📋 Current Plan:\n'));
        console.log(this.plan);
        
        // Show metadata if available
        if (this.metadata.clarifications && this.metadata.clarifications.length > 0) {
            console.log(chalk.gray('\n📝 Clarifications:'));
            this.metadata.clarifications.forEach((c, i) => {
                console.log(chalk.gray(`  ${i + 1}. ${c.question}`));
                console.log(chalk.gray(`     → ${c.answer}`));
            });
        }
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

    /**
     * Update entire plan with new content
     * @param {string} newPlan - New plan content
     */
    update(newPlan) {
        this._savePlan(newPlan);
        this.metadata.updated = new Date().toISOString();
        this.metadata.version++;
        this._saveMetadata();
        console.log(chalk.green('✅ Plan updated'));
    }

    /**
     * Add clarification to plan metadata
     * @param {string} question - The question
     * @param {string} answer - The answer
     */
    addClarification(question, answer) {
        this._loadPlan();
        this.metadata.clarifications = this.metadata.clarifications || [];
        this.metadata.clarifications.push({
            question,
            answer,
            timestamp: new Date().toISOString()
        });
        this._saveMetadata();
    }

    /**
     * Interactive plan editing
     */
    async edit() {
        this._loadPlan();
        
        const actions = await inquirer.prompt([{
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
                'View current plan',
                'Add a task',
                'Update entire plan',
                'Mark task complete',
                'View clarifications',
                'Cancel'
            ]
        }]);
        
        switch (actions.action) {
            case 'View current plan':
                this.show();
                break;
            case 'Add a task':
                const task = await inquirer.prompt([{
                    type: 'input',
                    name: 'task',
                    message: 'Enter task description:'
                }]);
                this.add(task.task);
                break;
            case 'Update entire plan':
                const newPlan = await inquirer.prompt([{
                    type: 'editor',
                    name: 'content',
                    message: 'Edit plan (opens in editor):',
                    default: this.plan
                }]);
                this.update(newPlan.content);
                break;
            case 'Mark task complete':
                const taskNum = await inquirer.prompt([{
                    type: 'input',
                    name: 'num',
                    message: 'Enter task number to complete:'
                }]);
                this.check(parseInt(taskNum.num));
                break;
            case 'View clarifications':
                this.show();
                break;
        }
    }

    /**
     * Create new plan from template
     * @param {string} goal - Main goal
     * @param {Array<string>} tasks - List of tasks
     * @param {Object} clarifications - Clarifications data
     */
    create(goal, tasks = [], clarifications = {}) {
        // Initialize plan path if not set
        if (!this.planPath) {
            const sessionDir = path.join(process.env.HOME, '.copilot/session-state');
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            
            const sessionId = Date.now().toString();
            const newSessionDir = path.join(sessionDir, sessionId);
            fs.mkdirSync(newSessionDir, { recursive: true });
            
            this.planPath = path.join(newSessionDir, 'plan.md');
        }
        
        let content = `# Plan: ${goal}\n\n`;
        content += `**Goal**: ${goal}\n\n`;
        content += `**Status**: In Progress\n\n`;
        
        if (Object.keys(clarifications).length > 0) {
            content += `## Clarifications\n\n`;
            for (const [key, value] of Object.entries(clarifications)) {
                content += `- **${key}**: ${value}\n`;
            }
            content += '\n';
        }
        
        content += `## Tasks\n\n`;
        if (tasks.length > 0) {
            tasks.forEach(task => {
                content += `- [ ] ${task}\n`;
            });
        } else {
            content += `- [ ] Initial task\n`;
        }
        
        this._savePlan(content);
        this.metadata = {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            version: 1,
            clarifications: Object.entries(clarifications).map(([q, a]) => ({
                question: q,
                answer: a,
                timestamp: new Date().toISOString()
            }))
        };
        this._saveMetadata();
        
        console.log(chalk.green('✅ Plan created'));
        return content;
    }

    save() {
        this._saveMetadata();
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
                        this._loadMetadata();
                        return;
                    }
                }
            }
            this.plan = '# Plan\n\n- [ ] First task\n';
        }
    }

    _savePlan(content) {
        // Ensure directory exists
        if (!this.planPath) {
            // Auto-determine plan path
            const sessionDir = path.join(process.env.HOME, '.copilot/session-state');
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }
            
            // Create a new session directory
            const sessionId = Date.now().toString();
            const newSessionDir = path.join(sessionDir, sessionId);
            fs.mkdirSync(newSessionDir, { recursive: true });
            
            this.planPath = path.join(newSessionDir, 'plan.md');
        }
        
        // Ensure parent directory exists
        const dir = path.dirname(this.planPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(this.planPath, content, 'utf8');
        this.plan = content;
    }

    _loadMetadata() {
        if (this.planPath) {
            const metaPath = this.planPath.replace('.md', '.meta.json');
            if (fs.existsSync(metaPath)) {
                try {
                    this.metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
                } catch (e) {
                    // Ignore invalid metadata
                }
            }
        }
    }

    _saveMetadata() {
        if (this.planPath) {
            const metaPath = this.planPath.replace('.md', '.meta.json');
            fs.writeFileSync(metaPath, JSON.stringify(this.metadata, null, 2), 'utf8');
        }
    }
}

module.exports = PlanEditor;
