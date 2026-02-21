# DevContainer Quick Start

## What is DevContainer?

DevContainer provides a **fully configured development environment** in a Docker container. No more "works on my machine" - everyone gets the same setup!

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose)
- **VS Code** with Remote-Containers extension

### Install Docker Desktop

**macOS:**
```bash
brew install --cask docker
```

**Windows:**
Download from https://www.docker.com/products/docker-desktop

**Linux:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Install VS Code Extension

```bash
code --install-extension ms-vscode-remote.remote-containers
```

Or install from VS Code:
1. Open Extensions (Cmd/Ctrl+Shift+X)
2. Search "Remote - Containers"
3. Install

## Quick Start (30 seconds)

### Option 1: VS Code (Recommended)

```bash
# 1. Open project
cd agenticide
code .

# 2. Click notification
"Reopen in Container" → Click it!

# 3. Wait for build (2-3 minutes first time)
# Container builds automatically
# Dependencies install automatically
# CLI links globally

# 4. You're ready!
agenticide --version
agenticide chat
```

### Option 2: Command Palette

```bash
# 1. Open project
code .

# 2. Command Palette
Cmd/Ctrl+Shift+P

# 3. Type and select
"Remote-Containers: Reopen in Container"

# 4. Wait for setup
# You're ready when you see ✅ in terminal
```

### Option 3: Command Line

```bash
# Build and start container
docker-compose -f .devcontainer/docker-compose.yml up -d

# Open VS Code in container
code --folder-uri vscode-remote://dev-container+$(pwd)/.devcontainer/devcontainer.json
```

## First Run

When container starts, you'll see:

```bash
🚀 Setting up Agenticide development environment...
📦 Installing agenticide-cli dependencies...
📦 Installing agenticide-core dependencies...
📦 Installing agenticide-vscode dependencies...
🔧 Configuring git...
📁 Creating config directory...
⚙️  Creating default config...
🔗 Linking CLI globally...
🔨 Building VSCode extension...
🧪 Running tests...
✅ DevContainer setup complete!

📝 Quick start:
  agenticide --help
  agenticide chat
  cd agenticide-vscode && npm run watch
```

## What's Included

### Languages & Runtimes

- ✅ **Node.js 20 LTS** - JavaScript runtime
- ✅ **Bun 1.x** - Fast JS runtime (3x faster than Node)
- ✅ **Rust + Cargo** - Systems programming
- ✅ **Go 1.22** - Concurrent programming
- ✅ **Python 3.11** - Scripting & AI

### Tools

- ✅ **Git** - Version control
- ✅ **GitHub CLI** - Repo operations
- ✅ **TypeScript** - Type-safe development
- ✅ **ESLint** - Code linting
- ✅ **Prettier** - Code formatting
- ✅ **Docker-in-Docker** - Container testing

### VS Code Extensions (Auto-installed)

- GitHub Copilot & Copilot Chat
- ESLint, Prettier
- GitLens
- Rust Analyzer
- Go Extension
- Python Extension
- Docker Extension

## Development Workflow

### Terminal Commands

All in one place:

```bash
# CLI Development
agenticide --help
agenticide chat
You: @package.json  # Test context attachments
You: /stub websocket rust  # Test stub generation

# Core Development
cd agenticide-core
node test-analyzer.js

# Extension Development
cd agenticide-vscode
npm run watch  # Auto-compile on changes
# Press F5 to launch Extension Development Host

# Run all tests
node test-all-bug-fixes.js
node test-context-attachment.js

# DevContainer tests
bash .devcontainer/test-container.sh
```

### VS Code Tasks

Access via `Terminal → Run Task...`:

- **Install All Dependencies** - Reinstall everything
- **Test DevContainer Setup** - Verify container
- **Build VSCode Extension** - Compile TypeScript
- **Watch VSCode Extension** - Auto-compile
- **Run All Tests** - Execute test suite
- **Package VSCode Extension** - Create .vsix
- **Link CLI Globally** - Relink agenticide command
- **Clean All** - Remove node_modules

### Debugging

Launch configurations ready:

1. **Run Agenticide CLI** - Test CLI commands
2. **Debug Agenticide Chat** - Debug chat mode
3. **Test Context Attachments** - Debug attachments
4. **Extension Development Host** - Debug VSCode extension
5. **Attach to Node Process** - Attach debugger (port 9229)

Access via `Run → Start Debugging` (F5)

## Testing

### Quick Test

```bash
# Test everything
bash .devcontainer/test-container.sh

# Output:
# ✓ Git
# ✓ Node.js, npm, Bun
# ✓ Rust, Cargo
# ✓ Go
# ✓ Python
# ✓ Agenticide CLI
# ✓ All dependencies
# ✓ Configuration
# ✓ Module tests
# ✅ All DevContainer tests passed!
```

