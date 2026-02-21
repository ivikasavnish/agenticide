#!/usr/bin/env node

/**
 * Test Enhanced Task System
 * Demonstrates task generation, dependency resolution, and execution
 */

const path = require('path');
const os = require('os');
const { TaskManager } = require('./agenticide-core/taskManager');
const { DependencyResolver } = require('./agenticide-core/dependencyResolver');
const { TaskExecutor } = require('./agenticide-core/taskExecutor');

const dbPath = path.join(os.homedir(), '.agenticide', 'test-tasks.db');
const fs = require('fs');

// Clean up old test database
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
}

console.log('🧪 Testing Enhanced Task System\n');
console.log('=' .repeat(60));

// Initialize system
const taskManager = new TaskManager(dbPath);
const resolver = new DependencyResolver(taskManager);
const executor = new TaskExecutor(taskManager, {
    maxConcurrency: 3,
    autoStart: false,
    stopOnError: false
});

console.log('\n✅ Task system initialized\n');

// Create sample tasks with dependencies
console.log('📝 Creating tasks with dependencies...\n');

const task1 = taskManager.createTask({
    id: 'setup-database',
    title: 'Setup Database Schema',
    description: 'Create database tables and indexes',
    type: 'feature',
    priority: 10,
    complexity: 'moderate',
    estimated_effort: 30
});

const task2 = taskManager.createTask({
    id: 'create-api',
    title: 'Create API Endpoints',
    description: 'Build REST API endpoints',
    type: 'feature',
    priority: 8,
    complexity: 'complex',
    estimated_effort: 120
});

const task3 = taskManager.createTask({
    id: 'add-auth',
    title: 'Add Authentication',
    description: 'Implement JWT authentication',
    type: 'feature',
    priority: 9,
    complexity: 'complex',
    estimated_effort: 90
});

const task4 = taskManager.createTask({
    id: 'write-tests',
    title: 'Write Unit Tests',
    description: 'Create comprehensive test suite',
    type: 'test',
    priority: 7,
    complexity: 'simple',
    estimated_effort: 60
});

const task5 = taskManager.createTask({
    id: 'add-docs',
    title: 'Add Documentation',
    description: 'Write API documentation',
    type: 'doc',
    priority: 5,
    complexity: 'simple',
    estimated_effort: 45
});

console.log(`✓ Created ${task1.id}`);
console.log(`✓ Created ${task2.id}`);
console.log(`✓ Created ${task3.id}`);
console.log(`✓ Created ${task4.id}`);
console.log(`✓ Created ${task5.id}\n`);

// Add dependencies
console.log('🔗 Adding dependencies...\n');

taskManager.addDependency('create-api', 'setup-database', 'blocks');
taskManager.addDependency('add-auth', 'setup-database', 'blocks');
taskManager.addDependency('write-tests', 'create-api', 'blocks');
taskManager.addDependency('write-tests', 'add-auth', 'blocks');
taskManager.addDependency('add-docs', 'create-api', 'blocks');

console.log('✓ create-api depends on setup-database');
console.log('✓ add-auth depends on setup-database');
console.log('✓ write-tests depends on create-api and add-auth');
console.log('✓ add-docs depends on create-api\n');

// Show ready tasks
console.log('🎯 Ready to execute (no dependencies):\n');
const ready = taskManager.getReadyTasks();
ready.forEach(task => {
    console.log(`  - ${task.id}: ${task.title} (priority: ${task.priority})`);
});
console.log('');

// Show dependency order
console.log('📊 Execution Order (Topological Sort):\n');
try {
    const groups = resolver.getParallelGroups();
    groups.forEach((group, index) => {
        console.log(`  Level ${group.level}:`);
        group.tasks.forEach(task => {
            console.log(`    └─ ${task.id}: ${task.title}`);
        });
        if (group.canRunInParallel) {
            console.log(`    ⚡ Can run in parallel`);
        }
        console.log('');
    });
} catch (error) {
    console.error(`❌ Error: ${error.message}\n`);
}

