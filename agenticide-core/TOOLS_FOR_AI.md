# Agenticide Core Tools - For AI Agents

This document describes the tooling available in Agenticide Core that AI agents should be aware of and can use to assist developers.

---

## 🎯 Core Concept

**Project is the Central Object** - Everything revolves around projects. All operations are project-scoped.

---

## 🛠️ Available Tools

### 1. Project Discovery & Management

**Discover projects on the system:**
```javascript
const projects = await projectManager.discoverProjects();
// Returns: Array of projects found in common locations

const results = projectManager.searchProjects('my-app');
// Returns: Projects matching search query
```

**Open and work with a project:**
```javascript
await projectManager.openProject('/path/to/project');
const current = projectManager.getCurrentProject();
// Sets current project context
```

**Get project information:**
```javascript
const context = projectManager.getProjectContext();
// Returns comprehensive project info including:
// - Basic info (name, path, type, language, framework)
// - Statistics (files, tasks, terminals)
// - Active tasks
// - Running terminals
// - Recent API tests
// - Code structure (if analyzed)
```

---

### 2. Code Analysis & Structure

**Analyze project code:**
```javascript
const results = await projectManager.analyzeProjectCode();
// Parses all code files and extracts:
// - Functions with signatures (no bodies)
// - Classes with methods
// - Imports and exports
// - Entrypoints
// Returns: { files, functions, classes, entrypoints }
```

**Get code structure:**
```javascript
const structure = projectManager.getProjectStructure();
// Returns summary:
// - Total files analyzed
// - Function count
// - Class count
// - Export count
// - Entrypoints list
```

**Get file contracts (signatures only):**
```javascript
const contracts = projectManager.getFileContracts('/path/to/file.js');
// Returns for each file:
// {
//   file: 'path',
//   language: 'javascript',
//   imports: [...],
//   exports: [...],
//   functions: [
//     { name, signature, return_type, is_async, is_exported }
//   ],
//   classes: [
//     {
//       name, extends, implements,
//       methods: [{ name, signature, visibility }]
//     }
//   ]
// }
```

**Trace control flow:**
```javascript
const flow = projectManager.getControlFlow();
// Returns array of control flow edges:
// [
//   { from: 'index.js', to: 'utils.js', type: 'import', names: ['helper'] }
// ]
```

**Use Cases for AI:**
- Understanding project structure before making changes
- Finding entrypoints to understand execution flow
- Locating functions/classes to modify
- Understanding dependencies between files
- Generating documentation from contracts
- Refactoring assistance

---

### 3. Project Templates (Cookiecutter-style)

**List available templates:**
```javascript
const templates = projectManager.listTemplates();
// Returns: [
//   { name: 'node-express', title: 'Node.js Express API', description: '...' },
//   { name: 'react-app', title: 'React App', description: '...' },
//   ...
// ]
```

**Get template details:**
```javascript
const info = projectManager.getTemplateInfo('node-express');
// Returns: { name, title, description, files: [...] }
```

**Create project from template:**
```javascript
const result = await projectManager.createFromTemplate(
  'node-express',
  '/path/to/new-project',
  {
    project_name: 'My API',
    author: 'John Doe'
  }
);
// Creates complete project structure with variable substitution
// Runs post-creation commands (npm install, etc.)
```

**Available Templates:**
- `node-express` - Express.js REST API with TypeScript
- `node-cli` - CLI tool with Commander.js
- `react-app` - React app with Vite
- `typescript-lib` - Reusable TypeScript library
- `python-flask` - Flask REST API
- `python-cli` - Python CLI with Click
- `vscode-extension` - VSCode extension
- `rust-cli` - Rust command-line tool

**Use Cases for AI:**
- Quickly scaffold new projects for users
- Generate boilerplate code
- Create consistent project structures
- Suggest appropriate templates based on user needs

---

### 4. Terminal Management

