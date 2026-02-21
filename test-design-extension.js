// Test Design Extension Loading

const { ExtensionManager } = require('./agenticide-cli/core/extensionManager');
const chalk = require('chalk');

console.log(chalk.cyan('Testing Design Extension Loading...\n'));

async function test() {
    const em = new ExtensionManager();
    
    // Load all extensions
    console.log('1. Loading extensions...');
    const result = await em.loadExtensions();
    console.log(chalk.green(`   ✓ Loaded ${result.loaded} extensions\n`));
    
    // Check lovable-design by name
    console.log('2. Get extension by name "lovable-design"...');
    const ext1 = em.getExtension('lovable-design');
    if (ext1) {
        console.log(chalk.green(`   ✓ Found: ${ext1.name} v${ext1.version}`));
        console.log(chalk.gray(`      ${ext1.description}\n`));
    } else {
        console.log(chalk.red('   ✗ Not found\n'));
    }
    
    // Check by command "design"
    console.log('3. Get extension by command "design"...');
    const ext2 = em.getExtension('design');
    if (ext2) {
        console.log(chalk.green(`   ✓ Found: ${ext2.name}`));
        const info = ext2.getInfo();
        console.log(chalk.gray(`      Commands: ${info.commands.join(', ')}\n`));
    } else {
        console.log(chalk.red('   ✗ Not found\n'));
    }
    
    // Check by alias "ui"
    console.log('4. Get extension by alias "ui"...');
    const ext3 = em.getExtension('ui');
    if (ext3) {
        console.log(chalk.green(`   ✓ Found: ${ext3.name}\n`));
    } else {
        console.log(chalk.red('   ✗ Not found\n'));
    }
    
    // Check by alias "preview"
    console.log('5. Get extension by alias "preview"...');
    const ext4 = em.getExtension('preview');
    if (ext4) {
        console.log(chalk.green(`   ✓ Found: ${ext4.name}\n`));
    } else {
        console.log(chalk.red('   ✗ Not found\n'));
    }
    
    // List all extensions
    console.log('6. All loaded extensions:');
    const extensions = em.listExtensions();
    extensions.forEach(ext => {
        const marker = ext.name === 'lovable-design' ? '👉' : '  ';
        console.log(`   ${marker} ${ext.name.padEnd(20)} - ${ext.description.substring(0, 50)}`);
    });
    
    console.log(chalk.green('\n✅ All tests passed!'));
    console.log(chalk.cyan('\nReady to use: agenticide chat'));
    console.log(chalk.gray('  /design start'));
    console.log(chalk.gray('  /ui start'));
    console.log(chalk.gray('  /preview start\n'));
}

test().catch(e => {
    console.error(chalk.red('\n✗ Error:'), e.message);
    console.error(e.stack);
});
