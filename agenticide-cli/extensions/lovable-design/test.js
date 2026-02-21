#!/usr/bin/env node
// Test Lovable Design Extension

const chalk = require('../../node_modules/chalk');
const path = require('path');

console.log(chalk.cyan('╔════════════════════════════════════════════════════════════╗'));
console.log(chalk.cyan('║         Lovable Design Extension - Test Suite            ║'));
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

// Test 1: Load extension
const LovableDesignExtension = require('./index.js');
test('Load extension module', () => {
    assert(LovableDesignExtension, 'Module should load');
    assert(typeof LovableDesignExtension === 'function', 'Should be a class');
});

// Test 2: Load server
const DesignServer = require('./server/DesignServer.js');
test('Load DesignServer module', () => {
    assert(DesignServer, 'Module should load');
    assert(typeof DesignServer === 'function', 'Should be a class');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 2: Extension Instantiation\n');

const extension = new LovableDesignExtension();

test('Create extension instance', () => {
    assert(extension, 'Instance should be created');
    assert(extension instanceof LovableDesignExtension, 'Should be instance of LovableDesignExtension');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 3: Extension Properties\n');

test('Check extension name', () => {
    assert(extension.name === 'lovable-design', 'Name should be lovable-design');
});

test('Check extension description', () => {
    assert(extension.description, 'Description should exist');
    assert(extension.description.includes('AI'), 'Description should mention AI');
});

test('Check extension commands', () => {
    assert(Array.isArray(extension.commands), 'Commands should be an array');
    assert(extension.commands.includes('design'), 'Should include design command');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 4: Extension Methods\n');

test('Check required methods', () => {
    assert(typeof extension.init === 'function', 'init should exist');
    assert(typeof extension.execute === 'function', 'execute should exist');
    assert(typeof extension.startServer === 'function', 'startServer should exist');
    assert(typeof extension.stopServer === 'function', 'stopServer should exist');
    assert(typeof extension.getStatus === 'function', 'getStatus should exist');
    assert(typeof extension.showHelp === 'function', 'showHelp should exist');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 5: Server Instantiation\n');

// Mock AI agent manager
const mockAgentManager = {
    sendMessage: async (prompt) => {
        return `<!-- HTML -->
<div>Mock response</div>

/* CSS */
.mock { color: blue; }

// JavaScript
console.log('mock');`;
    }
};

const server = new DesignServer(mockAgentManager, {
    port: 9999,
    autoOpen: false,
    workDir: path.join(__dirname, '.test-lovable')
});

test('Create server instance', () => {
    assert(server, 'Server instance should be created');
    assert(server instanceof DesignServer, 'Should be instance of DesignServer');
});

test('Check server properties', () => {
    assert(server.port === 9999, 'Port should be set');
    assert(server.autoOpen === false, 'autoOpen should be false');
    assert(server.workDir, 'workDir should exist');
});

test('Check server methods', () => {
    assert(typeof server.start === 'function', 'start should exist');
    assert(typeof server.stop === 'function', 'stop should exist');
    assert(typeof server.loadDesign === 'function', 'loadDesign should exist');
    assert(typeof server.updateDesign === 'function', 'updateDesign should exist');
    assert(typeof server.handleAIRequest === 'function', 'handleAIRequest should exist');
    assert(typeof server.parseAIResponse === 'function', 'parseAIResponse should exist');
    assert(typeof server.broadcast === 'function', 'broadcast should exist');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 6: AI Response Parsing\n');

const testResponse = `Here is the updated design:

<!-- HTML -->
<div class="container">
    <h1>Hello World</h1>
    <button>Click Me</button>
</div>

/* CSS */
.container {
    padding: 20px;
    background: #f0f0f0;
}

button {
    padding: 10px 20px;
    background: blue;
    color: white;
}

// JavaScript
document.querySelector('button').addEventListener('click', () => {
    alert('Hello!');
});`;

test('Parse AI response', () => {
    const parsed = server.parseAIResponse(testResponse);
    assert(parsed.html, 'HTML should be parsed');
    assert(parsed.css, 'CSS should be parsed');
    assert(parsed.js, 'JS should be parsed');
    assert(parsed.html.includes('Hello World'), 'HTML content should be correct');
    assert(parsed.css.includes('container'), 'CSS content should be correct');
    assert(parsed.js.includes('addEventListener'), 'JS content should be correct');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 7: File Operations\n');

test('Initialize default files', () => {
    server.initializeDefaultFiles();
    const fs = require('fs');
    assert(fs.existsSync(server.workDir), 'Work directory should exist');
    assert(fs.existsSync(path.join(server.workDir, 'index.html')), 'index.html should exist');
    assert(fs.existsSync(path.join(server.workDir, 'styles.css')), 'styles.css should exist');
    assert(fs.existsSync(path.join(server.workDir, 'script.js')), 'script.js should exist');
});

test('Load design', () => {
    const design = server.loadDesign();
    assert(design.html, 'Should load HTML');
    assert(design.css, 'Should load CSS');
    assert(design.js, 'Should load JS');
    assert(design.html.includes('html'), 'HTML should have content');
});

test('Update design', () => {
    server.updateDesign({
        html: '<div>Test</div>',
        css: '.test { color: red; }',
        js: 'console.log("test");'
    });
    
    const design = server.loadDesign();
    assert(design.html.includes('Test'), 'HTML should be updated');
    assert(design.css.includes('test'), 'CSS should be updated');
    assert(design.js.includes('test'), 'JS should be updated');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 8: Extension Commands\n');

test('Help command', () => {
    const result = extension.showHelp();
    assert(result.success === true, 'Help should succeed');
});

test('Status command (server not running)', () => {
    const result = extension.getStatus();
    assert(result.running === false, 'Server should not be running');
});

test('Parse options', () => {
    const port = extension.parseOption(['--port', '8080'], '--port', 3456);
    assert(port === 8080, 'Port should be parsed');
    
    const dir = extension.parseOption(['--dir', '/tmp'], '--dir', '.');
    assert(dir === '/tmp', 'Dir should be parsed');
    
    const defaultPort = extension.parseOption([], '--port', 3456);
    assert(defaultPort === 3456, 'Default should be used');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 9: Console Buffer\n');

test('Handle console logs', () => {
    server.handleConsoleLog({
        level: 'log',
        message: 'Test log'
    });
    
    assert(server.consoleBuffer.length > 0, 'Console buffer should have entries');
    assert(server.consoleBuffer[server.consoleBuffer.length - 1].message === 'Test log', 'Log message should match');
});

test('Console buffer limit', () => {
    // Add 105 entries
    for (let i = 0; i < 105; i++) {
        server.handleConsoleLog({
            level: 'log',
            message: `Log ${i}`
        });
    }
    
    assert(server.consoleBuffer.length <= 100, 'Buffer should be limited to 100 entries');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 10: Cleanup\n');

test('Cleanup test files', () => {
    const fs = require('fs');
    const rimraf = (dir) => {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    };
    rimraf(server.workDir);
    assert(!fs.existsSync(server.workDir), 'Test directory should be removed');
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
    console.log(chalk.cyan('Lovable Design Extension is ready! 🎨\n'));
    console.log(chalk.gray('Try it:'));
    console.log(chalk.white('  agenticide chat'));
    console.log(chalk.white('  /design start\n'));
    process.exit(0);
} else {
    console.log(chalk.red('═══════════════════════════════════════════════════════════\n'));
    console.log(chalk.red(`❌ ${failed} test(s) failed\n`));
    process.exit(1);
}
