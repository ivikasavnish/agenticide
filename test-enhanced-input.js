#!/usr/bin/env node
// Test Enhanced Input - Command History and Autocomplete

const EnhancedInput = require('./agenticide-cli/core/enhancedInput');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log('🧪 Testing Enhanced Input\n');

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

// Test 1: Class loads
test('EnhancedInput class loads', () => {
    if (typeof EnhancedInput !== 'function') {
        throw new Error('EnhancedInput is not a constructor');
    }
});

// Test 2: Instance creation
test('Can create EnhancedInput instance', () => {
    const testHistoryFile = `/tmp/test-history-${Date.now()}.json`;
    const input = new EnhancedInput(testHistoryFile);
    if (!input) throw new Error('Failed to create instance');
    
    // Cleanup
    if (fs.existsSync(testHistoryFile)) {
        fs.unlinkSync(testHistoryFile);
    }
});

// Test 3: History management
test('History management works', () => {
    const testHistoryFile = `/tmp/test-history-${Date.now()}.json`;
    const input = new EnhancedInput(testHistoryFile);
    
    input.addToHistory('command1');
    input.addToHistory('command2');
    input.addToHistory('command3');
    
    const length = input.getHistoryLength();
    if (length !== 3) {
        throw new Error(`Expected 3 commands, got ${length}`);
    }
    
    const recent = input.getRecentHistory(2);
    if (recent.length !== 2) {
        throw new Error(`Expected 2 recent, got ${recent.length}`);
    }
    if (recent[0] !== 'command3') {
        throw new Error(`Expected command3, got ${recent[0]}`);
    }
    
    // Cleanup
    if (fs.existsSync(testHistoryFile)) {
        fs.unlinkSync(testHistoryFile);
    }
});

// Test 4: History persistence
test('History persists to file', () => {
    const testHistoryFile = `/tmp/test-history-${Date.now()}.json`;
    const input1 = new EnhancedInput(testHistoryFile);
    
    input1.addToHistory('persistent1');
    input1.addToHistory('persistent2');
    input1.saveHistory();
    
    // Create new instance, should load saved history
    const input2 = new EnhancedInput(testHistoryFile);
    const length = input2.getHistoryLength();
    if (length !== 2) {
        throw new Error(`Expected 2 persisted commands, got ${length}`);
    }
    
    // Cleanup
    if (fs.existsSync(testHistoryFile)) {
        fs.unlinkSync(testHistoryFile);
    }
});

// Test 5: Duplicate filtering
test('Duplicate commands filtered', () => {
    const testHistoryFile = `/tmp/test-history-${Date.now()}.json`;
    const input = new EnhancedInput(testHistoryFile);
    
    input.addToHistory('same command');
    input.addToHistory('same command');
    input.addToHistory('different command');
    input.addToHistory('different command');
    
    const length = input.getHistoryLength();
    if (length !== 2) {
        throw new Error(`Expected 2 unique commands, got ${length}`);
    }
    
    // Cleanup
    if (fs.existsSync(testHistoryFile)) {
        fs.unlinkSync(testHistoryFile);
    }
});

// Test 6: Shell command completions
test('Shell command completions work', () => {
    const input = new EnhancedInput();
    
    const gitCompletions = input.getShellCompletions('!git');
    if (!gitCompletions.includes('git')) {
        throw new Error('git not in completions');
    }
    
    const npmCompletions = input.getShellCompletions('!npm');
    if (!npmCompletions.includes('npm')) {
        throw new Error('npm not in completions');
    }
});

// Test 7: File path completions
test('File path completions work', () => {
    const input = new EnhancedInput();
    
    // Create test directory structure
    const testDir = `/tmp/test-files-${Date.now()}`;
    fs.mkdirSync(testDir);
    fs.writeFileSync(path.join(testDir, 'test1.txt'), '');
    fs.writeFileSync(path.join(testDir, 'test2.txt'), '');
    fs.mkdirSync(path.join(testDir, 'subdir'));
    
    // Change to test dir
    const originalCwd = process.cwd();
    process.chdir(testDir);
    
    try {
        const completions = input.getFileCompletions('@test');
        if (completions.length === 0) {
            throw new Error('No file completions found');
        }
        if (!completions.some(c => c.includes('test1.txt'))) {
            throw new Error('test1.txt not in completions');
        }
    } finally {
        // Restore and cleanup
        process.chdir(originalCwd);
        fs.rmSync(testDir, { recursive: true });
    }
});

// Test 8: Agenticide command completions
test('Agenticide command completions work', () => {
    const input = new EnhancedInput();
    
    const completions = input.getCompletionsSync('/st');
    if (!completions.includes('/status')) {
        throw new Error('/status not in completions');
    }
    if (!completions.includes('/stub')) {
        throw new Error('/stub not in completions');
    }
    
    const taskCompletions = input.getCompletionsSync('/task');
    if (!taskCompletions.includes('/tasks')) {
        throw new Error('/tasks not in completions');
    }
});

// Test 9: Empty input handling
test('Empty input handled correctly', () => {
    const testHistoryFile = `/tmp/test-history-${Date.now()}.json`;
    const input = new EnhancedInput(testHistoryFile);
    
    input.addToHistory('');
    input.addToHistory('   ');
    input.addToHistory('valid');
    
    const length = input.getHistoryLength();
    if (length !== 1) {
        throw new Error(`Expected 1 command (empty filtered), got ${length}`);
    }
    
    // Cleanup
    if (fs.existsSync(testHistoryFile)) {
        fs.unlinkSync(testHistoryFile);
    }
});

// Test 10: History limit
test('History limited to 500 commands', () => {
    const testHistoryFile = `/tmp/test-history-${Date.now()}.json`;
    const input = new EnhancedInput(testHistoryFile);
    
    // Add 600 commands
    for (let i = 0; i < 600; i++) {
        input.addToHistory(`command${i}`);
    }
    
    input.saveHistory();
    
    // Reload and check
    const input2 = new EnhancedInput(testHistoryFile);
    const length = input2.getHistoryLength();
    if (length > 500) {
        throw new Error(`Expected max 500 commands, got ${length}`);
    }
    
    // Cleanup
    if (fs.existsSync(testHistoryFile)) {
        fs.unlinkSync(testHistoryFile);
    }
});

// Test 11: Help text
test('Help text available', () => {
    const input = new EnhancedInput();
    const helpText = input.getHelpText();
    
    if (!helpText.includes('arrows')) {
        throw new Error('Help text missing arrows info');
    }
    if (!helpText.includes('Tab')) {
        throw new Error('Help text missing Tab info');
    }
});

// Test 12: Clear history
test('Clear history works', () => {
    const testHistoryFile = `/tmp/test-history-${Date.now()}.json`;
    const input = new EnhancedInput(testHistoryFile);
    
    input.addToHistory('command1');
    input.addToHistory('command2');
    input.clearHistory();
    
    const length = input.getHistoryLength();
    if (length !== 0) {
        throw new Error(`Expected 0 commands after clear, got ${length}`);
    }
    
    // Cleanup
    if (fs.existsSync(testHistoryFile)) {
        fs.unlinkSync(testHistoryFile);
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
    console.log('   You: <type command>');
    console.log('   You: ↑  (navigate history)');
    console.log('   You: <Tab>  (autocomplete)');
    console.log('   You: /history  (view history)\n');
}
