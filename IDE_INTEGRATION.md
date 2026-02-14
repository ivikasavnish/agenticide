# IDE Integration Guide for Agenticide

## Overview

This guide explains how to integrate LSP Manager and Context Manager into IDEs/editors.

## Integration Approaches

### 1. **Command-Line Integration** (Immediate)
Most IDEs support running shell commands:

#### VS Code Tasks
Create `.vscode/tasks.json`:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Initialize Context",
      "type": "shell",
      "command": "~/.agenticide/context_manager",
      "args": ["init", "${workspaceFolder}"],
      "presentation": {
        "reveal": "always"
      }
    },
    {
      "label": "Show Context",
      "type": "shell",
      "command": "~/.agenticide/context_manager",
      "args": ["show", "${workspaceFolder}"]
    },
    {
      "label": "Start LSP Servers",
      "type": "shell",
      "command": "~/.agenticide/context_manager",
      "args": ["tool", "--tool", "lsp", "${workspaceFolder}"]
    },
    {
      "label": "Add TODO",
      "type": "shell",
      "command": "~/.agenticide/context_manager",
      "args": ["add-todo", "${workspaceFolder}", "${input:todoDescription}"]
    },
    {
      "label": "AI Suggestions",
      "type": "shell",
      "command": "~/.agenticide/context_manager",
      "args": ["suggest", "${workspaceFolder}"]
    },
    {
      "label": "Search Files",
      "type": "shell",
      "command": "~/.agenticide/context_manager",
      "args": ["search", "${workspaceFolder}", "${input:searchQuery}"]
    }
  ],
  "inputs": [
    {
      "id": "todoDescription",
      "type": "promptString",
      "description": "TODO description"
    },
    {
      "id": "searchQuery",
      "type": "promptString",
      "description": "Search query"
    }
  ]
}
```

#### VS Code Keybindings
Create `.vscode/keybindings.json`:
```json
[
  {
    "key": "ctrl+alt+c",
    "command": "workbench.action.tasks.runTask",
    "args": "Show Context"
  },
  {
    "key": "ctrl+alt+t",
    "command": "workbench.action.tasks.runTask",
    "args": "Add TODO"
  },
  {
    "key": "ctrl+alt+s",
    "command": "workbench.action.tasks.runTask",
    "args": "AI Suggestions"
  }
]
```

### 2. **JSON-RPC Server Mode** (Advanced)
Create a server that IDEs can communicate with via JSON-RPC.

#### Server Architecture
```
IDE <-> JSON-RPC <-> Agenticide Server <-> Tools (lsp_manager, context_manager)
```

### 3. **VS Code Extension** (Recommended)
Native VS Code extension using TypeScript.

### 4. **IntelliJ Plugin** (For JetBrains IDEs)
Native plugin using Java/Kotlin.

### 5. **Vim/Neovim Plugin** (For Terminal Editors)
Lua/VimScript plugin.

## Implementation Plan

### Phase 1: JSON-RPC Server (Create agenticide-server)
A server that wraps our tools and provides IDE-friendly APIs.

**Features:**
- RESTful API endpoints
- JSON-RPC 2.0 support
- WebSocket support for real-time updates
- Auto-discovery of projects
- Session management

**Endpoints:**
```
POST /api/context/init         - Initialize project
GET  /api/context/show         - Get project context
POST /api/todo/add             - Add TODO
GET  /api/todo/list            - List TODOs
POST /api/todo/complete        - Complete TODO
POST /api/conversation/add     - Add conversation
GET  /api/conversation/list    - List conversations
GET  /api/suggest              - Get AI suggestions
POST /api/tool/execute         - Execute tool
POST /api/scaffold             - Generate scaffold
GET  /api/file/read            - Read file
POST /api/file/edit            - Edit file
POST /api/search               - Search files
GET  /api/projects             - List projects
POST /api/projects/switch      - Switch project
```

### Phase 2: VS Code Extension

**Extension Features:**
- 📊 Context Panel (sidebar)
- ✅ TODO Tree View
- 💬 Conversation History View
- 🤖 AI Suggestions Panel
- 🔧 Tool Execution Commands
- 📝 File Operations
- 🔍 Smart Search
- 🏗️ Scaffold Generator UI

**Extension Structure:**
```
agenticide-vscode/
├── package.json
├── src/
│   ├── extension.ts          # Main entry point
│   ├── contextProvider.ts    # Context tree view
│   ├── todoProvider.ts       # TODO tree view
│   ├── conversationProvider.ts # Conversation view
│   ├── suggestionPanel.ts    # AI suggestions
│   ├── agenticideClient.ts   # Communication with tools
│   └── commands/
│       ├── context.ts
│       ├── todo.ts
│       ├── conversation.ts
│       ├── scaffold.ts
│       └── tools.ts
└── resources/
    └── icons/
