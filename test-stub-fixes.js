#!/usr/bin/env node
// Test script to verify stubGenerator path fixes and task creation

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Stub Generator Fixes\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
        failed++;
    }
}

// Test 1: Verify stubGenerator is exported correctly
test('StubGenerator exports correctly', () => {
    const { StubGenerator } = require('./agenticide-cli/stubGenerator');
    if (!StubGenerator) throw new Error('StubGenerator not exported');
    if (typeof StubGenerator !== 'function') throw new Error('StubGenerator is not a class/function');
});

// Test 2: Verify fullChatImplementation can import stubGenerator
test('fullChatImplementation can import stubGenerator', () => {
    // Check the require path in fullChatImplementation
    const chatImpl = fs.readFileSync('./agenticide-cli/commands/chat/fullChatImplementation.js', 'utf8');
    const hasCorrectPath = chatImpl.includes("require('../../stubGenerator')");
    if (!hasCorrectPath) {
        throw new Error('fullChatImplementation has wrong stubGenerator import path');
    }
});

// Test 3: Verify TaskTracker is exported and imported correctly
test('TaskTracker exports correctly', () => {
    const { TaskTracker } = require('./agenticide-cli/taskTracker');
    if (!TaskTracker) throw new Error('TaskTracker not exported');
    if (typeof TaskTracker !== 'function') throw new Error('TaskTracker is not a class/function');
});

// Test 4: Verify loadTasks code has correct format
test('loadTasks code has correct format', () => {
    const indexPath = path.join(__dirname, 'agenticide-cli', 'index.js');
    const indexCode = fs.readFileSync(indexPath, 'utf8');
    if (!indexCode.includes('{ modules: [], tasks: [] }')) {
        throw new Error('loadTasks does not return proper object format');
    }
});

// Test 5: Test StubGenerator.detectStubs with Rust code
test('detectStubs finds Rust unimplemented! macros', () => {
    const { StubGenerator } = require('./agenticide-cli/stubGenerator');
    const stubGen = new StubGenerator(null);
    
    // Create test file
    const testFile = '/tmp/test_rust_stub.rs';
    fs.writeFileSync(testFile, `
pub fn test_function() -> Result<()> {
    unimplemented!("test_function")
}

pub fn another_function() {
    unimplemented!("another_function")
}
    `);
    
    const stubs = stubGen.detectStubs(testFile);
    fs.unlinkSync(testFile);
    
    if (stubs.length !== 2) {
        throw new Error(`Expected 2 stubs, found ${stubs.length}`);
    }
    if (!stubs.some(s => s.name === 'test_function')) {
        throw new Error('test_function stub not detected');
    }
    if (!stubs.some(s => s.name === 'another_function')) {
        throw new Error('another_function stub not detected');
    }
});

// Test 6: Test TaskTracker.createStubTasks
test('TaskTracker.createStubTasks creates tasks', () => {
    const { TaskTracker } = require('./agenticide-cli/taskTracker');
    const testDir = '/tmp/agenticide-test-' + Date.now();
    fs.mkdirSync(testDir);
    
    const tracker = new TaskTracker(testDir);
    const files = [{
        path: '/tmp/test.rs',
        stubs: 3,
        stubList: [
            { name: 'func1', line: 1, implemented: false },
            { name: 'func2', line: 5, implemented: false },
            { name: 'func3', line: 10, implemented: false }
        ]
    }];
    
    const result = tracker.createStubTasks('test_module', files, {
        type: 'service',
        language: 'rust'
    });
    
    if (result.totalTasks !== 3) {
        throw new Error(`Expected 3 tasks, got ${result.totalTasks}`);
    }
    
    // Verify file was written
    const taskFile = path.join(testDir, '.agenticide-tasks.json');
    if (!fs.existsSync(taskFile)) {
        throw new Error('Task file not created');
    }
    
    const data = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
    if (!data.modules || data.modules.length !== 1) {
        throw new Error('Module not created in task file');
    }
    if (!data.tasks || data.tasks.length !== 3) {
        throw new Error('Tasks not created in task file');
    }
    
    // Cleanup
    fs.unlinkSync(taskFile);
    fs.rmdirSync(testDir);
});

// Test 7: Test StubGenerator._executePlan creates stubList
test('StubGenerator plan execution includes stubList', () => {
    const { StubGenerator } = require('./agenticide-cli/stubGenerator');
    const code = fs.readFileSync('./agenticide-cli/stubGenerator.js', 'utf8');
    
    // Check that _executePlan adds stubList to created files
    if (!code.includes('stubList: stubs')) {
        throw new Error('_executePlan does not add stubList to files');
    }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    console.log('❌ Some tests failed\n');
    process.exit(1);
} else {
    console.log('✅ All tests passed!\n');
    console.log('✨ Ready to use:');
    console.log('   agenticide chat');
    console.log('   You: /stub mymodule rust');
    console.log('   You: /verify mymodule');
    console.log('   You: /implement function_name\n');
}
