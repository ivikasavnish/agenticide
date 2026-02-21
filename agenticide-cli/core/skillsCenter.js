// Skills Center - Central Skills Repository
// All components (CLI, Chat, Agents, Extensions) access skills through this

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { homedir } = require('os');
const chalk = require('chalk');

class SkillsCenter {
    constructor(options = {}) {
        this.skillsPath = options.skillsPath || path.join(homedir(), '.agenticide', 'skills');
        this.registry = new Map();
        this.mcpClient = options.mcpClient;
        this.aiProvider = options.aiProvider;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.stats = {
            discovered: 0,
            executed: 0,
            cached: 0,
            errors: 0
        };
        this.initialized = false;
    }

    /**
     * Initialize skills center and discover all skills
     */
    async initialize() {
        if (this.initialized) return;

        try {
            await this._ensureDirectories();
            await this.discover();
            this.initialized = true;
            console.log(chalk.green(`✓ Skills Center initialized: ${this.registry.size} skills loaded`));
        } catch (error) {
            console.log(chalk.red(`✗ Skills Center initialization failed: ${error.message}`));
            throw error;
        }
    }

    /**
     * Ensure skills directories exist
     */
    async _ensureDirectories() {
        const dirs = [
            this.skillsPath,
            path.join(this.skillsPath, 'builtin'),
            path.join(this.skillsPath, 'community'),
            path.join(this.skillsPath, 'custom')
        ];

        for (const dir of dirs) {
            try {
                await fs.mkdir(dir, { recursive: true });
            } catch (error) {
                if (error.code !== 'EEXIST') throw error;
            }
        }
    }

    /**
     * Discover all available skills
     * @returns {Promise<Array>} List of discovered skills
     */
    async discover() {
        this.registry.clear();
        
        const skillDirs = [
            path.join(this.skillsPath, 'builtin'),
            path.join(this.skillsPath, 'community'),
            path.join(this.skillsPath, 'custom')
        ];

        let discovered = 0;

        for (const dir of skillDirs) {
            try {
                const files = await fs.readdir(dir);
                
                for (const file of files) {
                    if (file.endsWith('.yml') || file.endsWith('.yaml')) {
                        const filepath = path.join(dir, file);
                        try {
                            const skill = await this.loadFromFile(filepath);
                            if (skill) {
                                this.registry.set(skill.name, skill);
                                discovered++;
                            }
                        } catch (error) {
                            console.log(chalk.yellow(`⚠️  Failed to load skill ${file}: ${error.message}`));
                        }
                    }
                }
            } catch (error) {
                // Directory doesn't exist or can't be read
                continue;
            }
        }

        this.stats.discovered = discovered;
        return Array.from(this.registry.values());
    }

    /**
     * Search for skills by query and filters
     * @param {string} query - Search query
     * @param {Object} filters - Optional filters (category, tags, etc.)
     * @returns {Array} Matching skills
     */
    search(query = '', filters = {}) {
        const skills = Array.from(this.registry.values());
        const queryLower = query.toLowerCase();

        return skills.filter(skill => {
            // Text search
            const matchesQuery = !query || 
                skill.name.toLowerCase().includes(queryLower) ||
                skill.description?.toLowerCase().includes(queryLower) ||
                skill.metadata?.tags?.some(tag => tag.toLowerCase().includes(queryLower));

            // Category filter
            const matchesCategory = !filters.category || 
                skill.category === filters.category;

            // Tag filter
            const matchesTags = !filters.tags || 
                filters.tags.every(tag => skill.metadata?.tags?.includes(tag));

            // MCP compatible filter
            const matchesMCP = filters.mcpCompatible === undefined ||
                skill.metadata?.mcp_compatible === filters.mcpCompatible;

            return matchesQuery && matchesCategory && matchesTags && matchesMCP;
        });
    }

    /**
     * List skills by category
     * @param {string} category - Optional category filter
     * @returns {Array} Skills in category
     */
    list(category = null) {
        const skills = Array.from(this.registry.values());
        
        if (!category) {
            return skills;
        }

        return skills.filter(skill => skill.category === category);
    }

    /**
     * Get skill by name
     * @param {string} skillName - Skill name
     * @returns {Object|null} Skill or null
     */
    get(skillName) {
        return this.registry.get(skillName) || null;
    }

