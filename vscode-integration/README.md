# VS Code Integration - Quick Setup

## ⚡ 5-Minute Setup

```bash
cd /path/to/your/project
mkdir -p .vscode
cp /Users/vikasavnish/agenticide/vscode-integration/tasks.json .vscode/
```

## 🎯 Available in Command Palette

1. Press `Cmd+Shift+P` (or `Ctrl+Shift+P`)
2. Type "Tasks: Run Task"
3. See Agenticide commands:
   - **Show Context** - View project info, TODOs, conversations
   - **List TODOs** - Show all tasks
   - **AI Suggestions** - Get intelligent recommendations
   - **Start LSP** - Auto-detect and start language servers

## 📝 Terminal Access

In VS Code terminal, use shortcuts:
```bash
cm show              # Show context
cm list-todos .      # List TODOs
cm suggest .         # AI suggestions
lsp detect .         # Detect languages
```

## 🚀 Quick Test

1. Open any project in VS Code
2. `Cmd+Shift+P` → "Agenticide: Show Context"
3. If no context, initialize: `cm init .` in terminal

---

For full extension with sidebar panels, see `/Users/vikasavnish/agenticide/IDE_INTEGRATION.md`
