# Agenticide - Copilot Instructions

## Project Overview

Agenticide is an AI coding assistant platform that provides CLI, VSCode extension, and core tooling for developers. It supports both **ACP (Agent Client Protocol)** for Claude Code integration and **MCP (Model Context Protocol)** for extensible tooling.

**Key Components:**
- `agenticide-cli/` - Node.js/Bun CLI for terminal-based AI assistance
- `agenticide-core/` - Core libraries for project analysis, terminal management, and API testing
- `agenticide-vscode/` - TypeScript VSCode extension with AI chat, task management, and code actions

## Build, Test, and Run Commands

### CLI (agenticide-cli/)
```bash
# Install dependencies
npm install

# Run with Node.js
npm start

# Run with Bun (faster alternative)
bun run index.js

# Test
node test-integration.js

# Install globally for development
npm link
```

### Core (agenticide-core/)
```bash
npm install
# No separate test command - tests are in CLI
```

### VSCode Extension (agenticide-vscode/)
```bash
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Package extension as .vsix
npm run package  # Creates agenticide-{version}.vsix

# Install locally
code --install-extension agenticide-{version}.vsix
```

### Building Binary Distribution
```bash
# Build standalone binary (requires Bun)
./build-binary.sh  # Creates agenticide-bin (56MB standalone)

# Build for Linux
./build-linux.sh

# Install system-wide
sudo mv agenticide-bin /usr/local/bin/agenticide
```

### Testing Individual Features
```bash
# Test analyzer
node test-analyzer.js

# Test intelligent analyzer  
node test-intelligent-analyzer.js

# Test LSP analyzer
node test-lsp-analyzer.js

# Test stub generator
node agenticide-cli/test-stub-generator.js

# Test all features
node agenticide-cli/test-all-features.js
```

## Architecture

### Multi-Component Monorepo
Agenticide uses a **monorepo** structure with three main components that work together:

1. **agenticide-core** - Provides project-centric tooling
   - Project indexing and analysis (via LSP)
   - Code structure extraction (functions, classes, imports)
   - Terminal management for running commands
   - API testing framework
   - File contract extraction (signatures without bodies)
   - Control flow tracing

2. **agenticide-cli** - Command-line interface
   - Chat command for interactive AI sessions
   - Task management (add, list, complete tasks)
   - Code explanation and analysis
   - ACP/MCP protocol support
   - Works with both Node.js and Bun runtimes

3. **agenticide-vscode** - VSCode extension
   - AI chat panel (webview-based)
   - Task tree view with checkboxes
   - Context tree view
   - Code actions menu (right-click)
   - Keyboard shortcuts (Cmd+Shift+A for chat)

### Core Concepts

#### Project-Centric Design
Everything revolves around **projects** as the central object. All operations (analysis, tasks, terminals, API tests) are scoped to a project context stored in `.agenticide-context.json`.

#### Intelligent Analysis with LSP
The `intelligentAnalyzer.js` uses **Language Server Protocol (LSP)** to extract:
- Code symbols (functions, classes, methods)
- Type information and signatures
- Import/export relationships
- Only analyzes changed files (hash-based tracking)

#### File Contracts
Core extracts **contracts** (function signatures, class definitions) without reading full implementations. This gives AI agents high-level understanding without processing entire codebases.

#### Protocol Support
- **ACP (Agent Client Protocol)** - JSON-RPC 2.0 for Claude Code communication
- **MCP (Model Context Protocol)** - Extensible tooling via server processes

### Data Storage
- **SQLite** (better-sqlite3) - Project metadata, code structure, analysis results
- **JSON files**:
  - `.agenticide-tasks.json` - Per-project task list
  - `.agenticide-context.json` - Project context and settings
  - `~/.agenticide/config.json` - Global CLI configuration

## Key Conventions

### Module System
All three components use **CommonJS** (`type: "commonjs"` in package.json). Do not use ES modules (`import/export`). Use `require()` and `module.exports`.

### Cross-Component References
CLI and VSCode extension depend on core:
```javascript
// From agenticide-cli or agenticide-vscode
const { ProjectManager } = require('../agenticide-core/projectManager');
const { IntelligentAnalyzer } = require('../agenticide-core/intelligentAnalyzer');
```

### Runtime Detection (CLI)
CLI supports both Node.js and Bun. Check runtime in `utils/runtime.js`:
```javascript
const runtime = require('./utils/runtime');
if (runtime.isBun) {
  // Bun-specific code
} else {
  // Node.js code
}
```

### Stub-First Development
Agenticide follows a **stub-first** pattern where interface stubs are created before full implementation. See `stubGenerator.js` for auto-generation of method stubs.

### Context Attachments
Uses `@` symbol file inclusion and automatic paste detection:
```javascript
// From agenticide-cli or agenticide-vscode
const ContextAttachment = require('../agenticide-core/contextAttachment');
const attachment = new ContextAttachment(process.cwd());

// Parse @file references in message
const result = attachment.processMessage('Review @src/app.js for bugs');

// result includes:
// - attachments: [{ type: 'file', filename, content, gitUrl, ... }]
// - processedMessage: with file summaries
// - errors: unresolved references
```

### Git-Aware Tracking
File attachments include git metadata (branch, commit, path):
```javascript
{
  path: "/project/src/app.js",
  relativePath: "src/app.js",
  gitTracked: true,
  branch: "main",
  commit: "abc1234...",
  gitUrl: "git://src/app.js#main@abc1234"
}
```

### Task Files Location
- **CLI**: Uses `.agenticide-tasks.json` in current working directory
- **VSCode**: Uses workspace root `.agenticide-tasks.json`
- Format: Array of `{id, description, completed, createdAt, completedAt}`

