# Agenticide v3.0.0 - Complete Package

**Free Open-Source AI Coding Assistant**

---

## 📦 What You Have

### 1. VSCode Extension (GUI)
- **Location**: `agenticide-vscode/agenticide-3.0.0.vsix`
- **Size**: 4.82 MB
- **Type**: VSCode Extension

### 2. CLI Tool (Terminal)
- **Location**: `agenticide-cli/`
- **Type**: Node.js CLI Application
- **Version**: 3.0.0

---

## ✨ Features

### Both Tools Support:
- ✅ **ACP (Agent Client Protocol)** - Claude Code integration
- ✅ **MCP (Model Context Protocol)** - External tool connections
- ✅ **Task Management** - Add, list, complete tasks
- ✅ **AI Chat** - Interactive coding assistant
- ✅ **Code Actions** - Explain, fix, refactor

### VSCode Extension Only:
- ✅ Focus Mode - Disable all other extensions
- ✅ Checkbox tasks in sidebar
- ✅ Code context menu actions
- ✅ Keyboard shortcuts (Cmd+Shift+A)

### CLI Tool Only:
- ✅ Beautiful terminal UI
- ✅ Configuration management
- ✅ Status dashboard
- ✅ Per-project initialization

---

## 🚀 Installation

### VSCode Extension

```bash
cd ~/agenticide/agenticide-vscode
code --install-extension agenticide-3.0.0.vsix
```

Then reload VSCode (Cmd+Shift+P → "Developer: Reload Window")

### CLI Tool

```bash
cd ~/agenticide/agenticide-cli
npm install -g .
```

Or:

```bash
npm link
```

---

## 🎯 Quick Start

### VSCode Extension

1. Install extension
2. Open command palette (Cmd+Shift+P)
3. Type "Agenticide"
4. Try:
   - "Agenticide: Open AI Chat"
   - "Agenticide: Add Task"
   - "Agenticide: Enable Focus Mode"

### CLI Tool

```bash
# Initialize in your project
cd ~/my-project
agenticide init

# Start chatting
agenticide chat

# Manage tasks
agenticide task:add "Implement login"
agenticide task:list

# Check status
agenticide status
```

---

## 📡 Protocols

### ACP (Agent Client Protocol)
- Standardized communication with AI agents
- JSON-RPC 2.0 over stdio
- Session management
- Used for Claude Code integration

### MCP (Model Context Protocol)
- Connect to external tools and services
- Context sharing between tools
- Extensible server architecture

### VSCode Language Model API
- GitHub Copilot integration
- Inline completions
- Chat interface

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│              Your Workspace                     │
├─────────────────────────────────────────────────┤
│                                                 │
│   VSCode Extension          CLI Tool            │
│   ┌──────────────┐         ┌──────────────┐    │
│   │  GUI Chat    │         │ Terminal Chat│    │
│   │  Sidebar     │         │  Commands    │    │
│   │  Focus Mode  │         │  Task Mgmt   │    │
│   └───────┬──────┘         └───────┬──────┘    │
│           │                        │            │
│           └────────┬───────────────┘            │
│                    │                            │
│          ┌─────────▼─────────┐                 │
│          │  ACP Client       │                 │
│          │  (Your Extension) │                 │
│          └─────────┬─────────┘                 │
│                    │                            │
│          ┌─────────┴─────────┐                 │
│          ▼                   ▼                 │
│   ┌────────────┐      ┌────────────┐          │
│   │ Claude Code│      │   Copilot  │          │
│   │   (ACP)    │      │  (VSCode)  │          │
│   └────────────┘      └────────────┘          │
└─────────────────────────────────────────────────┘
```

---

## 📚 Documentation

### VSCode Extension
- `ACP_MCP_ARCHITECTURE.md` - Complete technical guide
- `README.md` - User documentation
- `FEATURES.md` - Feature list

### CLI Tool
- `README.md` - Complete CLI guide
- `agenticide --help` - Command reference

---

## 🆚 Comparison

| Feature | Agenticide | Cursor | Claude Code | Copilot |
|---------|-----------|---------|-------------|---------|
| Price | **FREE** | $20/mo | Free | $10/mo |
| VSCode Ext | ✅ | ✅ | ❌ | ✅ |
| CLI Tool | ✅ | ❌ | ✅ | ✅ |
| ACP Support | ✅ | ❌ | ✅ | ❌ |
| MCP Support | ✅ | ❌ | ✅ | ❌ |
| Task Mgmt | ✅ | ✅ | ❌ | ❌ |
| Focus Mode | ✅ | ❌ | ❌ | ❌ |
| Open Source | ✅ | ❌ | ✅ | ❌ |

---

## 🔧 Configuration

### VSCode Extension Settings

Open Settings (Cmd+,) and search for "Agenticide":

- `agenticide.useClaudeCodeACP` - Use Claude Code via ACP
- `agenticide.claudeApiKey` - Fallback API key
- `agenticide.defaultAIProvider` - auto | claude | copilot
- `agenticide.chatLocation` - editor | sidebar

### CLI Configuration

Config stored in `~/.agenticide/config.json`:

```json
{
  "defaultProvider": "claude",
  "useACP": true,
  "claudeApiKey": "",
  "mcpServers": []
}
```

---

## 🛠️ Prerequisites

### For Claude Code Integration
```bash
# Install Claude Code
curl -fsSL https://claude.ai/install.sh | bash