```

### Phase 3: IntelliJ Plugin

**Plugin Features:**
- Tool Window for Context
- Action Group for commands
- Background tasks for long operations
- Notifications for suggestions

## Quick Start: VS Code Integration

### Option A: Use Built-in Terminal
```bash
# Add to VS Code settings.json
{
  "terminal.integrated.shellArgs.osx": [
    "-l",
    "-c",
    "source ~/.agenticide/aliases.sh && exec $SHELL"
  ]
}
```

Now you can use `cm` and `lsp` commands directly in VS Code terminal.

### Option B: Create Extension (Next Steps)

1. **Install Extension Generator**
```bash
npm install -g yo generator-code
yo code
# Select: New Extension (TypeScript)
# Name: agenticide-vscode
```

2. **Add Dependencies**
```bash
cd agenticide-vscode
npm install --save axios
```

3. **Implement Extension** (See Phase 2)

## API Server Implementation

Create a new Rust project for the API server:

```bash
cd /Users/vikasavnish/agenticide
cargo new agenticide-server
```

### Server Dependencies (Cargo.toml)
```toml
[dependencies]
actix-web = "4"
actix-cors = "0.7"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
```

### Server Features
- RESTful API for all context_manager commands
- WebSocket for real-time updates
- Auto-reload on .context.json changes
- CORS support for web-based IDEs
- Authentication (optional)

## Web-Based IDE Integration

For web IDEs (like GitHub Codespaces, GitPod):

### Use Web Extension API
```typescript
// WebSocket connection to agenticide-server
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update UI based on context changes
};

// Send commands
ws.send(JSON.stringify({
  command: 'add-todo',
  args: { description: 'New task' }
}));
```

## Neovim Integration

### Lua Plugin Structure
```lua
-- ~/.config/nvim/lua/agenticide/init.lua
local M = {}

function M.show_context()
  local handle = io.popen('~/.agenticide/context_manager show .')
  local result = handle:read("*a")
  handle:close()
  
  -- Display in floating window
  vim.api.nvim_echo({{result, 'Normal'}}, false, {})
end

function M.add_todo(description)
  local cmd = string.format("~/.agenticide/context_manager add-todo . '%s'", description)
  vim.fn.system(cmd)
end

return M
```

### Neovim Commands
```vim
" ~/.config/nvim/init.vim
command! AgenticideContext lua require('agenticide').show_context()
command! -nargs=1 AgenticideTodo lua require('agenticide').add_todo(<q-args>)

" Keybindings
nnoremap <leader>ac :AgenticideContext<CR>
nnoremap <leader>at :AgenticideTodo 
```

## Integration Benefits

### For Developers
- ✅ Context visible in sidebar
- ✅ TODOs integrated with task lists
- ✅ AI suggestions as code actions
- ✅ Quick access to all tools
- ✅ No context switching

### For AI Assistants
- ✅ Full project context available
- ✅ Conversation history for continuity
- ✅ File operations via API
- ✅ Multi-project support
- ✅ Real-time updates

## Recommended Implementation Order

1. ✅ **Command-Line Tools** (Done!)
   - LSP Manager
   - Context Manager

2. 🔄 **VS Code Tasks** (Quick Win - 1 hour)
   - Create tasks.json
   - Add keybindings
   - Test workflow

3. 🔜 **JSON-RPC Server** (2-3 days)
   - Create agenticide-server
   - Implement REST API
   - Add WebSocket support

4. 🔜 **VS Code Extension** (1 week)
   - Extension scaffold
   - UI components
   - Command integration
   - Publish to marketplace

5. 🔜 **Other IDEs** (As needed)
   - IntelliJ plugin
   - Vim/Neovim plugin
   - Web extension

## Next Steps

Want me to create:
1. **VS Code Extension** - Full TypeScript extension
2. **JSON-RPC Server** - Rust server for IDE communication
3. **Neovim Plugin** - Lua plugin for terminal users
4. **VS Code Tasks** - Quick integration file

Which would you like me to implement first?
