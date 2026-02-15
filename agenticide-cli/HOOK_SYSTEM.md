# 🔗 Agenticide Hook System

## Overview

The Hook System makes Agenticide extensible by allowing you to hook external tools at important stages of the workflow.

## Hook Points

Agenticide provides the following hook points:

### Stub Generation Hooks
- `pre-stub-generation` - Before stub generation starts
- `post-stub-generation` - After stubs are generated
- `pre-file-write` - Before each file is written
- `post-file-write` - After each file is written

### Git Hooks
- `pre-git-branch` - Before creating Git branch
- `post-git-branch` - After creating Git branch
- `pre-git-commit` - Before committing changes
- `post-git-commit` - After committing changes

### Task Hooks
- `pre-task-create` - Before creating tasks
- `post-task-create` - After creating tasks
- `pre-task-update` - Before updating tasks
- `post-task-update` - After updating tasks

### Workflow Hooks
- `pre-workflow` - Before workflow starts
- `post-workflow` - After workflow completes
- `pre-workflow-step` - Before each workflow step
- `post-workflow-step` - After each workflow step

### Implementation Hooks
- `pre-implement` - Before implementation
- `post-implement` - After implementation

### Verification Hooks
- `pre-verify` - Before verification
- `post-verify` - After verification

## Configuration

Create `.agenticide/hooks.json` in your project:

```json
{
  "hooks": {
    "post-stub-generation": [
      {
        "name": "format-code",
        "type": "command",
        "command": "prettier --write {{directory}}/**/*.{js,ts}",
        "enabled": true,
        "blocking": false,
        "onError": "warn"
      }
    ],
    "pre-git-commit": [
      {
        "name": "run-tests",
        "type": "command",
        "command": "npm test",
        "enabled": true,
        "blocking": true,
        "onError": "fail",
        "timeout": 60000
      }
    ]
  }
}
```

## Hook Types

### 1. Command Hook
Execute shell commands:

```json
{
  "name": "lint",
  "type": "command",
  "command": "eslint {{directory}}",
  "enabled": true,
  "blocking": false,
  "onError": "warn"
}
```

### 2. Script Hook
Run custom scripts:

```json
{
  "name": "custom-script",
  "type": "script",
  "script": ".agenticide/hooks/my-script.js",
  "enabled": true,
  "blocking": false
}
```

### 3. Function Hook
Register programmatically:

```javascript
const HookManager = require('./core/hookManager');
const hooks = new HookManager();

hooks.register('post-stub-generation', {
    name: 'custom-function',
    type: 'function',
    function: async (context) => {
        console.log('Generated:', context.moduleName);
        // Your custom logic here
    }
});
```

## Hook Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `name` | string | `'anonymous'` | Hook identifier |
| `type` | string | `'command'` | Hook type: `command`, `script`, `function` |
| `command` | string | - | Command to execute (for `command` type) |
| `script` | string | - | Script path (for `script` type) |
| `function` | function | - | Function to call (for `function` type) |
| `enabled` | boolean | `true` | Enable/disable hook |
| `blocking` | boolean | `true` | Wait for completion |
| `timeout` | number | `30000` | Timeout in milliseconds |
| `onError` | string | `'warn'` | Error handling: `warn`, `ignore`, `fail` |

## Context Variables

Hooks receive context that can be interpolated in commands:

```json
{
  "command": "prettier --write {{directory}}/{{moduleName}}.js"
}
```

Available variables depend on the hook point:

**Stub Generation:**
- `moduleName` - Module name
- `language` - Programming language
- `type` - Module type (service, api, library)
- `directory` - Output directory
- `outputDir` - Same as directory

**Git Operations:**
- `moduleName` - Module name
- `branch` - Git branch name
- `commit` - Commit hash
- `files` - Array of files

**Tasks:**
- `taskId` - Task identifier
- `task` - Task object

## Example Use Cases

### 1. Auto-Format Generated Code

```json
{
  "hooks": {
    "post-stub-generation": [
      {
        "name": "prettier",
        "type": "command",
        "command": "prettier --write {{directory}}/**/*.{js,ts,go,rs}",
        "enabled": true
      }
    ]
  }
}
```

