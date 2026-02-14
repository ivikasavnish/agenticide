# Agenticide VSCode Extension - Installation Guide

## 🎉 Extension Built Successfully!

Your extension has been packaged as: **agenticide-0.1.0.vsix**

Location: `/Users/vikasavnish/agenticide/agenticide-vscode/agenticide-0.1.0.vsix`

## ✨ What's New

- ✅ Custom sidebar panel with icon
- ✅ TODOs view
- ✅ Context view (project stats)
- ✅ Custom Agenticide icon in the activity bar

## 📦 Installation Options

### Option 1: Install via VSCode UI (Easiest)

1. Open Visual Studio Code
2. Click on the Extensions icon (or press `Cmd+Shift+X`)
3. Click the `...` menu (top right of Extensions panel)
4. Select "Install from VSIX..."
5. Navigate to `/Users/vikasavnish/agenticide/agenticide-vscode/`
6. Select `agenticide-0.1.0.vsix`
7. Click "Install"
8. Reload VSCode when prompted

### Option 2: Install via Command Line

```bash
code --install-extension /Users/vikasavnish/agenticide/agenticide-vscode/agenticide-0.1.0.vsix
```

## 🚀 Using the Extension

Once installed, you'll see:

1. **Agenticide icon** in the activity bar (left sidebar)
2. **Two panels** when you click the icon:
   - **TODOs** - Manage your TODO items
   - **Context** - Project overview and stats
3. Available commands (Cmd+Shift+P):
   - `Agenticide: Initialize Project` - Setup .context.json in workspace
   - `Agenticide: Add TODO` - Create a new TODO item
   - `Agenticide: Complete TODO` - Mark TODO as done
   - `Agenticide: Refresh` - Reload all views

## 📋 Features

- ✅ **Custom Sidebar Panel** with Agenticide icon
- ✅ **TODOs View** - Manage tasks with tree view
- ✅ **Context View** - Project stats and file tracking
- ✅ WebAssembly-powered context manager (no external dependencies!)
- ✅ Real-time updates when TODOs change
- ✅ Visual status indicators (pending/completed)
- ✅ Project initialization

## 🔧 Development

To rebuild after making changes:

```bash
cd /Users/vikasavnish/agenticide/agenticide-vscode
npm run compile
npm run package
```

## 📝 What's Included

- WebAssembly context manager (70KB)
- Tree view provider for TODOs
- Command palette integration
- File watching and auto-refresh

## 🐛 Troubleshooting

**Extension not showing?**
- Make sure you have a workspace open in VSCode
- Check Extensions panel (Cmd+Shift+X) for "Agenticide"

**Commands not working?**
- Run "Agenticide: Initialize Project" first
- This creates `.context.json` in your workspace root

**TODOs not updating?**
- Click the refresh button in the TODOs panel
- Check that `.context.json` exists in workspace

## 🎯 Next Steps

1. Install the extension using one of the methods above
2. Open a project folder in VSCode
3. Run `Agenticide: Initialize Project`
4. Start adding TODOs!

The extension uses embedded WASM, so no external CLI tools needed!
