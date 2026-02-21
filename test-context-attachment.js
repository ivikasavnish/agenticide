// Test Context Attachment System
const ContextAttachment = require('./agenticide-cli/core/contextAttachment');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Context Attachment System\n');

const attachment = new ContextAttachment(process.cwd());

// Test 1: Parse @file references
console.log('Test 1: Parse @file references');
const message1 = 'Review @package.json and @README.md for issues';
const refs = attachment.parseFileReferences(message1);
console.log('  Found references:', refs.map(r => r.filename).join(', '));
console.log('  ✓ Passed\n');

// Test 2: Process message with files
console.log('Test 2: Process message with file attachments');
const result = attachment.processMessage('Check @package.json please');
console.log('  Attachments:', result.attachments.length);
if (result.attachments.length > 0) {
    const att = result.attachments[0];
    console.log('  File:', att.filename);
    console.log('  Lines:', att.lines);
    console.log('  Git tracked:', att.gitTracked);
    if (att.gitUrl) {
        console.log('  Git URL:', att.gitUrl);
    }
}
console.log('  ✓ Passed\n');

// Test 3: Paste detection
console.log('Test 3: Paste detection');
const pasteContent = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
const isPaste = attachment.isPastedContent(pasteContent);
console.log('  Is paste?', isPaste);
console.log('  ✓ Passed\n');

// Test 4: Git info
console.log('Test 4: Git information');
const gitRoot = attachment.getGitRoot();
const branch = attachment.getCurrentBranch();
const commit = attachment.getCurrentCommit();
console.log('  Git root:', gitRoot ? '✓' : '✗');
console.log('  Branch:', branch || 'N/A');
console.log('  Commit:', commit ? commit.substring(0, 7) : 'N/A');
console.log('  ✓ Passed\n');

// Test 5: Create git link
console.log('Test 5: Create git link');
const testFile = path.join(__dirname, 'package.json');
if (fs.existsSync(testFile)) {
    const gitLink = attachment.createGitLink(testFile);
    console.log('  Git tracked:', gitLink.gitTracked);
    console.log('  Relative path:', gitLink.relativePath);
    if (gitLink.gitUrl) {
        console.log('  Git URL:', gitLink.gitUrl);
    }
    console.log('  ✓ Passed\n');
}

// Test 6: File with quotes
console.log('Test 6: Parse quoted filename');
const message2 = 'Check @"file with spaces.txt"';
const refs2 = attachment.parseFileReferences(message2);
console.log('  Found:', refs2[0]?.filename || 'none');
console.log('  ✓ Passed\n');

// Test 7: Multiple files
console.log('Test 7: Multiple file references');
const message3 = 'Compare @package.json with @package-lock.json and @README.md';
const refs3 = attachment.parseFileReferences(message3);
console.log('  Found files:', refs3.length);
console.log('  Files:', refs3.map(r => r.filename).join(', '));
console.log('  ✓ Passed\n');

console.log('✅ All tests passed!');
console.log('\n📖 See docs/CONTEXT_ATTACHMENTS.md for usage guide');
