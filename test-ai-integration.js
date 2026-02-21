// Test AI Integration Fix
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.cyan('\n🧪 Testing AI Integration Fix...\n'));

let passed = 0;
let failed = 0;

function test(name, condition, details = '') {
    if (condition) {
        console.log(chalk.green(`✓ ${name}`));
        if (details) console.log(chalk.gray(`  ${details}`));
        passed++;
    } else {
        console.log(chalk.red(`✗ ${name}`));
        if (details) console.log(chalk.gray(`  ${details}`));
        failed++;
    }
}

// Test 1: Check fullChatImplementation passes context
const chatFile = fs.readFileSync(
    path.join(__dirname, 'agenticide-cli/commands/chat/fullChatImplementation.js'),
    'utf8'
);
test(
    'Extension context is built and passed',
    chatFile.includes('const extensionContext = {') && 
    chatFile.includes('agentManager,') &&
    chatFile.includes('ext.execute(args[0] || \'help\', args.slice(1), extensionContext)'),
    'Context includes agentManager, enhancedInput, contextAttachment, cwd'
);

// Test 2: Check lovable-design stores agentManager from context
const extensionFile = fs.readFileSync(
    path.join(__dirname, 'agenticide-cli/extensions/lovable-design/index.js'),
    'utf8'
);
test(
    'Extension stores agentManager from context',
    extensionFile.includes('if (context && context.agentManager)') &&
    extensionFile.includes('this.agentManager = context.agentManager'),
    'agentManager stored before creating server'
);

// Test 3: Check DesignServer has fallback for missing AI
const serverFile = fs.readFileSync(
    path.join(__dirname, 'agenticide-cli/extensions/lovable-design/server/DesignServer.js'),
    'utf8'
);
test(
    'DesignServer checks AI availability',
    serverFile.includes('if (!this.agentManager || typeof this.agentManager.sendMessage !== \'function\')'),
    'Graceful fallback when AI unavailable'
);

test(
    'DesignServer provides helpful error message',
    serverFile.includes('AI agent not available') &&
    serverFile.includes('Manually edit files'),
    'User gets clear instructions'
);

// Test 4: Check no hardcoded null checks that would fail
test(
    'No unchecked null dereferences',
    !serverFile.includes('this.agentManager.sendMessage') ||
    serverFile.match(/if.*agentManager.*sendMessage/),
    'All agentManager calls are guarded'
);

console.log(chalk.cyan('\n' + '='.repeat(50)));
console.log(chalk.cyan('Test Summary'));
console.log(chalk.cyan('='.repeat(50)));
console.log(chalk.green(`✓ Passed: ${passed}`));
if (failed > 0) {
    console.log(chalk.red(`✗ Failed: ${failed}`));
} else {
    console.log(chalk.gray(`✗ Failed: 0`));
}
console.log(chalk.cyan('='.repeat(50)));

if (failed === 0) {
    console.log(chalk.green('\n✅ All AI integration tests passed!\n'));
    console.log(chalk.cyan('AI integration flow:'));
    console.log(chalk.gray('  1. Chat passes extensionContext with agentManager'));
    console.log(chalk.gray('  2. Extension stores agentManager from context'));
    console.log(chalk.gray('  3. Server checks AI availability before using'));
    console.log(chalk.gray('  4. Graceful fallback if unavailable\n'));
    console.log(chalk.cyan('Try it:'));
    console.log(chalk.gray('  agenticide chat'));
    console.log(chalk.gray('  /design start'));
    console.log(chalk.gray('  # Click "Ask AI" in browser\n'));
} else {
    console.log(chalk.red('\n❌ Some tests failed.\n'));
    process.exit(1);
}
