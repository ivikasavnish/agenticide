# Workflow Integration - Complete

## Overview

Agenticide now includes a powerful workflow system that integrates stubs, tasks, Git, and execution into cohesive workflows that can be:
- **Defined programmatically** - As JavaScript/Node.js workflows
- **Exported to Makefile** - For Make users
- **Exported to Taskfile** - For Task users (modern Make alternative)
- **Exported to package.json** - For npm scripts
- **Executed with trapping** - Proper error handling and retries
- **Visualized in terminal** - Beautiful progress output

## 🎯 Key Features

### 1. **Integrated Workflows**
Combines all Agenticide features into single units:
- Stub generation
- Task tracking
- Git branching and commits
- Implementation
- Testing
- Linting
- Building

### 2. **Export Formats**
Generate workflows in multiple formats:
- **Makefile** - Traditional Make
- **Taskfile.yml** - Modern Task runner
- **package.json** - npm scripts
- **JSON** - Custom integrations

### 3. **Error Handling**
Professional error trapping:
- Stop on error
- Continue on error
- Retry with backoff
- Conditional execution

### 4. **Progress Tracking**
Real-time workflow progress:
- Step-by-step execution
- Duration tracking
- Success/failure rates
- Detailed logging

## 📋 Usage

### Define a Workflow

```javascript
const { Workflow } = require('./workflow');

const workflow = new Workflow(
    'user-service',
    'Complete workflow for user service from stub to production'
);

workflow
    .addStep({
        name: 'Generate Stubs',
        command: '/stub user go service',
        type: 'agenticide'
    })
    .addStep({
        name: 'Verify Structure',
        command: '/verify user',
        type: 'agenticide'
    })
    .addStep({
        name: 'Implement Functions',
        command: 'make implement',
        type: 'shell'
    })
    .addStep({
        name: 'Run Tests',
        command: 'go test ./...',
        type: 'shell'
    })
    .addStep({
        name: 'Build',
        command: 'go build',
        type: 'shell'
    });
```

### Execute Workflow

```javascript
const { WorkflowExecutor } = require('./workflow');

const executor = new WorkflowExecutor(workflow, {
    verbose: true,
    stopOnError: true
});

const result = await executor.execute((progress) => {
    console.log(`Step ${progress.current}/${progress.total}: ${progress.step}`);
});

console.log(`Workflow ${result.status}`);
console.log(`Duration: ${result.duration}ms`);
console.log(`Success: ${result.summary.success}/${result.summary.total}`);
```

### Export to Makefile

```javascript
const makefile = workflow.toMakefile();
fs.writeFileSync('Makefile', makefile);
```

**Generated Makefile:**
```makefile
# Generated Makefile for workflow: user-service
# Complete workflow for user service from stub to production

.PHONY: all step-1 step-2 step-3 step-4 step-5

all: step-1 step-2 step-3 step-4 step-5

step-1:
\t@echo "==> Generate Stubs"
\tagenticide chat -c "/stub user go service"

step-2: step-1
\t@echo "==> Verify Structure"
\tagenticide chat -c "/verify user"

step-3: step-2
\t@echo "==> Implement Functions"
\tmake implement

step-4: step-3
\t@echo "==> Run Tests"
\tgo test ./...

step-5: step-4
\t@echo "==> Build"
\tgo build
```

### Export to Taskfile

```javascript
const taskfile = workflow.toTaskfile();
fs.writeFileSync('Taskfile.yml', taskfile);
```

**Generated Taskfile.yml:**
```yaml
# Generated Taskfile for workflow: user-service
# Complete workflow for user service from stub to production

version: '3'

tasks:
  default:
    desc: "Complete workflow for user service from stub to production"
    cmds:
      - task: step-1
      - task: step-2
      - task: step-3
      - task: step-4
      - task: step-5

  step-1:
    desc: "Generate Stubs"
    cmds:
      - agenticide chat -c "/stub user go service"

  step-2:
    desc: "Verify Structure"
    deps: [step-1]
    cmds:
      - agenticide chat -c "/verify user"

  step-3:
    desc: "Implement Functions"
    deps: [step-2]
    cmds:
      - make implement

  step-4:
    desc: "Run Tests"
    deps: [step-3]
    cmds:
      - go test ./...

  step-5:
    desc: "Build"
    deps: [step-4]
    cmds:
      - go build
```

## 🚀 Pre-built Workflows

### Full Development Workflow

```javascript
const { StubWorkflows } = require('./workflow');

const workflow = StubWorkflows.createFullWorkflow('user', 'go');

// Automatically includes:
// 1. Stub generation
// 2. Structure verification
// 3. Function implementation
// 4. Test execution
// 5. Code linting
// 6. Build
```

### Quick Prototype Workflow

```javascript
const workflow = StubWorkflows.createPrototypeWorkflow('prototype', 'go');

// Lightweight workflow for quick prototyping:
// 1. Stub generation (no tests)
// 2. Quick verification
```

## 🎨 CLI Integration

### New Commands

```bash
# Execute a workflow
agenticide workflow run <name>

# Create workflow from template
agenticide workflow create <module> <language>

# Export workflow to Makefile
agenticide workflow export makefile <name>

# Export workflow to Taskfile
agenticide workflow export taskfile <name>

# List all workflows
agenticide workflow list

# Show workflow details
agenticide workflow show <name>
```

