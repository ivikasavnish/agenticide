# 🚀 Agenticide - Complete AI Development Platform

**The ONLY AI IDE with professional stub-first development, workflow integration, enterprise coding standards, and extensible plugin system.**

[![Tests](https://img.shields.io/badge/tests-9/9_passing-brightgreen)]() [![Integration](https://img.shields.io/badge/integration-complete-blue)]() [![Extensions](https://img.shields.io/badge/extensions-7_built--in-purple)]() [![Docs](https://img.shields.io/badge/docs-75KB-blue)]()

## 🎯 What Sets Agenticide Apart

| Feature | Agenticide | OpenCode | OpenClaw |
|---------|-----------|----------|----------|
| **Stub-First Development** | ✅ Full | ❌ No | ❌ No |
| **Professional Standards** | ✅ 6 styles | ❌ No | ❌ No |
| **Workflow Automation** | ✅ Complete | ❌ No | ❌ No |
| **Extension System** | ✅ 7 plugins | ❌ No | ❌ No |
| **Process Management** | ✅ Full | ❌ No | ❌ No |
| **Session Management** | ✅ Yes | ❌ No | ❌ No |
| **Git Integration** | ✅ Full | ❌ No | ❌ No |
| **Task Tracking** | ✅ Yes | ❌ No | ❌ No |
| **Export to Make/Task** | ✅ Yes | ❌ No | ❌ No |

**Agenticide provides a complete professional development workflow that no other AI IDE offers.**

## ⚡ Quick Start

```bash
# Just run agenticide - chat mode starts automatically!
$ agenticide

💬 You: create a websocket server with authentication

🤖 Assistant: I'll help you create that...

# Generate production-ready code:
/stub websocket javascript service --style=airbnb

✨ Automatically:
  ✅ Creates Git branch (feature/stub-websocket)
  ✅ Generates AI stubs with Airbnb style
  ✅ Adds comprehensive API annotations
  ✅ Creates Jest tests
  ✅ Tracks tasks in .agenticide-tasks.json
  ✅ Commits to Git

# Manage background processes:
/process start node websocket-server.js
/process list
/process logs 1

# Switch to other features:
/switch task        # Task management
/switch analyze     # Project analysis
/switch search      # Semantic search
```

## 🚀 Installation

```bash
git clone https://github.com/yourusername/agenticide.git
cd agenticide
./install.sh
echo 'source ~/.agenticide/aliases.sh' >> ~/.zshrc
source ~/.zshrc

# Start immediately (no subcommand needed!)
agenticide
```

## 🎮 Usage

### Default Chat Mode (Easiest Way)
```bash
# Just run agenticide - starts interactive chat
$ agenticide

# Ask questions, generate code, manage processes
You: help me build a REST API
You: /stub api go service
You: /process start go run main.go
You: /switch task
```

### Specific Commands
```bash
agenticide init              # Initialize in directory
agenticide analyze           # Analyze project with LSP
agenticide search "query"    # Semantic code search
agenticide status            # Show status
```

## 📚 Complete Documentation

- [Stub-First Guide](./STUB_FIRST_GUIDE.md) - Complete workflow guide (9.5KB)
- [Professional Standards](./PROFESSIONAL_STANDARDS.md) - 6 coding styles (15KB)
- [Workflow Integration](./WORKFLOW_INTEGRATION.md) - Automation system (10KB)
- [Session Management](./SESSION_MANAGEMENT.md) - Named sessions & auto-compaction (12KB)
- [Process Management](./PROCESS_MANAGEMENT.md) - Terminal & process control (5KB)
- [Complete Integration](./COMPLETE_INTEGRATION.md) - Full features (11KB)

**Total: 75KB of comprehensive documentation**

## 🧩 Extensions (7 Built-in)

Agenticide includes a powerful extension system with 7 ready-to-use plugins:

### Process Management 🖥️
```bash
/process start node server.js   # Start background process
/process list                    # List all processes
/process logs 1                  # View process output
/process stop 1                  # Stop process
```

### Browser Automation 🌐
```bash
/browser open https://example.com
/browser screenshot page.png
/browser click "#button"
/browser type "#input" "text"
```

### Docker Management 🐳
```bash
/docker ps                       # List containers
/docker run ubuntu bash          # Run container
/docker logs <container>         # View logs
/docker stop <container>         # Stop container
```

### Enhanced CLI 💻
```bash
/cli run "npm test"             # Run with history
/cli history                     # Show command history
/cli alias build "npm run build" # Create alias
```

### Debugger 🐛
```bash
/debug inspect myFunction       # Inspect function
/debug trace module.js          # Stack trace
/debug log data                 # Debug logging
```

### Model Context Protocol (MCP) 📡
```bash
/mcp context                    # Show available context
/mcp filesystem                 # File operations
/mcp git                        # Git context
```

### Manual QA Testing ✅
```bash
/qa create "Login flow"         # Create test case
/qa list                        # List test cases
/qa run 1                       # Run test
/qa report                      # Generate report
```

**Enable/disable extensions:**
```bash
/extensions                     # List all
/extension enable browser       # Enable
/extension disable browser      # Disable
```

## 📊 Statistics

- **6,500+** lines of code
- **7** languages supported (Go, Rust, TypeScript, JavaScript, Python, Java, C#)
- **6** coding styles (Google, Airbnb, Uber, Microsoft, Rust, PEP8)
- **7** extensions (process, browser, docker, cli, debugger, mcp, qa)
- **4** test frameworks (Google Test, Jest, pytest, Rust)
- **3** export formats (Makefile, Taskfile, JSON)
- **9/9** tests passing (100%)
- **Named sessions** with auto-save and resume
- **Auto-compaction** for git and database

## 💡 Key Features

### 🔨 Stub-First Development
Generate production-ready code with tests and annotations using professional coding standards from Google, Airbnb, Uber, and Microsoft.

### 📋 Session Management
Never lose work with named sessions, auto-save, and continuation support:
```bash
agenticide chat --session myproject    # Start named session
agenticide chat --continue             # Resume last session
/sessions                              # List all sessions
```

### 🖥️ Process Management
Full visibility and control over background processes:
```bash
/process start npm run dev
/process list
/process logs 1
```

### 🧩 Extensible Architecture
Add custom functionality with the extension system. Create your own extensions or use the 7 built-in plugins.

### ⚡ Workflow Automation
Export tasks to Makefile or Taskfile for team collaboration and CI/CD integration.

---

See [COMPLETE_INTEGRATION.md](./COMPLETE_INTEGRATION.md) for full features and examples.
