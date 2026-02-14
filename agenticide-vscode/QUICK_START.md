# 🚀 Quick Start Guide

## Installation

```bash
code --install-extension ~/agenticide/agenticide-vscode/agenticide-0.1.0.vsix
```

Then restart VSCode.

## First Steps

### 1. Find the Agenticide Icon
Look for the Agenticide icon in the **Activity Bar** (left sidebar):
- It shows 3 connected circles with checkboxes
- Click it to open the Agenticide panel

### 2. Initialize Your Project
1. Open a folder/workspace in VSCode
2. Press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows/Linux)
3. Type: `Agenticide: Initialize Project`
4. Press Enter

This creates a `.context.json` file in your workspace.

### 3. Add Your First TODO
1. Press `Cmd+Shift+P`
2. Type: `Agenticide: Add TODO`
3. Enter your TODO description (e.g., "Fix login bug")
4. Press Enter

### 4. View Your TODOs
1. Click the Agenticide icon in the sidebar
2. See the **TODOs** section with your items
3. Right-click on a TODO to mark it complete

### 5. Check Project Context
In the same sidebar panel:
- **Context** section shows project stats
- File count
- TODO completion rate

## Key Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Initialize Project | `Cmd+Shift+P` → `Agenticide: Initialize` | Setup .context.json |
| Add TODO | `Cmd+Shift+P` → `Agenticide: Add TODO` | Create new task |
| Complete TODO | Right-click TODO | Mark as done |
| Refresh | Click refresh icon | Reload views |

## Panel Layout

```
┌─────────────────────────────────┐
│   Activity Bar (Left Sidebar)  │
│                                 │
│  📁 Explorer                    │
│  🔍 Search                      │
│  🔀 Source Control              │
│  🐞 Run and Debug               │
│  📦 Extensions                  │
│  ⭕ Agenticide  ← Click here!  │
│                                 │
└─────────────────────────────────┘

When you click Agenticide icon:

┌─────────────────────────────────┐
│  AGENTICIDE                     │
├─────────────────────────────────┤
│  📋 TODOS                   🔄  │
│    ○ Fix login bug              │
│    ○ Update documentation       │
│    ✓ Add tests (Completed)      │
├─────────────────────────────────┤
│  📊 CONTEXT                     │
│    📁 my-project                │
│    📄 15 files tracked          │
│    ✓ 1 / 3 TODOs done          │
└─────────────────────────────────┘
```

## Tips

- **Auto-refresh**: The panel updates automatically when .context.json changes
- **Multiple projects**: Initialize each workspace separately
- **Icon indicators**: 
  - ○ = Pending TODO
  - ✓ = Completed TODO
  - ⚠️ = Not initialized

## Troubleshooting

**Don't see the icon?**
- Make sure extension is enabled in Extensions panel
- Restart VSCode after installation

**Panel is empty?**
- Run "Initialize Project" first
- Make sure you have a folder open in VSCode

**TODOs not showing?**
- Click the refresh button (🔄) in the TODOs panel header
- Check that .context.json exists in your workspace root

## What's Next?

The extension currently uses embedded WebAssembly for context management. Future features:
- AI-powered suggestions
- Multi-agent collaboration
- Conversation tracking
- LSP integration for code intelligence

Enjoy building with Agenticide! 🚀
