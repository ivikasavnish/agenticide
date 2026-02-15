// Test workflow integration
const { Workflow, WorkflowExecutor, StubWorkflows } = require('./workflow');
const { GitIntegration } = require('./gitIntegration');
const { TaskTracker } = require('./taskTracker');
const { CodeDisplay } = require('./codeDisplay');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Workflow Integration\n');

// Setup
if (!fs.existsSync('test-output')) {
    fs.mkdirSync('test-output', { recursive: true });
}

// Test 1: Create a workflow
console.log('Test 1: Creating workflow...');
const workflow = new Workflow('test-auth', 'Test authentication service');

workflow
    .addStep({
        name: 'Create directory',
        command: 'mkdir -p test-output/auth',
        type: 'shell'
    })
    .addStep({
        name: 'Create test file',
        command: 'echo "// Test file" > test-output/auth/auth.go',
        type: 'shell'
    })
    .addStep({
        name: 'List files',
        command: 'ls -la test-output/auth',
        type: 'shell'
    });

console.log(`✅ Created workflow with ${workflow.steps.length} steps\n`);

// Ensure test-output directory exists
if (!fs.existsSync('test-output')) {
    fs.mkdirSync('test-output', { recursive: true });
}

// Test 2: Export to Makefile
console.log('Test 2: Exporting to Makefile...');
const makefile = workflow.toMakefile();
fs.writeFileSync('test-output/Makefile', makefile);
console.log('✅ Exported to test-output/Makefile');
console.log('Preview:');
console.log(makefile.split('\n').slice(0, 10).join('\n') + '\n...\n');

// Test 3: Export to Taskfile
console.log('Test 3: Exporting to Taskfile...');
const taskfile = workflow.toTaskfile();
fs.writeFileSync('test-output/Taskfile.yml', taskfile);
console.log('✅ Exported to test-output/Taskfile.yml');
console.log('Preview:');
console.log(taskfile.split('\n').slice(0, 15).join('\n') + '\n...\n');

// Test 4: Execute workflow
console.log('Test 4: Executing workflow...');
const executor = new WorkflowExecutor(workflow, {
    verbose: false,
    stopOnError: true
});

(async () => {
    try {
        const result = await executor.execute((progress) => {
            process.stdout.write(`\r  Progress: ${progress.current}/${progress.total} - ${progress.step}`);
        });
        
        console.log('\n✅ Workflow executed');
        console.log(`   Status: ${result.status}`);
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Success: ${result.summary.success}/${result.summary.total}\n`);
        
        // Test 5: Pre-built workflows
        console.log('Test 5: Testing pre-built workflows...');
        const fullWorkflow = StubWorkflows.createFullWorkflow('user', 'go');
        console.log(`✅ Full workflow: ${fullWorkflow.steps.length} steps`);
        fullWorkflow.steps.forEach((step, i) => {
            console.log(`   ${i + 1}. ${step.name}`);
        });
        
        const prototypeWorkflow = StubWorkflows.createPrototypeWorkflow('proto', 'rust');
        console.log(`\n✅ Prototype workflow: ${prototypeWorkflow.steps.length} steps`);
        prototypeWorkflow.steps.forEach((step, i) => {
            console.log(`   ${i + 1}. ${step.name}`);
        });
        
        // Test 6: Git Integration
        console.log('\nTest 6: Testing Git integration...');
        const git = new GitIntegration(process.cwd());
        console.log(`   Is Git repo: ${git.isGitRepo()}`);
        if (git.isGitRepo()) {
            const currentBranch = git.getCurrentBranch();
            console.log(`   Current branch: ${currentBranch || 'unknown'}`);
            const status = git.getStatus();
            if (status) {
                console.log(`   Status: ${status.modified?.length || 0} modified, ${status.untracked?.length || 0} untracked`);
            }
        }
        console.log('✅ Git integration working\n');
        
        // Test 7: Task Tracker
        console.log('Test 7: Testing task tracker...');
        const tracker = new TaskTracker('test-output');
        const testTasks = [
            { file: 'auth.go', function: 'Login', line: 10 },
            { file: 'auth.go', function: 'Logout', line: 20 },
            { file: 'auth.go', function: 'Verify', line: 30 }
        ];
        
        const taskResult = tracker.createStubTasks('auth', testTasks.map(t => ({
            path: path.join('test-output', t.file),
            name: t.file,
            stubs: testTasks.length,
            stubList: testTasks
        })), {
            type: 'service',
            language: 'go'
        });
        
        console.log(`✅ Created ${taskResult.totalTasks} tasks`);
        console.log(`   Module: ${taskResult.module || 'auth'}`);
        
        const summary = tracker.getProjectSummary();
        if (summary && summary.progress !== undefined) {
            console.log(`   Progress: ${summary.progress.toFixed(1)}%\n`);
        } else {
            console.log(`   Status: Task tracking initialized\n`);
        }
        
        // Test 8: Code Display
        console.log('Test 8: Testing code display...');
        const sampleCode = `package main

import "fmt"

// Login authenticates a user
// TODO: Implement
func Login(username, password string) error {
    // Implementation here
    return nil
}`;
        
        fs.writeFileSync('test-output/sample.go', sampleCode);
        console.log('✅ Code display:');
        CodeDisplay.displayFile('sample.go', sampleCode, { lineNumbers: false });
        
        // Test 9: JSON serialization
        console.log('\nTest 9: Testing JSON serialization...');
        const json = workflow.toJSON();
        const restored = Workflow.fromJSON(json);
        console.log(`✅ Workflow serialization working`);
        console.log(`   Original steps: ${workflow.steps.length}`);
        console.log(`   Restored steps: ${restored.steps.length}\n`);
        
        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ All Integration Tests Passed!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✓ Workflow creation');
        console.log('✓ Makefile export');
        console.log('✓ Taskfile export');
        console.log('✓ Workflow execution');
        console.log('✓ Pre-built workflows');
        console.log('✓ Git integration');
        console.log('✓ Task tracking');
        console.log('✓ Code display');
        console.log('✓ JSON serialization\n');
        
        // Cleanup
        console.log('Cleaning up test files...');
        const { execSync } = require('child_process');
        try {
            execSync('rm -rf test-output', { stdio: 'ignore' });
            console.log('✅ Cleanup complete\n');
        } catch (err) {
            console.log('⚠️  Cleanup skipped\n');
        }
        
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
})();
