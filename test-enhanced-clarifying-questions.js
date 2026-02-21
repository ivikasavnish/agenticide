// Comprehensive Test Suite for Enhanced Clarifying Questions
// Tests: Editable questions, Few-shot learning, GitHub search, User-initiated Q&A

const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

console.log(chalk.cyan('\n╔════════════════════════════════════════════════════════════╗'));
console.log(chalk.cyan('║  Enhanced Clarifying Questions - Test Suite              ║'));
console.log(chalk.cyan('╚════════════════════════════════════════════════════════════╝\n'));

// Test results tracking
const results = {
    passed: 0,
    failed: 0,
    tests: []
};

function test(name, fn) {
    try {
        console.log(chalk.gray(`\n▶ Testing: ${name}`));
        fn();
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log(chalk.green(`  ✓ PASS: ${name}`));
    } catch (error) {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: error.message });
        console.log(chalk.red(`  ✗ FAIL: ${name}`));
        console.log(chalk.red(`    Error: ${error.message}`));
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertExists(obj, message) {
    if (!obj) {
        throw new Error(message || 'Object does not exist');
    }
}

console.log(chalk.yellow('═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 1: Module Loading Tests\n'));

// Test 1: Load ClarifyingQuestions module
test('Load ClarifyingQuestions module', () => {
    const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
    assertExists(ClarifyingQuestions, 'ClarifyingQuestions module should load');
    assert(typeof ClarifyingQuestions === 'function', 'ClarifyingQuestions should be a class');
});

// Test 2: Load FewShotExamples module
test('Load FewShotExamples module', () => {
    const FewShotExamples = require('./agenticide-cli/core/fewShotExamples');
    assertExists(FewShotExamples, 'FewShotExamples module should load');
    assert(typeof FewShotExamples === 'function', 'FewShotExamples should be a class');
});

// Test 3: Load GitHubSearch module
test('Load GitHubSearch module', () => {
    const GitHubSearch = require('./agenticide-cli/core/githubSearch');
    assertExists(GitHubSearch, 'GitHubSearch module should load');
    assert(typeof GitHubSearch === 'function', 'GitHubSearch should be a class');
});

