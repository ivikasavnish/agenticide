# Agenticide v3.0.0 - ACP + MCP Architecture

## 🚀 Hybrid AI Assistant with Agent Client Protocol & Model Context Protocol

Agenticide is a **free, open-source alternative to Cursor, Claude Code, and GitHub Copilot** that combines:

- **ACP (Agent Client Protocol)** - Standardized communication with AI agents
- **MCP (Model Context Protocol)** - Context sharing with external tools
- **Hybrid AI** - Best of Claude Code + GitHub Copilot

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VSCode Extension                         │
│                     (ACP Client)                            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐    ┌──────────────┐   ┌──────────────┐ │
│   │ Claude Code  │    │   Copilot    │   │  MCP Server  │ │
│   │  (via ACP)   │    │ (VSCode API) │   │  (Context)   │ │
│   └──────────────┘    └──────────────┘   └──────────────┘ │
│          │                    │                   │         │
│          └────────────────────┴───────────────────┘         │
│                              │                              │
│                   ┌──────────▼──────────┐                  │
│                   │   Hybrid Manager    │                  │
│                   │  (Smart Routing)    │                  │
│                   └─────────────────────┘                  │
│                              │                              │
│          ┌───────────────────┴───────────────────┐         │
│          ▼                   ▼                   ▼         │
│   ┌──────────┐        ┌──────────┐       ┌──────────┐    │
│   │   Chat   │        │  Tasks   │       │ Context  │    │
│   │   View   │        │TreeView  │       │TreeView  │    │
│   └──────────┘        └──────────┘       └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Features

### ✅ Implemented in v3.0.0

1. **Agent Client Protocol (ACP)**
   - Claude Code integration via ACP
   - JSON-RPC 2.0 communication
   - Session management
   - Agentic task execution

2. **Model Context Protocol (MCP)**
   - External tool connections
   - Context sharing across tools
   - MCP server integration

3. **GitHub Copilot Integration**
   - VSCode Language Model API
   - Inline completions
   - Chat interface

4. **Hybrid AI Manager**
   - Smart routing between Claude & Copilot
   - Auto-selects best provider per task
   - Fallback handling

5. **Task Management**
   - VSCode workspace storage
   - Checkbox interactions
   - Task persistence

6. **Focus Mode**
   - One-click disable all extensions
   - Status bar toggle
   - Extension restore

---

## 🔌 Protocol Integration

### ACP (Agent Client Protocol)

Agenticide acts as an **ACP Client**, communicating with:

- **Claude Code** (agentic coding agent)
- Any ACP-compatible agent

**Key Methods Used:**
- `initialize` - Version & capability negotiation
- `session/new` - Create new coding session
- `session/prompt` - Send user prompts
- `fs/read_text_file` - File operations
- `terminal/create` - Terminal access

### MCP (Model Context Protocol)

Connect to external MCP servers for:

- Database access
- API integrations
- Custom tools
- Context providers

**Configuration:**
```json
{
  "agenticide.mcpServers": [
    {
      "name": "my-server",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"]
    }
  ]
}
```

---

## ⚙️ Installation & Setup

### 1. Install Extension

```bash
code --install-extension ~/agenticide/agenticide-vscode/agenticide-3.0.0.vsix
```

### 2. Install Claude Code (Optional but Recommended)

**macOS/Linux:**
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Windows:**
```powershell
irm https://claude.ai/install.ps1 | iex
```

### 3. Install GitHub Copilot

From VSCode Extensions: Search "GitHub Copilot"

### 4. Configure Settings

Open Settings (`Cmd+,`) and search for "Agenticide":

- **Use Claude Code ACP**: Enable/disable ACP integration
- **Claude API Key**: Fallback if Claude Code not installed
- **Default AI Provider**: `auto`, `claude`, or `copilot`
- **Chat Location**: `editor` or `sidebar`

---

## 🎯 Usage

### Chat with AI

- **Keyboard**: `Cmd+Shift+A` (Mac) or `Ctrl+Shift+A` (Windows)
- **Command**: "Agenticide: Open AI Chat"

Chat automatically routes to:
- **Claude** for complex tasks (refactoring, architecture, bug fixes)
- **Copilot** for quick completions and simple questions

### Code Actions

