/**
 * AI Agent Manager - Multi-provider AI integration
 * Supports Claude, Copilot, OpenAI, and other agents via ACP/MCP
 */

const { spawn } = require('child_process');
const readline = require('readline');

// Available AI models
const MODELS = {
    // Claude (Anthropic)
    claude: {
        'claude-3-opus': { provider: 'anthropic', name: 'Claude 3 Opus', tier: 'premium' },
        'claude-3-sonnet': { provider: 'anthropic', name: 'Claude 3 Sonnet', tier: 'standard' },
        'claude-3-haiku': { provider: 'anthropic', name: 'Claude 3 Haiku', tier: 'fast' },
    },
    // OpenAI
    openai: {
        'gpt-4': { provider: 'openai', name: 'GPT-4', tier: 'premium' },
        'gpt-4-turbo': { provider: 'openai', name: 'GPT-4 Turbo', tier: 'standard' },
        'gpt-3.5-turbo': { provider: 'openai', name: 'GPT-3.5 Turbo', tier: 'fast' },
    },
    // GitHub Copilot
    copilot: {
        'copilot-gpt4': { provider: 'github', name: 'Copilot GPT-4', tier: 'premium' },
        'copilot-gpt35': { provider: 'github', name: 'Copilot GPT-3.5', tier: 'standard' },
    },
    // Local models
    local: {
        'codellama': { provider: 'ollama', name: 'CodeLlama', tier: 'local' },
        'deepseek-coder': { provider: 'ollama', name: 'DeepSeek Coder', tier: 'local' },
    }
};

class AIAgentManager {
    constructor() {
        this.agents = new Map();
        this.activeAgent = null;
        this.conversationHistory = [];
    }

    /**
     * List all available models
     */
    listModels() {
        const models = [];
        for (const [category, categoryModels] of Object.entries(MODELS)) {
            for (const [key, info] of Object.entries(categoryModels)) {
                models.push({
                    id: key,
                    category,
                    ...info
                });
            }
        }
        return models;
    }

    /**
     * Initialize Claude agent
     */
    async initClaudeAgent() {
        try {
            // Use proper ACP client
            const { ACPClient } = require('./acpClient');
            const acpClient = new ACPClient();
            
            const success = await acpClient.initClaudeAgent();
            if (success) {
                this.agents.set('claude', {
                    type: 'acp',
                    model: 'claude-3-sonnet',
                    acpClient
                });
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Failed to initialize Claude:', error.message);
            return false;
        }
    }

    /**
     * Initialize GitHub Copilot agent
     */
    async initCopilotAgent() {
        try {
            // Try using proper ACP client first
            const { ACPClient } = require('./acpClient');
            const acpClient = new ACPClient();
            
            const success = await acpClient.initCopilotAgent();
            if (success) {
                this.agents.set('copilot', {
                    type: 'acp',
                    model: 'copilot-gpt4',
                    acpClient
                });
                return true;
            }
            
            // Fallback: direct API approach (if available)
            console.log('ACP Copilot not available, trying alternative...');
            
            // For now, just mark as unavailable
            return false;
        } catch (error) {
            console.error('Failed to initialize Copilot:', error.message);
            return false;
        }
    }

    /**
     * Initialize OpenAI agent
     */
    async initOpenAIAgent() {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('OPENAI_API_KEY not set');
            return false;
        }

        this.agents.set('openai', {
            type: 'openai-api',
            model: 'gpt-4-turbo',
            apiKey
        });

        return true;
    }

    /**
     * Initialize local model via Ollama
     */
    async initLocalAgent(model = 'codellama') {
        try {
            const ollamaPath = await this.findCommand('ollama');
            if (!ollamaPath) {
                throw new Error('Ollama not found. Install: brew install ollama');
            }

            this.agents.set('local', {
                type: 'ollama',
                model,
                command: 'ollama'
            });

            return true;
        } catch (error) {
            console.error('Failed to initialize local model:', error.message);
            return false;
        }
    }