### 2. Run Tests Before Commit

```json
{
  "hooks": {
    "pre-git-commit": [
      {
        "name": "test",
        "type": "command",
        "command": "npm test",
        "enabled": true,
        "blocking": true,
        "onError": "fail"
      }
    ]
  }
}
```

### 3. Security Scanning

```json
{
  "hooks": {
    "pre-git-commit": [
      {
        "name": "security-audit",
        "type": "command",
        "command": "npm audit --audit-level=high",
        "enabled": true,
        "onError": "warn"
      }
    ]
  }
}
```

### 4. Slack Notifications

```json
{
  "hooks": {
    "post-git-commit": [
      {
        "name": "notify-slack",
        "type": "script",
        "script": ".agenticide/hooks/notify-slack.js",
        "enabled": true
      }
    ]
  }
}
```

### 5. Documentation Generation

```json
{
  "hooks": {
    "post-workflow": [
      {
        "name": "docs",
        "type": "command",
        "command": "npm run docs:generate",
        "enabled": true,
        "blocking": false
      }
    ]
  }
}
```

### 6. Lint-Staged Integration

```json
{
  "hooks": {
    "pre-git-commit": [
      {
        "name": "lint-staged",
        "type": "command",
        "command": "npx lint-staged",
        "enabled": true,
        "blocking": true,
        "onError": "fail"
      }
    ]
  }
}
```

## Programmatic Usage

```javascript
const HookManager = require('./core/hookManager');
const hooks = new HookManager({ verbose: true });

// Register a hook
hooks.register('post-stub-generation', {
    name: 'my-hook',
    type: 'command',
    command: 'echo "Done!"'
});

// Execute hooks
const result = await hooks.execute('post-stub-generation', {
    moduleName: 'user',
    directory: './src/user'
});

console.log('Success:', result.success);
console.log('Results:', result.results);

// List all hooks
const hookList = hooks.list();
console.log(hookList);

// Clear hooks
hooks.clear('post-stub-generation'); // Clear specific hook point
hooks.clear(); // Clear all hooks
```

## Error Handling

### onError: 'warn' (default)
Hook failure logs a warning, workflow continues:
```
⚠️  lint-code: eslint failed with exit code 1
```

### onError: 'ignore'
Hook failure is silently ignored, workflow continues.

### onError: 'fail'
Hook failure stops the workflow:
```
❌ Error: Hook 'run-tests' failed: npm test exited with code 1
```

## Best Practices

1. **Non-Blocking by Default** - Use `blocking: false` for non-critical hooks
2. **Appropriate Timeouts** - Set realistic timeouts for long-running hooks
3. **Fail Fast** - Use `onError: 'fail'` for critical checks (tests, security)
4. **Warn for Quality** - Use `onError: 'warn'` for linting, formatting
5. **Context Variables** - Use `{{variable}}` for dynamic commands
6. **Enable Selectively** - Start with `enabled: false`, enable as needed

## Built-in Integrations

Copy `.agenticide/hooks.example.json` to `.agenticide/hooks.json` and customize:

```bash
cp .agenticide/hooks.example.json .agenticide/hooks.json
# Edit hooks.json to enable desired hooks
```

## Example Hooks

### TypeScript Type Checking
```json
{
  "name": "typecheck",
  "type": "command",
  "command": "tsc --noEmit",
  "enabled": true,
  "onError": "warn"
}
```

### Go Formatting
```json
{
  "name": "gofmt",
  "type": "command",
  "command": "gofmt -w {{directory}}",
  "enabled": true
}
```

### Rust Clippy
```json
{
  "name": "clippy",
  "type": "command",
  "command": "cargo clippy",
  "enabled": true,
  "onError": "warn"
}
```

### Custom Validation
```json
{
  "name": "validate",
  "type": "script",
  "script": ".agenticide/hooks/validate.js",
  "enabled": true
}
```

## API Reference

See `HookManager.HOOKS` for all available hook points.

---

**The Hook System makes Agenticide infinitely extensible!**
