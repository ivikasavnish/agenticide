// Few-Shot Examples Manager
// Handles example-based learning and GitHub code search integration

const chalk = require('chalk');
const fs = require('fs').promises;
const path = require('path');

class FewShotExamples {
    constructor() {
        this.examples = [];
        this.libraryPath = path.join(process.env.HOME || process.env.USERPROFILE, '.agenticide', 'examples');
        this.githubMCP = null;
        this.initLibrary();
    }

    async initLibrary() {
        try {
            await fs.mkdir(this.libraryPath, { recursive: true });
        } catch (error) {
            // Library directory exists or can't be created
        }
    }

    /**
     * Search GitHub for code examples using MCP
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Array of code examples
     */
    async searchGitHub(query, options = {}) {
        const {
            language = 'javascript',
            stars = '>100',
            limit = 10,
            sort = 'stars'
        } = options;

        try {
            // Use GitHub MCP server if available
            const searchQuery = `${query} language:${language} stars:${stars}`;
            
            console.log(chalk.gray(`🔍 Searching GitHub: ${searchQuery}\n`));

            // This will be called via MCP - placeholder for now
            // In real implementation, this calls the GitHub MCP search_code tool
            const results = await this._searchGitHubCode(searchQuery, { limit, sort });
            
            return results.map((item, idx) => ({
                id: `github_${idx}`,
                type: 'github',
                title: item.name || path.basename(item.path),
                file: item.path,
                repo: item.repository?.full_name || 'unknown',
                url: item.html_url,
                score: item.score,
                stars: item.repository?.stargazers_count || 0,
                snippet: item.text_matches?.[0]?.fragment || '',
                language: item.language || language,
                metadata: {
                    updated: item.repository?.updated_at,
                    description: item.repository?.description
                }
            }));
        } catch (error) {
            console.log(chalk.yellow(`⚠️  GitHub search unavailable: ${error.message}`));
            return [];
        }
    }

    /**
     * Placeholder for GitHub MCP integration
     * Will be replaced with actual MCP call
     */
    async _searchGitHubCode(query, options) {
        // This will interface with GitHub MCP server
        // For now, return mock data for testing
        return [];
    }

    /**
     * Add code example to a question
     * @param {string} question - The question
     * @param {Array|Object} examples - Examples to attach
     * @returns {Object} Enhanced question with examples
     */
    enrichQuestion(question, examples) {
        if (!Array.isArray(examples)) {
            examples = [examples];
        }

        return {
            question,
            examples: examples.map(ex => this._normalizeExample(ex)),
            hasExamples: true,
            exampleCount: examples.length
        };
    }

    /**
     * Create few-shot prompt with examples
     * @param {string} task - The task to perform
     * @param {Array} examples - Few-shot examples
     * @returns {Object} Few-shot prompt structure
     */
    createFewShotPrompt(task, examples) {
        return {
            task,
            examples: examples.map((ex, idx) => ({
                id: `shot_${idx}`,
                input: ex.input || ex.question,
                output: ex.output || ex.answer,
                explanation: ex.explanation
            })),
            prompt: this._buildFewShotPrompt(task, examples)
        };
    }

    /**
     * Build few-shot prompt text
     */
    _buildFewShotPrompt(task, examples) {
        let prompt = `Here are some examples to guide you:\n\n`;
        
        examples.forEach((ex, idx) => {
            prompt += `Example ${idx + 1}:\n`;
            prompt += `  Input: ${ex.input}\n`;
            prompt += `  Output: ${ex.output}\n`;
            if (ex.explanation) {
                prompt += `  Why: ${ex.explanation}\n`;
            }
            prompt += `\n`;
        });

        prompt += `Now, following these patterns:\n${task}`;
        return prompt;
    }

    /**
     * Display examples to user
     * @param {Array} examples - Examples to display
     * @param {Object} options - Display options
     */
    displayExamples(examples, options = {}) {
        const { showCode = true, showMetadata = true, maxSnippetLines = 10 } = options;

        console.log(chalk.cyan(`\n📚 Found ${examples.length} example${examples.length > 1 ? 's' : ''}:\n`));

        examples.forEach((ex, idx) => {
            console.log(chalk.bold(`[${idx + 1}] ${ex.title || 'Untitled'}`));
            
            if (ex.type === 'github') {
                console.log(chalk.gray(`    ⭐ ${ex.stars || 0} - ${ex.repo}`));
                console.log(chalk.blue(`    ${ex.url}`));
            }

            if (showMetadata && ex.metadata?.description) {
                console.log(chalk.gray(`    ${ex.metadata.description.slice(0, 80)}...`));
            }

            if (showCode && ex.snippet) {
                const lines = ex.snippet.split('\n').slice(0, maxSnippetLines);
                console.log(chalk.gray('    Preview:'));
                lines.forEach(line => {
                    console.log(chalk.gray(`    │ ${line}`));
                });
                if (ex.snippet.split('\n').length > maxSnippetLines) {
                    console.log(chalk.gray(`    │ ... (${ex.snippet.split('\n').length - maxSnippetLines} more lines)`));
                }
            }

            console.log(''); // Empty line between examples
        });
    }

