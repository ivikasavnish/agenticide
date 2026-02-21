# 🚀 Agenticide Installation & Quick Start

## ✅ Installation Complete!

The Agenticide CLI has been installed to: `~/.agenticide/bin/agenticide`

---

## 🔧 Activate Installation

### Option 1: Reload Shell (Recommended)
```bash
source ~/.bashrc    # For bash
# or
source ~/.zshrc     # For zsh
```

### Option 2: Use Full Path
```bash
~/.agenticide/bin/agenticide --version
```

### Option 3: Add to PATH (Current Session)
```bash
export PATH="$HOME/.agenticide/bin:$PATH"
agenticide --version
```

---

## 🎯 Quick Start

### Start Interactive Chat
```bash
agenticide
# or
agenticide chat
```

### See All Commands
```bash
agenticide --help
```

### Check Version
```bash
agenticide --version
```

---

## 🎮 Try New Features

### API Testing
```bash
agenticide

You: /api get https://api.github.com/zen
You: /api get https://httpbin.org/json
You: /api post https://httpbin.org/post '{"test":"data"}'
```

### SQL Queries
```bash
You: /sql connect sqlite ./database.db
You: /sql tables
You: /sql query SELECT * FROM users LIMIT 5
```

### Intelligent Hints
```bash
You: /help           # See all commands
You: /api<Enter>     # See API usage
You: /sql<Enter>     # See SQL usage
You: /pro<Tab>       # Autocomplete to /process
```

### Process Management
```bash
You: /process start npm run dev
You: /process list
You: /process logs 1
```

---

## 📦 What's Installed

| Binary | Size | Description |
|--------|------|-------------|
| `agenticide` | 56MB | Standalone binary (no dependencies) |
| `agenticide-dev` | Link | Development version (uses Node.js) |

---

## 🆘 Troubleshooting

### Command Not Found
If you get "command not found":

1. **Check installation:**
   ```bash
   ls -lh ~/.agenticide/bin/agenticide
   ```

2. **Use full path:**
   ```bash
   ~/.agenticide/bin/agenticide --version
   ```

3. **Add to PATH manually:**
   ```bash
   echo 'export PATH="$HOME/.agenticide/bin:$PATH"' >> ~/.bashrc
   source ~/.bashrc
   ```

### Binary Won't Run
```bash
# Make sure it's executable
chmod +x ~/.agenticide/bin/agenticide

# Try running
~/.agenticide/bin/agenticide --version
```

### Use Node.js Version Instead
```bash
# If binary doesn't work, use Node version
cd /Users/vikasavnish/agenticide/agenticide-cli
node index.js --help
```

---

## 📚 Documentation

- **RELEASE_NOTES.md** - Full release notes
- **docs/NEW_FEATURES.md** - New features guide
- **docs/EXTENSIONS_GUIDE.md** - Extension reference
- **docs/FEATURES_SUMMARY.md** - Quick summary

---

## 🎯 Common Use Cases

### Full Stack Development
```bash
agenticide

# Start server
You: /process start npm run dev

# Test API
You: /api get http://localhost:3000/health

# Check database
You: /sql connect sqlite ./app.db
You: /sql query SELECT COUNT(*) FROM users

# View logs
You: /process logs 1
```

### API Testing
```bash
# Public API
You: /api get https://api.github.com/users/octocat

# With auth
You: /api get https://api.example.com/profile \
  -H "Authorization: Bearer your-token"

# Save request
You: /api save github-profile
You: /api load github-profile
```

### Database Work
```bash
# Connect
You: /sql connect sqlite ./production.db

# Explore
You: /sql tables
You: /sql describe users

# Query
You: /sql query SELECT * FROM users WHERE created_at > date('now', '-7 days')
```

---

## 🔄 Updates

To update Agenticide:

```bash
cd /Users/vikasavnish/agenticide
git pull
./build-binary.sh    # Rebuild binary
./install-cli.sh     # Reinstall
```

---

## 💬 Get Help

- Type `/help` in the CLI
- Check documentation in `docs/`
- Run `agenticide --help`
- Open an issue on GitHub

---

## 🎉 You're Ready!

Start using Agenticide:

```bash
agenticide
```

Enjoy your AI-powered development environment! 🚀