### Comprehensive Tests

```bash
# Bug fixes
node test-all-bug-fixes.js

# Context attachments
node test-context-attachment.js

# Integration tests
cd agenticide-cli
node test-integration.js
node test-all-features.js

# Stub generator
node test-stub-generator.js
```

## Multi-Language Testing

### Test Rust

```bash
agenticide chat
You: /stub websocket rust service

cd src/websocket
cargo build
cargo test
```

### Test Go

```bash
You: /stub api go service

cd src/api
go mod init api
go build
go test ./...
```

### Test TypeScript

```bash
You: /stub auth typescript api

cd src/auth
npm install
npm test
```

## Tips & Tricks

### 1. Fast Rebuilds

Container caches build layers. Changes to code = instant reload!

### 2. Use Bun for Speed

```bash
# 3x faster than Node
time bun agenticide-cli/index.js chat
time node agenticide-cli/index.js chat
```

### 3. Multiple Terminals

Open multiple terminals - all in container:
```
Terminal → New Terminal
```

### 4. Port Forwarding

Access from host machine:
```bash
# In container: npm start (port 3000)
# In host: http://localhost:3000
```

### 5. Git from Host

Git credentials mounted from host:
```bash
# Works automatically
git pull
git push
gh pr create
```

### 6. File Sync

Files sync instantly - edit in VS Code, see changes in container.

### 7. Persistent Data

Volumes persist across rebuilds:
- Node modules
- Cargo cache
- Go cache
- Config files

## Troubleshooting

### Container Won't Start

```bash
# Rebuild from scratch
Cmd/Ctrl+Shift+P → "Remote-Containers: Rebuild Container"

# Or with Docker
docker-compose -f .devcontainer/docker-compose.yml down -v
docker-compose -f .devcontainer/docker-compose.yml build --no-cache
docker-compose -f .devcontainer/docker-compose.yml up -d
```

### Dependencies Missing

```bash
# Re-run setup
bash .devcontainer/post-create.sh

# Or manually
cd agenticide-cli && npm install
cd ../agenticide-core && npm install
cd ../agenticide-vscode && npm install
npm link agenticide-cli
```

### Port Conflicts

Edit `.devcontainer/devcontainer.json`:
```json
"forwardPorts": [3001, 8081, 9230]
```

### Out of Disk Space

```bash
# Clean Docker
docker system prune -a --volumes

# Remove old containers
docker container prune

# Remove old images
docker image prune -a
```

### Performance Issues

**macOS/Windows:**
```json
// Use cached mounts in docker-compose.yml
volumes:
  - ..:/workspace:cached
```

**Linux:** Already fast!

## GitHub Codespaces

Works with GitHub Codespaces too!

```bash
# On GitHub:
# Code → Codespaces → Create codespace on main

# Automatically uses .devcontainer/
# No setup needed!
```

## CI/CD

Container tested in GitHub Actions:

```yaml
# .github/workflows/devcontainer.yml
- uses: devcontainers/ci@v0.3
  with:
    runCmd: bash .devcontainer/test-container.sh
```

## Comparison

| Method | Setup Time | Consistency | Isolation | Performance |
|--------|-----------|-------------|-----------|-------------|
| **DevContainer** | 2-3 min (first time) | ✅ Perfect | ✅ Complete | ✅ Good |
| Local Install | 10-30 min | ❌ Varies | ❌ None | ✅✅ Best |
| VM | 30-60 min | ✅ Good | ✅ Complete | ❌ Slow |
| Docker Manual | 15-20 min | ✅ Good | ✅ Complete | ✅ Good |

## Next Steps

1. ✅ Container running? Test it:
   ```bash
   bash .devcontainer/test-container.sh
   ```

2. ✅ Start developing:
   ```bash
   agenticide chat
   cd agenticide-vscode && npm run watch
   ```

3. ✅ Read full guide:
   ```bash
   docs/DEVCONTAINER_GUIDE.md
   ```

## Support

Issues? Check:
1. Docker is running: `docker ps`
2. Extension installed: VS Code → Extensions → "Remote - Containers"
3. DevContainer logs: View → Output → Remote - Containers
4. Container logs: `docker logs agenticide-dev`

## Success! 🎉

You now have a fully configured development environment with:
- ✅ All languages installed
- ✅ All dependencies ready
- ✅ CLI globally available
- ✅ Tests passing
- ✅ Extensions configured
- ✅ Debugging ready

**Start coding!** 🚀