    /**
     * Display few-shot examples before asking question
     * @param {Array} examples - Few-shot examples
     */
    displayFewShotExamples(examples) {
        console.log(chalk.cyan('\n📚 Let me show you some examples first:\n'));

        examples.forEach((ex, idx) => {
            console.log(chalk.bold(`Example ${idx + 1}:`));
            console.log(chalk.gray(`  Input:  ${ex.input}`));
            console.log(chalk.green(`  Output: ${ex.output}`));
            if (ex.explanation) {
                console.log(chalk.yellow(`  Why:    ${ex.explanation}`));
            }
            console.log('');
        });

        console.log(chalk.cyan('Now, following these patterns:\n'));
    }

    /**
     * Save example to library
     * @param {Object} example - Example to save
     * @param {Array<string>} tags - Tags for categorization
     */
    async saveToLibrary(example, tags = []) {
        const normalized = this._normalizeExample(example);
        normalized.tags = tags;
        normalized.id = `lib_${Date.now()}`;
        normalized.savedAt = new Date().toISOString();

        const filename = `${normalized.id}.json`;
        const filepath = path.join(this.libraryPath, filename);

        await fs.writeFile(filepath, JSON.stringify(normalized, null, 2));
        
        console.log(chalk.green(`✅ Saved to library: ${filename}`));
        console.log(chalk.gray(`   Tags: ${tags.join(', ')}`));
        
        return normalized.id;
    }

    /**
     * Load examples from library by tags
     * @param {Array<string>} tags - Tags to filter by
     * @returns {Promise<Array>} Matching examples
     */
    async loadFromLibrary(tags = []) {
        try {
            const files = await fs.readdir(this.libraryPath);
            const examples = [];

            for (const file of files) {
                if (!file.endsWith('.json')) continue;

                const filepath = path.join(this.libraryPath, file);
                const content = await fs.readFile(filepath, 'utf-8');
                const example = JSON.parse(content);

                // Filter by tags if provided
                if (tags.length === 0 || tags.some(tag => example.tags?.includes(tag))) {
                    examples.push(example);
                }
            }

            return examples;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Could not load library: ${error.message}`));
            return [];
        }
    }

    /**
     * List all examples in library
     */
    async listLibrary() {
        const examples = await this.loadFromLibrary();
        
        if (examples.length === 0) {
            console.log(chalk.yellow('📚 Library is empty'));
            return;
        }

        console.log(chalk.cyan(`\n📚 Example Library (${examples.length} items):\n`));

        examples.forEach((ex, idx) => {
            console.log(chalk.bold(`[${idx + 1}] ${ex.title || ex.id}`));
            console.log(chalk.gray(`    Type: ${ex.type}`));
            if (ex.tags && ex.tags.length > 0) {
                console.log(chalk.gray(`    Tags: ${ex.tags.join(', ')}`));
            }
            if (ex.language) {
                console.log(chalk.gray(`    Language: ${ex.language}`));
            }
            console.log('');
        });
    }

    /**
     * Normalize example to standard format
     */
    _normalizeExample(example) {
        if (typeof example === 'string') {
            // Assume it's code
            return {
                type: 'code',
                code: example,
                language: 'text'
            };
        }

        if (example.url) {
            return {
                type: 'url',
                url: example.url,
                title: example.title,
                ...example
            };
        }

        if (example.code) {
            return {
                type: 'code',
                code: example.code,
                language: example.language || 'text',
                title: example.title,
                ...example
            };
        }

        if (example.file) {
            return {
                type: 'file',
                file: example.file,
                ...example
            };
        }

        return example;
    }

    /**
     * Fetch code from GitHub URL
     * @param {string} url - GitHub file URL
     * @returns {Promise<Object>} Code content and metadata
     */
    async fetchGitHubFile(url) {
        try {
            // Extract owner, repo, path from URL
            const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)/);
            if (!match) {
                throw new Error('Invalid GitHub URL format');
            }

            const [, owner, repo, ref, filepath] = match;
            
            console.log(chalk.gray(`📥 Fetching ${owner}/${repo}/${filepath}...`));

            // This will use GitHub MCP get_file_contents
            const content = await this._fetchGitHubFileContent(owner, repo, filepath, ref);

            return {
                type: 'github',
                title: path.basename(filepath),
                file: filepath,
                repo: `${owner}/${repo}`,
                url,
                code: content,
                language: this._detectLanguage(filepath)
            };
        } catch (error) {
            console.log(chalk.red(`❌ Failed to fetch: ${error.message}`));
            return null;
        }
    }

    /**
     * Placeholder for GitHub file fetch via MCP
     */
    async _fetchGitHubFileContent(owner, repo, path, ref) {
        // Will use GitHub MCP get_file_contents tool
        return '';
    }

    /**
     * Detect programming language from file extension
     */
    _detectLanguage(filepath) {
        const ext = path.extname(filepath).toLowerCase();
        const langMap = {
            '.js': 'javascript',
            '.ts': 'typescript',
            '.py': 'python',
            '.rb': 'ruby',
            '.go': 'go',
            '.rs': 'rust',
            '.java': 'java',
            '.cpp': 'cpp',
            '.c': 'c',
            '.cs': 'csharp',
            '.php': 'php',
            '.swift': 'swift',
            '.kt': 'kotlin',
            '.sh': 'bash',
            '.md': 'markdown',
            '.json': 'json',
            '.yaml': 'yaml',
            '.yml': 'yaml'
        };
        return langMap[ext] || 'text';
    }

    /**
     * Get example statistics
     */
    getStats() {
        return {
            totalExamples: this.examples.length,
            libraryPath: this.libraryPath
        };
    }

    /**
     * Clear all examples
     */
    clear() {
        this.examples = [];
    }
}

module.exports = FewShotExamples;
