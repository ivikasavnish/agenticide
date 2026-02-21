#!/usr/bin/env node
const EnhancedInput = require('./agenticide-cli/core/enhancedInput');

async function main() {
    const input = new EnhancedInput();
    console.log('Chat test (type "exit" to quit)');
    
    while (true) {
        const userInput = await input.prompt('You:');
        
        if (userInput === 'exit') {
            console.log('Goodbye!');
            break;
        }
        
        console.log(`Bot: You said "${userInput}"`);
    }
    
    input.close();
    process.exit(0);
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