Right-click in editor → "Agenticide AI":
- Explain Code
- Fix Code
- Refactor
- Generate Tests
- Add Comments

### Task Management

1. Open sidebar → "Agenticide" icon
2. Click "+" to add tasks
3. Check boxes to complete
4. Tasks persist in workspace

### Focus Mode

Click **Extensions** button in status bar (bottom-right) to disable all other extensions.

---

## 🔧 Configuration

### Settings

```jsonc
{
  // === AI Provider Settings ===
  "agenticide.useClaudeCodeACP": true,  // Use Claude Code via ACP
  "agenticide.claudeApiKey": "",        // Fallback API key
  "agenticide.defaultAIProvider": "auto", // auto | claude | copilot
  
  // === Chat Settings ===
  "agenticide.chatLocation": "editor",  // editor | sidebar
  "agenticide.chatEditorColumn": "beside", // beside | one | two | three
  
  // === MCP Servers (Advanced) ===
  "agenticide.mcpServers": []
}
```

### Environment Variables

```bash
# Claude API Key (alternative to settings)
export ANTHROPIC_API_KEY="sk-ant-..."

# GitHub Copilot (handled by Copilot extension)
# No additional env vars needed
```

---

## 🤖 How It Works

### 1. Initialization

When you open VSCode:
1. Extension activates
2. Checks for Claude Code installation
3. Initializes ACP client
4. Connects to Copilot (if installed)
5. Starts MCP servers (if configured)

### 2. Request Flow

When you send a chat message:

```
User Input
    ↓
Hybrid Manager (analyzes prompt)
    ↓
┌───────────────────────────┐
│ Is it complex/agentic?    │
├───────────────────────────┤
│ YES → Claude via ACP      │
│ NO  → Copilot via API     │
└───────────────────────────┘
    ↓
Context Added (tasks, files, selection)
    ↓
Agent/Model Response
    ↓
Display in Chat UI
```

### 3. Agent Communication (ACP)

```typescript
// Simplified ACP flow
1. session/new → Create session
2. session/prompt → Send user message
3. Agent responds with updates
4. fs/write_text_file → Apply changes
5. terminal/create → Run commands
```

---

## 🆚 Comparison

| Feature | Agenticide | Cursor | Claude Code | Copilot |
|---------|-----------|---------|-------------|---------|
| **Price** | Free | $20/mo | Free | $10/mo |
| **Claude Integration** | ✅ ACP | ✅ | ✅ | ❌ |
| **Copilot Integration** | ✅ API | ❌ | ❌ | ✅ |
| **Task Management** | ✅ | ✅ | ❌ | ❌ |
| **Focus Mode** | ✅ | ❌ | ❌ | ❌ |
| **MCP Support** | ✅ | ❌ | ✅ | ❌ |
| **Open Source** | ✅ | ❌ | ✅ | ❌ |
| **Protocol** | ACP+MCP | Custom | ACP | Custom |

---

## 🐛 Troubleshooting

### Claude Code Not Working

1. Check if installed: `which claude`
2. Verify ACP support: `claude --acp`
3. Check extension logs: Developer Tools → Console

### Copilot Not Responding

1. Ensure Copilot extension installed
2. Sign in to GitHub
3. Check subscription status

### Tasks Not Saving

Tasks use VSCode workspace storage. Ensure:
- Workspace folder is open
- Not in untitled workspace

---

## 🚧 Roadmap

- [ ] Real-time ACP streaming responses
- [ ] MCP Apps UI integration
- [ ] Multi-agent orchestration
- [ ] Custom MCP server creation
- [ ] Team collaboration features
- [ ] Git workflow automation
- [ ] Inline code edits (like Cursor)
- [ ] Voice input support

---

## 📚 Resources

- [ACP Specification](https://agentclientprotocol.com/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Code Docs](https://code.claude.com/)
- [VSCode API](https://code.visualstudio.com/api)

---

## 🤝 Contributing

This is open source! Contributions welcome:

1. Fork the repository
2. Create feature branch
3. Make changes
4. Submit pull request

---

## 📄 License

MIT License - See LICENSE.txt

---

## 💬 Support

- GitHub Issues
- Discord Community (coming soon)
- Email: support@agenticide.dev

---

**Built with ❤️ for the developer community**

**Version 3.0.0** - ACP + MCP Integration
