#!/usr/bin/env node
/**
 * Quick integration test for plan updates
 */

const PlanEditor = require('./agenticide-cli/commands/plan/planEditor');
const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');

console.log('🧪 Testing Plan Update Workflow\n');

// Test 1: Create plan with clarifications
console.log('1️⃣ Creating plan with clarifications...');
const editor = new PlanEditor();
const plan = editor.create(
    'Build REST API',
    ['Setup Express', 'Create routes', 'Add validation'],
    { timeline: '1 week', tech: 'Node.js' }
);
console.log('✅ Plan created\n');

// Test 2: Show plan
console.log('2️⃣ Showing plan...');
editor.show();
console.log('');

// Test 3: Add clarification
console.log('3️⃣ Adding clarification...');
editor.addClarification('Database?', 'Use MongoDB');
console.log('✅ Clarification added\n');

// Test 4: Add task
console.log('4️⃣ Adding task...');
editor.add('Write tests');
console.log('');

// Test 5: Show updated plan
console.log('5️⃣ Showing updated plan...');
editor.show();
console.log('');

console.log('✅ All integration tests passed!');
console.log('\n✨ Ready to use:');
console.log('   agenticide chat');
console.log('   You: /plan create <goal>');
console.log('   You: /clarify');
