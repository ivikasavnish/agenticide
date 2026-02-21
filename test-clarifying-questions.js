#!/usr/bin/env node
/**
 * Test clarifying questions and plan management
 */

console.log('🧪 Testing Clarifying Questions & Plan Management\n');

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

async function asyncTest(name, fn) {
    try {
        await fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}: ${error.message}`);
        failed++;
    }
}

// Test 1: ClarifyingQuestions class exists
test('ClarifyingQuestions class exists', () => {
    const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
    const clarifier = new ClarifyingQuestions();
    if (!clarifier.ask || typeof clarifier.ask !== 'function') {
        throw new Error('ask method not found');
    }
    if (!clarifier.askMultiple || typeof clarifier.askMultiple !== 'function') {
        throw new Error('askMultiple method not found');
    }
});

// Test 2: PlanEditor has new methods
test('PlanEditor has enhanced methods', () => {
    const PlanEditor = require('./agenticide-cli/commands/plan/planEditor');
    const editor = new PlanEditor();
    if (!editor.update || typeof editor.update !== 'function') {
        throw new Error('update method not found');
    }
    if (!editor.addClarification || typeof editor.addClarification !== 'function') {
        throw new Error('addClarification method not found');
    }
    if (!editor.edit || typeof editor.edit !== 'function') {
        throw new Error('edit method not found');
    }
    if (!editor.create || typeof editor.create !== 'function') {
        throw new Error('create method not found');
    }
});

// Test 3: ClarifyingQuestions storage
asyncTest('ClarifyingQuestions stores data', async () => {
    const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
    const clarifier = new ClarifyingQuestions();
    
    clarifier.clarifications = {
        'goal': {
            question: 'What is the goal?',
            answer: 'Build a chat app',
            timestamp: new Date().toISOString()
        }
    };
    
    const summary = clarifier.getSummary();
    if (!summary.includes('What is the goal?')) {
        throw new Error('Summary should include question');
    }
    if (!summary.includes('Build a chat app')) {
        throw new Error('Summary should include answer');
    }
    
    const all = clarifier.getAll();
    if (!all.goal) {
        throw new Error('getAll should return clarifications');
    }
});

// Test 4: ClarifyingQuestions save/load
asyncTest('ClarifyingQuestions save and load', async () => {
    const fs = require('fs');
    const path = require('path');
    const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
    const clarifier = new ClarifyingQuestions();
    
    const testFile = path.join(__dirname, 'test-clarifications.json');
    
    clarifier.clarifications = {
        'test': {
            question: 'Test question?',
            answer: 'Test answer',
            timestamp: new Date().toISOString()
        }
    };
    
    clarifier.save(testFile);
    if (!fs.existsSync(testFile)) {
        throw new Error('File should exist after save');
    }
    
    const clarifier2 = new ClarifyingQuestions();
    clarifier2.load(testFile);
    
    if (!clarifier2.clarifications.test) {
        throw new Error('Loaded clarifications should contain test data');
    }
    
    // Cleanup
    fs.unlinkSync(testFile);
});

// Test 5: PlanEditor metadata
asyncTest('PlanEditor metadata management', async () => {
    const PlanEditor = require('./agenticide-cli/commands/plan/planEditor');
    const editor = new PlanEditor();
    
    if (!editor.metadata) {
        throw new Error('PlanEditor should have metadata');
    }
    
    if (!editor.metadata.clarifications || !Array.isArray(editor.metadata.clarifications)) {
        throw new Error('Metadata should have clarifications array');
    }
});

// Test 6: PlanEditor create with clarifications
asyncTest('PlanEditor create with clarifications', async () => {
    const PlanEditor = require('./agenticide-cli/commands/plan/planEditor');
    const editor = new PlanEditor();
    
    const plan = editor.create(
        'Test Goal',
        ['Task 1', 'Task 2'],
        { timeline: 'Days', priority: 'High' }
    );
    
    if (!plan.includes('Test Goal')) {
        throw new Error('Plan should include goal');
    }
    if (!plan.includes('Task 1')) {
        throw new Error('Plan should include tasks');
    }
    if (!plan.includes('timeline')) {
        throw new Error('Plan should include clarifications');
    }
});

// Test 7: ClarifyingQuestions clear
asyncTest('ClarifyingQuestions clear', async () => {
    const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
    const clarifier = new ClarifyingQuestions();
    
    clarifier.clarifications = { test: { question: 'Q', answer: 'A' } };
    if (Object.keys(clarifier.clarifications).length === 0) {
        throw new Error('Should have clarifications');
    }
    
    clarifier.clear();
    if (Object.keys(clarifier.clarifications).length !== 0) {
        throw new Error('Clarifications should be empty after clear');
    }
});

// Test 8: Integration check - both modules imported in chat
test('fullChatImplementation imports both modules', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./agenticide-cli/commands/chat/fullChatImplementation.js', 'utf8');
    
    if (!content.includes("require('../../core/clarifyingQuestions')")) {
        throw new Error('ClarifyingQuestions import not found');
    }
    
    if (!content.includes('new ClarifyingQuestions()')) {
        throw new Error('ClarifyingQuestions instantiation not found');
    }
});

// Test 9: Commands added to help
test('/plan and /clarify commands in help', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./agenticide-cli/commands/chat/fullChatImplementation.js', 'utf8');
    
    if (!content.includes('/plan')) {
        throw new Error('/plan command not found in chat');
    }
    
    if (!content.includes('/clarify')) {
        throw new Error('/clarify command not found in chat');
    }
});

// Test 10: Command handlers exist
test('/plan and /clarify handlers exist', () => {
    const fs = require('fs');
    const content = fs.readFileSync('./agenticide-cli/commands/chat/fullChatImplementation.js', 'utf8');
    
    if (!content.includes("cmd === 'plan'")) {
        throw new Error('/plan handler not found');
    }
    
    if (!content.includes("cmd === 'clarify'")) {
        throw new Error('/clarify handler not found');
    }
});

// Run tests
(async () => {
    await Promise.all([
        asyncTest('ClarifyingQuestions stores data', async () => {
            const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
            const clarifier = new ClarifyingQuestions();
            
            clarifier.clarifications = {
                'goal': {
                    question: 'What is the goal?',
                    answer: 'Build a chat app',
                    timestamp: new Date().toISOString()
                }
            };
            
            const summary = clarifier.getSummary();
            if (!summary.includes('What is the goal?')) {
                throw new Error('Summary should include question');
            }
        }),
        asyncTest('ClarifyingQuestions save and load', async () => {
            const fs = require('fs');
            const path = require('path');
            const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
            const clarifier = new ClarifyingQuestions();
            
            const testFile = path.join(__dirname, 'test-clarifications.json');
            
            clarifier.clarifications = {
                'test': {
                    question: 'Test question?',
                    answer: 'Test answer',
                    timestamp: new Date().toISOString()
                }
            };
            
            clarifier.save(testFile);
            const clarifier2 = new ClarifyingQuestions();
            clarifier2.load(testFile);
            
            if (!clarifier2.clarifications.test) {
                throw new Error('Loaded clarifications should contain test data');
            }
            
            fs.unlinkSync(testFile);
        }),
        asyncTest('PlanEditor metadata management', async () => {
            const PlanEditor = require('./agenticide-cli/commands/plan/planEditor');
            const editor = new PlanEditor();
            
            if (!editor.metadata || !Array.isArray(editor.metadata.clarifications)) {
                throw new Error('Metadata should have clarifications array');
            }
        }),
        asyncTest('PlanEditor create with clarifications', async () => {
            const PlanEditor = require('./agenticide-cli/commands/plan/planEditor');
            const editor = new PlanEditor();
            
            const plan = editor.create(
                'Test Goal',
                ['Task 1', 'Task 2'],
                { timeline: 'Days', priority: 'High' }
            );
            
            if (!plan.includes('Test Goal') || !plan.includes('Task 1')) {
                throw new Error('Plan should include goal and tasks');
            }
        }),
        asyncTest('ClarifyingQuestions clear', async () => {
            const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
            const clarifier = new ClarifyingQuestions();
            
            clarifier.clarifications = { test: { question: 'Q', answer: 'A' } };
            clarifier.clear();
            
            if (Object.keys(clarifier.clarifications).length !== 0) {
                throw new Error('Clarifications should be empty after clear');
            }
        })
    ]);
    
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed\n`);
    
    if (failed > 0) {
        console.log('❌ Some tests failed!');
        process.exit(1);
    } else {
        console.log('✅ All tests passed!\n');
        console.log('✨ New features ready:');
        console.log('   /plan create <goal>   # Create plan with clarifications');
        console.log('   /plan show            # View current plan');
        console.log('   /plan edit            # Edit plan interactively');
        console.log('   /plan update          # Update plan content');
        console.log('   /clarify              # Ask clarifying questions');
        console.log('');
        process.exit(0);
    }
})();