**Create terminal:**
```javascript
const terminal = projectManager.createTerminal({
  name: 'Dev Server',
  command: 'npm',
  args: ['run', 'dev'],
  background: true  // Run in background
});
```

**Run commands:**
```javascript
// Background (non-blocking)
const bgTerminal = await projectManager.runBackground('npm test');

// Foreground (wait for completion)
const result = await projectManager.runForeground('npm run build');
// result: { pid, exitCode, output }
```

**Get terminal output:**
```javascript
const output = projectManager.getTerminalOutput(pid, {
  tail: 100,  // Last 100 lines
  type: 'stdout'  // Only stdout
});
```

**List active terminals:**
```javascript
const terminals = projectManager.listTerminals();
```

**Kill terminal:**
```javascript
projectManager.killTerminal(pid);
```

**Use Cases for AI:**
- Running build commands
- Executing tests
- Starting development servers
- Installing dependencies
- Running linters/formatters
- Executing scripts

---

### 5. API Testing

**Test API endpoint:**
```javascript
const result = await projectManager.testAPI({
  name: 'Login Test',
  method: 'POST',
  url: 'http://localhost:3000/api/login',
  headers: { 'Content-Type': 'application/json' },
  body: { username: 'test', password: 'test123' }
});
// Returns: { statusCode, headers, body, duration }
```

**Execute curl command:**
```javascript
const result = await projectManager.curl(`
  curl -X POST http://api.example.com/login \\
    -H "Content-Type: application/json" \\
    -d '{"username":"test"}'
`);
```

**Get test history:**
```javascript
const history = projectManager.getAPIHistory({ limit: 10 });
```

**Replay test:**
```javascript
const result = await projectManager.replayTest(testId);
```

**Test collections:**
```javascript
// Create collection
projectManager.createTestCollection('Auth Tests', [
  { name: 'Login', method: 'POST', url: '...', body: {...} },
  { name: 'Get Profile', method: 'GET', url: '...' }
]);

// Run collection
const results = await projectManager.runTestCollection('Auth Tests');
```

**Use Cases for AI:**
- Testing APIs during development
- Debugging API issues
- Validating responses
- Creating test suites
- Performance testing
- Integration testing

---

### 6. Task Management

**Add task:**
```javascript
const task = projectManager.addTask(projectId, 'Implement login feature', priority = 5);
```

**List tasks:**
```javascript
const tasks = projectManager.listTasks(projectId);
const pending = projectManager.listTasks(projectId, { completed: false });
```

**Complete task:**
```javascript
projectManager.completeTask(taskId);
```

**Delete task:**
```javascript
projectManager.deleteTask(taskId);
```

**Use Cases for AI:**
- Breaking down user requests into tasks
- Tracking work progress
- Managing TODO lists
- Prioritizing work

---

## 📊 Event System

The ProjectManager emits events that AI agents can listen to:

```javascript
projectManager.on('project:discovered', (project) => {
  // New project found
});

projectManager.on('project:current', (project) => {
  // Current project changed
});

projectManager.on('project:analyzed', ({ projectId, results }) => {
  // Code analysis completed
});

projectManager.on('terminal:created', (terminal) => {
  // Terminal started
});

projectManager.on('terminal:output', ({ pid, type, data }) => {
  // Terminal output received
});

projectManager.on('terminal:exit', ({ pid, code }) => {
  // Terminal exited
});

projectManager.on('task:added', (task) => {
  // Task added
});
```

---

## 🎨 Example Workflows for AI Agents

### Workflow 1: Understanding a New Project

```javascript
// 1. Open the project
await projectManager.openProject('/path/to/project');

// 2. Get basic context
const context = projectManager.getProjectContext();
console.log(`Project: ${context.project.name}`);
console.log(`Type: ${context.project.type}`);
console.log(`Language: ${context.project.language}`);

// 3. Analyze code structure
const analysis = await projectManager.analyzeProjectCode();
console.log(`Found ${analysis.functions} functions`);
console.log(`Entrypoints: ${analysis.entrypoints.join(', ')}`);

// 4. Get detailed structure
const structure = projectManager.getProjectStructure();

// 5. Trace control flow
const flow = projectManager.getControlFlow();

// Now the AI has complete understanding of the project
```

