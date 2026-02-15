/**
 * Agent Client Protocol (ACP) Client
 * Implements proper ACP communication for AI agents
 */

const { spawn } = require('child_process');
const { Writable, Readable } = require('stream');

// Lazy load ES modules (ACP SDK is ESM-only)
let acp;
async function loadACPSDK() {
    if (!acp) {
        acp = await import('@agentclientprotocol/sdk');
    }
    return acp;
}

class ACPClient {
    constructor() {
        this.agents = new Map();
        this.activeAgent = null;
        this.messageBuffer = '';
    }

    /**
     * Create a client implementation with ACP callbacks
     */
    createClientImpl() {
        const fs = require('fs');
        const path = require('path');
        
        return {
            sessionUpdate: async (params) => {
                const update = params.update;
                
                // Handle different types of session updates
                switch (update.sessionUpdate) {
                    case 'agent_message_chunk':
                        if (update.content?.type === 'text') {
                            this.messageBuffer += update.content.text || '';
                        }
                        break;
                    case 'agent_thought_chunk':
                        // Ignore thinking chunks for now
                        break;
                    case 'tool_call':
                        console.log(`\n🔧 ${update.title || 'Tool call'} (${update.status})`);
                        break;
                    case 'tool_call_update':
                        // Log tool call updates
                        break;
                    default:
                        break;
                }
            },
            requestPermission: async (params) => {
                // Auto-approve all permissions for now
                if (params.options && params.options.length > 0) {
                    // Log what's being approved
                    console.log(`\n🔐 Permission: ${params.toolCall?.title || 'Action requested'}`);
                    return {
                        outcome: {
                            outcome: 'selected',
                            optionId: params.options[0].optionId
                        }
                    };
                }
                return { outcome: { outcome: 'dismissed' } };
            },
            readTextFile: async (params) => {
                try {
                    const filePath = path.resolve(params.path);
                    const content = fs.readFileSync(filePath, 'utf8');
                    console.log(`\n📖 Reading: ${params.path}`);
                    return { content };
                } catch (error) {
                    console.error(`\n❌ Error reading ${params.path}:`, error.message);
                    return { content: '' };
                }
            },
            writeTextFile: async (params) => {
                try {
                    const filePath = path.resolve(params.path);
                    const dir = path.dirname(filePath);
                    
                    // Ensure directory exists
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    
                    fs.writeFileSync(filePath, params.content, 'utf8');
                    console.log(`\n✍️  Wrote: ${params.path}`);
                    return {};
                } catch (error) {
                    console.error(`\n❌ Error writing ${params.path}:`, error.message);
                    throw error;
                }
            }
        };
    }

    /**
     * Initialize GitHub Copilot agent via ACP
     */
    async initCopilotAgent() {
        try {
            // Load ACP SDK
            const acp = await loadACPSDK();
            
            // Check if GitHub Copilot agent is available
            const copilotPath = await this.findCopilotAgent();
            if (!copilotPath) {
                console.log('GitHub Copilot agent not found. Using alternative...');
                return false;
            }

            // Start Copilot agent process with ACP
            const agentProcess = spawn(copilotPath, ['--acp'], {
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // Create streams for communication
            const input = Writable.toWeb(agentProcess.stdin);
            const output = Readable.toWeb(agentProcess.stdout);

            // Create the connection with proper client implementation
            const stream = acp.ndJsonStream(input, output);
            const clientImpl = this.createClientImpl();
            const connection = new acp.ClientSideConnection(() => clientImpl, stream);

            // Initialize the connection
            await connection.initialize({
                protocolVersion: acp.PROTOCOL_VERSION,
                clientCapabilities: {
                    fs: {
                        readTextFile: true,
                        writeTextFile: true
                    }
                }
            });

            this.agents.set('copilot', {
                connection,
                process: agentProcess,
                type: 'acp',
                sessionId: null
            });

            this.activeAgent = 'copilot';
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
            // Load ACP SDK
            const acp = await loadACPSDK();
            
            const claudePath = await this.findClaudeAgent();
            if (!claudePath) {
                return false;
            }

            // Start Claude agent process (Claude CLI doesn't support --acp yet, use direct mode)
            // For now, we'll return false and let it fall back to Claude API
            return false;

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
            const conn = agent.connection;
            
            // Clear message buffer
            this.messageBuffer = '';
            
            // Create session if not exists
            if (!agent.sessionId) {
                const sessionResult = await conn.newSession({
                    cwd: context.cwd || process.cwd(),
                    mcpServers: []
                });
                agent.sessionId = sessionResult.sessionId;
            }

            // Send prompt
            let fullMessage = this.buildPromptWithContext(message, context);
            
            // Use prompt method with the session
            const result = await conn.prompt({
                sessionId: agent.sessionId,
                prompt: [
                    {
                        type: 'text',
                        text: fullMessage
                    }
                ]
            });

            // Return collected message buffer if available, otherwise use result
            if (this.messageBuffer) {
                return this.messageBuffer;
            }
            
            return result.text || result.message || 'No response from agent';
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
            '/opt/homebrew/bin/copilot',             // Homebrew Copilot CLI
            '/usr/local/bin/copilot',
            process.env.HOME + '/.local/bin/copilot',
            '/usr/local/bin/github-copilot-agent',   // Legacy names
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
            const result = execSync('which copilot', { encoding: 'utf8' });
            return result.trim();
        } catch {
            try {
                const result = execSync('which github-copilot-agent', { encoding: 'utf8' });
                return result.trim();
            } catch {
                return null;
            }
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