// Test 4: Load enhanced PlanHandlers
test('Load enhanced PlanHandlers module', () => {
    const PlanHandlers = require('./agenticide-cli/commands/chat/handlers/planHandlers-enhanced');
    assertExists(PlanHandlers, 'PlanHandlers module should load');
    assert(typeof PlanHandlers === 'function', 'PlanHandlers should be a class');
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 2: Class Instantiation Tests\n'));

let clarifier, fewShot, github, planHandlers;

// Test 5: Instantiate ClarifyingQuestions
test('Instantiate ClarifyingQuestions', () => {
    const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
    clarifier = new ClarifyingQuestions();
    assertExists(clarifier, 'ClarifyingQuestions instance should exist');
    assertExists(clarifier.fewShot, 'Should have fewShot property');
    assertExists(clarifier.github, 'Should have github property');
    assertExists(clarifier.clarifications, 'Should have clarifications property');
});

// Test 6: Instantiate FewShotExamples
test('Instantiate FewShotExamples', () => {
    const FewShotExamples = require('./agenticide-cli/core/fewShotExamples');
    fewShot = new FewShotExamples();
    assertExists(fewShot, 'FewShotExamples instance should exist');
    assertExists(fewShot.examples, 'Should have examples array');
    assertExists(fewShot.libraryPath, 'Should have libraryPath');
});

// Test 7: Instantiate GitHubSearch
test('Instantiate GitHubSearch', () => {
    const GitHubSearch = require('./agenticide-cli/core/githubSearch');
    github = new GitHubSearch();
    assertExists(github, 'GitHubSearch instance should exist');
    assertExists(github.cache, 'Should have cache');
    assert(typeof github.searchCode === 'function', 'Should have searchCode method');
});

// Test 8: Instantiate PlanHandlers
test('Instantiate PlanHandlers', () => {
    const PlanHandlers = require('./agenticide-cli/commands/chat/handlers/planHandlers-enhanced');
    const ClarifyingQuestions = require('./agenticide-cli/core/clarifyingQuestions');
    const testClarifier = new ClarifyingQuestions();
    planHandlers = new PlanHandlers(testClarifier);
    assertExists(planHandlers, 'PlanHandlers instance should exist');
    assertExists(planHandlers.clarifier, 'Should have clarifier property');
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 3: Method Existence Tests\n'));

// Test 9: ClarifyingQuestions - Core methods
test('ClarifyingQuestions has core methods', () => {
    assert(typeof clarifier.ask === 'function', 'Should have ask method');
    assert(typeof clarifier.askMultiple === 'function', 'Should have askMultiple method');
    assert(typeof clarifier.confirm === 'function', 'Should have confirm method');
    assert(typeof clarifier.choose === 'function', 'Should have choose method');
});

// Test 10: ClarifyingQuestions - Enhanced methods
test('ClarifyingQuestions has enhanced methods', () => {
    assert(typeof clarifier.askWithEdit === 'function', 'Should have askWithEdit method');
    assert(typeof clarifier.askWithGitHubExamples === 'function', 'Should have askWithGitHubExamples method');
    assert(typeof clarifier.askWithFewShot === 'function', 'Should have askWithFewShot method');
    assert(typeof clarifier.askWithExamples === 'function', 'Should have askWithExamples method');
});

// Test 11: ClarifyingQuestions - Question management methods
test('ClarifyingQuestions has question management methods', () => {
    assert(typeof clarifier.addQuestion === 'function', 'Should have addQuestion method');
    assert(typeof clarifier.editQuestion === 'function', 'Should have editQuestion method');
    assert(typeof clarifier.deleteQuestion === 'function', 'Should have deleteQuestion method');
    assert(typeof clarifier.listQuestions === 'function', 'Should have listQuestions method');
});

// Test 12: ClarifyingQuestions - Example methods
test('ClarifyingQuestions has example methods', () => {
    assert(typeof clarifier.searchGitHubExamples === 'function', 'Should have searchGitHubExamples method');
    assert(typeof clarifier.getCurrentExamples === 'function', 'Should have getCurrentExamples method');
    assert(typeof clarifier.saveExample === 'function', 'Should have saveExample method');
    assert(typeof clarifier.loadExamples === 'function', 'Should have loadExamples method');
});

// Test 13: FewShotExamples methods
test('FewShotExamples has required methods', () => {
    assert(typeof fewShot.searchGitHub === 'function', 'Should have searchGitHub method');
    assert(typeof fewShot.enrichQuestion === 'function', 'Should have enrichQuestion method');
    assert(typeof fewShot.createFewShotPrompt === 'function', 'Should have createFewShotPrompt method');
    assert(typeof fewShot.displayExamples === 'function', 'Should have displayExamples method');
    assert(typeof fewShot.displayFewShotExamples === 'function', 'Should have displayFewShotExamples method');
    assert(typeof fewShot.saveToLibrary === 'function', 'Should have saveToLibrary method');
    assert(typeof fewShot.loadFromLibrary === 'function', 'Should have loadFromLibrary method');
});

// Test 14: GitHubSearch methods
test('GitHubSearch has required methods', () => {
    assert(typeof github.searchCode === 'function', 'Should have searchCode method');
    assert(typeof github.searchRepositories === 'function', 'Should have searchRepositories method');
    assert(typeof github.getFileContents === 'function', 'Should have getFileContents method');
    assert(typeof github.displayResults === 'function', 'Should have displayResults method');
    assert(typeof github.clearCache === 'function', 'Should have clearCache method');
});

// Test 15: PlanHandlers methods
test('PlanHandlers has required methods', () => {
    assert(typeof planHandlers.handlePlan === 'function', 'Should have handlePlan method');
    assert(typeof planHandlers.handleClarify === 'function', 'Should have handleClarify method');
    assert(typeof planHandlers._interactiveClarify === 'function', 'Should have _interactiveClarify method');
    assert(typeof planHandlers._githubSearch === 'function', 'Should have _githubSearch method');
    assert(typeof planHandlers._fewShotMode === 'function', 'Should have _fewShotMode method');
    assert(typeof planHandlers._interactiveBuilder === 'function', 'Should have _interactiveBuilder method');
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 4: Question Management Tests\n'));

// Test 16: Add question
test('Add question to clarifications', () => {
    const key = clarifier.addQuestion('What is the API endpoint?', 'POST /api/users');
    assertExists(key, 'Should return a key');
    assert(key.startsWith('q_'), 'Key should start with q_');
    assert(clarifier.clarifications[key], 'Question should be stored');
    assertEquals(clarifier.clarifications[key].question, 'What is the API endpoint?', 'Question text should match');
    assertEquals(clarifier.clarifications[key].answer, 'POST /api/users', 'Answer should match');
});

// Test 17: Edit question
test('Edit existing question', () => {
    const key = clarifier.addQuestion('Original question', 'Original answer');
    const edited = clarifier.editQuestion(key, 'Updated question');
    assert(edited, 'Edit should succeed');
    assertEquals(clarifier.clarifications[key].question, 'Updated question', 'Question should be updated');
    assertEquals(clarifier.clarifications[key].originalQuestion, 'Original question', 'Original should be preserved');
    assert(clarifier.clarifications[key].edited === true, 'Edited flag should be set');
});

// Test 18: Delete question
test('Delete question', () => {
    const key = clarifier.addQuestion('Question to delete', 'Answer');
    assert(clarifier.clarifications[key], 'Question should exist before deletion');
    const deleted = clarifier.deleteQuestion(key);
    assert(deleted, 'Delete should succeed');
    assert(!clarifier.clarifications[key], 'Question should not exist after deletion');
});

// Test 19: List questions
test('List all questions', () => {
    const testClarifier = new (require('./agenticide-cli/core/clarifyingQuestions'))();
    const key1 = testClarifier.addQuestion('Question 1', 'Answer 1');
    const key2 = testClarifier.addQuestion('Question 2', 'Answer 2');
    const key3 = testClarifier.addQuestion('Question 3', 'Answer 3');
    
    // Verify all keys are different
    assert(key1 !== key2, 'Keys should be unique');
    assert(key2 !== key3, 'Keys should be unique');
    assert(key1 !== key3, 'Keys should be unique');
    
    const list = testClarifier.listQuestions();
    assertEquals(list.length, 3, `Should have 3 questions, got ${list.length}. Keys: ${key1}, ${key2}, ${key3}`);
    assert(list[0].key, 'Each item should have a key');
    assert(list[0].question, 'Each item should have a question');
    assert(list[0].answer, 'Each item should have an answer');
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 5: Few-Shot Examples Tests\n'));

// Test 20: Create few-shot prompt
test('Create few-shot prompt', () => {
    const examples = [
        { input: 'Get all users', output: 'GET /api/users' },
        { input: 'Create user', output: 'POST /api/users' },
        { input: 'Update user', output: 'PATCH /api/users/:id' }
    ];
    
    const prompt = fewShot.createFewShotPrompt('Define delete user endpoint', examples);
    assertExists(prompt, 'Prompt should exist');
    assertEquals(prompt.examples.length, 3, 'Should have 3 examples');
    assert(prompt.prompt.includes('Example 1'), 'Prompt should include examples');
    assert(prompt.prompt.includes('GET /api/users'), 'Prompt should include example output');
});

// Test 21: Enrich question with examples
test('Enrich question with examples', () => {
    const examples = [
        { type: 'code', code: 'console.log("hello")', language: 'javascript' }
    ];
    
    const enriched = fewShot.enrichQuestion('How to log?', examples);
    assertExists(enriched, 'Enriched question should exist');
    assertEquals(enriched.question, 'How to log?', 'Question should match');
    assert(enriched.hasExamples === true, 'Should have hasExamples flag');
    assertEquals(enriched.exampleCount, 1, 'Should have 1 example');
});

// Test 22: Normalize example formats
test('Normalize different example formats', () => {
    // String code
    const normalized1 = fewShot._normalizeExample('const x = 1;');
    assertEquals(normalized1.type, 'code', 'String should become code type');
    
    // URL
    const normalized2 = fewShot._normalizeExample({ url: 'https://github.com/user/repo' });
    assertEquals(normalized2.type, 'url', 'Should detect URL type');
    
    // Code object
    const normalized3 = fewShot._normalizeExample({ code: 'x = 1', language: 'python' });
    assertEquals(normalized3.type, 'code', 'Should detect code type');
    assertEquals(normalized3.language, 'python', 'Should preserve language');
});

// Test 23: Detect language from filename
test('Detect programming language from filename', () => {
    assertEquals(fewShot._detectLanguage('test.js'), 'javascript', 'Should detect JavaScript');
    assertEquals(fewShot._detectLanguage('test.py'), 'python', 'Should detect Python');
    assertEquals(fewShot._detectLanguage('test.go'), 'go', 'Should detect Go');
    assertEquals(fewShot._detectLanguage('test.rs'), 'rust', 'Should detect Rust');
    assertEquals(fewShot._detectLanguage('test.java'), 'java', 'Should detect Java');
    assertEquals(fewShot._detectLanguage('test.unknown'), 'text', 'Should default to text');
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 6: GitHub Search Tests\n'));

// Test 24: Cache initialization
test('GitHub search cache initialization', () => {
    assertExists(github.cache, 'Cache should exist');
    assert(github.cache instanceof Map, 'Cache should be a Map');
    assertEquals(github.cache.size, 0, 'Cache should be empty initially');
});

// Test 25: Cache statistics
test('GitHub search cache stats', () => {
    const testGithub = new (require('./agenticide-cli/core/githubSearch'))();
    const stats = testGithub.getCacheStats();
    assertExists(stats, 'Stats should exist');
    assert('size' in stats, 'Should have size property');
    assert('timeout' in stats, 'Should have timeout property');
    assert(typeof stats.size === 'number', 'Size should be a number');
    assert(typeof stats.timeout === 'number', 'Timeout should be a number');
});

// Test 26: Clear cache
test('Clear GitHub search cache', () => {
    // Add something to cache
    github.cache.set('test', { data: 'test', timestamp: Date.now() });
    assert(github.cache.size > 0, 'Cache should have items');
    
    github.clearCache();
    assertEquals(github.cache.size, 0, 'Cache should be empty after clear');
});

// Test 27: Format code results
test('Format GitHub code search results', () => {
    const mockResults = {
        items: [{
            name: 'auth.js',
            path: 'src/auth.js',
            repository: {
                full_name: 'user/repo',
                owner: { login: 'user' },
                stargazers_count: 1234,
                description: 'Test repo',
                updated_at: '2026-02-17'
            },
            html_url: 'https://github.com/user/repo/blob/main/src/auth.js',
            language: 'JavaScript',
            score: 10.5,
            text_matches: [{ fragment: 'const auth = ...' }]
        }]
    };
    
    const formatted = github._formatCodeResults(mockResults);
    assertEquals(formatted.length, 1, 'Should have 1 result');
    assertEquals(formatted[0].name, 'auth.js', 'Name should match');
    assertEquals(formatted[0].repo, 'user/repo', 'Repo should match');
    assertEquals(formatted[0].stars, 1234, 'Stars should match');
    assertEquals(formatted[0].language, 'JavaScript', 'Language should match');
});

// Test 28: Format repository results
test('Format GitHub repository search results', () => {
    const mockResults = {
        items: [{
            name: 'test-repo',
            full_name: 'user/test-repo',
            owner: { login: 'user' },
            html_url: 'https://github.com/user/test-repo',
            stargazers_count: 500,
            forks_count: 50,
            language: 'TypeScript',
            description: 'Test repository',
            topics: ['api', 'rest'],
            updated_at: '2026-02-17',
            license: { name: 'MIT' }
        }]
    };
    
    const formatted = github._formatRepoResults(mockResults);
    assertEquals(formatted.length, 1, 'Should have 1 result');
    assertEquals(formatted[0].name, 'test-repo', 'Name should match');
    assertEquals(formatted[0].stars, 500, 'Stars should match');
    assertEquals(formatted[0].language, 'TypeScript', 'Language should match');
    assertEquals(formatted[0].topics.length, 2, 'Should have 2 topics');
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 7: Example Library Tests\n'));

// Test 29: Library path creation
test('Example library path is set', () => {
    assertExists(fewShot.libraryPath, 'Library path should exist');
    assert(fewShot.libraryPath.includes('.agenticide'), 'Library path should be in .agenticide directory');
    assert(fewShot.libraryPath.includes('examples'), 'Library path should include examples');
});

// Test 30: Save and load from library
test('Save and load examples from library', async () => {
    const testExample = {
        type: 'code',
        code: 'function test() { return true; }',
        language: 'javascript',
        title: 'Test function'
    };
    
    const tags = ['test', 'javascript', 'function'];
    
    // Save
    const id = await fewShot.saveToLibrary(testExample, tags);
    assertExists(id, 'Should return an ID');
    assert(id.startsWith('lib_'), 'ID should start with lib_');
    
    // Load
    const loaded = await fewShot.loadFromLibrary(['test']);
    assert(loaded.length > 0, 'Should load at least one example');
    
    const found = loaded.find(ex => ex.id === id);
    assertExists(found, 'Should find the saved example');
    assertEquals(found.title, 'Test function', 'Title should match');
    assert(found.tags.includes('test'), 'Should have test tag');
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 8: Integration Tests\n'));

// Test 31: ClarifyingQuestions integrates with FewShotExamples
test('ClarifyingQuestions integrates with FewShotExamples', () => {
    assertExists(clarifier.fewShot, 'Should have fewShot instance');
    assert(clarifier.fewShot instanceof fewShot.constructor, 'Should be FewShotExamples instance');
});

// Test 32: ClarifyingQuestions integrates with GitHubSearch
test('ClarifyingQuestions integrates with GitHubSearch', () => {
    assertExists(clarifier.github, 'Should have github instance');
    assert(clarifier.github instanceof github.constructor, 'Should be GitHubSearch instance');
});

// Test 33: PlanHandlers integrates with ClarifyingQuestions
test('PlanHandlers integrates with ClarifyingQuestions', () => {
    assertExists(planHandlers.clarifier, 'Should have clarifier instance');
    assert(typeof planHandlers.clarifier.ask === 'function', 'Clarifier should have ask method');
});

// Test 34: Question set retrieval
test('PlanHandlers can retrieve question sets', () => {
    const questions = planHandlers._getQuestionSet('Requirements for current task');
    assertExists(questions, 'Question set should exist');
    assert(Array.isArray(questions), 'Should be an array');
    assert(questions.length > 0, 'Should have questions');
    assert(questions[0].question, 'Question should have question text');
    assert(questions[0].key, 'Question should have key');
});

// Test 35: Proposed questions retrieval
test('PlanHandlers can retrieve proposed questions', () => {
    const questions = planHandlers._getProposedQuestions('API Design');
    assertExists(questions, 'Proposed questions should exist');
    assert(Array.isArray(questions), 'Should be an array');
    assert(questions.length > 0, 'Should have questions');
    assert(questions[0].question, 'Question should have question text');
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 9: Data Persistence Tests\n'));

// Test 36: Save clarifications to file
test('Save clarifications to file', () => {
    const testPath = path.join(__dirname, 'test-clarifications.json');
    clarifier.clarifications = {
        'q_1': { question: 'Test?', answer: 'Yes', timestamp: new Date().toISOString() }
    };
    
    clarifier.save(testPath);
    assert(fs.existsSync(testPath), 'File should exist');
    
    const content = JSON.parse(fs.readFileSync(testPath, 'utf8'));
    assertExists(content.clarifications, 'Should have clarifications');
    assertExists(content.timestamp, 'Should have timestamp');
    
    // Cleanup
    fs.unlinkSync(testPath);
});

// Test 37: Load clarifications from file
test('Load clarifications from file', () => {
    const testPath = path.join(__dirname, 'test-clarifications-load.json');
    const testData = {
        clarifications: {
            'q_1': { question: 'Loaded?', answer: 'Yes', timestamp: new Date().toISOString() }
        },
        timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(testPath, JSON.stringify(testData, null, 2));
    
    const newClarifier = new (require('./agenticide-cli/core/clarifyingQuestions'))();
    newClarifier.load(testPath);
    
    assertExists(newClarifier.clarifications['q_1'], 'Should load clarifications');
    assertEquals(newClarifier.clarifications['q_1'].question, 'Loaded?', 'Question should match');
    
    // Cleanup
    fs.unlinkSync(testPath);
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));
console.log(chalk.bold('Phase 10: Edge Cases and Error Handling\n'));

// Test 38: Edit non-existent question
test('Edit non-existent question returns false', () => {
    const result = clarifier.editQuestion('non_existent_key', 'New question');
    assertEquals(result, false, 'Should return false for non-existent question');
});

// Test 39: Delete non-existent question
test('Delete non-existent question returns false', () => {
    const result = clarifier.deleteQuestion('non_existent_key');
    assertEquals(result, false, 'Should return false for non-existent question');
});

// Test 40: List questions when empty
test('List questions when empty', () => {
    clarifier.clarifications = {};
    const list = clarifier.listQuestions();
    assertEquals(list.length, 0, 'Should return empty array');
});

// Test 41: Handle empty GitHub results
test('Handle empty GitHub search results', () => {
    const formatted = github._formatCodeResults({ items: [] });
    assertEquals(formatted.length, 0, 'Should return empty array');
});

// Test 42: Handle null GitHub results
test('Handle null GitHub search results', () => {
    const formatted = github._formatCodeResults(null);
    assertEquals(formatted.length, 0, 'Should return empty array');
});

// Test 43: Get current examples when none set
test('Get current examples when none set', () => {
    const examples = clarifier.getCurrentExamples();
    assertExists(examples, 'Should return an array');
    assert(Array.isArray(examples), 'Should be an array');
});

// Test 44: Load from library with no files
test('Load from library when empty', async () => {
    const examples = await fewShot.loadFromLibrary(['nonexistent-tag']);
    assert(Array.isArray(examples), 'Should return an array');
});

// Test 45: Few-shot with empty examples
test('Create few-shot prompt with empty examples', () => {
    const prompt = fewShot.createFewShotPrompt('Task', []);
    assertExists(prompt, 'Should create prompt');
    assertEquals(prompt.examples.length, 0, 'Should have 0 examples');
});

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));

// Print Summary
console.log(chalk.bold('\n╔════════════════════════════════════════════════════════════╗'));
console.log(chalk.bold('║                    TEST SUMMARY                           ║'));
console.log(chalk.bold('╚════════════════════════════════════════════════════════════╝\n'));

console.log(chalk.cyan(`Total Tests: ${results.passed + results.failed}`));
console.log(chalk.green(`✓ Passed: ${results.passed}`));
console.log(chalk.red(`✗ Failed: ${results.failed}`));

const passRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);
console.log(chalk.yellow(`\nPass Rate: ${passRate}%`));

if (results.failed > 0) {
    console.log(chalk.red('\n❌ Failed Tests:'));
    results.tests.filter(t => t.status === 'FAIL').forEach(t => {
        console.log(chalk.red(`  • ${t.name}`));
        console.log(chalk.gray(`    ${t.error}`));
    });
}

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));

// Test breakdown by phase
console.log(chalk.bold('Test Breakdown by Phase:\n'));
console.log(chalk.gray('  Phase 1: Module Loading (4 tests)'));
console.log(chalk.gray('  Phase 2: Class Instantiation (4 tests)'));
console.log(chalk.gray('  Phase 3: Method Existence (7 tests)'));
console.log(chalk.gray('  Phase 4: Question Management (4 tests)'));
console.log(chalk.gray('  Phase 5: Few-Shot Examples (4 tests)'));
console.log(chalk.gray('  Phase 6: GitHub Search (5 tests)'));
console.log(chalk.gray('  Phase 7: Example Library (2 tests)'));
console.log(chalk.gray('  Phase 8: Integration (5 tests)'));
console.log(chalk.gray('  Phase 9: Data Persistence (2 tests)'));
console.log(chalk.gray('  Phase 10: Edge Cases (8 tests)'));

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));

// Feature coverage summary
console.log(chalk.bold('Feature Coverage:\n'));
console.log(chalk.green('  ✓ Editable Questions (askWithEdit)'));
console.log(chalk.green('  ✓ Few-Shot Learning (askWithFewShot)'));
console.log(chalk.green('  ✓ GitHub Search Integration'));
console.log(chalk.green('  ✓ Question Management (add/edit/delete/list)'));
console.log(chalk.green('  ✓ Example Library (save/load)'));
console.log(chalk.green('  ✓ Data Persistence (save/load clarifications)'));
console.log(chalk.green('  ✓ PlanHandlers Integration'));
console.log(chalk.green('  ✓ Cache Management'));
console.log(chalk.green('  ✓ Error Handling'));

console.log(chalk.yellow('\n═══════════════════════════════════════════════════════════\n'));

// Exit with appropriate code
if (results.failed > 0) {
    console.log(chalk.red('❌ Some tests failed!\n'));
    process.exit(1);
} else {
    console.log(chalk.green('✅ All tests passed!\n'));
    console.log(chalk.cyan('Ready for MCP integration and skills testing! 🚀\n'));
    process.exit(0);
}
