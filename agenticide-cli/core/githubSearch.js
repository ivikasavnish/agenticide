// GitHub Code Search Integration
// Integrates with GitHub MCP server for code search

const chalk = require('chalk');

class GitHubSearch {
    constructor(mcpClient = null) {
        this.mcpClient = mcpClient;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Search code on GitHub
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    async searchCode(query, options = {}) {
        const {
            language = null,
            stars = null,
            perPage = 10,
            sort = 'stars',
            order = 'desc'
        } = options;

        // Build search query
        let searchQuery = query;
        if (language) searchQuery += ` language:${language}`;
        if (stars) searchQuery += ` stars:${stars}`;

        // Check cache
        const cacheKey = `code:${searchQuery}:${perPage}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                console.log(chalk.gray('✓ Using cached results'));
                return cached.data;
            }
        }

        try {
            console.log(chalk.gray(`🔍 Searching: "${searchQuery}"`));

            // Call GitHub MCP search_code if available
            if (this.mcpClient && typeof this.mcpClient.searchCode === 'function') {
                const results = await this.mcpClient.searchCode({
                    query: searchQuery,
                    perPage,
                    sort,
                    order
                });

                const formattedResults = this._formatCodeResults(results);
                
                // Cache results
                this.cache.set(cacheKey, {
                    data: formattedResults,
                    timestamp: Date.now()
                });

                return formattedResults;
            } else {
                console.log(chalk.yellow('⚠️  GitHub MCP not available, using fallback'));
                return [];
            }
        } catch (error) {
            console.log(chalk.red(`❌ Search failed: ${error.message}`));
            return [];
        }
    }

    /**
     * Search repositories on GitHub
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Promise<Array>} Search results
     */
    async searchRepositories(query, options = {}) {
        const {
            language = null,
            stars = null,
            perPage = 10,
            sort = 'stars'
        } = options;

        let searchQuery = query;
        if (language) searchQuery += ` language:${language}`;
        if (stars) searchQuery += ` stars:${stars}`;

        const cacheKey = `repo:${searchQuery}:${perPage}`;
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }

        try {
            if (this.mcpClient && typeof this.mcpClient.searchRepositories === 'function') {
                const results = await this.mcpClient.searchRepositories({
                    query: searchQuery,
                    perPage,
                    sort
                });

                const formattedResults = this._formatRepoResults(results);
                
                this.cache.set(cacheKey, {
                    data: formattedResults,
                    timestamp: Date.now()
                });

                return formattedResults;
            } else {
                return [];
            }
        } catch (error) {
            console.log(chalk.red(`❌ Repository search failed: ${error.message}`));
            return [];
        }
    }

    /**
     * Get file contents from GitHub
     * @param {string} owner - Repository owner
     * @param {string} repo - Repository name
     * @param {string} path - File path
     * @param {string} ref - Branch/commit ref
     * @returns {Promise<Object>} File contents
     */
    async getFileContents(owner, repo, path, ref = 'main') {
        try {
            if (this.mcpClient && typeof this.mcpClient.getFileContents === 'function') {
                const result = await this.mcpClient.getFileContents({
                    owner,
                    repo,
                    path,
                    ref
                });

                return {
                    content: Buffer.from(result.content, 'base64').toString('utf-8'),
                    path: result.path,
                    name: result.name,
                    sha: result.sha,
                    size: result.size,
                    url: result.html_url
                };
            }
            return null;
        } catch (error) {
            console.log(chalk.red(`❌ Failed to get file: ${error.message}`));
            return null;
        }
    }

    /**
     * Format code search results
     */
    _formatCodeResults(results) {
        if (!results || !results.items) return [];

        return results.items.map(item => ({
            name: item.name,
            path: item.path,
            repo: item.repository.full_name,
            owner: item.repository.owner.login,
            url: item.html_url,
            stars: item.repository.stargazers_count,
            language: item.language || 'Unknown',
            description: item.repository.description,
            snippet: item.text_matches?.[0]?.fragment || '',
            score: item.score,
            updated: item.repository.updated_at
        }));
    }

    /**
     * Format repository search results
     */
    _formatRepoResults(results) {
        if (!results || !results.items) return [];

        return results.items.map(item => ({
            name: item.name,
            fullName: item.full_name,
            owner: item.owner.login,
            url: item.html_url,
            stars: item.stargazers_count,
            forks: item.forks_count,
            language: item.language,
            description: item.description,
            topics: item.topics || [],
            updated: item.updated_at,
            license: item.license?.name
        }));
    }

    /**
     * Display search results
     * @param {Array} results - Search results
     * @param {Object} options - Display options
     */
    displayResults(results, options = {}) {
        const { maxResults = 10, showSnippets = true } = options;

        if (results.length === 0) {
            console.log(chalk.yellow('\n⚠️  No results found\n'));
            return;
        }

        console.log(chalk.cyan(`\n📦 Found ${results.length} result${results.length > 1 ? 's' : ''}:\n`));

        results.slice(0, maxResults).forEach((result, idx) => {
            console.log(chalk.bold(`[${idx + 1}] ${result.name || result.fullName}`));
            
            if (result.repo) {
                console.log(chalk.gray(`    📁 ${result.repo} ⭐ ${result.stars || 0}`));
            }
            
            if (result.description) {
                console.log(chalk.gray(`    ${result.description.slice(0, 80)}...`));
            }
            
            if (result.language) {
                console.log(chalk.gray(`    🔤 ${result.language}`));
            }
            
            console.log(chalk.blue(`    🔗 ${result.url}`));

            if (showSnippets && result.snippet) {
                console.log(chalk.gray('\n    Preview:'));
                const lines = result.snippet.split('\n').slice(0, 5);
                lines.forEach(line => {
                    console.log(chalk.gray(`    │ ${line}`));
                });
                console.log('');
            }
        });

        if (results.length > maxResults) {
            console.log(chalk.gray(`\n... and ${results.length - maxResults} more results\n`));
        }
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            timeout: this.cacheTimeout
        };
    }
}

module.exports = GitHubSearch;
