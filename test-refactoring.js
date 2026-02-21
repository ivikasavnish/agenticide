#!/usr/bin/env node
/**
 * Test refactored chat handlers
 */

console.log('🧪 Testing Refactored Chat Handlers\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        failed++;
    }
}

// Test 1: All handler files exist
test('All handler files exist', () => {
    const fs = require('fs');
    const handlers = [
        './agenticide-cli/commands/chat/handlers/agentHandlers.js',
        './agenticide-cli/commands/chat/handlers/planHandlers.js',
        './agenticide-cli/commands/chat/handlers/sessionHandlers.js',
        './agenticide-cli/commands/chat/handlers/cacheHandlers.js',
        './agenticide-cli/commands/chat/handlers/taskHandlers.js',
        './agenticide-cli/commands/chat/handlers/extensionHandlers.js',
        './agenticide-cli/commands/chat/handlers/commandRouter.js'
    ];
    
    handlers.forEach(h => {
        if (!fs.existsSync(h)) {
            throw new Error(`Missing file: ${h}`);
        }
    });
});

// Test 2: Help menu exists
test('Help menu module exists', () => {
    const fs = require('fs');
    if (!fs.existsSync('./agenticide-cli/commands/chat/helpMenu.js')) {
        throw new Error('helpMenu.js not found');
    }
});

// Test 3: AgentHandlers can be required
test('AgentHandlers module loads', () => {
    const AgentHandlers = require('./agenticide-cli/commands/chat/handlers/agentHandlers');
    if (typeof AgentHandlers !== 'function') {
        throw new Error('AgentHandlers is not a class');
    }
});

// Test 4: PlanHandlers can be required
test('PlanHandlers module loads', () => {
    const PlanHandlers = require('./agenticide-cli/commands/chat/handlers/planHandlers');
    if (typeof PlanHandlers !== 'function') {
        throw new Error('PlanHandlers is not a class');
    }
});

// Test 5: CommandRouter can be required
test('CommandRouter module loads', () => {
    const CommandRouter = require('./agenticide-cli/commands/chat/handlers/commandRouter');
    if (typeof CommandRouter !== 'function') {
        throw new Error('CommandRouter is not a class');
    }
});

// Test 6: HelpMenu can be required
test('HelpMenu module loads', () => {
    const HelpMenu = require('./agenticide-cli/commands/chat/helpMenu');
    if (typeof HelpMenu !== 'function') {
        throw new Error('HelpMenu is not a class');
    }
});

// Test 7: AgentHandlers has required methods
test('AgentHandlers has required methods', () => {
    const AgentHandlers = require('./agenticide-cli/commands/chat/handlers/agentHandlers');
    const mockManager = { listAgents: () => ({}), switchAgent: async () => ({ success: true }) };
    const handler = new AgentHandlers(mockManager);
    
    if (typeof handler.handleAgent !== 'function') {
        throw new Error('handleAgent method not found');
    }
    if (typeof handler.handleModel !== 'function') {
        throw new Error('handleModel method not found');
    }
    if (typeof handler.handleStatus !== 'function') {
        throw new Error('handleStatus method not found');
    }
});

// Test 8: PlanHandlers has required methods
test('PlanHandlers has required methods', () => {
    const PlanHandlers = require('./agenticide-cli/commands/chat/handlers/planHandlers');
    const mockClarifier = { askMultiple: async () => ({}), input: async () => '', choose: async () => '' };
    const handler = new PlanHandlers(mockClarifier);
    
    if (typeof handler.handlePlan !== 'function') {
        throw new Error('handlePlan method not found');
    }
    if (typeof handler.handleClarify !== 'function') {
        throw new Error('handleClarify method not found');
    }
});

// Test 9: CommandRouter can be instantiated
test('CommandRouter can be instantiated', () => {
    const CommandRouter = require('./agenticide-cli/commands/chat/handlers/commandRouter');
    
    const mockDeps = {
        agentManager: { listAgents: () => ({}) },
        sessionManager: { listSessions: () => [] },
        extensionManager: { listExtensions: () => [] },
        clarifier: { askMultiple: async () => ({}) },
        loadTasks: () => ({ tasks: [] }),
        projectContext: null,
        enhancedInput: { showHistory: () => {} }
    };
    
    const router = new CommandRouter(mockDeps);
    if (typeof router.route !== 'function') {
        throw new Error('route method not found');
    }
});

// Test 10: File sizes are reasonable
test('Handler files are appropriately sized', () => {
    const fs = require('fs');
    const handlers = {
        'agentHandlers.js': 100,
        'planHandlers.js': 200,
        'sessionHandlers.js': 150,
        'cacheHandlers.js': 100,
        'taskHandlers.js': 150,
        'extensionHandlers.js': 200,
        'commandRouter.js': 300
    };
    
    for (const [file, maxLines] of Object.entries(handlers)) {
        const path = `./agenticide-cli/commands/chat/handlers/${file}`;
        const content = fs.readFileSync(path, 'utf8');
        const lines = content.split('\n').length;
        
        if (lines > maxLines) {
            throw new Error(`${file} has ${lines} lines, expected max ${maxLines}`);
        }
    }
});

console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
    console.log('❌ Some tests failed!');
    process.exit(1);
} else {
    console.log('✅ All refactoring tests passed!\n');
    console.log('✨ Refactored structure:');
    console.log('   agenticide-cli/commands/chat/');
    console.log('   ├── fullChatImplementation.js');
    console.log('   ├── helpMenu.js');
    console.log('   └── handlers/');
    console.log('       ├── agentHandlers.js');
    console.log('       ├── planHandlers.js');
    console.log('       ├── sessionHandlers.js');
    console.log('       ├── cacheHandlers.js');
    console.log('       ├── taskHandlers.js');
    console.log('       ├── extensionHandlers.js');
    console.log('       └── commandRouter.js');
    console.log('');
    console.log('📦 Total: 8 modules, ~737 lines (handlers + help)');
    console.log('📉 Reduced from: 1590 lines in single file');
    console.log('✅ Improvement: Better organized, easier to maintain');
    process.exit(0);
}