    /**
     * Check if skill exists
     * @param {string} skillName - Skill name
     * @returns {boolean} True if exists
     */
    has(skillName) {
        return this.registry.has(skillName);
    }

    /**
     * Load skill from file
     * @param {string} filepath - Path to skill YAML file
     * @returns {Promise<Object>} Loaded skill
     */
    async loadFromFile(filepath) {
        try {
            const content = await fs.readFile(filepath, 'utf8');
            const skill = yaml.load(content);

            // Validate skill
            this._validateSkill(skill);

            // Add metadata
            skill._filepath = filepath;
            skill._loaded = new Date().toISOString();

            return skill;
        } catch (error) {
            throw new Error(`Failed to load skill from ${filepath}: ${error.message}`);
        }
    }

    /**
     * Load skill from MCP
     * @param {string} mcpSkillName - MCP skill/tool name
     * @returns {Promise<Object>} Skill wrapper for MCP tool
     */
    async loadFromMCP(mcpSkillName) {
        if (!this.mcpClient) {
            throw new Error('MCP client not available');
        }

        // Convert MCP tool to skill format
        const tool = await this.mcpClient.getTool(mcpSkillName);
        
        return {
            name: `mcp-${mcpSkillName}`,
            version: '1.0.0',
            category: 'mcp',
            description: tool.description,
            inputs: tool.inputSchema?.properties ? 
                Object.entries(tool.inputSchema.properties).map(([name, schema]) => ({
                    name,
                    type: schema.type,
                    required: tool.inputSchema.required?.includes(name),
                    description: schema.description
                })) : [],
            execution: {
                type: 'mcp',
                tool: mcpSkillName
            },
            metadata: {
                mcp_compatible: true,
                source: 'mcp'
            }
        };
    }

