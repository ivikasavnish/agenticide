// Test readline issue
const EnhancedInput = require('./agenticide-cli/core/enhancedInput');

async function test() {
    const input = new EnhancedInput('/tmp/test-history.json');
    
    console.log('Test 1: First prompt...');
    const answer1 = await input.prompt('Test1:');
    console.log('Got:', answer1);
    
    console.log('\nTest 2: Second prompt (should not freeze)...');
    const answer2 = await input.prompt('Test2:');
    console.log('Got:', answer2);
    
    console.log('\nTest 3: Third prompt...');
    const answer3 = await input.prompt('Test3:');
    console.log('Got:', answer3);
    
    input.close();
    console.log('\n✅ No freeze! All prompts worked.');
    process.exit(0);
}

test();
