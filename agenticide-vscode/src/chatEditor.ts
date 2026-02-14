import * as vscode from 'vscode';
import { HybridAIManager } from './aiProviders';
import { getTasks } from './extension';

export class ChatEditorProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'agenticide.chatEditor';
    private static panel: vscode.WebviewPanel | undefined;
    private static aiManager: HybridAIManager;

    constructor(private readonly context: vscode.ExtensionContext) {
        if (!ChatEditorProvider.aiManager) {
            ChatEditorProvider.aiManager = new HybridAIManager();
        }
    }

    public static openChat(context: vscode.ExtensionContext, column?: vscode.ViewColumn) {
        if (!ChatEditorProvider.aiManager) {
            ChatEditorProvider.aiManager = new HybridAIManager();
        }
        const config = vscode.workspace.getConfiguration('agenticide');
        const location = config.get<string>('chatLocation', 'editor');
        
        if (location === 'sidebar') {
            vscode.commands.executeCommand('agenticide-chat.focus');
            return;
        }

        // Open in editor
        const columnSetting = config.get<string>('chatEditorColumn', 'beside');
        let targetColumn: vscode.ViewColumn;

        switch (columnSetting) {
            case 'one':
                targetColumn = vscode.ViewColumn.One;
                break;
            case 'two':
                targetColumn = vscode.ViewColumn.Two;
                break;
            case 'three':
                targetColumn = vscode.ViewColumn.Three;
                break;
            case 'beside':
            default:
                targetColumn = column || vscode.ViewColumn.Beside;
                break;
        }

        if (ChatEditorProvider.panel) {
            ChatEditorProvider.panel.reveal(targetColumn);
            return;
        }

        ChatEditorProvider.panel = vscode.window.createWebviewPanel(
            ChatEditorProvider.viewType,
            '🤖 Agenticide AI',
            targetColumn,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [context.extensionUri]
            }
        );

        ChatEditorProvider.panel.webview.html = this.getHtmlContent();

        ChatEditorProvider.panel.webview.onDidReceiveMessage(
            async (data) => {
                switch (data.type) {
                    case 'sendMessage':
                        await this.handleMessage(data.message, ChatEditorProvider.panel!);
                        break;
                }
            }
        );

        ChatEditorProvider.panel.onDidDispose(() => {
            ChatEditorProvider.panel = undefined;
        });
    }

    private static async handleMessage(message: string, panel: vscode.WebviewPanel) {
        // Get context
        const editor = vscode.window.activeTextEditor;
        const tasks = getTasks();
        const context = {
            file: editor?.document.fileName,
            language: editor?.document.languageId,
            code: editor?.document.getText(editor.selection),
            tasks: tasks.filter(t => !t.completed).slice(0, 5)
        };

        // Show thinking
        panel.webview.postMessage({
            type: 'addMessage',
            role: 'assistant',
            content: '🤔 Thinking...',
            isThinking: true
        });

        // Generate response using hybrid AI
        const result = await this.aiManager.chat(message, context);
        
        panel.webview.postMessage({
            type: 'addMessage',
            role: 'assistant',
            content: `**[${result.provider}]**\n\n${result.response}`,
            isThinking: false
        });
    }

    private static getHtmlContent(): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }
        
        #header {
            padding: 12px 16px;
            background: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        #header h1 {
            font-size: 14px;
            font-weight: 600;
            margin: 0;
        }
        
        #messages {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
        }
        
        .message {
            margin-bottom: 16px;
            padding: 12px 16px;
            border-radius: 6px;
            max-width: 85%;
            animation: fadeIn 0.2s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .user-message {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: auto;
        }
        
        .assistant-message {
            background: var(--vscode-input-background);
            border-left: 3px solid var(--vscode-focusBorder);
        }
        
        .thinking {
            opacity: 0.6;
            font-style: italic;
        }
        
        #input-area {
            padding: 16px;
            background: var(--vscode-sideBar-background);
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        #input-container {
            display: flex;
            gap: 8px;
        }
        
        #message-input {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 10px 12px;
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            resize: none;
            min-height: 40px;
            max-height: 120px;
        }
        
        #message-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
        
        #send-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 0 20px;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 600;
            min-width: 70px;
        }
        
        #send-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        #send-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .suggestions {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 12px;
        }
        
        .suggestion {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 8px 14px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            transition: background 0.2s;
        }
        
        .suggestion:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .welcome {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        
        .welcome h2 {
            font-size: 24px;
            margin-bottom: 12px;
        }
        
        .welcome p {
            margin-bottom: 24px;
        }
        
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 4px;
            overflow-x: auto;
            margin: 8px 0;
        }
        
        code {
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div id="header">
        <span style="font-size: 20px;">🤖</span>
        <h1>Agenticide AI Chat</h1>
    </div>
    
    <div id="messages">
        <div class="welcome">
            <h2>👋 Hi! I'm your AI coding assistant</h2>
            <p>Ask me anything about your code</p>
            <div class="suggestions">
                <button class="suggestion" onclick="sendSuggestion('Explain this code')">
                    💡 Explain code
                </button>
                <button class="suggestion" onclick="sendSuggestion('Fix any bugs')">
                    🔧 Fix bugs
                </button>
                <button class="suggestion" onclick="sendSuggestion('Generate tests')">
                    🧪 Generate tests
                </button>
                <button class="suggestion" onclick="sendSuggestion('Refactor this')">
                    ✨ Refactor
                </button>
            </div>
        </div>
    </div>
    
    <div id="input-area">
        <div id="input-container">
            <textarea 
                id="message-input" 
                placeholder="Ask anything about your code..." 
                rows="1"
            ></textarea>
            <button id="send-button">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const input = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');

        // Auto-resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = input.scrollHeight + 'px';
        });

        function sendMessage() {
            const message = input.value.trim();
            if (!message) return;

            // Add user message
            addMessage('user', message);
            
            // Send to extension
            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });

            input.value = '';
            input.style.height = 'auto';
        }

        function sendSuggestion(text) {
            input.value = text;
            sendMessage();
        }

        function addMessage(role, content, isThinking = false) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${role}-message\`;
            if (isThinking) messageDiv.className += ' thinking';
            
            messageDiv.textContent = content;
            messagesDiv.appendChild(messageDiv);
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
            
            // Remove welcome on first message
            const welcome = messagesDiv.querySelector('.welcome');
            if (welcome) welcome.remove();
        }

        sendButton.addEventListener('click', sendMessage);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Handle messages from extension
        window.addEventListener('message', (event) => {
            const message = event.data;
            
            if (message.type === 'addMessage') {
                // Remove thinking message if exists
                const thinking = messagesDiv.querySelector('.thinking');
                if (thinking && !message.isThinking) {
                    thinking.remove();
                }
                
                addMessage(message.role, message.content, message.isThinking);
            }
        });

        // Focus input on load
        input.focus();
    </script>
</body>
</html>`;
    }

    public resolveCustomTextEditor(): void {
        // Not used for our implementation
    }
}
