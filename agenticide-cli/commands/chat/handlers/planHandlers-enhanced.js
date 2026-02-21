// Enhanced Plan and Clarifications Handlers with Few-Shot Support
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

    async handleClarify(args) {
        const subcommand = args[0];

        if (!subcommand) {
            // Interactive clarification mode
            return await this._interactiveClarify();
        }

        switch (subcommand) {
            case 'add':
                const question = args.slice(1).join(' ');
                if (!question) {
                    console.log(chalk.red('❌ Usage: /clarify add <question>'));
                    return;
                }
                await this._addCustomQuestion(question);
                break;

            case 'edit':
                const key = args[1];
                if (!key) {
                    console.log(chalk.red('❌ Usage: /clarify edit <id>'));
                    return;
                }
                await this._editQuestion(key);
                break;

            case 'delete':
                const deleteKey = args[1];
                if (!deleteKey) {
                    console.log(chalk.red('❌ Usage: /clarify delete <id>'));
                    return;
                }
                this._deleteQuestion(deleteKey);
                break;

            case 'list':
                this._listQuestions();
                break;

            case 'github-search':
                const searchQuery = args.slice(1).join(' ');
                if (!searchQuery) {
                    console.log(chalk.red('❌ Usage: /clarify github-search <query>'));
                    return;
                }
                await this._githubSearch(searchQuery);
                break;

            case 'few-shot':
                const task = args.slice(1).join(' ');
                if (!task) {
                    console.log(chalk.red('❌ Usage: /clarify few-shot <task>'));
                    return;
                }
                await this._fewShotMode(task);
                break;

            case 'interactive':
                await this._interactiveBuilder();
                break;

            default:
                console.log(chalk.yellow('Usage: /clarify [add|edit|delete|list|github-search|few-shot|interactive]'));
        }
    }

    async _interactiveClarify() {
        console.log(chalk.cyan('\n❓ Clarifying Questions Mode\n'));
        console.log(chalk.gray('I can help clarify requirements before proceeding.\n'));
        
        const type = await this.clarifier.choose(
            'What would you like to clarify?',
            [
                'Requirements for current task',
                'Feature scope and boundaries',
                'Technical approach',
                'Dependencies and constraints',
                'Custom question',
                'Search GitHub for examples',
                'Use few-shot learning'
            ]
        );
        
        if (type === 'Custom question') {
            const question = await this.clarifier.input('Enter your question:');
            const result = await this.clarifier.askWithEdit(question, { allowEdit: true });
            
            this.clarifier.addQuestion(result.question, result.answer, {
                edited: result.edited,
                originalQuestion: result.originalQuestion
            });
            
            console.log(chalk.green(`\n✅ Clarification saved!\n`));
        } else if (type === 'Search GitHub for examples') {
            const query = await this.clarifier.input('Enter search query (e.g., "JWT authentication"):');
            const language = await this.clarifier.choose('Language?', 
                ['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust', 'Java', 'Any']);
            
            await this._githubSearch(query, { language: language === 'Any' ? null : language.toLowerCase() });
        } else if (type === 'Use few-shot learning') {
            const task = await this.clarifier.input('What task do you want help with?');
            await this._fewShotMode(task);
        } else {
            let questions = this._getQuestionSet(type);
            
            // Ask with edit option
            const answers = {};
            for (const q of questions) {
                const result = await this.clarifier.askWithEdit(q.question, {
                    allowEdit: true,
                    allowSkip: true,
                    choices: q.choices
                });
                
                if (!result.skipped) {
                    answers[q.key] = result.answer;
                    
                    // Save to plan
                    const planEditor = new PlanEditor();
                    planEditor.addClarification(result.question, result.answer);
                }
            }
            
            console.log(chalk.green('\n✅ Clarifications saved to plan!\n'));
            console.log(chalk.gray('Summary:'));
            console.log(this.clarifier.getSummary());
        }
    }

    async _addCustomQuestion(question) {
        console.log(chalk.cyan(`\n❓ Question: ${question}\n`));
        
        const answerNow = await this.clarifier.confirm('Would you like to answer this now?', null);
        
        if (answerNow) {
            const answer = await this.clarifier.input('Your answer:');
            const key = this.clarifier.addQuestion(question, answer);
            console.log(chalk.green(`\n✅ Question added and answered! (ID: ${key})\n`));
            
            // Save to plan
            const planEditor = new PlanEditor();
            planEditor.addClarification(question, answer);
        } else {
            const key = this.clarifier.addQuestion(question, null);
            console.log(chalk.green(`\n✅ Question added! Answer later with: /clarify edit ${key}\n`));
        }
    }

    async _editQuestion(key) {
        const questions = this.clarifier.listQuestions();
        const question = questions.find(q => q.key === key);
        
        if (!question) {
            console.log(chalk.red(`❌ Question with ID ${key} not found`));
            return;
        }
        
        console.log(chalk.cyan(`\nCurrent question: ${question.question}`));
        console.log(chalk.gray(`Current answer: ${question.answer || 'Not answered'}\n`));
        
        const newQuestion = await this.clarifier.input('New question text (Enter to keep current):', question.question);
        const newAnswer = await this.clarifier.input('New answer (Enter to keep current):', question.answer || '');
        
        if (newQuestion && newQuestion !== question.question) {
            this.clarifier.editQuestion(key, newQuestion);
        }
        
        if (newAnswer && newAnswer !== question.answer) {
            this.clarifier.clarifications[key].answer = newAnswer;
        }
        
        console.log(chalk.green('\n✅ Question updated!\n'));
    }

    _deleteQuestion(key) {
        const deleted = this.clarifier.deleteQuestion(key);
        if (deleted) {
            console.log(chalk.green(`✅ Question ${key} deleted`));
        } else {
            console.log(chalk.red(`❌ Question ${key} not found`));
        }
    }

    _listQuestions() {
        const questions = this.clarifier.listQuestions();
        
        if (questions.length === 0) {
            console.log(chalk.yellow('\n📋 No questions yet\n'));
            return;
        }
        
        console.log(chalk.cyan(`\n📋 Questions (${questions.length}):\n`));
        
        questions.forEach((q, idx) => {
            console.log(chalk.bold(`[${idx + 1}] ${q.question}`));
            console.log(chalk.gray(`    ID: ${q.key}`));
            if (q.answer) {
                console.log(chalk.green(`    Answer: ${q.answer}`));
            } else {
                console.log(chalk.yellow(`    Answer: Not yet answered`));
            }
            if (q.edited) {
                console.log(chalk.gray(`    (Edited from: "${q.originalQuestion}")`));
            }
            console.log('');
        });
    }

    async _githubSearch(query, options = {}) {
        console.log(chalk.cyan('\n🔍 GitHub Code Search\n'));
        
        const examples = await this.clarifier.searchGitHubExamples(query, {
            language: options.language,
            stars: '>100',
            perPage: 10,
            ...options
        });
        
        if (examples.length === 0) {
            console.log(chalk.yellow('⚠️  No examples found'));
            return;
        }
        
        // Display and let user select
        const selected = await this.clarifier.selectMultiple(
            'Select examples to add to library:',
            examples.map((ex, idx) => ({
                name: `${ex.name} (${ex.repo}) ⭐ ${ex.stars}`,
                value: idx
            }))
        );
        
        if (selected.length > 0) {
            const tags = await this.clarifier.input('Tags (comma-separated):');
            const tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
            
            for (const idx of selected) {
                await this.clarifier.saveExample(examples[idx], tagArray);
            }
            
            console.log(chalk.green(`\n✅ Saved ${selected.length} example(s) to library!\n`));
        }
    }

    async _fewShotMode(task) {
        console.log(chalk.cyan('\n📚 Few-Shot Learning Mode\n'));
        console.log(chalk.gray(`Task: ${task}\n`));
        
        const numExamples = await this.clarifier.choose(
            'How many examples would you like to provide?',
            ['2', '3', '5', 'Custom']
        );
        
        const count = numExamples === 'Custom' 
            ? parseInt(await this.clarifier.input('Enter number:'))
            : parseInt(numExamples);
        
        const examples = [];
        
        console.log(chalk.cyan(`\nPlease provide ${count} examples:\n`));
        
        for (let i = 0; i < count; i++) {
            console.log(chalk.bold(`\nExample ${i + 1}:`));
            const input = await this.clarifier.input('  Input:');
            const output = await this.clarifier.input('  Output:');
            const explanation = await this.clarifier.input('  Explanation (optional):');
            
            examples.push({ input, output, explanation: explanation || undefined });
        }
        
        // Now ask the question with few-shot examples
        const result = await this.clarifier.askWithFewShot(task, examples);
        
        console.log(chalk.green('\n✅ Few-shot learning applied!'));
        console.log(chalk.cyan(`Your answer: ${result.answer}\n`));
        
        // Save to plan
        const planEditor = new PlanEditor();
        planEditor.addClarification(task, result.answer);
    }

    async _interactiveBuilder() {
        console.log(chalk.cyan('\n🔨 Interactive Question Builder\n'));
        console.log(chalk.gray('I will propose questions, you can refine them before answering.\n'));
        
        const category = await this.clarifier.choose(
            'What area are you working on?',
            [
                'API Design',
                'Database Schema',
                'Authentication',
                'UI/UX',
                'Testing Strategy',
                'Deployment',
                'Custom'
            ]
        );
        
        let proposedQuestions = this._getProposedQuestions(category);
        
        if (category === 'Custom') {
            const count = parseInt(await this.clarifier.input('How many questions?'));
            proposedQuestions = [];
            for (let i = 0; i < count; i++) {
                const q = await this.clarifier.input(`Question ${i + 1}:`);
                proposedQuestions.push({ question: q, key: `custom_${i}` });
            }
        }
        
        console.log(chalk.cyan(`\n📝 I will ask ${proposedQuestions.length} questions. You can refine each before answering.\n`));
        
        for (let i = 0; i < proposedQuestions.length; i++) {
            const q = proposedQuestions[i];
            console.log(chalk.cyan(`\n[${i + 1}/${proposedQuestions.length}]`));
            
            const result = await this.clarifier.askWithEdit(q.question, {
                allowEdit: true,
                allowSkip: true
            });
            
            if (!result.skipped) {
                const planEditor = new PlanEditor();
                planEditor.addClarification(result.question, result.answer);
            }
        }
        
        console.log(chalk.green('\n✅ Interactive session complete!\n'));
    }

    _getProposedQuestions(category) {
        const questions = {
            'API Design': [
                { question: 'What HTTP methods will the API support?', key: 'http_methods' },
                { question: 'What authentication mechanism to use?', key: 'auth' },
                { question: 'What versioning strategy?', key: 'versioning' },
                { question: 'What response format (JSON, XML)?', key: 'format' }
            ],
            'Database Schema': [
                { question: 'What database system to use?', key: 'db_system' },
                { question: 'What are the main entities?', key: 'entities' },
                { question: 'What relationships exist between entities?', key: 'relationships' },
                { question: 'What indexing strategy?', key: 'indexes' }
            ],
            'Authentication': [
                { question: 'What authentication method (JWT, Session, OAuth)?', key: 'auth_method' },
                { question: 'Token expiration time?', key: 'token_expiry' },
                { question: 'Support refresh tokens?', key: 'refresh' },
                { question: 'Multi-factor authentication required?', key: 'mfa' }
            ],
            'UI/UX': [
                { question: 'What UI framework/library?', key: 'ui_framework' },
                { question: 'Mobile-first or desktop-first?', key: 'responsive' },
                { question: 'Accessibility requirements?', key: 'a11y' },
                { question: 'Theming support needed?', key: 'theming' }
            ],
            'Testing Strategy': [
                { question: 'What testing framework to use?', key: 'test_framework' },
                { question: 'Target code coverage percentage?', key: 'coverage' },
                { question: 'E2E testing required?', key: 'e2e' },
                { question: 'Performance testing needed?', key: 'perf_test' }
            ],
            'Deployment': [
                { question: 'What deployment platform (AWS, GCP, Azure)?', key: 'platform' },
                { question: 'Containerization (Docker, K8s)?', key: 'containers' },
                { question: 'CI/CD pipeline requirements?', key: 'cicd' },
                { question: 'Monitoring and logging strategy?', key: 'monitoring' }
            ]
        };
        
        return questions[category] || [];
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
