const path = require('path');
const WebSearchExtension = require('./agenticide-cli/extensions/web-search');

// Use CLI's chalk
const chalk = require('./agenticide-cli/node_modules/chalk');

console.log(chalk.bold('🔍 Testing Web Search Extension\n'));

async function test() {
    const extension = new WebSearchExtension();
    
    // Test 1: Install check
    console.log('1. Checking Playwright installation...');
    const installResult = await extension.install();
    console.log(`   ${installResult.success ? '✓' : '✗'} ${installResult.message}`);
    
    if (!installResult.success) {
        console.log(chalk.yellow('\n⚠️  Install Playwright first: npm install playwright'));
        console.log(chalk.dim('   Then run this test again'));
        return;
    }
    
    // Test 2: Enable extension
    console.log('\n2. Enabling extension...');
    const enableResult = await extension.enable();
    console.log(`   ${enableResult.success ? '✓' : '✗'} ${enableResult.message}`);
    
    // Test 3: Search command
    console.log('\n3. Testing search command...');
    const searchResult = await extension.handleCommand('search', ['Node.js best practices'], {});
    if (searchResult.success) {
        console.log(chalk.green(`   ✓ Found ${searchResult.data.length} results`));
    } else {
        console.log(chalk.red(`   ✗ ${searchResult.message}`));
    }
    
    // Test 4: Browse with clean content
    console.log('\n4. Testing browse with clean content...');
    const browseResult = await extension.handleCommand('browse', ['https://example.com', '--clean'], {});
    if (browseResult.success) {
        console.log(chalk.green('   ✓ Successfully browsed and cleaned content'));
        console.log(chalk.dim(`   Title: ${browseResult.title}`));
        console.log(chalk.dim(`   Word count: ${browseResult.content?.wordCount || 0}`));
    } else {
        console.log(chalk.red(`   ✗ ${browseResult.message}`));
    }
    
    // Test 5: Text mode
    console.log('\n5. Testing text-only mode (lynx-style)...');
    const textResult = await extension.handleCommand('browse', ['https://example.com', '--text'], {});
    if (textResult.success) {
        console.log(chalk.green('   ✓ Text extraction successful'));
        console.log(chalk.dim(`   Content length: ${textResult.content?.length || 0} characters`));
    } else {
        console.log(chalk.red(`   ✗ ${textResult.message}`));
    }
    
    // Test 6: Console capture
    console.log('\n6. Testing console capture...');
    const consoleResult = await extension.handleCommand('browse', ['https://example.com', '--console'], {});
    if (consoleResult.success) {
        console.log(chalk.green('   ✓ Console logs captured'));
        console.log(chalk.dim(`   Captured ${consoleResult.consoleLogs?.length || 0} console events`));
    } else {
        console.log(chalk.red(`   ✗ ${consoleResult.message}`));
    }
    
    // Test 7: Extract links
    console.log('\n7. Testing link extraction...');
    const extractResult = await extension.handleCommand('extract', ['--links'], {});
    if (extractResult.success) {
        console.log(chalk.green('   ✓ Links extracted'));
        console.log(chalk.dim(`   Found ${extractResult.data?.links?.length || 0} links`));
    } else {
        console.log(chalk.red(`   ✗ ${extractResult.message}`));
    }
    
    // Cleanup
    console.log('\n8. Cleaning up...');
    await extension.disable();
    console.log(chalk.green('   ✓ Extension disabled'));
    
    // Summary
    console.log(chalk.bold('\n' + '='.repeat(50)));
    console.log(chalk.bold.green('✅ Web Search Extension Test Complete!\n'));
    console.log(chalk.bold('Features Available:'));
    console.log(chalk.white('  • Multi-engine search (Google + DuckDuckGo)'));
    console.log(chalk.white('  • Clean content extraction (Readability-style)'));
    console.log(chalk.white('  • Text-only mode (lynx-style browsing)'));
    console.log(chalk.white('  • Console log capture (errors, warnings, logs)'));
    console.log(chalk.white('  • Link/image/data extraction'));
    console.log(chalk.white('  • HTML cleaning (removes ads, scripts, styling)'));
    console.log(chalk.white('  • Structured data extraction (meta, JSON-LD)'));
    
    console.log(chalk.bold('\nUsage:'));
    console.log(chalk.gray('  agenticide chat'));
    console.log(chalk.cyan('  /search "query here"'));
    console.log(chalk.cyan('  /browse https://example.com --clean'));
    console.log(chalk.cyan('  /browse https://example.com --text'));
    console.log(chalk.cyan('  /browse https://example.com --console'));
    console.log(chalk.cyan('  /extract --links'));
    console.log(chalk.cyan('  /extract --text'));
    console.log(chalk.cyan('  /extract --data'));
}

test().catch(err => {
    console.error(chalk.red('\n❌ Test failed:'), err.message);
    process.exit(1);
});
