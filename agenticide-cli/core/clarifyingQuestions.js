// Clarifying Questions Handler
// Helps AI ask clarifying questions and collect structured responses

const chalk = require('chalk');
const inquirer = require('inquirer');
const FewShotExamples = require('./fewShotExamples');
const GitHubSearch = require('./githubSearch');

class ClarifyingQuestions {
    constructor(options = {}) {
        this.conversationHistory = [];
        this.clarifications = {};
        this.fewShot = new FewShotExamples();
        this.github = new GitHubSearch(options.mcpClient);
        this.currentExamples = [];
    }

    /**
     * Ask a single clarifying question with optional choices
     * @param {string} question - The question to ask
     * @param {Array<string>} choices - Optional array of choices
     * @param {boolean} allowFreeform - Allow freeform text input (default: true)
     * @returns {Promise<string>} User's answer
     */
    async ask(question, choices = null, allowFreeform = true) {
        console.log('\n' + chalk.yellow('❓ Clarification Needed:'));
        console.log(chalk.white(question));
        
        if (choices && choices.length > 0) {
            // Multiple choice with optional freeform
            const prompt = {
                type: 'list',
                name: 'answer',
                message: 'Please select:',
                choices: allowFreeform ? [...choices, new inquirer.Separator(), 'Other (specify)'] : choices
            };
            
            const result = await inquirer.prompt([prompt]);
            
            if (result.answer === 'Other (specify)' && allowFreeform) {
                const freeform = await inquirer.prompt([{
                    type: 'input',
                    name: 'custom',
                    message: 'Please specify:'
                }]);
                return freeform.custom;
            }
            
            return result.answer;
        } else {
            // Free-form text input
            const result = await inquirer.prompt([{
                type: 'input',
                name: 'answer',
                message: 'Your answer:'
            }]);
            return result.answer;
        }
    }

    /**
     * Ask multiple clarifying questions in sequence
     * @param {Array<{question: string, choices?: string[], key: string}>} questions
     * @returns {Promise<Object>} Map of key -> answer
     */
    async askMultiple(questions) {
        const answers = {};
        
        console.log('\n' + chalk.yellow('❓ I need some clarifications to proceed:'));
        console.log(chalk.gray(`   ${questions.length} question${questions.length > 1 ? 's' : ''} to answer\n`));
        
        for (let i = 0; i < questions.length; i++) {
            const q = questions[i];
            console.log(chalk.cyan(`\n[${i + 1}/${questions.length}]`));
            
            const answer = await this.ask(q.question, q.choices, q.allowFreeform !== false);
            answers[q.key] = answer;
            
            // Store in clarifications history
            this.clarifications[q.key] = {
                question: q.question,
                answer: answer,
                timestamp: new Date().toISOString()
            };
        }
        
        console.log('\n' + chalk.green('✅ All questions answered'));
        return answers;
    }

    /**
     * Confirm a plan or action
     * @param {string} message - What to confirm
     * @param {string} details - Optional details to show
     * @returns {Promise<boolean>} true if confirmed
     */
    async confirm(message, details = null) {
        if (details) {
            console.log('\n' + chalk.cyan('ℹ️  Details:'));
            console.log(chalk.gray(details));
        }
        
        const result = await inquirer.prompt([{
            type: 'confirm',
            name: 'confirmed',
            message: chalk.yellow(message),
            default: false
        }]);
        
        return result.confirmed;
    }

    /**
     * Present options and let user choose
     * @param {string} message - Prompt message
     * @param {Array<string|{name: string, value: any}>} options - Options to choose from
     * @returns {Promise<any>} Selected option value
     */
    async choose(message, options) {
        console.log('\n' + chalk.cyan('🔍 Selection:'));
        
        const result = await inquirer.prompt([{
            type: 'list',
            name: 'choice',
            message: message,
            choices: options
        }]);
        
        return result.choice;
    }

    /**
     * Let user select multiple items
     * @param {string} message - Prompt message
     * @param {Array<string|{name: string, value: any}>} options - Options to choose from
     * @returns {Promise<Array>} Selected option values
     */
    async selectMultiple(message, options) {
        console.log('\n' + chalk.cyan('☑️  Multiple Selection:'));
        
        const result = await inquirer.prompt([{
            type: 'checkbox',
            name: 'selections',
            message: message,
            choices: options
        }]);
        
        return result.selections;
    }

