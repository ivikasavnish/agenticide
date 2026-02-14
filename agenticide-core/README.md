# Agenticide Core v3.0.0

**Project-Centric AI Coding Tooling Package**

Everything revolves around the **Project** as the central object.

---

## 🎯 Philosophy

Traditional coding tools treat files and code as independent units. Agenticide Core treats the **Project** as the fundamental unit, with everything organized around it:

- **Files** belong to Projects
- **Terminals** run in Project context
- **API Tests** are scoped to Projects
- **Tasks** are Project-specific
- **Context** flows from the Project

---

## 📦 Features

### 1. **Project Index**
- Automatic project discovery
- SQLite-based indexing
- Fast search and filtering
- Metadata storage
- File indexing per project

### 2. **Terminal Manager**
- Foreground terminals (interactive)
- Background terminals (daemon-like)
- Output capture and streaming
- Terminal history per project
- Process management

### 3. **API Tester**
- HTTP request testing
- Curl command parsing
- Test history and replay
- Test collections
- Assertions and validation

### 4. **Project Manager**
- Central coordination
- Event-driven architecture
- Context management
- Task tracking
- Statistics and insights

---

## 🚀 Installation

```bash
npm install @agenticide/core
```

Or from source:

```bash
cd agenticide-core
npm install
npm link
```

---

## 📖 Usage

### Quick Start

```javascript
const { ProjectManager } = require('@agenticide/core');

const pm = new ProjectManager();

// Discover projects
const projects = await pm.discoverProjects();
console.log(`Found ${projects.length} projects`);

// Open a project
await pm.openProject('/path/to/project');

// Add a task
pm.addTask(pm.currentProject.id, 'Implement login feature');

// Run command in background
const terminal = await pm.runBackground('npm run dev');

// Test an API
const result = await pm.testAPI({
    name: 'Login Test',
    method: 'POST',
    url: 'http://localhost:3000/api/login',
    body: { username: 'test', password: 'test123' }
});

console.log('API Test:', result.statusCode, result.duration + 'ms');
```

---

## 📚 API Reference

### ProjectManager

Main class that coordinates everything.

#### Constructor

```javascript
const pm = new ProjectManager();
```

#### Project Discovery

```javascript
// Discover projects in common directories
const projects = await pm.discoverProjects();

// Discover in specific paths
const projects = await pm.discoverProjects([
    '/Users/you/projects',
    '/Users/you/workspace'
]);

// Search for projects
const results = pm.searchProjects('my-app');

// List all projects
const all = pm.listProjects({ limit: 20 });

// List by type
const nodeProjects = pm.listProjects({ type: 'node' });
```

#### Project Operations

```javascript
// Open project (set as current + index files)
await pm.openProject('/path/to/project');

// Get current project
const current = pm.getCurrentProject();

// Get project context (full info)
const context = pm.getProjectContext(projectId);

// Get project stats
const stats = pm.getProjectStats(projectId);
// => { files: 523, tasks: 12, completedTasks: 8, activeTerminals: 2 }
```

#### Task Management

```javascript
// Add task
const task = pm.addTask(projectId, 'Implement auth', priority = 5);

// List tasks
const tasks = pm.listTasks(projectId);

// List only pending
const pending = pm.listTasks(projectId, { completed: false });

// Complete task
pm.completeTask(taskId);

// Delete task
pm.deleteTask(taskId);
```

#### Terminal Management

```javascript
// Create interactive terminal
const terminal = pm.createTerminal({
    name: 'Dev Server',
    command: 'npm',
    args: ['run', 'dev'],
    background: false
});

// Run command in background
const bgTerminal = await pm.runBackground('npm test');

// Run command in foreground (wait for completion)
const result = await pm.runForeground('npm run build');

// List all terminals for project
const terminals = pm.listTerminals();

// Get terminal output
const output = pm.getTerminalOutput(pid, {
    tail: 100,  // Last 100 lines
    type: 'stdout'  // Only stdout
});

// Kill terminal
pm.killTerminal(pid);
```

#### API Testing

```javascript
// Test API endpoint
const result = await pm.testAPI({
    name: 'Get Users',
    method: 'GET',
    url: 'http://api.example.com/users',
    headers: {
        'Authorization': 'Bearer token123'
    }
});

// Execute curl command
const result = await pm.curl(`
    curl -X POST http://api.example.com/login \\
    -H "Content-Type: application/json" \\
    -d '{"username":"test","password":"pass"}'
`);

// Get test history
const history = pm.getAPIHistory({ limit: 10 });

// Replay previous test
const replay = await pm.replayTest(testId);

// Create test collection
pm.createTestCollection('Auth Tests', [
    {
        name: 'Login',
        method: 'POST',
        url: 'http://localhost:3000/api/login',
        body: { username: 'test', password: 'test123' }
    },
    {
        name: 'Get Profile',
        method: 'GET',
        url: 'http://localhost:3000/api/profile'
    }
]);

// Run collection
const results = await pm.runTestCollection('Auth Tests');
```

#### Events

```javascript
pm.on('project:discovered', (project) => {
    console.log('Found project:', project.name);
});

pm.on('project:current', (project) => {
    console.log('Switched to:', project.name);
});

pm.on('terminal:created', (terminal) => {
    console.log('Terminal started:', terminal.name);
});

pm.on('terminal:output', ({ pid, type, data }) => {
    console.log(`[${pid}] ${type}:`, data);
});

pm.on('terminal:exit', ({ pid, code }) => {
    console.log(`Terminal ${pid} exited with code ${code}`);
});

pm.on('task:added', (task) => {
    console.log('Task added:', task.description);
});
```