    /**
     * Execute a skill
     * @param {string} skillName - Skill name
     * @param {Object} inputs - Input values
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     */
    async execute(skillName, inputs = {}, context = {}) {
        const skill = this.get(skillName);
        
        if (!skill) {
            throw new Error(`Skill not found: ${skillName}`);
        }

        // Check cache
        const cacheKey = this._getCacheKey(skillName, inputs);
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                this.stats.cached++;
                return cached.result;
            }
        }

        try {
            // Validate inputs
            this._validateInputs(skill, inputs);

            // Resolve dependencies
            const deps = await this._resolveDependencies(skill);

            // Execute
            const SkillExecutor = require('./skillExecutor');
            const executor = new SkillExecutor(this);
            const result = await executor.execute(skill, inputs, { ...context, dependencies: deps });

            // Validate outputs
            this._validateOutputs(skill, result);

            // Cache result
            this.cache.set(cacheKey, {
                result,
                timestamp: Date.now()
            });

            this.stats.executed++;
            return result;
        } catch (error) {
            this.stats.errors++;
            throw new Error(`Skill execution failed (${skillName}): ${error.message}`);
        }
    }

    /**
     * Execute skill with few-shot examples
     * @param {string} skillName - Skill name
     * @param {Array} examples - Few-shot examples
     * @param {Object} inputs - Input values
     * @returns {Promise<Object>} Execution result
     */
    async executeWithFewShot(skillName, examples, inputs) {
        const skill = this.get(skillName);
        
        if (!skill) {
            throw new Error(`Skill not found: ${skillName}`);
        }

        // Add examples to context
        return await this.execute(skillName, inputs, { fewShot: examples });
    }

    /**
     * Install skill from source
     * @param {string|Object} source - URL, file path, or skill object
     * @returns {Promise<string>} Installed skill name
     */
    async install(source) {
        let skill;

        if (typeof source === 'string') {
            if (source.startsWith('http')) {
                // Download from URL
                skill = await this._downloadSkill(source);
            } else if (await this._fileExists(source)) {
                // Load from file
                skill = await this.loadFromFile(source);
            } else {
                throw new Error(`Invalid skill source: ${source}`);
            }
        } else {
            skill = source;
        }

        // Validate
        this._validateSkill(skill);

        // Determine category (default to custom)
        const category = skill.metadata?.category || 'custom';
        const targetDir = path.join(this.skillsPath, category);
        const targetFile = path.join(targetDir, `${skill.name}.yml`);

        // Check if already exists
        if (await this._fileExists(targetFile)) {
            throw new Error(`Skill already installed: ${skill.name}`);
        }

        // Save skill
        await fs.writeFile(targetFile, yaml.dump(skill), 'utf8');

        // Add to registry
        this.registry.set(skill.name, skill);

        console.log(chalk.green(`✓ Installed skill: ${skill.name}`));
        return skill.name;
    }

    /**
     * Uninstall skill
     * @param {string} skillName - Skill name
     */
    async uninstall(skillName) {
        const skill = this.get(skillName);
        
        if (!skill) {
            throw new Error(`Skill not found: ${skillName}`);
        }

        if (!skill._filepath) {
            throw new Error(`Cannot uninstall skill without file path`);
        }

        // Delete file
        await fs.unlink(skill._filepath);

        // Remove from registry
        this.registry.delete(skillName);

        console.log(chalk.green(`✓ Uninstalled skill: ${skillName}`));
    }

    /**
     * Enable skill
     * @param {string} skillName - Skill name
     */
    async enable(skillName) {
        const skill = this.get(skillName);
        
        if (!skill) {
            throw new Error(`Skill not found: ${skillName}`);
        }

        skill.enabled = true;
        await this._saveSkill(skill);
    }

    /**
     * Disable skill
     * @param {string} skillName - Skill name
     */
    async disable(skillName) {
        const skill = this.get(skillName);
        
        if (!skill) {
            throw new Error(`Skill not found: ${skillName}`);
        }

        skill.enabled = false;
        await this._saveSkill(skill);
    }

    /**
     * Get statistics
     * @returns {Object} Statistics
     */
    getStats() {
        return {
            ...this.stats,
            totalSkills: this.registry.size,
            categories: this._getCategoryCounts(),
            cacheSize: this.cache.size
        };
    }

    /**
     * Get skill usage statistics
     * @param {string} skillName - Skill name
     * @returns {Object} Usage stats
     */
    getUsage(skillName) {
        // TODO: Implement usage tracking
        return {
            executions: 0,
            lastUsed: null,
            avgDuration: 0
        };
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    // Private methods

    _validateSkill(skill) {
        if (!skill.name) throw new Error('Skill must have a name');
        if (!skill.version) throw new Error('Skill must have a version');
        if (!skill.description) throw new Error('Skill must have a description');
        if (!skill.execution) throw new Error('Skill must have execution config');
        if (!skill.execution.type) throw new Error('Skill execution must have a type');
    }

    _validateInputs(skill, inputs) {
        for (const input of skill.inputs || []) {
            if (input.required && !(input.name in inputs)) {
                throw new Error(`Required input missing: ${input.name}`);
            }

            if (input.name in inputs) {
                const value = inputs[input.name];
                
                // Type validation
                if (input.type === 'enum' && !input.values.includes(value)) {
                    throw new Error(`Invalid value for ${input.name}: must be one of ${input.values.join(', ')}`);
                }
            }
        }
    }

    _validateOutputs(skill, outputs) {
        if (!outputs || typeof outputs !== 'object') {
            throw new Error('Skill must return an object');
        }

        // Check required outputs
        for (const output of skill.outputs || []) {
            if (output.required && !(output.name in outputs)) {
                throw new Error(`Required output missing: ${output.name}`);
            }
        }
    }

    async _resolveDependencies(skill) {
        const resolved = {};
        
        for (const dep of skill.dependencies || []) {
            if (!this.has(dep.name)) {
                if (dep.optional) {
                    continue;
                }
                throw new Error(`Required dependency not found: ${dep.name}`);
            }
            
            resolved[dep.name] = this.get(dep.name);
        }

        return resolved;
    }

    _getCacheKey(skillName, inputs) {
        return `${skillName}:${JSON.stringify(inputs)}`;
    }

    _getCategoryCounts() {
        const counts = {};
        for (const skill of this.registry.values()) {
            counts[skill.category] = (counts[skill.category] || 0) + 1;
        }
        return counts;
    }

    async _saveSkill(skill) {
        if (!skill._filepath) {
            throw new Error('Cannot save skill without file path');
        }
        await fs.writeFile(skill._filepath, yaml.dump(skill), 'utf8');
    }

    async _fileExists(filepath) {
        try {
            await fs.access(filepath);
            return true;
        } catch {
            return false;
        }
    }

    async _downloadSkill(url) {
        // TODO: Implement HTTP download
        throw new Error('Skill download not yet implemented');
    }
}

module.exports = SkillsCenter;
