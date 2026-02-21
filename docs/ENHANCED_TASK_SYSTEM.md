# Enhanced Task System - Usage Guide

## Overview

The enhanced task system provides **dependency-driven, real-time task management** with automatic ordering, parallel execution, and comprehensive tracking.

## Quick Start

```javascript
const { TaskManager, DependencyResolver, TaskExecutor } = require('./agenticide-core');
const path = require('path');
const os = require('os');

// Initialize
const dbPath = path.join(os.homedir(), '.agenticide', 'projects.db');
const taskManager = new TaskManager(dbPath);
const resolver = new DependencyResolver(taskManager);
const executor = new TaskExecutor(taskManager);
```

## Creating Tasks

### Basic Task

```javascript
const task = taskManager.createTask({
    title: 'Implement User Authentication',
    description: 'Add JWT-based authentication system',
    type: 'feature',              // feature, bug, test, refactor, doc
    priority: 9,                  // 0-10
    complexity: 'complex',        // trivial, simple, moderate, complex
    estimated_effort: 120,        // minutes
    test_required: true
});
```

### Task with Parent (Composable)

```javascript
// Create parent task
const parentTask = taskManager.createTask({
    title: 'Build API Layer',
    type: 'feature',
    priority: 10
});

// Create child tasks
const childTask = taskManager.createTask({
    title: 'Create User Endpoints',
    parent_id: parentTask.id,
    type: 'feature',
    priority: 8
});

// Or decompose automatically
const subtasks = taskManager.decomposeTask(parentTask.id, [
    { title: 'User CRUD', type: 'feature', estimated_effort: 30 },
    { title: 'Product CRUD', type: 'feature', estimated_effort: 30 },
    { title: 'Order CRUD', type: 'feature', estimated_effort: 40 }
]);
```

## Adding Dependencies

```javascript
// Task B depends on Task A (B blocked until A completes)
taskManager.addDependency('task-b-id', 'task-a-id', 'blocks');

// Soft dependency (suggestion, doesn't block)
taskManager.addDependency('task-b-id', 'task-a-id', 'suggests');

// Related tasks (no blocking)
taskManager.addDependency('task-b-id', 'task-a-id', 'relates_to');
```

## Automatic Dependency Resolution

### Get Ready Tasks (No Dependencies)

```javascript
const readyTasks = taskManager.getReadyTasks();
// Returns tasks with all dependencies met, ordered by priority
```

### Get Execution Order (Topological Sort)

```javascript
const groups = resolver.getParallelGroups();
// Returns:
// [
//   { level: 0, tasks: [task1], canRunInParallel: false },
//   { level: 1, tasks: [task2, task3], canRunInParallel: true },
//   { level: 2, tasks: [task4], canRunInParallel: false }
// ]
```

### Find Critical Path

```javascript
const criticalPath = resolver.getCriticalPath();
// Returns:
// {
//   path: [task1, task2, task4],
//   totalEffort: 180,
//   estimatedDuration: "3 hours"
// }
```

## Real-Time Updates

### Listen to Task Events

```javascript
// Task lifecycle events
taskManager.on('task:event', ({ taskId, eventType, message }) => {
    console.log(`[${eventType}] ${taskId}: ${message}`);
});

// Executor events
executor.on('task:started', ({ taskId, task }) => {
    console.log(`Starting: ${task.title}`);
});

executor.on('task:completed', ({ taskId, task, duration }) => {
    console.log(`✅ Completed: ${task.title} (${duration}ms)`);
});

executor.on('task:failed', ({ taskId, task, error }) => {
    console.error(`❌ Failed: ${task.title} - ${error}`);
});

executor.on('execution:started', () => {
    console.log('🚀 Execution started');
});

executor.on('execution:completed', ({ tasksExecuted }) => {
    console.log(`✅ All ${tasksExecuted} tasks completed`);
});
```

## Executing Tasks

### Execute Next Ready Task

```javascript
await executor.executeNext();
```

### Execute All Tasks in Order

```javascript
await executor.executeAll();
// Automatically:
// - Resolves dependency order
// - Executes in topological sequence
// - Runs parallel groups concurrently
// - Updates dependent tasks when complete
```

### Execute with Custom Logic

```javascript
const customExecutor = async (task) => {
    // Your implementation logic
    if (task.type === 'feature') {
        // Generate code
        return { success: true, files: ['file1.js', 'file2.js'] };
    }
};

await executor.executeTask(taskId, customExecutor);
```

### Parallel Execution

```javascript
// Executor automatically detects tasks that can run in parallel
const executor = new TaskExecutor(taskManager, {
    maxConcurrency: 5,  // Run up to 5 tasks simultaneously
    stopOnError: false  // Continue even if some tasks fail
});

await executor.executeAll();
```

## Status Management

### Update Task Status

```javascript
// Valid transitions: pending → ready → in_progress → done
taskManager.updateTaskStatus(taskId, 'in_progress');
taskManager.updateTaskStatus(taskId, 'done', { 
    result: 'Completed successfully' 
});

// Automatic behaviors:
// - Updates dependent tasks when done
// - Calculates actual effort
// - Updates parent progress if applicable
// - Emits real-time events
```

### Rollback Failed Task

```javascript
if (task.status === 'failed') {
    await executor.rollback(taskId);
    // Resets task to pending, clears timestamps
}
```

## Querying & Reporting

### Get Task Summary

```javascript
const summary = taskManager.getTaskSummary();
// {
//   total: 24,
//   ready: 3,
//   by_status: [
//     { status: 'pending', count: 15 },
//     { status: 'done', count: 5 },
//     ...
//   ],
//   by_type: [...]
// }
```

