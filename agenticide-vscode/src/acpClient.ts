import * as vscode from 'vscode';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

/**
 * ACP Client - Manages Agent Client Protocol connections
 * VSCode acts as the CLIENT, agents (Claude Code, Copilot) act as SERVERS
 */
export class ACPClient {
    private clients: Map<string, any> = new Map();
    private sessions: Map<string, string> = new Map();
    
    constructor() {}

    /**
     * Initialize Claude Code agent via ACP
     */
    async initializeClaudeAgent(): Promise<boolean> {
        try {
            // Check if claude-code is installed
            const claudePath = await this.findClaudePath();
            if (!claudePath) {
                vscode.window.showWarningMessage(
                    'Claude Code not found. Install: curl -fsSL https://claude.ai/install.sh | bash'
                );
                return false;
            }

            console.log('🤖 Starting Claude Code agent...');
            
            // Start Claude Code as subprocess using ACP
            const agentProcess = vscode.window.createTerminal({
                name: 'Claude Agent',
                shellPath: claudePath,
                shellArgs: ['--acp'],
                hideFromUser: true
            });

            // Store agent reference
            this.clients.set('claude', { process: agentProcess, type: 'acp' });
            
            console.log('✅ Claude Code agent initialized via ACP');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Claude agent:', error);
            return false;
        }
    }

    /**
     * Initialize GitHub Copilot via VSCode API
     */
    async initializeCopilotAgent(): Promise<boolean> {
        try {
            // Check if Copilot extension is installed
            const copilotExt = vscode.extensions.getExtension('GitHub.copilot');
            if (!copilotExt) {
                vscode.window.showWarningMessage(
                    'GitHub Copilot not found. Install from Extensions marketplace.'
                );
                return false;
            }

            await copilotExt.activate();
            this.clients.set('copilot', { type: 'vscode-api' });
            
            console.log('✅ GitHub Copilot initialized');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Copilot:', error);
            return false;
        }
    }

    /**
     * Initialize MCP server connection
     */
    async initializeMCPServer(serverPath: string, serverArgs: string[]): Promise<boolean> {
        try {
            const transport = new StdioClientTransport({
                command: serverPath,
                args: serverArgs,
            });

            const client = new Client({
                name: 'agenticide-vscode',
                version: '3.0.0',
            }, {
                capabilities: {}
            });

            await client.connect(transport);
            
            this.clients.set('mcp-server', { client, type: 'mcp' });
            console.log('✅ MCP server connected');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize MCP server:', error);
            return false;
        }
    }

    /**
     * Send prompt to agent using ACP
     */
    async sendPrompt(agentName: string, prompt: string, context?: any): Promise<string> {
        const agent = this.clients.get(agentName);
        if (!agent) {
            return `❌ Agent '${agentName}' not initialized`;
        }

        if (agent.type === 'acp') {
            return await this.sendACPPrompt(agentName, prompt, context);
        } else if (agent.type === 'vscode-api') {
            return await this.sendCopilotPrompt(prompt, context);
        } else if (agent.type === 'mcp') {
            return await this.sendMCPPrompt(agent.client, prompt, context);
        }

        return '❌ Unknown agent type';
    }

    /**
     * Send ACP-compliant prompt to Claude Code
     */
    private async sendACPPrompt(agentName: string, prompt: string, context?: any): Promise<string> {
        try {
            // Create ACP session if not exists
            let sessionId = this.sessions.get(agentName);
            if (!sessionId) {
                sessionId = await this.createACPSession(agentName);
            }

            // Send prompt via ACP session/prompt method
            const response = await this.acpRequest(agentName, 'session/prompt', {
                sessionId,
                prompt,
                context: this.buildContext(context)
            });

            return response.content || response.text || 'No response from agent';
        } catch (error) {
            return `❌ ACP Error: ${error}`;
        }
    }

    /**
     * Send prompt to Copilot via VSCode API
     */
    private async sendCopilotPrompt(prompt: string, context?: any): Promise<string> {
        try {
            // Use VSCode's language model API
            const models = await vscode.lm.selectChatModels({
                vendor: 'copilot',
                family: 'gpt-4o'
            });

            if (models.length === 0) {
                return '❌ Copilot model not available';
            }

            const model = models[0];
            const messages = [
                vscode.LanguageModelChatMessage.User(prompt)
            ];

            const response = await model.sendRequest(messages, {}, new vscode.CancellationTokenSource().token);
            
            let fullResponse = '';
            for await (const chunk of response.text) {
                fullResponse += chunk;
            }

            return fullResponse;
        } catch (error) {
            return `❌ Copilot Error: ${error}`;
        }
    }

    /**
     * Send prompt to MCP server
     */
    private async sendMCPPrompt(client: any, prompt: string, context?: any): Promise<string> {
        try {
            // Use MCP tools/call to interact with server
            const result = await client.request({
                method: 'tools/call',
                params: {
                    name: 'chat',
                    arguments: {
                        message: prompt,
                        context
                    }
                }
            });

            return result.content?.[0]?.text || 'No response';
        } catch (error) {
            return `❌ MCP Error: ${error}`;
        }
    }

    /**
     * Create ACP session
     */
    private async createACPSession(agentName: string): Promise<string> {
        const response = await this.acpRequest(agentName, 'session/new', {
            mode: 'agentic'
        });
        
        const sessionId = response.sessionId || `session-${Date.now()}`;
        this.sessions.set(agentName, sessionId);
        return sessionId;
    }

    /**
     * Send ACP JSON-RPC request
     */
    private async acpRequest(agentName: string, method: string, params: any): Promise<any> {
        const agent = this.clients.get(agentName);
        if (!agent || agent.type !== 'acp') {
            throw new Error('Invalid agent for ACP request');
        }

        // This is a simplified version - in production, use proper JSON-RPC over stdio
        const request = {
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params
        };

        // Send via terminal (in production, use proper IPC)
        const terminal = agent.process as vscode.Terminal;
        terminal.sendText(JSON.stringify(request));

        // TODO: Implement proper response handling via stdio
        return { content: 'Response from ' + method };
    }

    /**
     * Build context for agents
     */
    private buildContext(context?: any): any {
        if (!context) return {};

        return {
            workspace: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
            activeFile: context.file,
            language: context.language,
            selection: context.code,
            tasks: context.tasks
        };
    }

    /**
     * Find Claude Code installation
     */
    private async findClaudePath(): Promise<string | null> {
        const possiblePaths = [
            '/usr/local/bin/claude',
            '/opt/homebrew/bin/claude',
            process.env.HOME + '/.local/bin/claude'
        ];

        for (const path of possiblePaths) {
            try {
                const uri = vscode.Uri.file(path);
                await vscode.workspace.fs.stat(uri);
                return path;
            } catch {
                continue;
            }
        }

        return null;
    }

    /**
     * Get status of all agents
     */
    getStatus(): string {
        const status: string[] = [];
        
        status.push('🤖 Agent Status:');
        status.push(`  Claude (ACP): ${this.clients.has('claude') ? '✅' : '❌'}`);
        status.push(`  Copilot (API): ${this.clients.has('copilot') ? '✅' : '❌'}`);
        status.push(`  MCP Server: ${this.clients.has('mcp-server') ? '✅' : '❌'}`);
        
        return status.join('\n');
    }

    /**
     * Cleanup
     */
    dispose() {
        for (const [name, agent] of this.clients.entries()) {
            if (agent.type === 'acp' && agent.process) {
                agent.process.dispose();
            } else if (agent.type === 'mcp' && agent.client) {
                agent.client.close();
            }
        }
        this.clients.clear();
        this.sessions.clear();
    }
}
