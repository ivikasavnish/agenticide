# Agenticide CLI v3.0.0

**AI Coding Assistant for the Terminal** with ACP + MCP support

Free alternative to Claude Code CLI that works with:
- 🤖 Claude Code (via ACP)
- 🤖 GitHub Copilot (coming soon)
- 📡 MCP Servers

---

## 🚀 Installation

### From Source

```bash
cd agenticide-cli
npm install -g .
```

### From NPM (when published)

```bash
npm install -g agenticide-cli
```

---

## 📋 Commands

### Initialize Project

```bash
agenticide init
```

Creates `.agenticide-tasks.json` in current directory.

### Interactive Chat

```bash
agenticide chat
```

Start an interactive AI coding session:
- Ask questions about code
- Get architecture advice  
- Debug issues
- Generate code

**Options:**
- `-p, --provider <provider>` - Choose AI provider (claude|copilot|auto)

**Example:**
```bash
$ agenticide chat

💬 Chat started. Type your message (or "exit" to quit)

You: How do I implement authentication in Express.js?

🤖 Claude:
┌────────────────────────────────────────────┐
│                                            │
│  Here's how to implement authentication... │
│                                            │
└────────────────────────────────────────────┘

You: exit
Goodbye! 👋
```

### Task Management

#### Add Task

```bash
agenticide task:add "Implement login feature"
```

#### List Tasks

```bash
agenticide task:list

📋 Tasks:

  ○ 1. Implement login feature
  ○ 2. Fix bug in user service
  ✓ 3. Update documentation
```

#### Complete Task

```bash
agenticide task:complete <task-id>
```

### Code Analysis

#### Explain Code

```bash
agenticide explain src/app.js
```

Analyzes and explains the code in the file.

### Configuration

#### Set Config

```bash
agenticide config:set defaultProvider claude
agenticide config:set claudeApiKey sk-ant-...
```

#### Show Config

```bash
agenticide config:show

⚙️  Configuration:
{
  "defaultProvider": "claude",
  "useACP": true,
  "claudeApiKey": "sk-ant-...",
  "mcpServers": []
}
```

### Status

```bash
agenticide status

📊 Status:

  ✅ Claude Code (ACP)
  ℹ️  Tasks: 5 (2 pending)
  ℹ️  Provider: claude
  ℹ️  Directory: /Users/you/project
```

---

## 🏗️ Architecture

```
┌────────────────────────────────────────┐
│        Agenticide CLI (Node.js)        │
│          (ACP Client)                  │
├────────────────────────────────────────┤
│                                        │
│   ┌──────────────┐   ┌──────────────┐ │
│   │ Claude Code  │   │  MCP Server  │ │
│   │  (via ACP)   │   │  (Context)   │ │
│   └──────────────┘   └──────────────┘ │
│          │                   │         │
│          └───────────────────┘         │
│                    │                   │
│         ┌──────────▼──────────┐       │
│         │  JSON-RPC Handler   │       │
│         └─────────────────────┘       │
│                    │                   │
│      ┌─────────────┴─────────────┐    │
│      ▼                           ▼    │
│  Commands                    Tasks    │
│  (chat, explain)        (.agenticide)  │
└────────────────────────────────────────┘
```

---

## 🔌 Protocols

### Agent Client Protocol (ACP)

Communicates with Claude Code using JSON-RPC 2.0:

```javascript
{
  "jsonrpc": "2.0",
  "method": "session/prompt",
  "params": {
    "sessionId": "session-123",
    "prompt": "Explain this code",
    "context": {
      "file": "app.js",
      "cwd": "/project"
    }
  }
}
```

### Model Context Protocol (MCP)

Connect to MCP servers for additional tools:

```bash
agenticide config:set mcpServers '[{"name":"postgres","command":"npx","args":["-y","@modelcontextprotocol/server-postgres"]}]'
```

---

## ⚙️ Configuration

Config stored in `~/.agenticide/config.json`:

```json
{
  "defaultProvider": "claude",
  "useACP": true,
  "claudeApiKey": "",
  "mcpServers": []
}
```

Tasks stored in `.agenticide-tasks.json` per project:

```json
[
  {
    "id": 1707123456789,
    "description": "Implement auth",
    "completed": false,
    "createdAt": "2026-02-14T04:24:49.476Z"
  }
]
```

---

## 📚 Examples

### Quick Start

```bash
# Initialize
cd my-project
agenticide init

# Start chatting
agenticide chat

# Add tasks
agenticide task:add "Refactor authentication"
agenticide task:add "Add unit tests"

# List tasks
agenticide task:list

# Explain code
agenticide explain src/auth.js

# Check status
agenticide status
```

### Daily Workflow

```bash
# Morning: Check status
agenticide status

# Work: Interactive coding
agenticide chat
> How can I optimize this database query?
> Show me how to implement caching

# Track progress
agenticide task:add "Implement Redis caching"
agenticide task:complete 1234

# Code review
agenticide explain src/cache.js
```

---

## 🆚 Comparison with Other CLIs

| Feature | Agenticide CLI | Claude Code | GitHub Copilot CLI |
|---------|---------------|-------------|-------------------|
| **Price** | Free | Free | $10/mo |
| **ACP Support** | ✅ | ✅ | ❌ |
| **MCP Support** | ✅ | ✅ | ❌ |
| **Task Management** | ✅ | ❌ | ❌ |
| **Interactive Chat** | ✅ | ✅ | ✅ |
| **Code Explain** | ✅ | ✅ | ✅ |
| **Config Management** | ✅ | ✅ | ❌ |
| **Open Source** | ✅ | ✅ | ❌ |

---

## 🔧 Development

### Project Structure

```
agenticide-cli/
├── index.js          # Main CLI entry point
├── package.json      # Dependencies & config
├── README.md         # This file
└── node_modules/     # Dependencies
```

### Build & Test

```bash
# Install dependencies
npm install

# Link for local testing
npm link

# Test commands
agenticide --help
agenticide status
agenticide chat

# Unlink
npm unlink -g agenticide-cli
```

---

## 🐛 Troubleshooting

### Claude Code Not Found

```bash
# Install Claude Code
curl -fsSL https://claude.ai/install.sh | bash

# Verify installation
which claude

# Test ACP mode
claude --acp
```

### Permission Errors

```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

### Tasks Not Saving

Ensure `.agenticide-tasks.json` has write permissions:

```bash
chmod 644 .agenticide-tasks.json
```

---

## 🚧 Roadmap

- [ ] GitHub Copilot integration
- [ ] Real-time streaming responses
- [ ] Code generation commands
- [ ] Git integration
- [ ] MCP server management
- [ ] Plugin system
- [ ] Multi-agent orchestration
- [ ] Session history
- [ ] Export conversations

---

## 📖 Resources

- [ACP Specification](https://agentclientprotocol.com/)
- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Code](https://code.claude.com/)

---

## 📄 License

MIT License

---

## 💬 Support

- GitHub Issues
- Discord (coming soon)
- Email: support@agenticide.dev

---

**Built with ❤️ for developers who live in the terminal**

Version 3.0.0 | ACP + MCP Support