// Show critical path
console.log('🎯 Critical Path (longest dependency chain):\n');
const criticalPath = resolver.getCriticalPath();
criticalPath.path.forEach((task, index) => {
    const arrow = index < criticalPath.path.length - 1 ? ' → ' : '';
    process.stdout.write(`${task.id}${arrow}`);
});
console.log(`\n  Total effort: ${criticalPath.totalEffort} minutes (${criticalPath.estimatedDuration})\n`);

// Validate dependency graph
console.log('✅ Validating dependency graph...\n');
const validation = resolver.validate();
if (validation.valid) {
    console.log('  ✓ No issues found\n');
} else {
    console.log('  ⚠️  Issues found:');
    validation.issues.forEach(issue => {
        console.log(`    - [${issue.type}] ${issue.message}`);
    });
    console.log('');
}

// Get task summary
console.log('📈 Task Summary:\n');
const summary = taskManager.getTaskSummary();
console.log(`  Total tasks: ${summary.total}`);
console.log(`  Ready to execute: ${summary.ready}`);
console.log(`\n  By Status:`);
summary.by_status.forEach(stat => {
    console.log(`    - ${stat.status}: ${stat.count}`);
});
console.log(`\n  By Type:`);
summary.by_type.forEach(stat => {
    console.log(`    - ${stat.type}: ${stat.count}`);
});
console.log('');

// Test task decomposition
console.log('🔨 Testing Task Decomposition...\n');
const subtasks = taskManager.decomposeTask('create-api', [
    {
        title: 'Create User Endpoints',
        description: 'GET, POST, PUT, DELETE for users',
        type: 'feature',
        complexity: 'moderate',
        estimated_effort: 40
    },
    {
        title: 'Create Product Endpoints',
        description: 'GET, POST, PUT, DELETE for products',
        type: 'feature',
        complexity: 'moderate',
        estimated_effort: 40
    },
    {
        title: 'Add API Validation',
        description: 'Request/response validation',
        type: 'feature',
        complexity: 'simple',
        estimated_effort: 20
    }
]);

console.log(`✓ Decomposed 'create-api' into ${subtasks.length} subtasks:`);
subtasks.forEach(task => {
    console.log(`  - ${task.id}: ${task.title}`);
});
console.log('');

// Test execution simulation
console.log('🚀 Simulating Task Execution...\n');

// Listen to events
executor.on('task:started', ({ task }) => {
    console.log(`  ▶️  Starting: ${task.id}`);
});

executor.on('task:completed', ({ task, duration }) => {
    console.log(`  ✅ Completed: ${task.id} (${Math.round(duration/1000)}s)`);
});

executor.on('task:execute', ({ task, complete }) => {
    // Simulate work
    setTimeout(() => {
        complete({ success: true, message: 'Task completed successfully' });
    }, Math.random() * 1000 + 500); // 0.5-1.5 seconds
});

(async () => {
    try {
        await executor.executeNext();
        
        console.log('\n📊 Execution Metrics:\n');
        const metrics = executor.getMetrics();
        console.log(`  Total executed: ${metrics.totalExecuted}`);
        console.log(`  Successful: ${metrics.successful}`);
        console.log(`  Failed: ${metrics.failed}`);
        console.log(`  Success rate: ${metrics.successRate}`);
        console.log(`  Average duration: ${metrics.averageDuration}`);
        console.log(`  Total duration: ${metrics.totalDuration}\n`);

        // Show updated summary
        const updatedSummary = taskManager.getTaskSummary();
        console.log('📈 Updated Task Summary:\n');
        console.log(`  Ready to execute: ${updatedSummary.ready}\n`);
        updatedSummary.by_status.forEach(stat => {
            console.log(`  - ${stat.status}: ${stat.count}`);
        });

        console.log('\n' + '='.repeat(60));
        console.log('✅ All tests completed successfully!');
        console.log('='.repeat(60) + '\n');

        // Clean up
        taskManager.close();
        
    } catch (error) {
        console.error(`\n❌ Error: ${error.message}\n`);
        process.exit(1);
    }
})();