### Workflow 2: Creating a New Feature

```javascript
// 1. Add task
const task = projectManager.addTask(projectId, 'Add user authentication');

// 2. Analyze existing code to understand patterns
const contracts = projectManager.getFileContracts('src/routes/index.js');

// 3. Run tests to establish baseline
const testResult = await projectManager.runForeground('npm test');

// 4. Make code changes (using edit tools)
// ... AI makes changes ...

// 5. Run tests again
const newTestResult = await projectManager.runForeground('npm test');

// 6. Test the API
const apiTest = await projectManager.testAPI({
  name: 'Test new login endpoint',
  method: 'POST',
  url: 'http://localhost:3000/api/login',
  body: { username: 'test', password: 'test123' }
});

// 7. Complete task
projectManager.completeTask(task.id);
```

### Workflow 3: Debugging an Issue

```javascript
// 1. Get project context
const context = projectManager.getProjectContext();

// 2. Check recent API test failures
const recentTests = context.recentTests.filter(t => t.status >= 400);

// 3. Get file contracts for failing endpoint
const contracts = projectManager.getFileContracts('src/controllers/auth.js');

// 4. Run in dev mode with output capture
const devServer = await projectManager.runBackground('npm run dev');

// 5. Listen for output
projectManager.on('terminal:output', ({ pid, data }) => {
  if (pid === devServer.pid) {
    console.log(data);
    // AI analyzes output for errors
  }
});

// 6. Replay failing test
const result = await projectManager.replayTest(failingTestId);

// 7. Make fix based on analysis
// ... AI makes changes ...

// 8. Test again
const retestResult = await projectManager.testAPI({...});
```

### Workflow 4: Starting a New Project

```javascript
// 1. List available templates
const templates = projectManager.listTemplates();

// 2. AI asks user which type they want
// User: "I want a REST API in Node.js"

// 3. Create from template
const result = await projectManager.createFromTemplate(
  'node-express',
  '/Users/developer/my-api',
  {
    project_name: 'My API',
    author: 'Developer Name'
  }
);

// 4. Open the new project
await projectManager.openProject(result.project.path);

// 5. Start dev server
const devServer = await projectManager.runBackground('npm run dev');

// 6. Test it works
const healthCheck = await projectManager.testAPI({
  name: 'Health Check',
  method: 'GET',
  url: 'http://localhost:3000/health'
});

console.log('✅ Project ready!');
```

---

## 💡 Best Practices for AI Agents

1. **Always get project context first** before making changes
2. **Analyze code structure** to understand existing patterns
3. **Use contracts** to understand interfaces without reading full code
4. **Run tests** before and after changes
5. **Use background terminals** for long-running processes
6. **Create test collections** for regression testing
7. **Track work with tasks** for complex features
8. **Use templates** for consistent project creation
9. **Listen to events** to react to changes
10. **Check control flow** to understand dependencies

---

## 🔌 Integration Points

### For VSCode Extension
- Display code structure in sidebar tree view
- Show entrypoints as special nodes
- Provide "Analyze Project" command
- Show terminal output in panels
- Display API test results
- Template picker UI

### For CLI
- `agenticide analyze` - Analyze current project
- `agenticide structure` - Show project structure
- `agenticide contracts <file>` - Show file contracts
- `agenticide flow` - Show control flow
- `agenticide new <template>` - Create from template
- `agenticide templates` - List templates

### For AI Chat
- Automatically analyze project when user asks about code
- Use contracts to answer questions without reading full code
- Suggest appropriate templates for new projects
- Trace control flow to explain execution
- Use structure to suggest refactoring

---

**This tooling gives AI agents comprehensive project understanding and powerful automation capabilities.**
