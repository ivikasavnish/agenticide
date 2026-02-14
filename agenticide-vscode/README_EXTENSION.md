# 🚀 Agenticide VSCode Extension

A multi-agent IDE extension with collaborative TODO management and project context tracking.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![VSCode](https://img.shields.io/badge/vscode-%5E1.109.0-blue)

## ✨ Features

### Custom Sidebar Panel
- **Agenticide icon** in the activity bar (3 connected agents with checkboxes)
- Dedicated panel with multiple views
- Clean, intuitive interface

### TODOs View
- Create and manage TODO items
- Visual status indicators (pending ○, completed ✓)
- Right-click to complete tasks
- Real-time updates

### Context View  
- Project name and location
- File tracking statistics
- TODO completion metrics
- At-a-glance project overview

### WebAssembly Powered
- Embedded context manager (70KB WASM module)
- No external CLI dependencies
- Fast, efficient operations
- Works offline

## 📥 Installation

### Quick Install
```bash
code --install-extension ~/agenticide/agenticide-vscode/agenticide-0.1.0.vsix
```

### Manual Install
1. Open VSCode
2. Extensions panel (`Cmd+Shift+X`)
3. Click `...` menu → "Install from VSIX..."
4. Select `agenticide-0.1.0.vsix`
5. Restart VSCode

## 🎯 Quick Start

1. **Find the icon**: Look for Agenticide in the activity bar (left sidebar)
2. **Click it**: Opens the Agenticide panel
3. **Initialize**: `Cmd+Shift+P` → "Agenticide: Initialize Project"
4. **Add TODO**: `Cmd+Shift+P` → "Agenticide: Add TODO"
5. **View results**: See TODOs and stats in the panel

See [QUICK_START.md](./QUICK_START.md) for detailed walkthrough.

## 📋 Commands

| Command | Description |
|---------|-------------|
| `Agenticide: Initialize Project` | Create .context.json in workspace |
| `Agenticide: Add TODO` | Add a new TODO item |
| `Agenticide: Complete TODO` | Mark TODO as complete |
| `Agenticide: Refresh` | Reload all views |

## 🏗️ Architecture

```
Extension (TypeScript)
    ↓
WASM Context Manager (Rust)
    ↓
.context.json (Storage)
```

**Key Components:**
- `extension.ts` - Main extension logic, tree providers
- `wasm/context_manager.wasm` - Rust-compiled context manager
- `.context.json` - Project state storage

## 📁 Project Structure

```
agenticide-vscode/
├── package.json           # Extension manifest
├── src/
│   └── extension.ts      # Main extension code
├── wasm/
│   ├── context_manager.wasm      # Compiled WASM
│   └── context_manager.js        # JS bindings
├── resources/
│   ├── icon.png          # Extension icon (128x128)
│   └── icon.svg          # Activity bar icon
└── out/
    └── extension.js      # Compiled output
```

## 🛠️ Development

### Prerequisites
- Node.js 20+
- VSCode 1.109.0+
- TypeScript 5.9+

### Build from Source
```bash
cd agenticide-vscode
npm install
npm run compile
npm run package
```

### Watch Mode (for development)
```bash
npm run watch
```

Then press F5 in VSCode to launch Extension Development Host.

## 🎨 Icon Design

The Agenticide icon features:
- 3 connected circles (representing collaborative agents)
- Checkboxes below (TODO management)
- Gold accent star (AI capabilities)
- Blue color scheme (VSCode native)

## 📊 Data Storage

The extension stores data in `.context.json`:

```json
{
  "todos": [
    {
      "id": 1,
      "description": "Fix login bug",
      "status": "pending",
      "created_at": "2026-02-12T18:00:00Z"
    }
  ],
  "files": ["src/main.rs", "Cargo.toml"],
  "metadata": {
    "project_name": "my-project"
  }
}
```

## 🔒 Privacy & Security

- All data stored locally in `.context.json`
- No external API calls
- No telemetry or tracking
- WASM runs in sandbox

## 🐛 Troubleshooting

**Extension not visible?**
- Check Extensions panel - ensure "Agenticide" is enabled
- Restart VSCode

**Icon not showing in activity bar?**
- Extension should appear below default icons
- Look for 3 connected circles icon

**Commands not working?**
- Open a folder/workspace first
- Run "Initialize Project" to create .context.json

**Panel is empty?**
- Ensure .context.json exists in workspace root
- Click refresh button (🔄)

## 🚧 Roadmap

- [ ] AI-powered TODO suggestions
- [ ] Multi-agent collaboration UI
- [ ] Conversation tracking view
- [ ] LSP integration
- [ ] Git integration
- [ ] Export/import functionality
- [ ] Settings/preferences panel

## 📝 License

MIT License - see [LICENSE](./LICENSE)

## 🤝 Contributing

This is part of the Agenticide project. Contributions welcome!

## 📚 Learn More

- [Quick Start Guide](./QUICK_START.md)
- [Installation Guide](./INSTALL.md)
- [Main Project](../)

---

**Built with:** TypeScript, Rust (WASM), VSCode Extension API

**Package size:** 74KB

**Status:** ✅ Production Ready
