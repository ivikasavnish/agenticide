# Automatic AI Agent Setup Guide

## 🚀 Zero-Config Quick Start

Just set **ONE** environment variable and it works automatically!

### Option 1: OpenAI (Recommended - Most Reliable)
```bash
export OPENAI_API_KEY="sk-..."
agenticide chat
```

### Option 2: Claude (Anthropic)
```bash
export ANTHROPIC_API_KEY="sk-ant-..."
agenticide chat --provider claude
```

### Option 3: Local (Free, No API Key)
```bash
brew install ollama
ollama pull codellama
agenticide chat --provider local
```

---

## 🔄 How It Works (Automatic Fallback Chain)

### When you run `agenticide chat --provider copilot`:

```
1. ✓ Try ACP (github-copilot-agent --acp)
   ↓ Not found?
   
2. ✓ Try OpenAI API (with OPENAI_API_KEY)
   ↓ Not found?
   
3. ✓ Try Local Ollama (codellama)
   ↓ Not found?
   
4. ✗ Show setup instructions
```

### When you run `agenticide chat --provider claude`:

```
1. ✓ Try ACP (claude --acp)
   ↓ Not found?
   
2. ✓ Try Claude API (with ANTHROPIC_API_KEY)
   ↓ Not found?
   
3. ✗ Show setup instructions
```

---

## 📦 What Gets Auto-Detected

### Environment Variables (Checked Automatically)
- `OPENAI_API_KEY` - For OpenAI/GPT models
- `ANTHROPIC_API_KEY` or `CLAUDE_API_KEY` - For Claude
- `GITHUB_TOKEN` - Alternative for OpenAI fallback

### Installed Binaries (Checked Automatically)
- `github-copilot-agent` - Copilot ACP agent
- `claude` - Claude ACP agent  
- `ollama` - Local model runner

### No Manual Setup Required!
Just install ONE of the above and it works automatically.

---

## 🎯 Recommended Setup (Pick ONE)

### For Best Results: OpenAI
```bash
# Add to ~/.zshrc or ~/.bashrc
export OPENAI_API_KEY="sk-proj-..."

# Verify
echo $OPENAI_API_KEY

# Use
agenticide chat
```

### For Claude Fans: Anthropic
```bash
# Add to ~/.zshrc or ~/.bashrc
export ANTHROPIC_API_KEY="sk-ant-..."

# Verify
echo $ANTHROPIC_API_KEY

# Use
agenticide chat --provider claude
```

### For Free/Local: Ollama
```bash
# Install
brew install ollama

# Start service
ollama serve &

# Pull model
ollama pull codellama

# Use
agenticide chat --provider local
```

---

## ✅ Current Setup (voter-app-rust)

Already initialized! Just add an API key:

```bash
cd /Users/vikasavnish/voter-app-rust

# Option 1: Quick test with OpenAI
export OPENAI_API_KEY="sk-..."
agenticide chat

# Chat will automatically:
# - Load project context (9 symbols ✓)
# - Load tasks ✓
# - Enable semantic search ✓
# - Start chatting!

# Try:
You: explain the server.rs file
You: how does routing work in this project
You: /search websocket
```

---

## 🔍 Context Sharing (Automatic)

Every message includes:
```xml
<context>
Current directory: /Users/vikasavnish/voter-app-rust

Project symbols (9 total):
  - create_router (Function)
  - root (Function)  
  - health (Function)
  - main (Function)
  ...

Active tasks:
  ○ Your pending tasks here
</context>
```

Agents automatically see your:
- Project structure
- Indexed functions
- Active tasks
- Language (Rust detected ✓)

---

## 💡 Pro Tips

### Tip 1: Use Copilot Provider with OpenAI Key
```bash
# "copilot" provider automatically uses OpenAI as fallback
export OPENAI_API_KEY="sk-..."
agenticide chat --provider copilot
```

### Tip 2: Check What's Available
```bash
# Before chatting, see what's detected
agenticide chat --list-models
```

### Tip 3: No API Key? Use Local
```bash
# Free, runs on your machine
brew install ollama
ollama pull codellama
agenticide chat --provider local
```

### Tip 4: Save API Keys Permanently
```bash
# Add to ~/.zshrc (or ~/.bashrc)
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.zshrc
source ~/.zshrc
```

---

## 🐛 Troubleshooting

### "No AI agents available"
**Solution**: Set ONE environment variable:
```bash
export OPENAI_API_KEY="sk-..."
# or
export ANTHROPIC_API_KEY="sk-ant-..."
```

### "Copilot error: Command failed"
**This is FIXED!** Old versions used `gh copilot` which was broken.
New version automatically uses OpenAI API instead.

### Want to use specific implementation?
The system chooses the best available automatically, but you can see what's being used:
```bash
# In chat, type:
/status

# Shows:
✓ copilot: gpt-4-turbo (fallback: openai-api)
```

---

## 🎉 Bottom Line

**Just set ONE of these:**
```bash
export OPENAI_API_KEY="sk-..."        # Best option
export ANTHROPIC_API_KEY="sk-ant-..."  # Claude
# or install ollama                      # Free/local
```

**Then run:**
```bash
cd /Users/vikasavnish/voter-app-rust
agenticide chat
```

**Everything else is automatic!** ✨

The system will:
1. ✅ Detect available agents
2. ✅ Use best implementation
3. ✅ Load project context
4. ✅ Enable search
5. ✅ Start chatting

No manual setup, no configuration files, just works! 🚀
