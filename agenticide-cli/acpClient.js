/**
 * Agent Client Protocol (ACP) Client
 * Implements proper ACP communication for AI agents
 */

const { spawn } = require('child_process');
const { Client } = require('@agentclientprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@agentclientprotocol/sdk/client/stdio.js');

class ACPClient {
    constructor() {
        this.agents = new Map();
        this.activeAgent = null;
    }

    /**
     * Initialize GitHub Copilot agent via ACP
     */
    async initCopilotAgent() {
        try {
            // Check if GitHub Copilot agent is available
            const copilotPath = await this.findCopilotAgent();
            if (!copilotPath) {
                console.log('GitHub Copilot agent not found. Using alternative...');
                return false;
            }

            // Start Copilot agent process
            const process = spawn(copilotPath, ['--acp'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Create ACP transport
            const transport = new StdioClientTransport({
                inputStream: process.stdout,
                outputStream: process.stdin
            });

            // Create ACP client
            const client = new Client({
                name: 'agenticide-copilot',
                version: '1.0.0'
            }, {
                capabilities: {
                    roots: {
                        listChanged: true
                    },
                    sampling: {}
                }
            });

            // Connect client to transport
            await client.connect(transport);

            this.agents.set('copilot', {
                client,
                process,
                type: 'acp'
            });

            return true;
        } catch (error) {
            console.error('Copilot init error:', error.message);
            return false;
        }
    }

    /**
     * Initialize Claude agent via ACP
     */
    async initClaudeAgent() {
        try {
            const claudePath = await this.findClaudeAgent();
            if (!claudePath) {
                return false;
            }

            // Start Claude agent process
            const process = spawn(claudePath, ['--acp'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Create ACP transport
            const transport = new StdioClientTransport({
                inputStream: process.stdout,
                outputStream: process.stdin
            });

            // Create ACP client
            const client = new Client({
                name: 'agenticide-claude',
                version: '1.0.0'
            }, {
                capabilities: {
                    roots: {
                        listChanged: true
                    },
                    sampling: {}
                }
            });

            // Connect client to transport
            await client.connect(transport);

            this.agents.set('claude', {
                client,
                process,
                type: 'acp'
            });

            return true;
        } catch (error) {
            console.error('Claude init error:', error.message);
            return false;
        }
    }

    /**
     * Send message to agent via ACP
     */
    async sendMessage(agentName, message, context = {}) {
        const agent = this.agents.get(agentName);
        if (!agent) {
            throw new Error(`Agent ${agentName} not initialized`);
        }

        if (agent.type !== 'acp') {
            throw new Error(`Agent ${agentName} is not an ACP agent`);
        }

        try {
            // Build ACP request
            const request = {
                method: 'sampling/createMessage',
                params: {
                    messages: [
                        {
                            role: 'user',
                            content: {
                                type: 'text',
                                text: this.buildPromptWithContext(message, context)
                            }
                        }
                    ],
                    maxTokens: 4096,
                    includeContext: 'allServers'
                }
            };

            // Send via ACP client
            const response = await agent.client.request(request);

            // Extract text from response
            if (response.content && response.content.type === 'text') {
                return response.content.text;
            }

            return 'No response from agent';
        } catch (error) {
            throw new Error(`ACP communication error: ${error.message}`);
        }
    }

    /**
     * Build prompt with context
     */
    buildPromptWithContext(message, context) {
        let prompt = message;

        if (context && Object.keys(context).length > 0) {
            prompt += '\n\n<context>\n';
            
            if (context.cwd) {
                prompt += `Current directory: ${context.cwd}\n`;
            }
            
            if (context.symbols && context.topSymbols) {
                prompt += `\nProject symbols (${context.symbols} total):\n`;
                context.topSymbols.forEach(s => {
                    prompt += `  - ${s}\n`;
                });
            }
            
            if (context.tasks && context.tasks.length > 0) {
                prompt += `\nActive tasks:\n`;
                context.tasks.slice(0, 5).forEach(t => {
                    const status = t.completed ? '✓' : '○';
                    prompt += `  ${status} ${t.description}\n`;
                });
            }
            
            prompt += '</context>';
        }

        return prompt;
    }

    /**
     * Find GitHub Copilot agent
     */
    async findCopilotAgent() {
        const { execSync } = require('child_process');
        const possiblePaths = [
            '/usr/local/bin/github-copilot-agent',
            '/opt/homebrew/bin/github-copilot-agent',
            process.env.HOME + '/.local/bin/github-copilot-agent'
        ];

        // Check known paths
        const fs = require('fs');
        for (const path of possiblePaths) {
            if (fs.existsSync(path)) return path;
        }

        // Try finding via which
        try {
            const result = execSync('which github-copilot-agent', { encoding: 'utf8' });
            return result.trim();
        } catch {
            return null;
        }
    }

    /**
     * Find Claude agent
     */
    async findClaudeAgent() {
        const { execSync } = require('child_process');
        const possiblePaths = [
            '/usr/local/bin/claude',
            '/opt/homebrew/bin/claude',
            process.env.HOME + '/.local/bin/claude'
        ];

        const fs = require('fs');
        for (const path of possiblePaths) {
            if (fs.existsSync(path)) return path;
        }

        try {
            const result = execSync('which claude', { encoding: 'utf8' });
            return result.trim();
        } catch {
            return null;
        }
    }

    /**
     * Cleanup
     */
    dispose() {
        for (const [name, agent] of this.agents.entries()) {
            if (agent.client) {
                try {
                    agent.client.close();
                } catch (error) {
                    console.error(`Error closing ${name}:`, error.message);
                }
            }
            if (agent.process) {
                agent.process.kill();
            }
        }
        this.agents.clear();
    }
}

module.exports = { ACPClient };
