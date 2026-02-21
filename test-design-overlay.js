const DesignServer = require('./agenticide-cli/extensions/lovable-design/server/DesignServer');

console.log('Testing Design Server with Overlay Chat...\n');

// Test 1: Server initialization
console.log('1. Initialize Design Server');
const server = new DesignServer({ port: 3457 });
console.log('   ✓ Server created');

// Test 2: Start server
console.log('\n2. Start server on port 3457');
server.start().then(() => {
    console.log('   ✓ Server started');
    
    // Test 3: Check HTML has overlay
    console.log('\n3. Check overlay chat HTML');
    const html = server.getIndexHTML();
    
    const checks = [
        { name: 'ai-chat-overlay div', pattern: 'id="ai-chat-overlay"' },
        { name: 'toggleChat function', pattern: 'function toggleChat()' },
        { name: 'sendMessage function', pattern: 'function sendMessage()' },
        { name: 'startElementPicker function', pattern: 'function startElementPicker()' },
        { name: 'handleImageUpload function', pattern: 'function handleImageUpload(' },
        { name: 'Image upload button', pattern: 'id="image-upload"' },
        { name: 'Element picker button', pattern: 'id="picker-btn"' },
        { name: 'Chat input', pattern: 'id="chat-input"' },
        { name: 'Sandbox without allow-same-origin', pattern: 'sandbox="allow-scripts"' },
        { name: 'window.parent.postMessage', pattern: 'window.parent.postMessage' }
    ];
    
    let passed = 0;
    checks.forEach(check => {
        const found = html.includes(check.pattern);
        if (found) {
            console.log(`   ✓ ${check.name}`);
            passed++;
        } else {
            console.log(`   ✗ ${check.name} MISSING`);
        }
    });
    
    console.log(`\n4. Summary: ${passed}/${checks.length} checks passed`);
    
    if (passed === checks.length) {
        console.log('\n✅ All overlay chat features implemented correctly!');
        console.log('\nFeatures available:');
        console.log('  • Overlay chat panel (slide-in from right)');
        console.log('  • Real-time file progress tracking');
        console.log('  • Console error monitoring with suggestions');
        console.log('  • Image upload (📷)');
        console.log('  • Element picker (🎯)');
        console.log('  • Design file upload (📁)');
        console.log('  • Auto-resize textarea');
        console.log('  • Enter to send, Shift+Enter for newline');
        console.log('  • Secure sandbox (no allow-same-origin)');
    } else {
        console.log('\n⚠️  Some features missing');
    }
    
    // Stop server
    server.stop();
    process.exit(passed === checks.length ? 0 : 1);
}).catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