    /**
     * Send message to active agent
     */
    async sendMessage(message, options = {}) {
        const agentType = options.agent || this.activeAgent || 'copilot';
        const agent = this.agents.get(agentType);

        if (!agent) {
            throw new Error(`Agent ${agentType} not initialized. Run 'agenticide agent init ${agentType}'`);
        }

        // Add to conversation history
        this.conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: Date.now()
        });

        let response;
        switch (agent.type) {
            case 'acp':
                response = await this.sendToACP(message, agent, options);
                break;
            case 'openai-api':
                response = await this.sendToOpenAI(message, agent, options);
                break;
            case 'ollama':
                response = await this.sendToOllama(message, agent, options);
                break;
            default:
                throw new Error(`Unknown agent type: ${agent.type}`);
        }

        // Add response to history
        this.conversationHistory.push({
            role: 'assistant',
            content: response,
            timestamp: Date.now(),
            agent: agentType
        });

        return response;
    }

    /**
     * Send message to ACP agent (Copilot or Claude)
     */
    async sendToACP(message, agent, options) {
        if (!agent.acpClient) {
            throw new Error('ACP client not initialized');
        }

        try {
            // Build context
            const context = options.context || {};
            
            // Send via ACP
            const agentName = this.activeAgent;
            const response = await agent.acpClient.sendMessage(agentName, message, context);
            
            return response;
        } catch (error) {
            throw new Error(`ACP error: ${error.message}`);
        }
    }

    /**
     * Send message to OpenAI
     */
    async sendToOpenAI(message, agent, options) {
        const https = require('https');
        
        const data = JSON.stringify({
            model: agent.model,
            messages: [
                ...this.conversationHistory.slice(-10), // Last 10 messages for context
                { role: 'user', content: message }
            ],
            max_tokens: options.maxTokens || 2000,
            temperature: options.temperature || 0.7
        });

        return new Promise((resolve, reject) => {
            const req = https.request({
                hostname: 'api.openai.com',
                port: 443,
                path: '/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${agent.apiKey}`,
                    'Content-Length': data.length
                }
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const response = JSON.parse(body);
                        resolve(response.choices[0].message.content);
                    } catch (error) {
                        reject(new Error('Failed to parse OpenAI response'));
                    }
                });
            });

            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }

    /**
     * Send message to Ollama (local model)
     */
    async sendToOllama(message, agent, options) {
        const { execSync } = require('child_process');
        
        try {
            const prompt = JSON.stringify(message);
            const result = execSync(`ollama run ${agent.model} ${prompt}`, {
                encoding: 'utf8',
                maxBuffer: 10 * 1024 * 1024
            });
            
            return result.trim();
        } catch (error) {
            throw new Error(`Ollama error: ${error.message}`);
        }
    }

    /**
     * Send message to ACP agent (Claude - legacy method, use sendToACP instead)
     */
    async sendToACPLegacy(message, agent, options) {
        // This is kept for backwards compatibility
        // New code should use sendToACP which works for both Copilot and Claude
        return this.sendToACP(message, agent, options);
    }

    /**
     * Find command in PATH
     */
    async findCommand(cmd) {
        const { execSync } = require('child_process');
        try {
            const result = execSync(`which ${cmd}`, { encoding: 'utf8' });
            return result.trim();
        } catch {
            return null;
        }
    }

    /**
     * Find Claude CLI path
     */
    async findClaudePath() {
        const possiblePaths = [
            '/usr/local/bin/claude',
            '/opt/homebrew/bin/claude',
            process.env.HOME + '/.local/bin/claude'
        ];

        const fs = require('fs');
        for (const path of possiblePaths) {
            if (fs.existsSync(path)) return path;
        }

        return await this.findCommand('claude');
    }

    /**
     * Switch active agent
     */
    setActiveAgent(agentType) {
        if (!this.agents.has(agentType)) {
            throw new Error(`Agent ${agentType} not initialized`);
        }
        this.activeAgent = agentType;
    }

    /**
     * Get agent status
     */
    getStatus() {
        const status = {};
        for (const [name, agent] of this.agents.entries()) {
            status[name] = {
                type: agent.type,
                model: agent.model,
                active: name === this.activeAgent
            };
        }
        return status;
    }

    /**
     * Cleanup
     */
    dispose() {
        for (const agent of this.agents.values()) {
            if (agent.process) {
                agent.process.kill();
            }
        }
        this.agents.clear();
    }
}

module.exports = { AIAgentManager, MODELS };