    /**
     * Ask for text input with validation
     * @param {string} message - Prompt message
     * @param {Function} validate - Optional validation function
     * @returns {Promise<string>} User input
     */
    async input(message, validate = null) {
        const promptConfig = {
            type: 'input',
            name: 'value',
            message: message
        };
        
        if (validate) {
            promptConfig.validate = validate;
        }
        
        const result = await inquirer.prompt([promptConfig]);
        return result.value;
    }

    /**
     * Get clarification summary for AI context
     * @returns {string} Formatted summary of all clarifications
     */
    getSummary() {
        if (Object.keys(this.clarifications).length === 0) {
            return 'No clarifications collected yet.';
        }
        
        let summary = 'Clarifications collected:\n';
        for (const [key, data] of Object.entries(this.clarifications)) {
            summary += `- ${data.question}\n  → ${data.answer}\n`;
        }
        return summary;
    }

    /**
     * Get all clarifications as structured data
     * @returns {Object} Map of all clarifications
     */
    getAll() {
        return { ...this.clarifications };
    }

    /**
     * Clear all clarifications
     */
    clear() {
        this.clarifications = {};
    }

    /**
     * Save clarifications to file
     * @param {string} filepath - Path to save to
     */
    save(filepath) {
        const fs = require('fs');
        const path = require('path');
        
        const dir = path.dirname(filepath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(
            filepath,
            JSON.stringify({
                clarifications: this.clarifications,
                timestamp: new Date().toISOString()
            }, null, 2),
            'utf8'
        );
    }

    /**
     * Load clarifications from file
     * @param {string} filepath - Path to load from
     */
    load(filepath) {
        const fs = require('fs');
        
        if (fs.existsSync(filepath)) {
            const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
            this.clarifications = data.clarifications || {};
        }
    }

    /**
     * Ask with option to edit question first
     * @param {string} question - The question to ask
     * @param {Object} options - Options (choices, allowEdit, allowSkip)
     * @returns {Promise<Object>} { question, answer, edited }
     */
    async askWithEdit(question, options = {}) {
        const { choices = null, allowEdit = true, allowSkip = false } = options;

        let finalQuestion = question;
        let wasEdited = false;

        if (allowEdit) {
            console.log('\n' + chalk.yellow('❓ Question:'));
            console.log(chalk.white(question));
            console.log('');

            const actions = ['Answer now', 'Edit question'];
            if (allowSkip) actions.push('Skip');

            const action = await inquirer.prompt([{
                type: 'list',
                name: 'action',
                message: 'What would you like to do?',
                choices: actions
            }]);

            if (action.action === 'Skip') {
                return { question, answer: null, skipped: true };
            }

            if (action.action === 'Edit question') {
                const edited = await inquirer.prompt([{
                    type: 'input',
                    name: 'newQuestion',
                    message: 'Enter revised question:',
                    default: question
                }]);

                finalQuestion = edited.newQuestion;
                wasEdited = true;

                console.log(chalk.green(`\n✏️  Updated question: "${finalQuestion}"\n`));
            }
        }

        const answer = await this.ask(finalQuestion, choices, options.allowFreeform !== false);

        return {
            originalQuestion: question,
            question: finalQuestion,
            answer,
            edited: wasEdited
        };
    }

    /**
     * Ask question with GitHub code examples
     * @param {string} question - The question
     * @param {string} searchQuery - GitHub search query
     * @param {Object} options - Search and display options
     * @returns {Promise<Object>} { question, answer, examples }
     */
    async askWithGitHubExamples(question, searchQuery, options = {}) {
        console.log(chalk.yellow(`\n❓ ${question}\n`));
        console.log(chalk.gray('Let me find some examples...\n'));

        // Search GitHub
        const results = await this.github.searchCode(searchQuery, options);

        if (results.length === 0) {
            console.log(chalk.yellow('⚠️  No examples found, proceeding without examples\n'));
            const answer = await this.ask(question, options.choices);
            return { question, answer, examples: [] };
        }

        // Display results
        this.github.displayResults(results, { maxResults: 5, showSnippets: true });

        // Let user select examples
        const selection = await inquirer.prompt([{
            type: 'checkbox',
            name: 'selected',
            message: 'Select examples to include (or none to continue):',
            choices: results.map((r, idx) => ({
                name: `${r.name} (${r.repo}) ⭐ ${r.stars}`,
                value: idx
            }))
        }]);

        const selectedExamples = selection.selected.map(idx => results[idx]);
        this.currentExamples = selectedExamples;

        if (selectedExamples.length > 0) {
            console.log(chalk.green(`\n✅ Added ${selectedExamples.length} example(s) to context\n`));
        }

        // Ask the question
        const answer = await this.ask(question, options.choices);

        return {
            question,
            answer,
            examples: selectedExamples,
            searchQuery
        };
    }

    /**
     * Ask question with few-shot examples
     * @param {string} question - The question
     * @param {Array} fewShotExamples - Array of {input, output, explanation}
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} { question, answer, examples }
     */
    async askWithFewShot(question, fewShotExamples, options = {}) {
        console.log('\n');
        
        // Display few-shot examples
        this.fewShot.displayFewShotExamples(fewShotExamples);

        // Ask the question
        console.log(chalk.yellow(`❓ ${question}\n`));
        const answer = await this.ask(question, options.choices, options.allowFreeform !== false);

        return {
            question,
            answer,
            fewShot: fewShotExamples
        };
    }

    /**
     * Ask question with code examples
     * @param {string} question - The question
     * @param {Array} examples - Array of code examples
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} { question, answer, examples }
     */
    async askWithExamples(question, examples, options = {}) {
        console.log(chalk.yellow(`\n❓ ${question}\n`));

        // Display examples
        this.fewShot.displayExamples(examples, { showCode: true, maxSnippetLines: 15 });

        // Option to view more details
        const viewMore = await inquirer.prompt([{
            type: 'confirm',
            name: 'view',
            message: 'Would you like to view more details?',
            default: false
        }]);

        if (viewMore.view) {
            // Show detailed view (could open in editor or show full code)
            console.log(chalk.gray('\n(Use /examples view <id> to see full code)\n'));
        }

        // Ask the question
        const answer = await this.ask(question, options.choices, options.allowFreeform !== false);

        return {
            question,
            answer,
            examples,
            hasExamples: true
        };
    }

    /**
     * Search GitHub and return examples
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Examples
     */
    async searchGitHubExamples(query, options = {}) {
        return await this.github.searchCode(query, options);
    }

    /**
     * Add question to clarifications
     * @param {string} question - Question text
     * @param {string} answer - Answer text
     * @param {Object} metadata - Additional metadata
     */
    addQuestion(question, answer, metadata = {}) {
        // Generate unique key with counter to avoid collision
        let key;
        let counter = 0;
        do {
            key = `q_${Date.now()}_${counter}`;
            counter++;
        } while (this.clarifications[key]);
        
        this.clarifications[key] = {
            question,
            answer,
            timestamp: new Date().toISOString(),
            ...metadata
        };
        return key;
    }

    /**
     * Edit existing question
     * @param {string} key - Question key
     * @param {string} newQuestion - New question text
     */
    editQuestion(key, newQuestion) {
        if (this.clarifications[key]) {
            this.clarifications[key].originalQuestion = this.clarifications[key].question;
            this.clarifications[key].question = newQuestion;
            this.clarifications[key].edited = true;
            this.clarifications[key].editedAt = new Date().toISOString();
            return true;
        }
        return false;
    }

    /**
     * Delete question
     * @param {string} key - Question key
     */
    deleteQuestion(key) {
        if (this.clarifications[key]) {
            delete this.clarifications[key];
            return true;
        }
        return false;
    }

    /**
     * List all questions
     * @returns {Array} Array of questions
     */
    listQuestions() {
        return Object.entries(this.clarifications).map(([key, data]) => ({
            key,
            ...data
        }));
    }

    /**
     * Get current examples in context
     */
    getCurrentExamples() {
        return this.currentExamples;
    }

    /**
     * Save example to library
     * @param {Object} example - Example to save
     * @param {Array} tags - Tags for categorization
     */
    async saveExample(example, tags = []) {
        return await this.fewShot.saveToLibrary(example, tags);
    }

    /**
     * Load examples from library
     * @param {Array} tags - Tags to filter by
     */
    async loadExamples(tags = []) {
        return await this.fewShot.loadFromLibrary(tags);
    }
}

module.exports = ClarifyingQuestions;
