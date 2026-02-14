# Context Manager - Enhanced with Scaffold & File Operations

## Updates (v0.2.0)

### 🏗️ Scaffold Support
Generate common project files based on detected language:

```bash
# Scaffold individual templates
context_manager scaffold . --template readme
context_manager scaffold . --template gitignore
context_manager scaffold . --template makefile
context_manager scaffold . --template dockerfile
context_manager scaffold . --template ci

# Scaffold everything
context_manager scaffold . --template all
```

**Supported Templates:**
- `readme` - Project README.md with language-specific sections
- `gitignore` - Language-specific .gitignore (Go, Rust, TypeScript, Python)
- `makefile` - Makefile with common targets (build, test, clean, lint)
- `dockerfile` - Multi-stage Dockerfile optimized for language
- `ci` - GitHub Actions workflow (.github/workflows/ci.yml)

### 📝 File Operations

**Read Files:**
```bash
context_manager read . README.md
context_manager read . src/main.rs
```

**Edit/Create Files:**
```bash
# Create with content
context_manager edit . config.json --content '{"key": "value"}'

# Interactive edit (opens prompt)
context_manager edit . notes.txt
```

**Search in Files:**
```bash
# Search all files
context_manager search . "TODO"

# Filter by extension
context_manager search . "func" --ext go
context_manager search . "import" --ext py
```

### 🔄 Project Switching

Central project registry in `~/.agenticide/projects.json`:

```bash
# Register projects
context_manager register /path/to/project --name myproject
context_manager register . --name current

# List all registered projects
context_manager projects

# Switch between projects
context_manager switch myproject
```

**Switch Output:**
```
🔄 Switching to: voter-outreach
Path: /Users/vikasavnish/voter-outreach-golang

Context:
  Type: module
  Language: Go
  Active TODOs: 1
  Conversations: 1

Commands:
  cd /Users/vikasavnish/voter-outreach-golang
  context_manager show /Users/vikasavnish/voter-outreach-golang
```

## Central Registry (~/.agenticide/)

All tools maintain state in home directory:

```
~/.agenticide/
├── lsp_manager              # Symlink to LSP Manager
├── context_manager          # Symlink to Context Manager
├── config.json              # Global configuration
└── projects.json            # Registered projects registry
```

### projects.json Format
```json
{
  "projects": {
    "voter-outreach": "/Users/vikasavnish/voter-outreach-golang",
    "lsp-manager": "/Users/vikasavnish/agenticide/lsp-manager",
    "context-manager": "/Users/vikasavnish/agenticide/context-manager"
  }
}
```

## Language-Specific Scaffolding

### Go Projects
- **README**: Go-specific installation and usage
- **.gitignore**: vendor/, bin/, *.exe, go.work
- **Makefile**: go build, go test, golangci-lint
- **Dockerfile**: Multi-stage build with alpine
- **CI**: GitHub Actions with Go 1.21, golangci-lint

### Rust Projects
- **README**: Cargo-based instructions
- **.gitignore**: target/, Cargo.lock
- **Makefile**: cargo build, cargo test, cargo clippy
- **Dockerfile**: Multi-stage with debian-slim
- **CI**: GitHub Actions with stable Rust

### TypeScript/JavaScript
- **README**: npm-based workflow
- **.gitignore**: node_modules/, dist/, .next/
- **Makefile**: npm run build, npm test
- **Dockerfile**: Multi-stage with node:20-alpine
- **CI**: GitHub Actions with Node.js 20

### Python
- **README**: pip-based setup
- **.gitignore**: __pycache__/, venv/, *.pyc
- **Makefile**: pytest, pylint, black
- **Dockerfile**: python:3.11-slim
- **CI**: GitHub Actions with Python 3.11

## Complete Command Reference

### Project Management
```bash
context_manager init [path]              # Initialize project context
context_manager register [path] --name   # Register in global registry
context_manager projects                  # List all registered projects
context_manager switch <name>            # Switch to registered project
context_manager show [path]              # Show project context
```

### TODO Management
```bash
context_manager add-todo [path] "desc"   # Add todo
context_manager list-todos [path]        # List todos
context_manager complete-todo [path] <id> # Complete todo
```

### Conversation Tracking
```bash
context_manager add-conversation [path] "summary"  # Add entry
context_manager show-history [path]                # Show history
```

### Agentic Features
```bash
context_manager suggest [path]           # Get AI suggestions
```

### Tool Calling
```bash
context_manager tool --tool lsp [path]   # Start LSP servers
context_manager tool --tool test [path]  # Run tests
context_manager tool --tool build [path] # Build project
```

### Scaffolding
```bash
context_manager scaffold [path] --template <type>
# Types: readme, gitignore, makefile, dockerfile, ci, all
```

### File Operations
```bash
context_manager read [path] <file>              # Read file
context_manager edit [path] <file> --content    # Edit/create file
context_manager search [path] <query> --ext     # Search files
```

## Example Workflows

### Starting a New Project
```bash
# Create and initialize
mkdir myproject && cd myproject
context_manager init .
context_manager register . --name myproject

# Scaffold common files
context_manager scaffold . --template all

# Add initial todos
context_manager add-todo . "Set up database schema"
context_manager add-todo . "Create API endpoints"

# Get suggestions
context_manager suggest .
```

### Working Across Multiple Projects
```bash
# Register all projects
context_manager register ~/project1 --name proj1
context_manager register ~/project2 --name proj2
context_manager register ~/project3 --name proj3

# List and switch
context_manager projects
context_manager switch proj2

# Search across project
context_manager search ~/project1 "TODO" --ext go
```

### Tracking Development Session
```bash
cd ~/myproject

# Start of day - check context
context_manager show .
context_manager list-todos .

# During development - track conversations
context_manager add-conversation . "Implemented user authentication"
context_manager add-conversation . "Fixed database connection pooling"

# Complete tasks
context_manager complete-todo . 1

# End of day - review
context_manager show-history .
context_manager suggest .
```

## Use Cases for AI Assistants

### Context Awareness
```bash
# AI can read project context
context_manager show /path/to/project

# Get language, features, todos, conversations
# Use this to make informed suggestions
```

### Code Generation
```bash
# AI generates scaffold templates
context_manager scaffold . --template makefile

# AI creates files with specific content
context_manager edit . api.go --content "package api..."
```

### Project Navigation
```bash
# AI helps search across codebase
context_manager search . "database connection" --ext go

# AI reads relevant files
context_manager read . config/database.go
```

### Multi-Project Management
```bash
# AI tracks all projects
context_manager projects

# AI can work across projects
context_manager switch frontend
context_manager switch backend
```

---

**All features ready!** Central registry at `~/.agenticide/projects.json` manages all projects.
