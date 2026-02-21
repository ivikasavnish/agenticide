// Test Design Server Fixes
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

console.log(chalk.cyan('\n🔧 Testing Design Server Fixes...\n'));

const serverPath = path.join(__dirname, 'agenticide-cli/extensions/lovable-design/server/DesignServer.js');
const content = fs.readFileSync(serverPath, 'utf8');

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

// Test 1: Check iframe sandbox is secure
test(
    'Iframe sandbox is secure (no allow-same-origin)',
    content.includes('sandbox="allow-scripts"') && !content.includes('allow-same-origin'),
    'Only allow-scripts, no allow-same-origin'
);

// Test 2: No template literal syntax errors in loadDesign
const loadDesignMatch = content.match(/function loadDesign\(design\)([\s\S]*?)}\s*$/m);
const loadDesignCode = loadDesignMatch ? loadDesignMatch[1] : '';
test(
    'loadDesign uses string concatenation (no template literals)',
    !loadDesignCode.includes('`') && !loadDesignCode.includes('\\${'),
    'No template literals that could cause syntax errors'
);

// Test 3: Check console entry uses string concat
test(
    'addConsoleEntry uses string concatenation',
    content.includes("entry.className = 'console-entry console-' + data.level"),
    'No template literals in console entry'
);

// Test 4: Check export function is fixed
test(
    'exportDesign blob creation is fixed',
    content.includes("'<!-- HTML -->\\\\n' + design.html + '\\\\n\\\\n' +"),
    'Single concatenated string for blob'
);

// Test 5: Check requestAI function exists
test(
    'requestAI function is defined',
    content.includes('async function requestAI()') || content.includes('function requestAI()'),
    'Function defined in global scope'
);

// Test 6: Check toggleConsole function exists
test(
    'toggleConsole function is defined',
    content.includes('function toggleConsole()'),
    'Function defined for toolbar button'
);

// Test 7: Check exportDesign function exists
test(
    'exportDesign function is defined',
    content.includes('async function exportDesign()') || content.includes('function exportDesign()'),
    'Function defined for toolbar button'
);

// Test 8: No unsafe eval or Function constructor
test(
    'No eval() or Function() constructor',
    !content.includes('eval(') && !content.match(/new\s+Function\(/),
    'No dynamic code execution'
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
    console.log(chalk.green('\n✅ All tests passed! Design server is ready.\n'));
    console.log(chalk.cyan('Try it:'));
    console.log(chalk.gray('  agenticide chat'));
    console.log(chalk.gray('  /design start\n'));
} else {
    console.log(chalk.red('\n❌ Some tests failed. Check the issues above.\n'));
    process.exit(1);
}