# Verify
which claude
```

### For GitHub Copilot
Install from VSCode Extensions marketplace

---

## 💡 Usage Examples

### VSCode Extension

**Chat with AI:**
```
Cmd+Shift+A → Opens chat
Type: "How do I implement JWT authentication?"
```

**Code Actions:**
```
1. Select code
2. Right-click → "Agenticide AI"
3. Choose: Explain | Fix | Refactor | Generate Tests
```

**Focus Mode:**
```
Click "Extensions" in status bar → Disables all other extensions
```

### CLI Tool

**Interactive Chat:**
```bash
$ agenticide chat

💬 Chat started

You: Explain this Express.js code
Claude: [Detailed explanation...]

You: How can I add authentication?
Claude: [Authentication guide...]
```

**Task Workflow:**
```bash
$ agenticide task:add "Implement user registration"
✅ Task added

$ agenticide task:list
📋 Tasks:
  ○ 1. Implement user registration
  
$ agenticide task:complete 1
✅ Task completed
```

---

## 🐛 Troubleshooting

### VSCode Extension Not Loading

1. Check Developer Console: Help → Toggle Developer Tools
2. Look for activation logs
3. Ensure VSCode 1.109+ installed
4. Try reload: Cmd+Shift+P → "Developer: Reload Window"

### CLI Commands Not Found

```bash
# Re-link globally
cd ~/agenticide/agenticide-cli
npm link

# Or install globally
npm install -g .
```

### Claude Code Not Found

```bash
# Install
curl -fsSL https://claude.ai/install.sh | bash

# Add to PATH
export PATH="$HOME/.local/bin:$PATH"
```

---

## 🚧 Roadmap

- [ ] Real-time ACP streaming
- [ ] MCP Apps UI integration
- [ ] Multi-agent orchestration
- [ ] Git workflow automation
- [ ] Team collaboration
- [ ] Voice input
- [ ] Custom plugin system
- [ ] Inline code edits (Cursor-style)

---

## 📄 License

MIT License - Free to use, modify, and distribute

---

## 💬 Support

- GitHub Issues: [Report bugs](https://github.com/your-repo/agenticide)
- Documentation: See README files in each package
- Email: support@agenticide.dev

---

## 🎉 Summary

**You now have a complete, free, open-source AI coding suite that rivals paid alternatives!**

✅ Two tools (VSCode + CLI)
✅ Three protocols (ACP + MCP + VSCode API)
✅ Multiple AI providers (Claude + Copilot)
✅ Full task management
✅ Beautiful UIs
✅ Completely FREE

**Install both and start coding smarter today!** 🚀