---

## 🗄️ Database Schema

Projects are stored in `~/.agenticide/projects.db` (SQLite):

### Tables

**projects**
- `id` - Project ID
- `name` - Project name
- `path` - Absolute path
- `type` - Project type (node, python, etc.)
- `language` - Primary language
- `framework` - Framework (react, express, etc.)
- `git_remote` - Git remote URL
- `last_accessed` - Timestamp
- `created_at` - Timestamp
- `metadata` - JSON metadata

**project_files**
- File index per project
- Path, type, size, modified time

**project_terminals**
- Terminal history per project
- Name, PID, status, command

**project_tasks**
- Tasks per project
- Description, completion status, priority

**api_tests**
- API test history per project
- Method, URL, headers, body, response

---

## 🎨 Examples

### Example 1: Auto-discover and Index All Projects

```javascript
const { ProjectManager } = require('@agenticide/core');

async function indexAllProjects() {
    const pm = new ProjectManager();
    
    console.log('🔍 Discovering projects...');
    const projects = await pm.discoverProjects();
    
    console.log(`\n📦 Found ${projects.length} projects:`);
    
    for (const project of projects) {
        console.log(`  ${project.name} (${project.type})`);
        console.log(`    ${project.path}`);
        
        // Index files
        pm.index.indexProjectFiles(project.id, project.path);
    }
    
    pm.close();
}

indexAllProjects();
```

### Example 2: Dev Server with Background Terminal

```javascript
const { ProjectManager } = require('@agenticide/core');

async function startDevServer() {
    const pm = new ProjectManager();
    
    // Open project
    await pm.openProject(process.cwd());
    
    // Start dev server in background
    console.log('🚀 Starting dev server...');
    const terminal = await pm.runBackground('npm run dev', {
        name: 'Dev Server'
    });
    
    // Listen for output
    pm.on('terminal:output', ({ pid, data }) => {
        if (pid === terminal.pid) {
            process.stdout.write(data);
        }
    });
    
    console.log(`✅ Dev server running (PID: ${terminal.pid})`);
    console.log('Press Ctrl+C to stop');
    
    // Handle cleanup
    process.on('SIGINT', () => {
        console.log('\n🛑 Stopping server...');
        pm.killTerminal(terminal.pid);
        pm.close();
        process.exit(0);
    });
}

startDevServer();
```

### Example 3: API Test Suite

```javascript
const { ProjectManager } = require('@agenticide/core');

async function testAPI() {
    const pm = new ProjectManager();
    await pm.openProject(process.cwd());
    
    console.log('🧪 Running API tests...\n');
    
    // Test 1: Health check
    const health = await pm.testAPI({
        name: 'Health Check',
        method: 'GET',
        url: 'http://localhost:3000/health'
    });
    
    console.log(`✓ Health: ${health.statusCode} (${health.duration}ms)`);
    
    // Test 2: Login
    const login = await pm.testAPI({
        name: 'Login',
        method: 'POST',
        url: 'http://localhost:3000/api/login',
        body: { username: 'admin', password: 'admin123' }
    });
    
    console.log(`✓ Login: ${login.statusCode} (${login.duration}ms)`);
    
    // Get test history
    const history = pm.getAPIHistory({ limit: 10 });
    console.log(`\n📊 Total tests run: ${history.length}`);
    
    pm.close();
}

testAPI();
```

### Example 4: Project Dashboard

```javascript
const { ProjectManager } = require('@agenticide/core');

async function showDashboard(projectPath) {
    const pm = new ProjectManager();
    await pm.openProject(projectPath);
    
    const context = pm.getProjectContext();
    
    console.log('╔════════════════════════════════════════╗');
    console.log(`║  ${context.name.padEnd(38)}║`);
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Type: ${context.type.padEnd(31)}║`);
    console.log(`║  Language: ${context.language.padEnd(27)}║`);
    console.log(`║  Framework: ${(context.framework || 'None').padEnd(26)}║`);
    console.log('╠════════════════════════════════════════╣');
    console.log(`║  Files: ${String(context.stats.files).padEnd(31)}║`);
    console.log(`║  Tasks: ${String(context.stats.tasks).padEnd(31)}║`);
    console.log(`║  Terminals: ${String(context.stats.activeTerminals).padEnd(26)}║`);
    console.log('╚════════════════════════════════════════╝');
    
    if (context.tasks.length > 0) {
        console.log('\n📝 Pending Tasks:');
        context.tasks.forEach((task, i) => {
            console.log(`  ${i + 1}. ${task.description}`);
        });
    }
    
    pm.close();
}

showDashboard(process.cwd());
```

---

## 🔌 Integration

### With CLI

```javascript
const { ProjectManager } = require('@agenticide/core');

// In your CLI commands
program
    .command('projects')
    .action(async () => {
        const pm = new ProjectManager();
        const projects = pm.listProjects({ limit: 20 });
        
        projects.forEach(p => {
            console.log(`${p.name} (${p.type}) - ${p.path}`);
        });
    });
```

### With VSCode Extension

```typescript
import { ProjectManager } from '@agenticide/core';

let projectManager: ProjectManager;

export function activate(context: vscode.ExtensionContext) {
    projectManager = new ProjectManager();
    
    // Discover projects on activation
    projectManager.discoverProjects().then(projects => {
        vscode.window.showInformationMessage(
            `Found ${projects.length} projects`
        );
    });
    
    // Register commands...
}
```

---

## 📄 License

MIT

---

**Built for developers who think in terms of projects, not just files.** 🚀