### AI Provider Selection
Both CLI and VSCode support multiple AI providers:
- `auto` - Automatically select best provider
- `claude` - Use Claude (via ACP or API key)
- `copilot` - Use GitHub Copilot (coming soon)

### Code Actions (VSCode)
Right-click menu items under "Agenticide AI" submenu:
- Explain Code
- Fix This Code
- Refactor Code
- Generate Tests
- Add Comments

### Project Templates
Core includes Cookiecutter-style templates for scaffolding:
- `node-express`, `node-cli`, `react-app`, `typescript-lib`
- `python-flask`, `python-cli`
- `vscode-extension`, `rust-cli`

Located in `agenticide-core/projectTemplates.js`.

## Working with LSP

### Starting LSP Server
```javascript
// intelligentAnalyzer.js
async startLSP(language, projectRoot) {
  // Spawns language server process
  // Sends initialize request
  // Returns server instance
}
```

### Extracting Symbols
```javascript
// Get document symbols from LSP
const symbols = await analyzer.getDocumentSymbols(filePath);
// Returns: [{ name, kind, range, children }]
```

### Incremental Analysis
Only re-analyze files when content hash changes:
```javascript
const hash = crypto.createHash('sha256').update(content).digest('hex');
if (hash !== storedHash) {
  // Analyze this file
}
```

## Terminal Management

### Creating Terminals
```javascript
const terminal = projectManager.createTerminal({
  name: 'Dev Server',
  command: 'npm',
  args: ['run', 'dev'],
  background: true
});
```

### Running Commands
```javascript
// Background (non-blocking)
const bgTerminal = await projectManager.runBackground('npm test');

// Foreground (wait for completion)
const result = await projectManager.runForeground('npm run build');
```

## API Testing

### Test Endpoint
```javascript
const result = await projectManager.testAPI({
  name: 'Login Test',
  method: 'POST',
  url: 'http://localhost:3000/api/login',
  headers: { 'Content-Type': 'application/json' },
  body: { username: 'test', password: 'test123' }
});
```

## VSCode Extension Specifics

### Webview Communication
Chat panel uses message passing:
```typescript
// extension.ts -> webview
panel.webview.postMessage({ type: 'response', content: aiResponse });

// webview -> extension.ts
panel.webview.onDidReceiveMessage(message => {
  if (message.type === 'prompt') {
    // Handle user input
  }
});
```

### Task Provider
Implements `vscode.TreeDataProvider` with checkbox support (VSCode 1.109.0+):
```typescript
getTreeItem(task: Task): vscode.TreeItem {
  const item = new vscode.TreeItem(task.description);
  item.checkboxState = task.completed ? 
    vscode.TreeItemCheckboxState.Checked : 
    vscode.TreeItemCheckboxState.Unchecked;
  return item;
}
```

### ACP Client (TypeScript)
Uses `@agentclientprotocol/sdk` for Claude Code integration:
```typescript
import { ACPClient } from './acpClient';
const client = new ACPClient();
await client.sendPrompt(sessionId, message, context);
```

## Common Pitfalls

1. **Cross-platform paths**: Always use `path.join()`, never string concatenation
2. **Async LSP calls**: LSP communication is async - always await responses
3. **File hash updates**: Update hash in database after analyzing file
4. **Terminal cleanup**: Kill background terminals when no longer needed
5. **Extension reload**: After TypeScript changes, reload VSCode window (Cmd+R)
6. **Stub path duplication**: AI may include src/ prefix - strip it in `_parseAndCreateFiles()`
7. **Plan validation**: Always validate JSON plan before executing file generation

## Two-Phase Stub Generation

The stub generator uses a two-phase approach:

### Phase 1: Generate Plan
AI returns structured JSON plan:
```json
{
  "module": "websocket",
  "files": [{
    "path": "mod.rs",
    "functions": [{"name": "init", "signature": "..."}],
    "structs": [{"name": "Config", "fields": [...]}]
  }],
  "dependencies": [...],
  "testStrategy": {...}
}
```

### Phase 2: Execute Plan
- Create directories from plan
- Generate files from specifications
- Return detailed execution results

**Methods:**
- `_generatePlan()` - Get JSON from AI
- `_parsePlanJSON()` - Validate JSON
- `_executePlan()` - Create files
- `_generateFileFromSpec()` - Generate code

## DevContainer Development

The project includes a complete DevContainer setup for consistent development:

### Quick Start
```bash
# Open in VS Code
code .
# Click "Reopen in Container"

# Container auto-installs:
# - Node.js 20, Bun, Rust, Go, Python
# - All dependencies
# - VS Code extensions
```

### Testing in Container
```bash
agenticide --version
node test-context-attachment.js
cd agenticide-vscode && npm run watch
```

See `docs/DEVCONTAINER_GUIDE.md` for complete guide.

## File Locations

- Global config: `~/.agenticide/config.json`
- Project tasks: `<project>/.agenticide-tasks.json`
- Project context: `<project>/.agenticide-context.json`
- SQLite database: Managed by core's ProjectManager
- Build output: `agenticide-vscode/out/` (compiled JS from TS)

## Dependencies

### Shared
- `better-sqlite3` - SQLite database
- `@agentclientprotocol/sdk` - ACP support
- `@modelcontextprotocol/sdk` - MCP support

### CLI-specific
- `commander` - CLI framework
- `inquirer` - Interactive prompts
- `chalk` - Terminal colors
- `ora` - Spinners
- `boxen` - Bordered boxes

### Core-specific
- `@babel/parser` & `@babel/traverse` - JavaScript AST parsing
- `typescript` & `typescript-language-server` - TypeScript LSP
- `chokidar` - File watching
- `fast-glob` - Fast file searching
- `terminal-kit` - Terminal UI

### VSCode-specific
- TypeScript compilation target: ESNext
- VSCode API version: `^1.109.0`
