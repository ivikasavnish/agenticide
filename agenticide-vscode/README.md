# 🤖 Agenticide AI Coding Assistant

**v0.2.0** - Your Free Cursor/Claude Code Alternative

![VSCode](https://img.shields.io/badge/vscode-%5E1.109.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Version](https://img.shields.io/badge/version-0.2.0-orange)

---

## 🎯 What Is This?

Agenticide is a **full-featured AI coding assistant** for VSCode with:
- ✅ **AI Chat Panel** (like Cursor)
- ✅ **Task Management with Checkboxes** (like Todoist)
- ✅ **Code Actions** (Explain, Fix, Refactor, Test)
- ✅ **🎯 Focus Mode** - **ONE-CLICK disable all other extensions!**
- ✅ **Context Tracking** (Files, Stats, Completion %)
- ✅ **WebAssembly Powered** (No external dependencies)
- ✅ **100% Free & Open Source**

---

## 🚀 Quick Install

```bash
code --install-extension ~/agenticide/agenticide-vscode/agenticide-0.2.0.vsix
```

Then restart VSCode and press **`Cmd+Shift+A`** to start!

---

## 📸 Screenshot Tour

### 1. Sidebar Panel
```
┌─────────────────────────────────┐
│  AGENTICIDE AI                  │
├─────────────────────────────────┤
│  💬 AI CHAT                     │
│    [Chat interface here]        │
├─────────────────────────────────┤
│  ☑️  TASKS              🔄 +    │
│    ○ Fix login bug       2h ago │
│    ○ Add tests           1d ago │
│    ✓ Refactor code       Done   │
├─────────────────────────────────┤
│  📊 CONTEXT                     │
│    📁 my-project                │
│    📄 15 files tracked          │
│    ✓ 67% complete (2/3)        │
└─────────────────────────────────┘
```

### 2. AI Chat
- Ask questions about code
- Get explanations & fixes
- Generate tests & refactor
- Context-aware responses

### 3. Task Checkboxes
- Click to mark done
- Auto-sorted by status
- Timestamps & progress

---

## ⚡ Key Features

### 💬 AI Chat
- Interactive conversation panel
- Quick suggestion buttons
- Code syntax highlighting
- `Cmd+Shift+A` to open

### ☑️ Smart Tasks
- Visual checkboxes
- One-click completion
- Pending/completed sections
- Right-click actions

### 🛠️ Code Actions
Right-click selected code:
- **Explain Code** (`Cmd+Shift+E`)
- **Fix This Code**
- **Generate Tests**
- **Refactor Code**
- **Add Comments**

### 📊 Context Panel
- Project overview
- File tracking
- Task completion stats
- **🎯 Focus Mode status & toggle**

### 🎯 Focus Mode ⭐ NEW!
**One-click to disable ALL other extensions!**
- Click status bar (bottom-right)
- Clean testing environment
- Performance boost
- Easy restore
- See [FOCUS_MODE.md](./FOCUS_MODE.md) for details

---

## 📖 Usage

### First Time Setup
1. Open a folder in VSCode
2. Click Agenticide icon (left sidebar)
3. `Cmd+Shift+P` → "Agenticide: Initialize Project"

### Using AI Chat
1. Press `Cmd+Shift+A`
2. Ask anything: "Explain this function", "Fix this bug", etc.
3. Or click suggestion buttons

### Managing Tasks
1. Click `+` button in Tasks panel
2. Enter task description
3. Click checkbox when done

### Code Actions
1. Select code
2. Right-click → "Agenticide AI"
3. Choose action

---

## 🔧 AI Integration

**Current Status:** Mock responses (placeholders)

**To Add Real AI:**

Edit `src/chatView.ts` and integrate:
- OpenAI API
- Claude API
- Local LLM (Ollama, LM Studio)
- Azure OpenAI
- Or any custom provider

See [FEATURES.md](./FEATURES.md) for integration code examples.

---

## 🆚 vs. Other AI Assistants

| Feature | Agenticide | Cursor | Copilot | Claude Code |
|---------|-----------|--------|---------|-------------|
| Price | **Free** | $20/mo | $10/mo | $20/mo |
| Open Source | ✅ | ❌ | ❌ | ❌ |
| AI Chat | ✅ | ✅ | ❌ | ✅ |
| Task Mgmt | ✅ | ❌ | ❌ | ❌ |
| Checkboxes | ✅ | ❌ | ❌ | ❌ |
| **Focus Mode** | **✅** | **❌** | **❌** | **❌** |
| Offline Core | ✅ | ❌ | ❌ | ❌ |
| BYO AI Model | ✅ | ❌ | ❌ | ❌ |

---

## 📂 What's Included

```
agenticide-0.2.0.vsix (98KB)
├── AI Chat Panel (Webview)
├── Task Manager (with checkboxes)
├── Context Tracker
├── Code Actions Menu
├── WASM Context Manager (70KB)
├── Keyboard Shortcuts
└── 3 Tree View Panels
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+A` | Open AI Chat |
| `Cmd+Shift+E` | Explain Selected Code |
| Right-click | Code Actions Menu |

---

## 📚 Documentation

- **[FOCUS_MODE.md](./FOCUS_MODE.md)** - 🎯 One-click extension management (MUST READ!)
- **[FEATURES.md](./FEATURES.md)** - Full feature list & AI integration guide
- **[QUICK_START.md](./QUICK_START.md)** - Step-by-step walkthrough
- **[INSTALL.md](./INSTALL.md)** - Installation & troubleshooting

---

## 🚧 Roadmap

**Coming Soon:**
- Real AI integration (OpenAI/Claude/Local)
- Inline code completions
- Multi-file refactoring
- Code review mode
- Terminal integration
- Voice input

**Vote on features!** Open an issue with your requests.

---

## 🐛 Known Issues

1. **AI responses are placeholders** - Integrate your AI model (see FEATURES.md)
2. **Uncomplete task not supported** - Coming in v0.3.0
3. **Delete task is stub** - WASM update needed

---

## 🛠️ Development

### Build from Source
```bash
cd agenticide-vscode
npm install
npm run compile
npm run package
```

### Watch Mode
```bash
npm run watch
# Then F5 in VSCode to debug
```

---

## 💡 Pro Tips

1. **Select code before asking** - AI gets better context
2. **Use specific questions** - "Fix null pointer" > "fix bug"
3. **Check Context panel** - See what files are tracked
4. **Use tasks for planning** - Break work into steps
5. **Integrate your own AI** - Use your preferred model

---

## 🙏 Acknowledgments

Inspired by: **Cursor**, **Claude Code**, **GitHub Copilot**, **Continue**

Built with: **TypeScript**, **Rust (WASM)**, **VSCode API**

---

## 📄 License

MIT License - See [LICENSE](./LICENSE)

Free to use, modify, and distribute!

---

## 🎉 Get Started

```bash
# 1. Install
code --install-extension agenticide-0.2.0.vsix

# 2. Restart VSCode

# 3. Press Cmd+Shift+A to chat!
```

**Happy coding with your AI pair programmer!** 🚀

---

**Questions?** Check [FEATURES.md](./FEATURES.md) or [QUICK_START.md](./QUICK_START.md)

**Found a bug?** Open an issue!

**Want to contribute?** PRs welcome!
