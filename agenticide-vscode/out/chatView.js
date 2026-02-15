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
exports.ChatViewProvider = void 0;
const vscode = __importStar(require("vscode"));
class ChatViewProvider {
    constructor(_extensionUri) {
        this._extensionUri = _extensionUri;
    }
    resolveWebviewView(webviewView, context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };
        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'sendMessage': {
                    await this.handleMessage(data.message);
                    break;
                }
                case 'applyCode': {
                    await this.applyCodeSuggestion(data.code);
                    break;
                }
            }
        });
    }
    async handleMessage(message) {
        // Add user message to chat
        this.addMessageToChat('user', message);
        // Get active editor context
        const editor = vscode.window.activeTextEditor;
        const context = {
            file: editor?.document.fileName,
            language: editor?.document.languageId,
            selection: editor?.document.getText(editor.selection),
            lineNumber: editor?.selection.start.line
        };
        // Show thinking indicator
        this.addMessageToChat('assistant', 'Thinking...', true);
        // Simulate AI response (replace with actual AI API call)
        setTimeout(() => {
            this.addMessageToChat('assistant', this.generateResponse(message, context));
        }, 1000);
    }
    generateResponse(message, context) {
        // Placeholder for AI integration
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('explain') || lowerMessage.includes('what')) {
            return `I'll help explain this code. Based on your current context:\n\n` +
                `File: ${context.file || 'No file open'}\n` +
                `Language: ${context.language || 'Unknown'}\n\n` +
                `To get AI-powered explanations, integrate with OpenAI, Claude, or local LLMs.`;
        }
        else if (lowerMessage.includes('fix') || lowerMessage.includes('bug')) {
            return `Let me help fix this. I can see you're working with ${context.language || 'code'}.\n\n` +
                `Suggested approach:\n` +
                `1. Check for syntax errors\n` +
                `2. Validate input/output\n` +
                `3. Review error handling\n\n` +
                `[AI integration needed for specific fixes]`;
        }
        else if (lowerMessage.includes('test')) {
            return `I can help generate tests! Here's what I need:\n\n` +
                `1. Your test framework preference\n` +
                `2. Coverage requirements\n` +
                `3. Edge cases to consider\n\n` +
                `[Connect AI model to generate actual tests]`;
        }
        else {
            return `I'm Agenticide AI assistant. I can help with:\n\n` +
                `• Code explanations\n` +
                `• Bug fixes and debugging\n` +
                `• Test generation\n` +
                `• Code refactoring\n` +
                `• Documentation\n\n` +
                `Ask me anything! (AI model integration coming soon)`;
        }
    }
    addMessageToChat(role, content, isThinking = false) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'addMessage',
                role,
                content,
                isThinking
            });
        }
    }
    async applyCodeSuggestion(code) {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        await editor.edit(editBuilder => {
            const selection = editor.selection;
            if (selection.isEmpty) {
                editBuilder.insert(selection.start, code);
            }
            else {
                editBuilder.replace(selection, code);
            }
        });
    }
    sendMessage(message) {
        this.addMessageToChat('assistant', message);
    }
    _getHtmlForWebview(webview) {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Agenticide AI Chat</title>
    <style>
        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        
        #chat-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        
        #messages {
            flex: 1;
            overflow-y: auto;
            padding: 10px;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 5px;
            max-width: 90%;
        }
        
        .user-message {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: auto;
            text-align: right;
        }
        
        .assistant-message {
            background-color: var(--vscode-editor-inactiveSelectionBackground);
            border-left: 3px solid var(--vscode-button-background);
        }
        
        .thinking {
            opacity: 0.6;
            font-style: italic;
        }
        
        #input-container {
            padding: 10px;
            border-top: 1px solid var(--vscode-panel-border);
            display: flex;
            gap: 5px;
        }
        
        #message-input {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px;
            border-radius: 3px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
        }
        
        #send-button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 3px;
            cursor: pointer;
            font-weight: bold;
        }
        
        #send-button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .code-block {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 3px;
            margin: 5px 0;
            font-family: var(--vscode-editor-font-family);
            font-size: 12px;
            overflow-x: auto;
        }
        
        .welcome {
            text-align: center;
            padding: 20px;
            opacity: 0.7;
        }
        
        .welcome h2 {
            margin: 0 0 10px 0;
        }
        
        .suggestions {
            display: grid;
            gap: 8px;
            margin-top: 15px;
        }
        
        .suggestion-button {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: 10px;
            border-radius: 5px;
            cursor: pointer;
            text-align: left;
        }
        
        .suggestion-button:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
    </style>
</head>
<body>
    <div id="chat-container">
        <div id="messages">
            <div class="welcome">
                <h2>🤖 Agenticide AI</h2>
                <p>Your AI pair programmer</p>
                <div class="suggestions">
                    <button class="suggestion-button" onclick="sendSuggestion('Explain this code')">
                        💡 Explain this code
                    </button>
                    <button class="suggestion-button" onclick="sendSuggestion('Fix any bugs')">
                        🔧 Fix any bugs
                    </button>
                    <button class="suggestion-button" onclick="sendSuggestion('Generate tests')">
                        🧪 Generate tests
                    </button>
                    <button class="suggestion-button" onclick="sendSuggestion('Refactor to be cleaner')">
                        ✨ Refactor code
                    </button>
                </div>
            </div>
        </div>
        <div id="input-container">
            <input type="text" id="message-input" placeholder="Ask anything about your code..." />
            <button id="send-button">Send</button>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messagesDiv = document.getElementById('messages');
        const input = document.getElementById('message-input');
        const sendButton = document.getElementById('send-button');

        function sendMessage() {
            const message = input.value.trim();
            if (!message) return;

            vscode.postMessage({
                type: 'sendMessage',
                message: message
            });

            input.value = '';
        }

        function sendSuggestion(text) {
            input.value = text;
            sendMessage();
        }

        sendButton.addEventListener('click', sendMessage);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        window.addEventListener('message', (event) => {
            const message = event.data;
            
            if (message.type === 'addMessage') {
                const messageDiv = document.createElement('div');
                messageDiv.className = \`message \${message.role}-message\`;
                
                if (message.isThinking) {
                    messageDiv.className += ' thinking';
                }
                
                messageDiv.textContent = message.content;
                messagesDiv.appendChild(messageDiv);
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
                
                // Remove welcome message on first interaction
                const welcome = messagesDiv.querySelector('.welcome');
                if (welcome) {
                    welcome.remove();
                }
            }
        });
    </script>
</body>
</html>`;
    }
}
exports.ChatViewProvider = ChatViewProvider;
ChatViewProvider.viewType = 'agenticide-chat';
//# sourceMappingURL=chatView.js.map