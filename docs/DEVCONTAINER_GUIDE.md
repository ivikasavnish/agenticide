# DevContainer Development Guide

## Overview

Agenticide provides a complete DevContainer setup for consistent development across machines. The container includes:

- **Node.js 20** - JavaScript runtime
- **Bun** - Fast JavaScript runtime and bundler  
- **Rust** - For native performance modules
- **Go** - For concurrent services
- **Python 3.11** - For scripts and tooling
- **Docker-in-Docker** - For containerized testing
- **GitHub CLI** - For repo operations

## Quick Start

### Prerequisites

1. **VS Code** with Remote-Containers extension
2. **Docker Desktop** (or Docker Engine)

### Open in DevContainer

```bash
# Option 1: From VS Code
# Open folder → Click "Reopen in Container" when prompted

# Option 2: From command palette
# Cmd/Ctrl+Shift+P → "Remote-Containers: Reopen in Container"

# Option 3: From CLI
code --remote container-attach agenticide-dev
```

### First Time Setup

The container automatically runs `.devcontainer/post-create.sh` which:
1. Installs all npm dependencies
2. Links CLI globally (`agenticide` command)
3. Compiles TypeScript extension
4. Creates config directories
5. Runs verification tests

Wait for "✅ DevContainer setup complete!" message.

## Development Workflow

### CLI Development

```bash
# Run CLI
agenticide --help
agenticide chat

# Test features
agenticide chat
You: @package.json  # Test context attachments
You: /stub test rust  # Test stub generation

# Run tests
cd agenticide-cli
npm test
node test-integration.js

# Test context attachments
node test-context-attachment.js
```

### Core Library Development

```bash
cd agenticide-core

# Run analyzer tests
node test-analyzer.js
node test-intelligent-analyzer.js
node test-lsp-analyzer.js

# Develop new features
# Files auto-reload when required by CLI
```

### VSCode Extension Development

```bash
cd agenticide-vscode

# Watch mode (auto-compile on changes)
npm run watch

# Package extension
npm run package

# Test in VS Code
# Press F5 to launch Extension Development Host
```

## Testing in DevContainer

### Unit Tests

```bash
# All tests
npm test

# Specific test
node test-context-attachment.js
```

### Integration Tests

```bash
# Full integration test
cd agenticide-cli
node test-all-features.js

# Stub generation test
node test-stub-generator.js

# Runtime test
node test-runtime.js
```

### Cross-Platform Testing

```bash
# Test Node.js
node --version
node index.js

# Test Bun
bun --version  
bun run index.js

# Compare performance
time node agenticide-cli/index.js --help
time bun agenticide-cli/index.js --help
```

### Test Stub Generation

```bash
# Create test project
mkdir test-project
cd test-project

agenticide init
agenticide chat

You: /stub websocket rust service
You: /stub api go service
You: /stub auth typescript api

# Verify generated files
tree src/

# Check git branches
git branch -a
```

## Multi-Language Support

### Rust Development

```bash
# Check Rust
rustc --version
cargo --version

# Test Rust module
cd src/websocket
cargo build
cargo test
```

### Go Development

```bash
# Check Go
go version

# Test Go module
cd src/api
go mod init api
go build
go test ./...
```

### Python Scripts

```bash
# Check Python
python3 --version
pip3 --version

# Run Python tools
python3 scripts/analyze.py
```

## Debugging

### Node.js Debugging

Port 9229 is forwarded automatically for Node debugger.

```bash
# Start with debugging
node --inspect-brk agenticide-cli/index.js chat

# In VS Code:
# Run → Start Debugging → Attach to Node
```

### TypeScript Debugging

```bash
cd agenticide-vscode

# Launch extension in debug mode
# Press F5 in VS Code
# Set breakpoints in src/extension.ts
```

### Container Shell

```bash
# Open additional terminal in container
# Terminal → New Terminal (automatically in container)

# Or attach to running container
docker exec -it agenticide-dev bash
```

## Port Forwarding

Auto-forwarded ports:

- **3000** - Application server
- **8080** - API server
- **9229** - Node debugger

Access from host: `http://localhost:3000`

## Volume Mounts

### Source Code

- **Host:** `/Users/you/agenticide`
- **Container:** `/workspace`
- **Type:** Cached (better performance)

### Node Modules

Separate volumes for faster installs:
- `devcontainer-node-modules`
- `devcontainer-core-node-modules`
- `devcontainer-vscode-node-modules`

### Build Caches

- `devcontainer-cargo` - Rust build cache
- `devcontainer-go` - Go build cache

### Git Config

Mounted from host:
- `~/.gitconfig`
- `~/.ssh` (for git auth)

## Performance Tips

### 1. Use Cached Volumes

Node modules are in named volumes for faster I/O:
```yaml
volumes:
  - devcontainer-node-modules:/workspace/agenticide-cli/node_modules
```

### 2. Host Network Mode

Uses host networking for better performance:
```yaml
network_mode: host
```

### 3. Build Cache

Cargo and Go caches persist across rebuilds.

## Troubleshooting

### Container Won't Start

```bash
# Rebuild container
Cmd/Ctrl+Shift+P → "Remote-Containers: Rebuild Container"

# Or from command line
docker-compose -f .devcontainer/docker-compose.yml build --no-cache
```

### Dependencies Not Installing

```bash
# Re-run post-create
bash .devcontainer/post-create.sh

# Or manually
cd agenticide-cli && npm install
cd agenticide-core && npm install
cd agenticide-vscode && npm install
```

### Port Already in Use

```bash
# Check running containers
docker ps

# Stop conflicting container
docker stop <container-id>

# Or change port in devcontainer.json
"forwardPorts": [3001, 8081, 9229]
```

### Git Auth Issues

```bash
# Check SSH mount
ls ~/.ssh/

# Test git
git clone git@github.com:user/repo.git

# If fails, configure in host first
# SSH keys are mounted from host
```

## Advanced Usage

### Custom Extensions

Add VS Code extensions to `devcontainer.json`:

```json
"extensions": [
  "your.extension"
]
```

### Environment Variables

Set in `docker-compose.yml`:

```yaml
environment:
  - YOUR_VAR=value
```

### Additional Tools

Install in `Dockerfile`:

```dockerfile
RUN apt-get install -y your-tool
```

## CI/CD Integration

Use same DevContainer in CI:

```yaml
# .github/workflows/test.yml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: devcontainers/ci@v0.3
        with:
          runCmd: npm test
```

## Best Practices

1. **Always rebuild** after changing Dockerfile
2. **Commit early** - container auto-mounts git
3. **Use volumes** for large node_modules
4. **Forward only needed ports** to avoid conflicts
5. **Mount SSH keys** for git operations
6. **Test in container** before committing
7. **Use watch mode** for active development

## Quick Reference

```bash
# Open in container
code --remote container-attach agenticide-dev

# Rebuild
Cmd/Ctrl+Shift+P → Rebuild Container

# Close container
Cmd/Ctrl+Shift+P → Close Remote Connection

# View logs
docker logs agenticide-dev

# Execute command
docker exec agenticide-dev agenticide --version

# Clean up
docker system prune -a --volumes
```

## See Also

- [VSCode Remote Containers](https://code.visualstudio.com/docs/remote/containers)
- [DevContainer Spec](https://containers.dev/)
- [Docker Compose](https://docs.docker.com/compose/)
