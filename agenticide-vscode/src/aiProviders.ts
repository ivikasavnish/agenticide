import * as vscode from 'vscode';
import { ACPClient } from './acpClient';

/**
 * AI Provider Interface - supports multiple AI backends
 */
export interface AIProvider {
    name: string;
    generateResponse(prompt: string, context?: any): Promise<string>;
    generateCompletion(code: string, position: vscode.Position): Promise<string>;
}

let acpClient: ACPClient | null = null;

export function getACPClient(): ACPClient {
    if (!acpClient) {
        acpClient = new ACPClient();
    }
    return acpClient;
}

/**
 * Claude Code Provider - For agentic coding tasks via ACP
 */
export class ClaudeProvider implements AIProvider {
    name = 'Claude';
    private acpClient: ACPClient;
    private useACP: boolean;
    private apiKey: string | undefined;

    constructor() {
        this.acpClient = getACPClient();
        this.apiKey = vscode.workspace.getConfiguration('agenticide').get('claudeApiKey');
        this.useACP = vscode.workspace.getConfiguration('agenticide').get('useClaudeCodeACP', true);
        
        // Initialize Claude Code agent if ACP enabled
        if (this.useACP) {
            this.acpClient.initializeClaudeAgent().then(success => {
                if (success) {
                    console.log('✅ Claude Code ready via ACP');
                }
            });
        }
    }

    async generateResponse(prompt: string, context?: any): Promise<string> {
        // Try ACP first (Claude Code)
        if (this.useACP) {
            const response = await this.acpClient.sendPrompt('claude', prompt, context);
            if (!response.startsWith('❌')) {
                return response;
            }
        }

        // Fallback to direct API
        if (!this.apiKey) {
            return '❌ Claude not available. Enable Claude Code or set API key in Settings.';
        }

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 4096,
                    messages: [{
                        role: 'user',
                        content: this.buildPromptWithContext(prompt, context)
                    }]
                })
            });

            if (!response.ok) {
                throw new Error(`Claude API error: ${response.statusText}`);
            }

            const data: any = await response.json();
            return data.content[0].text;
        } catch (error) {
            return `❌ Claude Error: ${error}`;
        }
    }

    async generateCompletion(code: string, position: vscode.Position): Promise<string> {
        // Claude doesn't do inline completions, return empty
        return '';
    }

    private buildPromptWithContext(prompt: string, context?: any): string {
        let fullPrompt = prompt;
        
        if (context) {
            if (context.code) {
                fullPrompt = `Code context:\n\`\`\`\n${context.code}\n\`\`\`\n\n${prompt}`;
            }
            if (context.files) {
                fullPrompt += `\n\nRelevant files: ${context.files.join(', ')}`;
            }
            if (context.tasks) {
                fullPrompt += `\n\nActive tasks:\n${context.tasks.map((t: any) => `- ${t.description}`).join('\n')}`;
            }
        }
        
        return fullPrompt;
    }
}

/**
 * GitHub Copilot Provider - For code completions via ACP
 */
export class CopilotProvider implements AIProvider {
    name = 'Copilot';
    private acpClient: ACPClient;
    private initialized: boolean = false;

    constructor() {
        this.acpClient = getACPClient();
        
        // Initialize Copilot
        this.acpClient.initializeCopilotAgent().then(success => {
            this.initialized = success;
            if (success) {
                console.log('✅ GitHub Copilot ready');
            }
        });
    }

    async generateResponse(prompt: string, context?: any): Promise<string> {
        if (!this.initialized) {
            return '❌ Copilot not available. Install GitHub Copilot extension.';
        }

        try {
            // Use ACP client to communicate with Copilot
            const response = await this.acpClient.sendPrompt('copilot', prompt, context);
            return response;
        } catch (error) {
            return `❌ Copilot Error: ${error}`;
        }
    }

    async generateCompletion(code: string, position: vscode.Position): Promise<string> {
        try {
            // Trigger inline completion
            const completions = await vscode.commands.executeCommand<vscode.CompletionList>(
                'vscode.executeCompletionItemProvider',
                vscode.window.activeTextEditor?.document.uri,
                position
            );
            
            if (completions && completions.items.length > 0) {
                return completions.items[0].insertText as string || '';
            }
            
            return '';
        } catch (error) {
            return '';
        }
    }
}

/**
 * Hybrid AI Manager - Intelligently routes requests to best provider
 */
export class HybridAIManager {
    private claude: ClaudeProvider;
    private copilot: CopilotProvider;
    private defaultProvider: 'claude' | 'copilot' | 'auto';

    constructor() {
        this.claude = new ClaudeProvider();
        this.copilot = new CopilotProvider();
        this.defaultProvider = vscode.workspace.getConfiguration('agenticide').get('defaultAIProvider', 'auto');
    }

    /**
     * Route to best provider based on task type
     */
    async chat(prompt: string, context?: any): Promise<{ response: string; provider: string }> {
        const provider = this.selectProvider(prompt);
        
        if (provider === 'claude') {
            return {
                response: await this.claude.generateResponse(prompt, context),
                provider: 'Claude'
            };
        } else {
            return {
                response: await this.copilot.generateResponse(prompt, context),
                provider: 'Copilot'
            };
        }
    }

    /**
     * Get inline code completion (always uses Copilot)
     */
    async complete(code: string, position: vscode.Position): Promise<string> {
        return await this.copilot.generateCompletion(code, position);
    }

    /**
     * Smart provider selection based on prompt
     */
    private selectProvider(prompt: string): 'claude' | 'copilot' {
        if (this.defaultProvider === 'claude') return 'claude';
        if (this.defaultProvider === 'copilot') return 'copilot';

        // Auto-select based on prompt type
        const lowerPrompt = prompt.toLowerCase();
        
        // Use Claude for complex, agentic tasks
        const claudeTriggers = [
            'refactor', 'explain', 'architecture', 'design',
            'implement', 'create', 'build', 'generate tests',
            'fix bug', 'optimize', 'analyze'
        ];
        
        // Use Copilot for quick completions and simple questions
        const copilotTriggers = [
            'complete', 'suggest', 'what is', 'how to',
            'quick', 'snippet'
        ];
        
        for (const trigger of claudeTriggers) {
            if (lowerPrompt.includes(trigger)) {
                return 'claude';
            }
        }
        
        for (const trigger of copilotTriggers) {
            if (lowerPrompt.includes(trigger)) {
                return 'copilot';
            }
        }
        
        // Default to Claude for complex tasks
        return 'claude';
    }

    /**
     * Get provider status
     */
    getStatus(): string {
        const acpStatus = getACPClient().getStatus();
        
        return `${acpStatus}\n\n` +
               `Mode: ${this.defaultProvider}\n\n` +
               `📡 Protocols:\n` +
               `  ✅ ACP (Agent Client Protocol)\n` +
               `  ✅ MCP (Model Context Protocol)\n` +
               `  ✅ VSCode Language Model API`;
    }

    /**
     * Cleanup
     */
    dispose() {
        getACPClient().dispose();
    }
}
