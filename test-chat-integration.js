// Quick integration test for chat command
console.log('🧪 Testing Chat Integration\n');

// Test 1: Check that fullChatImplementation has EnhancedInput
const fs = require('fs');
const chatCode = fs.readFileSync('./agenticide-cli/commands/chat/fullChatImplementation.js', 'utf8');

let passed = 0;
let failed = 0;

function test(name, condition) {
    if (condition) {
        console.log(`✅ ${name}`);
        passed++;
    } else {
        console.log(`❌ ${name}`);
        failed++;
    }
}

test('EnhancedInput is imported', chatCode.includes("require('../../core/enhancedInput')"));
test('EnhancedInput is instantiated', chatCode.includes('new EnhancedInput()'));
test('enhancedInput.prompt() is used', chatCode.includes('enhancedInput.prompt('));
test('enhancedInput.close() is called', chatCode.includes('enhancedInput.close()'));
test('/history command exists', chatCode.includes("cmd === 'history'"));
test('Help text is shown', chatCode.includes('getHelpText()'));
test('try-finally block exists', chatCode.includes('} finally {'));

// Test 2: Check EnhancedInput class exists
try {
    const EnhancedInput = require('./agenticide-cli/core/enhancedInput');
    test('EnhancedInput class loads', typeof EnhancedInput === 'function');
    
    const input = new EnhancedInput();
    test('EnhancedInput can be instantiated', !!input);
    test('prompt method exists', typeof input.prompt === 'function');
    test('close method exists', typeof input.close === 'function');
    test('showHistory method exists', typeof input.showHistory === 'function');
    test('getHelpText method exists', typeof input.getHelpText === 'function');
} catch (error) {
    console.log(`❌ EnhancedInput class error: ${error.message}`);
    failed++;
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed === 0) {
    console.log('✅ All integration checks passed!\n');
    console.log('🎉 Ready to use:');
    console.log('   agenticide chat');
    console.log('   You: ↑/↓  - Navigate history');
    console.log('   You: <Tab> - Autocomplete');
    console.log('   You: /history - View history\n');
    process.exit(0);
} else {
    console.log('❌ Some checks failed\n');
    process.exit(1);
}
