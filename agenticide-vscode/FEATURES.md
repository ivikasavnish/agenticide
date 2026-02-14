# 🤖 Agenticide AI Coding Assistant v0.2.0

**Your Cursor/Claude Code/Copilot Alternative**

Full-featured AI pair programmer with chat interface, code suggestions, and task management.

---

## ✨ What's New in v0.2.0

### 🎯 AI Chat Panel
- Interactive chat interface (like Cursor/Claude Code)
- Context-aware conversations
- Quick suggestion buttons
- Beautiful VSCode-themed UI
- Keyboard shortcut: `Cmd+Shift+A` (Mac) / `Ctrl+Shift+A` (Windows/Linux)

### ☑️ Task Management with Checkboxes
- Visual checkboxes for tasks (like Todoist)
- Click checkbox to mark complete/incomplete
- Pending and completed task sections
- Relative timestamps ("2h ago", "just now")
- Right-click context menu options

### 🛠️ Code Actions
Right-click on code to access **"Agenticide AI"** menu with:
- **Explain Code** - Get AI explanations
- **Fix This Code** - Auto-fix bugs
- **Refactor Code** - Improve code quality
- **Generate Tests** - Create test cases
- **Add Comments** - Auto-document code

### ⌨️ Keyboard Shortcuts
- `Cmd+Shift+A` - Open AI Chat
- `Cmd+Shift+E` - Explain selected code
- Right-click → Agenticide AI → More options

---

## 📦 Installation

```bash
code --install-extension ~/agenticide/agenticide-vscode/agenticide-0.2.0.vsix
```

**Or manually:**
1. VSCode → Extensions (`Cmd+Shift+X`)
2. `...` menu → "Install from VSIX..."
3. Select `agenticide-0.2.0.vsix`
4. Restart VSCode

---

## 🚀 Quick Start

### 1. Click the Agenticide Icon
Look for the icon in the activity bar (left sidebar) - it has 3 connected circles

### 2. You'll See 3 Panels:

#### 📊 AI Chat
- Ask coding questions
- Get explanations
- Request code fixes
- Generate tests
- Chat like with Claude/Cursor

#### ☑️ Tasks
- Create tasks with `+` button
- Check/uncheck to toggle completion
- See pending and completed separately
- Right-click for more options

#### 📈 Context
- Project overview
- File tracking stats
- Task completion percentage

### 3. Initialize Your Project
```
Cmd+Shift+P → "Agenticide: Initialize Project"
```

### 4. Start Coding with AI
- Select code → Right-click → "Agenticide AI" → Choose action
- Or press `Cmd+Shift+A` to open chat

---

## 🎨 Features Comparison

| Feature | Agenticide | Cursor | Claude Code | Copilot |
|---------|-----------|--------|-------------|---------|
| AI Chat | ✅ | ✅ | ✅ | ❌ |
| Code Explain | ✅ | ✅ | ✅ | ✅ |
| Auto-fix | ✅ | ✅ | ✅ | ✅ |
| Task Management | ✅ | ❌ | ❌ | ❌ |
| Offline WASM | ✅ | ❌ | ❌ | ❌ |
| Free & Open Source | ✅ | ❌ | ❌ | ❌ |
| Multi-Agent | 🚧 | ❌ | ❌ | ❌ |

---

## 💬 Using the AI Chat

### Quick Suggestions
Click any suggestion button:
- 💡 Explain this code
- 🔧 Fix any bugs
- 🧪 Generate tests
- ✨ Refactor code

### Or Type Your Own
```
"How does this authentication work?"
"Fix the memory leak in this function"
"Add error handling to this API call"
"Generate unit tests for UserService"
```

### Chat Features
- **Context-aware**: Knows your current file and selection
- **Syntax highlighting**: Code blocks formatted properly
- **Copy-paste friendly**: Easy to copy AI responses
- **Persistent**: Chat history stays during session

---

## ☑️ Task Management

### Adding Tasks
1. Click `+` in Tasks panel, OR
2. `Cmd+Shift+P` → "Agenticide: Add Task"
3. Enter description
4. Press Enter

### Completing Tasks
- **Click the checkbox** next to the task
- Or right-click → "Toggle Task"

### Task Display
```
☑️ TASKS                    🔄 +

Pending:
  ○ Fix login bug              Created 2h ago
  ○ Add unit tests             Created 1d ago

Completed:
  ✓ Refactor UserService       ✓ 3d ago
```

### Task Features
- **Checkboxes**: Visual completion state
- **Timestamps**: "2h ago", "just now", etc.
- **Icons**: ○ = pending, ✓ = done
- **Right-click**: Toggle, Delete
- **Auto-sort**: Pending first, then completed

---

## 🛠️ Code Actions

### How to Use
1. Select code in editor
2. Right-click
3. Choose **"Agenticide AI"**
4. Pick an action

### Available Actions

#### 💡 Explain Code
- Select any code
- Press `Cmd+Shift+E` or use menu
- Opens chat with explanation