### Get Execution Metrics

```javascript
const metrics = executor.getMetrics();
// {
//   totalExecuted: 10,
//   successful: 9,
//   failed: 1,
//   successRate: "90.00%",
//   averageDuration: "45s",
//   totalDuration: "450s"
// }
```

### Get Task Audit Trail

```javascript
const events = taskManager.getTaskEvents(taskId);
// [
//   { event_type: 'created', message: 'Task created', timestamp: '...' },
//   { event_type: 'status_changed', message: 'Status: pending -> in_progress', ... },
//   { event_type: 'completed', message: 'Task completed', ... }
// ]
```

## Validation

### Validate Dependency Graph

```javascript
const validation = resolver.validate();
if (!validation.valid) {
    validation.issues.forEach(issue => {
        console.error(`[${issue.type}] ${issue.message}`);
    });
}
// Detects:
// - Circular dependencies
// - Orphaned dependencies
// - Isolated tasks
```

## Integration with CLI

### From agenticide-cli/taskTracker.js

```javascript
const { TaskTracker } = require('./agenticide-cli/taskTracker');

const tracker = new TaskTracker(process.cwd());

// Access enhanced features
const ready = tracker.getReadyTasks();
const tree = tracker.getDependencyTree();

// Execute tasks
await tracker.executeNext();
await tracker.executeAll();

// Real-time updates automatically logged to console
```

## Best Practices

### 1. Always Create Dependency Tree Upfront

```javascript
// Good: Define all tasks and dependencies before execution
const tasks = [
    taskManager.createTask({ title: 'Setup DB', ... }),
    taskManager.createTask({ title: 'Create API', ... }),
    taskManager.createTask({ title: 'Add Tests', ... })
];

taskManager.addDependency(tasks[1].id, tasks[0].id); // API depends on DB
taskManager.addDependency(tasks[2].id, tasks[1].id); // Tests depend on API

await executor.executeAll();
```

### 2. Use Composability for Large Tasks

```javascript
// Break down large tasks automatically
const largeTask = taskManager.createTask({
    title: 'Build Complete Auth System',
    complexity: 'complex'
});

taskManager.decomposeTask(largeTask.id, [
    { title: 'User model', complexity: 'simple' },
    { title: 'JWT middleware', complexity: 'moderate' },
    { title: 'Login endpoint', complexity: 'simple' },
    { title: 'Logout endpoint', complexity: 'simple' }
]);
```

### 3. Leverage Real-Time Events

```javascript
// Log everything for debugging
taskManager.on('task:event', ({ taskId, eventType, message }) => {
    fs.appendFileSync('task-log.txt', `${new Date().toISOString()} [${eventType}] ${message}\n`);
});

// Update UI in real-time
executor.on('task:completed', ({ task }) => {
    webSocketServer.broadcast({ type: 'task_done', taskId: task.id });
});
```

### 4. Validate Before Execution

```javascript
const validation = resolver.validate();
if (!validation.valid) {
    throw new Error('Invalid task graph: ' + 
        validation.issues.map(i => i.message).join(', '));
}
```

## Configuration Options

### TaskExecutor Options

```javascript
const executor = new TaskExecutor(taskManager, {
    maxConcurrency: 3,      // Max parallel tasks
    autoStart: false,       // Wait for manual start
    stopOnError: true,      // Stop if any task fails
    enableRollback: true    // Allow rollback of failed tasks
});
```

## Example: Full Workflow

```javascript
// 1. Create tasks
const db = taskManager.createTask({ title: 'Setup Database', priority: 10 });
const api = taskManager.createTask({ title: 'Build API', priority: 8 });
const auth = taskManager.createTask({ title: 'Add Auth', priority: 9 });
const tests = taskManager.createTask({ title: 'Write Tests', priority: 7 });

// 2. Define dependencies
taskManager.addDependency(api.id, db.id);
taskManager.addDependency(auth.id, db.id);
taskManager.addDependency(tests.id, api.id);
taskManager.addDependency(tests.id, auth.id);

// 3. Validate
const validation = resolver.validate();
console.assert(validation.valid, 'Invalid dependency graph');

// 4. Show plan
const groups = resolver.getParallelGroups();
console.log('Execution Plan:');
groups.forEach(g => {
    console.log(`  Level ${g.level}: ${g.tasks.map(t => t.title).join(', ')}`);
});

// 5. Execute
await executor.executeAll();

// 6. Report
console.log('Metrics:', executor.getMetrics());
console.log('Summary:', taskManager.getTaskSummary());
```

## Migration from Old System

The new system maintains backward compatibility:

```javascript
// Old JSON file still works
const oldTasks = JSON.parse(fs.readFileSync('.agenticide-tasks.json'));

// Migrate to new system
oldTasks.tasks.forEach(task => {
    taskManager.createTask({
        title: task.description,
        type: 'feature',
        status: task.completed ? 'done' : 'pending'
    });
});
```

## Performance Notes

- **Dependency Resolution**: O(V+E) using Kahn's algorithm
- **Ready Task Query**: O(V+E) with indexed lookups
- **Database Operations**: SQLite with indexes for speed
- **Event Emission**: Synchronous, <1ms overhead
- **Recommended**: Up to 1000 tasks with good performance

## Summary

The enhanced task system provides:

✅ **Automatic task ordering** based on dependencies  
✅ **Real-time updates** via EventEmitter  
✅ **Parallel execution** of independent tasks  
✅ **Task composition** with parent-child relationships  
✅ **Comprehensive validation** with cycle detection  
✅ **Complete audit trail** for debugging  
✅ **Rollback capabilities** for failed tasks  
✅ **Backward compatibility** with existing systems
