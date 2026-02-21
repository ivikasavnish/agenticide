# Agenticide Extensions Quick Reference

## 🎯 All Extensions (11 Total)

### Core System Extensions

#### 1. **Process Manager** (`/process`)
Manage background processes and terminals
```bash
/process start npm run dev
/process list
/process logs 1
/process stop 1
```

#### 2. **Browser Automation** (`/browser`)
Control browser and take screenshots
```bash
/browser open https://example.com
/browser screenshot page.png
/browser click "#button"
```

#### 3. **Docker Management** (`/docker`)
Manage Docker containers
```bash
/docker ps
/docker run ubuntu bash
/docker logs <container>
```

#### 4. **Enhanced CLI** (`/cli`)
Enhanced command execution
```bash
/cli run "npm test"
/cli history
/cli alias build "npm run build"
```

#### 5. **Debugger** (`/debug`)
Code debugging tools
```bash
/debug inspect myFunction
/debug trace module.js
```

#### 6. **MCP Integration** (`/mcp`)
Model Context Protocol support
```bash
/mcp context
/mcp filesystem
```

#### 7. **QA Testing** (`/qa`)
Manual test case management
```bash
/qa create "Login flow"
/qa list
/qa run 1
```

### **NEW** Developer Tools

#### 8. **API Runner** (`/api`) 🆕
Test REST APIs instantly
```bash
# GET request
/api get https://api.github.com/users/octocat

# POST with data
/api post https://example.com/api '{"key":"value"}'

# With headers
/api get https://api.com/protected -H "Auth: Bearer token"

# History & saves
/api history
/api save github-api
/api load github-api
```

**Features:**
- All HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Custom headers
- JSON auto-detection
- Response timing
- Request history
- Save/load requests

#### 9. **SQL Runner** (`/sql`) 🆕
Database queries and management
```bash
# Connect
/sql connect sqlite ./database.db

# Query
/sql query SELECT * FROM users LIMIT 10
/sql query INSERT INTO logs (message) VALUES ('test')

# Explore
/sql tables
/sql describe users

# History
/sql history

# Multiple connections
/sql list
/sql use mydb
/sql disconnect
```

**Features:**
- SQLite support (MySQL/Postgres coming)
- Multiple connections
- Query timing
- Schema inspection
- SQL file execution
- Query history

---

## 💡 Hint System 🆕

Get intelligent suggestions as you type!

### Auto-help
```bash
You: /api
→ Shows usage, examples, and available actions

You: /sql
→ Shows connection info and query examples
```

### Context Detection
```bash
You: "need to test https://..."
💡 Tip: Use /api get <url> to test this endpoint

You: "query the database"
💡 Tip: Use /sql connect to work with databases
```

### Autocomplete
```bash
You: /pro<TAB>     → /process
You: /api g<TAB>   → /api get
You: /sql t<TAB>   → /sql tables
```

### Typo Correction
```bash
You: /proces   → Did you mean /process?
You: /apii     → Did you mean /api?
```

---

## 🎮 Extension Management

```bash
# List all extensions
/extension list

# Enable/disable
/extension enable api
/extension disable browser

# Get info
/extension info api
```

---

## 📚 Command Cheat Sheet

### Quick Actions

| Task | Command | Example |
|------|---------|---------|
| Test API | `/api get <url>` | `/api get https://api.github.com/zen` |
| Query DB | `/sql query <sql>` | `/sql query SELECT * FROM users` |
| Run Process | `/process start` | `/process start npm run dev` |
| Generate Code | `/stub` | `/stub api javascript service` |
| Git Operations | `/git` | `/git status` |
| Search Code | `/search` | `/search authentication` |
| Analyze Project | `/analyze` | `/analyze src/` |

### Combined Workflows

**API Development:**
```bash
1. /process start npm run dev
2. /api get http://localhost:3000/health
3. /api post http://localhost:3000/api/users '{"name":"test"}'
4. /process logs 1
```

**Database Work:**
```bash
1. /sql connect sqlite ./app.db
2. /sql tables
3. /sql describe users
4. /sql query SELECT * FROM users WHERE active=1
5. /sql history
```

**Full Stack Development:**
```bash
1. /process start npm run dev          # Start server
2. /sql connect sqlite ./db.sqlite     # Connect DB
3. /api get http://localhost:3000      # Test endpoint
4. /sql query SELECT COUNT(*) FROM logs # Check DB
5. /browser open http://localhost:3000  # View in browser
```

---

## 🔧 Configuration

Extensions auto-load on startup. Configure in:
```
~/.agenticide/extensions.json
```

---

## 📊 Extension Stats

- **Total Extensions:** 11
- **Built-in:** 9
- **Auto-loaded:** Yes
- **Configurable:** Yes
- **Extensible:** Yes (add your own!)

---

## 🚀 Pro Tips

1. **Use Tab** - Autocomplete makes commands faster
2. **Type /help** - See all available commands
3. **Save requests** - Use `/api save` for repeated API calls
4. **Multiple DBs** - Keep multiple SQL connections open
5. **Check history** - Use history commands to repeat actions
6. **Combine tools** - Chain extensions for powerful workflows

---

## 📖 Full Documentation

- [NEW_FEATURES.md](./NEW_FEATURES.md) - Detailed feature guide
- [STUB_FIRST_GUIDE.md](./STUB_FIRST_GUIDE.md) - Code generation
- [PROFESSIONAL_STANDARDS.md](./PROFESSIONAL_STANDARDS.md) - Coding styles
- [WORKFLOW_INTEGRATION.md](./WORKFLOW_INTEGRATION.md) - Automation

---

**Made with ❤️ by Agenticide Team**