#### 🔧 Fix This Code
- Select buggy code
- AI suggests fixes
- Apply directly to editor

#### 🧪 Generate Tests
- Select function/class
- AI creates test cases
- Supports multiple frameworks

#### ✨ Refactor Code
- Select complex code
- AI improves structure
- Better readability & performance

#### 💬 Add Comments
- Select undocumented code
- AI adds JSDoc/docstrings
- Follows language conventions

---

## ⚙️ Configuration

### AI Model Integration (Coming Soon)
Currently shows placeholder responses. To integrate real AI:

1. **Edit `src/chatView.ts`**
2. **Replace `generateResponse()` function with:**

```typescript
private async generateResponse(message: string, context: any): string {
    // Option 1: OpenAI
    const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [{role: "user", content: message}]
    });
    return response.choices[0].message.content;
    
    // Option 2: Claude API
    const response = await anthropic.messages.create({
        model: "claude-3-opus-20240229",
        messages: [{role: "user", content: message}]
    });
    return response.content[0].text;
    
    // Option 3: Local LLM (Ollama)
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
            model: "codellama",
            prompt: message
        })
    });
    return await response.json();
}
```

3. **Rebuild:**
```bash
npm run compile
npm run package
```

---

## 🔌 Extending Agenticide

### Adding Custom Commands

**Edit `package.json`:**
```json
{
  "commands": [{
    "command": "agenticide.myCustomCommand",
    "title": "My Custom AI Action"
  }]
}
```

**Edit `src/extension.ts`:**
```typescript
context.subscriptions.push(
    vscode.commands.registerCommand('agenticide.myCustomCommand', async () => {
        // Your custom logic
        chatProvider.sendMessage('Custom response!');
    })
);
```

### Adding Custom AI Providers

Create `src/aiProvider.ts`:
```typescript
export interface AIProvider {
    generateCompletion(prompt: string): Promise<string>;
    explainCode(code: string): Promise<string>;
    fixBugs(code: string): Promise<string>;
}

export class OpenAIProvider implements AIProvider {
    async generateCompletion(prompt: string): Promise<string> {
        // Your OpenAI integration
    }
}
```

---

## 📊 Architecture

```
┌─────────────────────────────────────┐
│  VSCode Extension (TypeScript)     │
├─────────────────────────────────────┤
│  • Chat View (Webview)             │
│  • Task Provider (TreeView)        │
│  • Context Provider (TreeView)     │
│  • Code Actions (Context Menu)     │
├─────────────────────────────────────┤
│  WASM Context Manager (Rust)       │
├─────────────────────────────────────┤
│  .context.json (Storage)            │
└─────────────────────────────────────┘
```

---

## 🚧 Roadmap

### Next Features
- [ ] **Real AI Integration** (OpenAI/Claude/Local LLMs)
- [ ] **Inline Code Completions** (like Copilot)
- [ ] **Multi-file Refactoring**
- [ ] **Code Review Mode**
- [ ] **Terminal Integration**
- [ ] **Git Integration**
- [ ] **Multi-agent Collaboration**
- [ ] **Voice Input**
- [ ] **Code Streaming**

### Community Requests
Submit feature requests via GitHub Issues!

---

## 🐛 Troubleshooting

**Chat not opening?**
- Press `Cmd+Shift+A`
- Or click Agenticide icon → AI Chat panel

**Tasks not showing checkboxes?**
- Requires VSCode 1.109.0+
- Update VSCode if needed

**Code actions not in menu?**
- Right-click on selected code
- Look for "Agenticide AI" submenu

**AI responses are placeholders?**
- Normal! Integrate your AI model (see Configuration)
- Current version shows mock responses

---

## 📚 Resources

- [Quick Start Guide](./QUICK_START.md)
- [Installation Guide](./INSTALL.md)
- [GitHub Repository](#) (Coming soon)
- [API Documentation](#) (Coming soon)

---

## 💡 Tips & Tricks

1. **Use keyboard shortcuts** - `Cmd+Shift+A` for chat, `Cmd+Shift+E` to explain
2. **Select before asking** - AI gets better context from selections
3. **Be specific** - "Fix null pointer" better than "fix bug"
4. **Use tasks for planning** - Break work into checkable items
5. **Check context panel** - See what files AI is aware of

---

## 🙏 Credits

Built with:
- **TypeScript** - Extension logic
- **Rust + WASM** - Context manager
- **VSCode Extension API** - UI framework

Inspired by: Cursor, Claude Code, GitHub Copilot, Continue

---

## 📄 License

MIT License - Free to use, modify, and distribute

---

## 🚀 Get Started Now!

```bash
# Install
code --install-extension agenticide-0.2.0.vsix

# Initialize
Cmd+Shift+P → "Agenticide: Initialize Project"

# Start chatting
Cmd+Shift+A
```

**Welcome to the future of AI-assisted coding!** 🎉
