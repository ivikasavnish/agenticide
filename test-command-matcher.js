#!/usr/bin/env node
// Test Command Matcher - Fuzzy command matching

const CommandMatcher = require('./agenticide-cli/core/commandMatcher');
const chalk = require('./agenticide-cli/node_modules/chalk');

console.log(chalk.cyan('╔════════════════════════════════════════════════════════════╗'));
console.log(chalk.cyan('║         Command Matcher - Test Suite                      ║'));
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
console.log('Phase 1: Initialization\n');

const matcher = new CommandMatcher();

test('Create CommandMatcher instance', () => {
    assert(matcher, 'Instance should be created');
    assert(matcher instanceof CommandMatcher, 'Should be instance of CommandMatcher');
});

test('Initialize default commands', () => {
    matcher.initializeDefaultCommands();
    assert(matcher.commands.size > 0, 'Should have commands registered');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 2: Command Registration\n');

test('Register command', () => {
    matcher.register('test', 'Test command', ['t']);
    assert(matcher.exists('test'), 'Command should exist');
    assert(matcher.exists('t'), 'Alias should exist');
});

test('Check default commands exist', () => {
    assert(matcher.exists('agent'), 'agent command should exist');
    assert(matcher.exists('status'), 'status command should exist');
    assert(matcher.exists('design'), 'design command should exist');
    assert(matcher.exists('skills'), 'skills command should exist');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 3: Exact Matching\n');

test('Exact match returns correct command', () => {
    const matches = matcher.findMatches('agent');
    assert(matches.length > 0, 'Should find matches');
    assert(matches[0].command === 'agent', 'Should match agent');
    assert(matches[0].score === 1.0, 'Score should be 1.0');
    assert(matches[0].type === 'exact', 'Type should be exact');
});

test('Alias exact match', () => {
    const matches = matcher.findMatches('stat');
    assert(matches.length > 0, 'Should find matches');
    assert(matches[0].command === 'status', 'Should match status');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 4: Fuzzy Matching\n');

test('Typo correction - agnet → agent', () => {
    const matches = matcher.findMatches('agnet');
    assert(matches.length > 0, 'Should find matches');
    assert(matches[0].command === 'agent', 'Should correct to agent');
    assert(matches[0].score > 0.5, 'Score should be reasonable');
});

test('Typo correction - desing → design', () => {
    const matches = matcher.findMatches('desing');
    assert(matches.length > 0, 'Should find matches');
    assert(matches[0].command === 'design', 'Should correct to design');
});

test('Partial match - des → design', () => {
    const matches = matcher.findMatches('des');
    assert(matches.length > 0, 'Should find matches');
    const hasDesign = matches.some(m => m.command === 'design');
    assert(hasDesign, 'Should include design in matches');
});

test('Prefix boost - sta → status (not tasks)', () => {
    const matches = matcher.findMatches('sta');
    assert(matches.length > 0, 'Should find matches');
    assert(matches[0].command === 'status', 'Prefix match should be first');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 5: Similarity Calculation\n');

test('Identical strings have similarity 1.0', () => {
    const sim = matcher.similarity('agent', 'agent');
    assert(sim === 1.0, `Similarity should be 1.0, got ${sim}`);
});

test('Completely different strings have low similarity', () => {
    const sim = matcher.similarity('agent', 'xyz');
    assert(sim < 0.5, `Similarity should be low, got ${sim}`);
});

test('One character difference has high similarity', () => {
    const sim = matcher.similarity('agent', 'agnet');
    assert(sim > 0.5, `Similarity should be reasonable, got ${sim}`);
});

test('Levenshtein distance calculation', () => {
    const dist = matcher.levenshteinDistance('kitten', 'sitting');
    assert(dist === 3, `Distance should be 3, got ${dist}`);
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 6: Suggestions\n');

test('Get suggestions for typo', () => {
    const suggestions = matcher.getSuggestions('implment');
    assert(suggestions.length > 0, 'Should have suggestions');
    assert(suggestions[0].command === 'implement', 'Should suggest implement');
});

test('Suggestions sorted by score', () => {
    const suggestions = matcher.getSuggestions('st');
    assert(suggestions.length > 0, 'Should have suggestions');
    
    // Check scores are descending
    for (let i = 1; i < suggestions.length; i++) {
        assert(
            suggestions[i - 1].score >= suggestions[i].score,
            'Scores should be descending'
        );
    }
});

test('No suggestions for completely wrong input', () => {
    const suggestions = matcher.getSuggestions('zzzzzzz');
    assert(suggestions.length === 0, 'Should have no suggestions');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 7: Command Listing\n');

test('Get all commands', () => {
    const allCommands = matcher.getAllCommands();
    assert(allCommands.length > 0, 'Should have commands');
    assert(Array.isArray(allCommands), 'Should be an array');
});

test('Commands are sorted', () => {
    const allCommands = matcher.getAllCommands();
    for (let i = 1; i < allCommands.length; i++) {
        assert(
            allCommands[i - 1].name <= allCommands[i].name,
            'Commands should be sorted alphabetically'
        );
    }
});

test('No duplicate commands in list', () => {
    const allCommands = matcher.getAllCommands();
    const names = allCommands.map(c => c.name);
    const uniqueNames = [...new Set(names)];
    assert(names.length === uniqueNames.length, 'Should have no duplicates');
});

console.log('═══════════════════════════════════════════════════════════\n');
console.log('Phase 8: Real-World Examples\n');

test('Common typos - staus → status', () => {
    const matches = matcher.findMatches('staus');
    assert(matches.length > 0 && matches[0].command === 'status', 'Should fix staus');
});

test('Common typos - hlep → help', () => {
    const matches = matcher.findMatches('hlep', 0.4); // Lower threshold for short words
    assert(matches.length > 0, 'Should find matches with lower threshold');
    const hasHelp = matches.some(m => m.command === 'help');
    assert(hasHelp, 'Should include help in matches');
});

test('Abbreviation - impl → implement', () => {
    const matches = matcher.findMatches('impl');
    assert(matches.length > 0, 'Should find impl');
    assert(matches[0].command === 'implement', 'Should match implement');
});

test('Similar commands - task vs tasks', () => {
    const matchTask = matcher.findMatches('task');
    const matchTasks = matcher.findMatches('tasks');
    assert(matchTask.length > 0, 'Should find task');
    assert(matchTasks.length > 0, 'Should find tasks');
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
    console.log(chalk.cyan('Command Matcher is ready for integration! 🎯\n'));
    console.log(chalk.gray('Example typos it can fix:'));
    console.log(chalk.white('  agnet → agent'));
    console.log(chalk.white('  desing → design'));
    console.log(chalk.white('  implment → implement'));
    console.log(chalk.white('  staus → status\n'));
    process.exit(0);
} else {
    console.log(chalk.red('═══════════════════════════════════════════════════════════\n'));
    console.log(chalk.red(`❌ ${failed} test(s) failed\n`));
    process.exit(1);
}