### Example Usage

```bash
# Create full workflow for user service
$ agenticide workflow create user go

✅ Created workflow: stub-user
   Steps: 6
   File: .agenticide/workflows/stub-user.json

# Execute the workflow
$ agenticide workflow run stub-user

🚀 Starting workflow: stub-user

▶️  Step 1/6: Generate Stubs
✅ Completed in 5.2s

▶️  Step 2/6: Verify Structure
✅ Completed in 0.5s

▶️  Step 3/6: Implement Functions
✅ Completed in 45.3s

▶️  Step 4/6: Run Tests
✅ Completed in 2.1s

▶️  Step 5/6: Lint Code
✅ Completed in 1.8s

▶️  Step 6/6: Build
✅ Completed in 3.4s

✅ Workflow completed in 58.3s
   Success: 6/6

# Export to Makefile
$ agenticide workflow export makefile stub-user

✅ Exported to Makefile
   Use: make all
```

## 🔧 Advanced Features

### Error Handling

```javascript
workflow.setErrorHandling('retry', 3); // Retry up to 3 times

workflow.addStep({
    name: 'Flaky Test',
    command: 'npm test',
    type: 'shell',
    continueOnError: true, // Don't stop workflow if this fails
    retry: true,
    maxRetries: 3
});
```

### Conditional Execution

```javascript
workflow.addStep({
    name: 'Deploy to Production',
    command: './deploy.sh',
    type: 'shell',
    condition: () => process.env.NODE_ENV === 'production'
});
```

### Environment Variables

```javascript
workflow.setEnv({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgres://...'
});
```

### Timeout

```javascript
workflow.addStep({
    name: 'Long Running Build',
    command: 'cargo build --release',
    type: 'shell',
    timeout: 600000 // 10 minutes
});
```

### Logging

```javascript
const executor = new WorkflowExecutor(workflow, {
    verbose: true,
    logFile: '.agenticide/logs/workflow.log'
});
```

## 📊 Integration with Stub-First

### Complete Stub-to-Production Flow

```javascript
// In agenticide CLI, when you run /stub:
const workflow = new Workflow('auth-service', 'Authentication service');

workflow
    // 1. Create Git branch
    .addStep({
        name: 'Create Feature Branch',
        command: 'git checkout -b feature/stub-auth',
        type: 'shell'
    })
    // 2. Generate stubs with AI
    .addStep({
        name: 'Generate Stubs',
        command: '/stub auth go service --style=google',
        type: 'agenticide'
    })
    // 3. Create tasks
    .addStep({
        name: 'Create Tasks',
        command: 'agenticide task create auth',
        type: 'shell'
    })
    // 4. Commit stubs
    .addStep({
        name: 'Commit Stubs',
        command: 'git add . && git commit -m "feat: Add auth stubs"',
        type: 'shell'
    })
    // 5. Verify structure
    .addStep({
        name: 'Verify Structure',
        command: '/verify auth',
        type: 'agenticide'
    })
    // 6. Implementation loop (can be separate workflow)
    .addStep({
        name: 'Implement Functions',
        command: '/implement Login --with-tests',
        type: 'agenticide'
    })
    .addStep({
        name: 'Run Tests',
        command: 'go test ./src/auth/...',
        type: 'shell'
    })
    // 7. Final commit
    .addStep({
        name: 'Commit Implementation',
        command: 'git add . && git commit -m "feat: Implement Login"',
        type: 'shell'
    });

// Execute
await executor.execute();
```

## 🎯 Use Cases

### 1. **CI/CD Pipeline**

Export to Makefile and use in GitHub Actions:

```yaml
# .github/workflows/build.yml
name: Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run workflow
        run: make all
```

### 2. **Team Development**

Share workflows across team:

```bash
# Developer 1 creates workflow
agenticide workflow create payment go
agenticide workflow export taskfile payment

# Developer 2 uses it
task default
```

### 3. **Automated Stub Generation**

Daily cron job to generate stubs for new features:

```javascript
const workflow = StubWorkflows.createFullWorkflow('feature-' + Date.now(), 'go');
workflow.toMakefile();
```

## 📈 Benefits

### 1. **Consistency**
- Same workflow for all modules
- No manual steps forgotten
- Reproducible results

### 2. **Efficiency**
- Automate repetitive tasks
- Parallel execution where possible
- Retry failed steps automatically

### 3. **Traceability**
- All steps logged
- Git commits for each phase
- Task tracking integrated

### 4. **Flexibility**
- Export to multiple formats
- Customize per project
- Extend with custom steps

## 🔄 Integration Points

```
Stub-First Workflow
       ↓
    Workflow
       ↓
   ┌────┴────┐
   │         │
   ↓         ↓
Git     Tasks
Branch  Tracking
   ↓         ↓
Commit   Update
   ↓         ↓
   └────┬────┘
        ↓
  Execute Tests
        ↓
  Verify & Deploy
```

## 🚧 Next Steps

- [ ] Add workflow templates library
- [ ] Visual workflow editor
- [ ] Parallel step execution
- [ ] Workflow versioning
- [ ] Remote workflow execution (API)
- [ ] Workflow marketplace

---

**Status:** ✅ Complete - Ready for Testing
