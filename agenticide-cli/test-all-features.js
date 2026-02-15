// Comprehensive Feature Test Suite
const chalk = require('chalk');

console.log(chalk.bold('\n╔════════════════════════════════════════════════════╗'));
console.log(chalk.bold('║   AGENTICIDE - COMPREHENSIVE FEATURE TESTS        ║'));
console.log(chalk.bold('╚════════════════════════════════════════════════════╝\n'));

async function runTests() {
    const tests = [];
    
    // Test 1: Module Loading
    console.log(chalk.cyan('📦 Test 1: Module Loading\n'));
    try {
        const PlanEditor = require('./commands/plan/planEditor');
        const StubOrchestrator = require('./commands/stub/stubOrchestrator');
        const OutputController = require('./core/outputController');
        const runtime = require('./utils/runtime');
        const ProviderManager = require('./providers/providerManager');
        
        console.log(chalk.green('  ✅ PlanEditor loaded'));
        console.log(chalk.green('  ✅ StubOrchestrator loaded'));
        console.log(chalk.green('  ✅ OutputController loaded'));
        console.log(chalk.green('  ✅ Runtime module loaded'));
        console.log(chalk.green('  ✅ ProviderManager loaded'));
        tests.push({ name: 'Module Loading', passed: true });
    } catch (e) {
        console.log(chalk.red('  ❌ Failed:', e.message));
        tests.push({ name: 'Module Loading', passed: false, error: e.message });
    }
    
    // Test 2: Runtime Detection
    console.log(chalk.cyan('\n⚡ Test 2: Runtime Detection\n'));
    try {
        const runtime = require('./utils/runtime');
        console.log(chalk.gray(`  Runtime: ${runtime.runtime}`));
        console.log(chalk.gray(`  Version: ${runtime.version}`));
        console.log(chalk.gray(`  Platform: ${runtime.platform}`));
        console.log(chalk.green('  ✅ Runtime detection works'));
        tests.push({ name: 'Runtime Detection', passed: true });
    } catch (e) {
        console.log(chalk.red('  ❌ Failed:', e.message));
        tests.push({ name: 'Runtime Detection', passed: false, error: e.message });
    }
    
    // Test 3: Module Instantiation
    console.log(chalk.cyan('\n🏗️  Test 3: Module Instantiation\n'));
    try {
        const PlanEditor = require('./commands/plan/planEditor');
        const OutputController = require('./core/outputController');
        
        const plan = new PlanEditor();
        const output = new OutputController();
        
        console.log(chalk.green('  ✅ PlanEditor instantiated'));
        console.log(chalk.green('  ✅ OutputController instantiated'));
        tests.push({ name: 'Module Instantiation', passed: true });
    } catch (e) {
        console.log(chalk.red('  ❌ Failed:', e.message));
        tests.push({ name: 'Module Instantiation', passed: false, error: e.message });
    }
    
    // Test 4: Provider Detection
    console.log(chalk.cyan('\n🤖 Test 4: AI Provider Detection\n'));
    try {
        const ProviderManager = require('./providers/providerManager');
        const pm = new ProviderManager();
        
        const provider = await pm.autoDetect();
        const providers = pm.listProviders();
        
        if (provider) {
            console.log(chalk.green(`  ✅ Active provider: ${provider}`));
        } else {
            console.log(chalk.yellow('  ⚠️  No providers detected (install Ollama/LM Studio)'));
        }
        console.log(chalk.gray(`  Available: ${providers.map(p => p.name).join(', ') || 'none'}`));
        tests.push({ name: 'Provider Detection', passed: true });
    } catch (e) {
        console.log(chalk.red('  ❌ Failed:', e.message));
        tests.push({ name: 'Provider Detection', passed: false, error: e.message });
    }
    
    // Test 5: Output Controller
    console.log(chalk.cyan('\n📢 Test 5: Output Controller\n'));
    try {
        const OutputController = require('./core/outputController');
        const output = new OutputController();
        
        output.success('Success message test');
        output.info('Info message test');
        output.warning('Warning message test');
        
        console.log(chalk.green('  ✅ All output methods work'));
        tests.push({ name: 'Output Controller', passed: true });
    } catch (e) {
        console.log(chalk.red('  ❌ Failed:', e.message));
        tests.push({ name: 'Output Controller', passed: false, error: e.message });
    }
    
    // Summary
    console.log(chalk.bold('\n╔════════════════════════════════════════════════════╗'));
    console.log(chalk.bold('║   TEST SUMMARY                                     ║'));
    console.log(chalk.bold('╚════════════════════════════════════════════════════╝\n'));
    
    const passed = tests.filter(t => t.passed).length;
    const failed = tests.filter(t => !t.passed).length;
    
    tests.forEach(test => {
        const status = test.passed ? chalk.green('✅ PASS') : chalk.red('❌ FAIL');
        console.log(`  ${status}  ${test.name}`);
        if (!test.passed && test.error) {
            console.log(chalk.red(`         ${test.error}`));
        }
    });
    
    console.log('');
    console.log(chalk.bold(`  Total: ${tests.length} tests`));
    console.log(chalk.green(`  Passed: ${passed}`));
    if (failed > 0) {
        console.log(chalk.red(`  Failed: ${failed}`));
    }
    console.log('');
    
    if (failed === 0) {
        console.log(chalk.bold.green('✅ ALL TESTS PASSED!\n'));
    } else {
        console.log(chalk.bold.yellow(`⚠️  ${failed} TEST(S) FAILED\n`));
    }
}

runTests().catch(e => {
    console.error(chalk.red('\n❌ Test suite failed:'), e.message);
    process.exit(1);
});
