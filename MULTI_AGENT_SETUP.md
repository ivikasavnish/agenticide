# Multi-Agent AI Integration - Complete! 🤖

## Overview

Agenticide now supports **multiple AI providers** with model selection, context sharing, and task integration!

---

## 🎯 Available Agents & Models

### GitHub Copilot ✓
- `copilot-gpt4` - GPT-4 powered (Premium)
- `copilot-gpt35` - GPT-3.5 powered (Standard)

### Claude (Anthropic) 🤖
- `claude-3-opus` - Most capable (Premium)
- `claude-3-sonnet` - Balanced (Standard) 
- `claude-3-haiku` - Fast (Fast)

### OpenAI 🔮
- `gpt-4` - Most capable (Premium)
- `gpt-4-turbo` - Fast GPT-4 (Standard)
- `gpt-3.5-turbo` - Fast and efficient (Fast)

### Local Models 💻
- `codellama` - CodeLlama via Ollama
- `deepseek-coder` - DeepSeek Coder via Ollama

---

## 📋 Commands

### List All Models
```bash
agenticide agent --models
agenticide model --list
agenticide chat --list-models
```

### Start Chat with Specific Provider
```bash
# GitHub Copilot (default)
agenticide chat --provider copilot

# Claude
agenticide chat --provider claude

# OpenAI
agenticide chat --provider openai

# Local model
agenticide chat --provider local --model codellama
```

### Set Default Model
```bash
agenticide model --set gpt-4
agenticide model --get
```

### Initialize Agents
```bash
agenticide agent --init copilot
agenticide agent --init claude
agenticide agent --init openai
agenticide agent --init local
```

---

## 💬 Interactive Chat

Once in chat, you have access to:

### Switch Agents
```
/agent copilot     # Switch to Copilot
/agent claude      # Switch to Claude
/agent openai      # Switch to OpenAI
```

### View Context
```
/context           # Show project context (symbols, tasks)
/tasks             # Show all tasks
/status            # Show agent status
```

### Search Code
```
/search authentication    # Semantic search in current project
/search database queries
```

---

## 🔄 Context Sharing

Agents automatically receive:

### Project Context
- Current working directory
- Indexed symbols (functions, classes)
- File structure
- Language detection

### Tasks & TODOs
- Active tasks
- Pending tasks
- Completed tasks
- Task descriptions

### Code Analysis
- Semantic search results
- LSP symbol information
- File dependencies

---

## 📦 Setup Instructions

### 1. GitHub Copilot (Recommended)
```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Install Copilot extension
gh extension install github/gh-copilot

# Test
gh copilot --version
```

### 2. Claude
```bash
# Download from https://claude.ai/download
# Or install via:
curl -fsSL https://claude.ai/install.sh | bash

# Test
claude --version
```

### 3. OpenAI
```bash
# Set API key
export OPENAI_API_KEY="sk-..."

# Add to ~/.zshrc or ~/.bashrc for persistence
echo 'export OPENAI_API_KEY="sk-..."' >> ~/.zshrc
```

### 4. Local Models (Ollama)
```bash
# Install Ollama
brew install ollama

# Pull models
ollama pull codellama
ollama pull deepseek-coder

# Test
ollama list
```

---

## 🎨 Usage Examples

### Example 1: Code Explanation
```bash
cd /Users/vikasavnish/voter-app-rust
agenticide chat --provider copilot

You: explain the server initialization code
🤖 copilot: [Explains server.rs...]
```

### Example 2: Task-Aware Assistant
```bash
# Add tasks
agenticide task:add "Implement user authentication"
agenticide task:add "Add database migrations"

# Start chat (tasks are shared with agent)
agenticide chat

You: what should I work on next?
🤖: Based on your tasks, I see you need to:
    1. Implement user authentication
    2. Add database migrations
    Let's start with authentication...
```

### Example 3: Code Search Integration
```bash
agenticide chat

You: /search authentication
🔎 Search: "authentication"
1. authenticateUser (auth.js)
2. validateToken (auth.js)

You: explain how authentication works
🤖: Based on the authenticateUser function...
```

### Example 4: Multi-Agent Workflow
```bash
agenticide chat --provider copilot

You: /agent claude        # Switch to Claude
✓ Switched to claude

You: /agent openai        # Switch to OpenAI
✓ Switched to openai

You: /status              # Check all agents
📊 Agent Status:
  ✓ copilot: copilot-gpt4
    claude: claude-3-sonnet
    openai: gpt-4-turbo
```

---

## 🔧 Configuration

### Default Settings
```javascript
// ~/.agenticide/config.json
{
  "defaultProvider": "copilot",
  "defaultModel": "copilot-gpt4",
  "contextSharing": true,
  "tools": {
    "lsp_manager": "...",
    "context_manager": "..."
  }
}
```

### Disable Context Sharing
```bash
agenticide chat --no-context
```

---

## 🚀 Advanced Features

### Context-Aware Responses
Agents see:
- Project structure
- Recent code changes
- Active tasks
- Indexed functions/classes

### Task Integration
```bash
# Agent knows about your tasks
You: what are my pending tasks?
🤖: You have 2 pending tasks:
    1. Implement user authentication
    2. Add database migrations
```

### Semantic Search in Chat
```bash
You: /search database connection
🔎 Found: executeQuery, findUserByUsername, createUser

You: show me how database queries work
🤖: Based on executeQuery function, queries use...
```

---

## 📊 Comparison

| Feature | Copilot | Claude | OpenAI | Local |
|---------|---------|--------|--------|-------|
| Speed | ⚡⚡⚡ | ⚡⚡ | ⚡⚡⚡ | ⚡ |
| Code Quality | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| Context Size | Large | Very Large | Large | Medium |
| Cost | $$$ | $$$ | $$$ | Free |
| Privacy | Cloud | Cloud | Cloud | Local |
| Setup | Easy | Medium | Easy | Easy |

---

## 🎯 Best Practices

### 1. Choose Right Agent for Task
- **Code completion**: Copilot
- **Explanation**: Claude
- **Quick queries**: GPT-3.5
- **Privacy**: Local models

### 2. Use Context
- Run `agenticide analyze` first
- Run `agenticide index` to enable search
- Add tasks with `agenticide task:add`

### 3. Switch Agents
- Try multiple agents for same question
- Compare responses
- Use `/agent <name>` to switch

---

## 🐛 Troubleshooting

### Copilot Not Working
```bash
# Check gh installation
which gh

# Check copilot extension
gh extension list

# Reinstall
gh extension install github/gh-copilot --force
```

### Claude Not Found
```bash
# Check installation
which claude

# Install
curl -fsSL https://claude.ai/install.sh | bash
```

### OpenAI API Error
```bash
# Check API key
echo $OPENAI_API_KEY

# Set API key
export OPENAI_API_KEY="sk-..."
```

### Ollama Models Missing
```bash
# List installed models
ollama list

# Pull missing model
ollama pull codellama
```

---

## ✅ Next Steps

1. **Install your preferred agent** (Copilot recommended)
2. **Analyze your project**: `agenticide analyze`
3. **Start chatting**: `agenticide chat`
4. **Try commands**: `/context`, `/tasks`, `/search`
5. **Switch agents**: `/agent claude`

---

**Status:** ✅ Fully Implemented  
**Testing:** ✅ Ready  
**Documentation:** ✅ Complete

🎉 **Multi-agent AI system ready to use!**
