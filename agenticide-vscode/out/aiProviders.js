"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridAIManager = exports.CopilotProvider = exports.ClaudeProvider = void 0;
exports.getACPClient = getACPClient;
const vscode = __importStar(require("vscode"));
const acpClient_1 = require("./acpClient");
let acpClient = null;
function getACPClient() {
    if (!acpClient) {
        acpClient = new acpClient_1.ACPClient();
    }
    return acpClient;
}
/**
 * Claude Code Provider - For agentic coding tasks via ACP
 */
class ClaudeProvider {
    constructor() {
        this.name = 'Claude';
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
    async generateResponse(prompt, context) {
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
            const data = await response.json();
            return data.content[0].text;
        }
        catch (error) {
            return `❌ Claude Error: ${error}`;
        }
    }
    async generateCompletion(code, position) {
        // Claude doesn't do inline completions, return empty
        return '';
    }
    buildPromptWithContext(prompt, context) {
        let fullPrompt = prompt;
        if (context) {
            if (context.code) {
                fullPrompt = `Code context:\n\`\`\`\n${context.code}\n\`\`\`\n\n${prompt}`;
            }
            if (context.files) {
                fullPrompt += `\n\nRelevant files: ${context.files.join(', ')}`;
            }
            if (context.tasks) {
                fullPrompt += `\n\nActive tasks:\n${context.tasks.map((t) => `- ${t.description}`).join('\n')}`;
            }
        }
        return fullPrompt;
    }
}
exports.ClaudeProvider = ClaudeProvider;
/**
 * GitHub Copilot Provider - For code completions via ACP
 */
class CopilotProvider {
    constructor() {
        this.name = 'Copilot';
        this.initialized = false;
        this.acpClient = getACPClient();
        // Initialize Copilot
        this.acpClient.initializeCopilotAgent().then(success => {
            this.initialized = success;
            if (success) {
                console.log('✅ GitHub Copilot ready');
            }
        });
    }
    async generateResponse(prompt, context) {
        if (!this.initialized) {
            return '❌ Copilot not available. Install GitHub Copilot extension.';
        }
        try {
            // Use ACP client to communicate with Copilot
            const response = await this.acpClient.sendPrompt('copilot', prompt, context);
            return response;
        }
        catch (error) {
            return `❌ Copilot Error: ${error}`;
        }
    }
    async generateCompletion(code, position) {
        try {
            // Trigger inline completion
            const completions = await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', vscode.window.activeTextEditor?.document.uri, position);
            if (completions && completions.items.length > 0) {
                return completions.items[0].insertText || '';
            }
            return '';
        }
        catch (error) {
            return '';
        }
    }
}
exports.CopilotProvider = CopilotProvider;
/**
 * Hybrid AI Manager - Intelligently routes requests to best provider
 */
class HybridAIManager {
    constructor() {
        this.claude = new ClaudeProvider();
        this.copilot = new CopilotProvider();
        this.defaultProvider = vscode.workspace.getConfiguration('agenticide').get('defaultAIProvider', 'auto');
    }
    /**
     * Route to best provider based on task type
     */
    async chat(prompt, context) {
        const provider = this.selectProvider(prompt);
        if (provider === 'claude') {
            return {
                response: await this.claude.generateResponse(prompt, context),
                provider: 'Claude'
            };
        }
        else {
            return {
                response: await this.copilot.generateResponse(prompt, context),
                provider: 'Copilot'
            };
        }
    }
    /**
     * Get inline code completion (always uses Copilot)
     */
    async complete(code, position) {
        return await this.copilot.generateCompletion(code, position);
    }
    /**
     * Smart provider selection based on prompt
     */
    selectProvider(prompt) {
        if (this.defaultProvider === 'claude')
            return 'claude';
        if (this.defaultProvider === 'copilot')
            return 'copilot';
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
    getStatus() {
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
exports.HybridAIManager = HybridAIManager;
//# sourceMappingURL=aiProviders.js.map