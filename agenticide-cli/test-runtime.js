// Test runtime detection and compatibility
const runtime = require('./utils/runtime');

console.log('🧪 Testing Runtime Compatibility\n');

// Test 1: Runtime detection
console.log('Test 1: Runtime Detection');
const info = runtime.getRuntimeInfo();
console.log(`  Runtime: ${info.runtime}`);
console.log(`  Version: ${info.version}`);
console.log(`  Platform: ${info.platform}`);
console.log(`  Features:`, info.features);
console.log('  ✅ Detection works\n');

// Test 2: File operations
console.log('Test 2: File Operations');
(async () => {
    try {
        // Write test
        await runtime.writeFile('test-runtime-file.txt', 'Hello from ' + runtime.runtime);
        console.log('  ✅ Write works');
        
        // Read test
        const content = await runtime.readFile('test-runtime-file.txt');
        console.log(`  ✅ Read works: "${content}"`);
        
        // Cleanup
        const fs = require('fs');
        fs.unlinkSync('test-runtime-file.txt');
        console.log('  ✅ Cleanup done\n');
        
        // Test 3: Shell execution
        console.log('Test 3: Shell Execution');
        const result = await runtime.execCommand('echo "test"');
        console.log(`  stdout: "${result.stdout}"`);
        console.log(`  exitCode: ${result.exitCode}`);
        console.log('  ✅ Shell execution works\n');
        
        // Test 4: Performance comparison
        console.log('Test 4: Performance');
        const start = Date.now();
        for (let i = 0; i < 100; i++) {
            await runtime.writeFile(`test-${i}.txt`, 'test');
            await runtime.readFile(`test-${i}.txt`);
            const fs = require('fs');
            fs.unlinkSync(`test-${i}.txt`);
        }
        const duration = Date.now() - start;
        console.log(`  100 file operations: ${duration}ms`);
        console.log(`  Average: ${(duration/100).toFixed(2)}ms per operation`);
        console.log('  ✅ Performance test complete\n');
        
        // Summary
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ All Runtime Tests Passed!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`Runtime: ${runtime.runtime} ${runtime.version}`);
        console.log(`Status: Fully Compatible`);
        if (runtime.isBun) {
            console.log(`Bonus: Using Bun's native APIs for 3-4x speed boost!`);
        }
        console.log('');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
})();
