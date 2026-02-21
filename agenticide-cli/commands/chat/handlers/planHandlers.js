// Plan and Clarification Handlers
const chalk = require('chalk');
const fs = require('fs');
const PlanEditor = require('../../plan/planEditor');

class PlanHandlers {
    constructor(clarifier) {
        this.clarifier = clarifier;
    }

    async handlePlan(args) {
        const planEditor = new PlanEditor();
        const subCmd = args[0];
        
        if (subCmd === 'create') {
            const goal = args.slice(1).join(' ');
            if (!goal) {
                console.log(chalk.red('\n✗ Please specify a goal\n'));
                console.log(chalk.gray('Usage: /plan create <goal>\n'));
            } else {
                const clarifications = await this.clarifier.askMultiple([
                    { question: 'What is the expected timeline?', key: 'timeline', choices: ['Hours', 'Days', 'Weeks', 'Months'] },
                    { question: 'What is the priority?', key: 'priority', choices: ['High', 'Medium', 'Low'] },
                    { question: 'Are there any dependencies or blockers?', key: 'blockers' }
                ]);
                
                const tasks = await this.clarifier.input('Enter initial tasks (comma-separated):');
                const taskList = tasks.split(',').map(t => t.trim()).filter(t => t);
                
                planEditor.create(goal, taskList, clarifications);
                console.log(chalk.green('\n✅ Plan created successfully!\n'));
                planEditor.show();
            }
        } else if (subCmd === 'show') {
            planEditor.show();
        } else if (subCmd === 'edit') {
            await planEditor.edit();
        } else if (subCmd === 'update') {
            console.log(chalk.cyan('\n📝 Updating plan...\n'));
            const newContent = await this.clarifier.input('Enter new plan content (or path to file):');
            if (fs.existsSync(newContent)) {
                const content = fs.readFileSync(newContent, 'utf8');
                planEditor.update(content);
            } else {
                planEditor.update(newContent);
            }
        } else {
            planEditor.show();
        }
    }

    async handleClarify() {
        console.log(chalk.cyan('\n❓ Clarifying Questions Mode\n'));
        console.log(chalk.gray('I can help clarify requirements before proceeding.\n'));
        
        const type = await this.clarifier.choose(
            'What would you like to clarify?',
            [
                'Requirements for current task',
                'Feature scope and boundaries',
                'Technical approach',
                'Dependencies and constraints',
                'Custom question'
            ]
        );
        
        if (type === 'Custom question') {
            const question = await this.clarifier.input('Enter your question:');
            const answer = await this.clarifier.input('Your answer:');
            console.log(chalk.green(`\n✅ Clarification saved: ${question} → ${answer}\n`));
        } else {
            let questions = this._getQuestionSet(type);
            const answers = await this.clarifier.askMultiple(questions);
            
            const planEditor = new PlanEditor();
            Object.entries(answers).forEach(([key, value]) => {
                planEditor.addClarification(questions.find(q => q.key === key).question, value);
            });
            
            console.log(chalk.green('\n✅ Clarifications saved to plan!\n'));
            console.log(chalk.gray('Summary:'));
            console.log(this.clarifier.getSummary());
        }
    }

    _getQuestionSet(type) {
        const sets = {
            'Requirements for current task': [
                { question: 'What is the main goal?', key: 'goal' },
                { question: 'What are the acceptance criteria?', key: 'criteria' },
                { question: 'Are there any constraints?', key: 'constraints' }
            ],
            'Feature scope and boundaries': [
                { question: 'What is included in this feature?', key: 'included' },
                { question: 'What is explicitly excluded?', key: 'excluded' },
                { question: 'What are the edge cases to handle?', key: 'edge_cases' }
            ],
            'Technical approach': [
                { question: 'Which technology stack to use?', key: 'stack' },
                { question: 'What design patterns to apply?', key: 'patterns' },
                { question: 'Are there performance requirements?', key: 'performance' }
            ],
            'Dependencies and constraints': [
                { question: 'What are the dependencies?', key: 'dependencies' },
                { question: 'What are the constraints?', key: 'constraints' },
                { question: 'What are the risks?', key: 'risks' }
            ]
        };
        return sets[type] || [];
    }
}

module.exports = PlanHandlers;
