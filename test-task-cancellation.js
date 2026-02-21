#!/usr/bin/env node
// Test Task Cancellation with ESC key support

const TaskCancellation = require('./agenticide-cli/core/taskCancellation');
const ora = require('./agenticide-cli/node_modules/ora');
const chalk = require('./agenticide-cli/node_modules/chalk');

console.log(chalk.cyan('╔════════════════════════════════════════════════════════════╗'));
console.log(chalk.cyan('║         Task Cancellation - Test Suite                    ║'));
console.log(chalk.cyan('╚════════════════════════════════════════════════════════════╝\n'));

let passed = 0;
let failed = 0;

function test(name, fn) {
    process.stdout.write(`▶ Testing: ${name}\n`);
    try {
        fn();
        console.log(chalk.green(`  ✓ PASS: ${name}\n`));
        passed++;
    } catch (error) {
        console.log(chalk.red(`  ✗ FAIL: ${name}`));
        console.log(chalk.red(`    ${error.message}\n`));
        failed++;
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 1: Module Loading\n');

// Test 1: Load module
test('Load TaskCancellation module', () => {
    assert(TaskCancellation, 'Module should load');
    assert(typeof TaskCancellation === 'function', 'Should be a class');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 2: Instantiation\n');

const cancellation = new TaskCancellation();

// Test 2: Instantiation
test('Create TaskCancellation instance', () => {
    assert(cancellation, 'Instance should be created');
    assert(cancellation instanceof TaskCancellation, 'Should be instance of TaskCancellation');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 3: Method Existence\n');

// Test 3: Methods exist
test('Check required methods exist', () => {
    assert(typeof cancellation.startListening === 'function', 'startListening should exist');
    assert(typeof cancellation.stopListening === 'function', 'stopListening should exist');
    assert(typeof cancellation.requestCancel === 'function', 'requestCancel should exist');
    assert(typeof cancellation.isCancelRequested === 'function', 'isCancelRequested should exist');
    assert(typeof cancellation.reset === 'function', 'reset should exist');
    assert(typeof cancellation.onCancel === 'function', 'onCancel should exist');
    assert(typeof cancellation.withCancellation === 'function', 'withCancellation should exist');
    assert(typeof cancellation.createCancelableSpinner === 'function', 'createCancelableSpinner should exist');
    assert(typeof cancellation.showHint === 'function', 'showHint should exist');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 4: Initial State\n');

// Test 4: Initial state
test('Check initial state', () => {
    assert(cancellation.cancelRequested === false, 'cancelRequested should be false');
    assert(cancellation.currentTask === null, 'currentTask should be null');
    assert(cancellation.isCancelRequested() === false, 'isCancelRequested() should return false');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 5: Cancellation Logic\n');

// Test 5: Request cancellation
test('Request cancellation', () => {
    cancellation.currentTask = 'Test Task';
    cancellation.requestCancel();
    assert(cancellation.isCancelRequested() === true, 'Should be canceled');
    cancellation.reset();
});

// Test 6: Reset cancellation
test('Reset cancellation state', () => {
    cancellation.currentTask = 'Test Task';
    cancellation.requestCancel();
    assert(cancellation.isCancelRequested() === true, 'Should be canceled before reset');
    
    cancellation.reset();
    assert(cancellation.isCancelRequested() === false, 'Should not be canceled after reset');
    assert(cancellation.currentTask === null, 'currentTask should be null after reset');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 6: Cleanup Functions\n');

// Test 7: Cleanup registration
test('Register cleanup function', () => {
    let cleanupRan = false;
    cancellation.onCancel(() => {
        cleanupRan = true;
    });
    
    assert(cancellation.cleanupFns.length === 1, 'Should have 1 cleanup function');
    
    cancellation.currentTask = 'Test';
    cancellation.requestCancel();
    
    assert(cleanupRan === true, 'Cleanup function should run');
    cancellation.reset();
});

// Test 8: Multiple cleanup functions
test('Register multiple cleanup functions', () => {
    let count = 0;
    cancellation.onCancel(() => count++);
    cancellation.onCancel(() => count++);
    cancellation.onCancel(() => count++);
    
    assert(cancellation.cleanupFns.length === 3, 'Should have 3 cleanup functions');
    
    cancellation.currentTask = 'Test';
    cancellation.requestCancel();
    
    assert(count === 3, 'All cleanup functions should run');
    cancellation.reset();
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 7: Async Task Wrapping\n');

// Test 9: Successful task completion
test('Complete task without cancellation', async () => {
    const result = await cancellation.withCancellation(
        'Test Task',
        async (isCanceled) => {
            await new Promise(resolve => setTimeout(resolve, 10));
            return 'success';
        }
    );
    
    assert(result.canceled === false, 'Should not be canceled');
    assert(result.result === 'success', 'Should return result');
});

// Test 10: Simulate cancellation
test('Simulate task cancellation', async () => {
    const result = await cancellation.withCancellation(
        'Test Task',
        async (isCanceled) => {
            // Simulate immediate cancellation
            cancellation.requestCancel();
            
            if (isCanceled()) {
                return null;
            }
            return 'should not reach';
        }
    );
    
    assert(result.canceled === true, 'Should be canceled');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 8: Spinner Integration\n');

// Test 11: Create cancelable spinner
test('Create cancelable spinner', () => {
    const spinner = cancellation.createCancelableSpinner(ora, 'Test task', 'Test');
    
    assert(spinner, 'Spinner should be created');
    assert(typeof spinner.stop === 'function', 'Spinner should have stop method');
    assert(typeof spinner.succeed === 'function', 'Spinner should have succeed method');
    assert(typeof spinner.fail === 'function', 'Spinner should have fail method');
    
    spinner.stop();
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 9: UI Elements\n');

// Test 12: Show hint
test('Show hint message', () => {
    const hint = cancellation.showHint();
    assert(typeof hint === 'string', 'Hint should be a string');
    assert(hint.includes('ESC'), 'Hint should mention ESC');
    assert(hint.includes('Ctrl+C'), 'Hint should mention Ctrl+C');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 10: Edge Cases\n');

// Test 13: Double cancellation
test('Handle double cancellation', () => {
    cancellation.currentTask = 'Test';
    cancellation.requestCancel();
    const firstState = cancellation.isCancelRequested();
    
    cancellation.requestCancel(); // Second call
    const secondState = cancellation.isCancelRequested();
    
    assert(firstState === secondState, 'State should remain same');
    cancellation.reset();
});

// Test 14: Cancel without task
test('Cancel without active task', () => {
    cancellation.reset();
    cancellation.requestCancel();
    assert(cancellation.isCancelRequested() === false, 'Should not cancel without task');
});

// Test 15: Cleanup with errors
test('Handle cleanup function errors', () => {
    let cleanupRan = false;
    
    cancellation.onCancel(() => {
        throw new Error('Cleanup error');
    });
    
    cancellation.onCancel(() => {
        cleanupRan = true;
    });
    
    cancellation.currentTask = 'Test';
    cancellation.requestCancel();
    
    assert(cleanupRan === true, 'Other cleanup functions should still run');
    cancellation.reset();
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log(chalk.cyan('╔════════════════════════════════════════════════════════════╗'));
console.log(chalk.cyan('║                    TEST SUMMARY                           ║'));
console.log(chalk.cyan('╚════════════════════════════════════════════════════════════╝\n'));

console.log(`Total Tests: ${passed + failed}`);
console.log(chalk.green(`✓ Passed: ${passed}`));
console.log(chalk.red(`✗ Failed: ${failed}\n`));

if (failed === 0) {
    console.log(chalk.green('═══════════════════════════════════════════════════════════\n'));
    console.log(chalk.green('✅ All tests passed!\n'));
    console.log(chalk.cyan('Task Cancellation is ready for integration! 🚀\n'));
    process.exit(0);
} else {
    console.log(chalk.red('═══════════════════════════════════════════════════════════\n'));
    console.log(chalk.red(`❌ ${failed} test(s) failed\n`));
    process.exit(1);
}
