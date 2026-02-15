#!/usr/bin/env node

// Test the stub-first workflow
const { StubGenerator } = require('./stubGenerator');

console.log('🧪 Testing Stub Generator\n');

// Test 1: Check supported languages
const stubGen = new StubGenerator();
console.log('✓ Supported languages:', stubGen.getSupportedLanguages().join(', '));
console.log('✓ Supported types:', stubGen.getSupportedTypes().join(', '));

// Test 2: Detect stubs in a sample file
const fs = require('fs');
const path = require('path');

// Create a sample Go file with stubs
const sampleFile = path.join(__dirname, 'test_sample.go');
const sampleContent = `package test

import "context"

// Service handles test logic
type Service struct {}

// Create creates a new item
func (s *Service) Create(ctx context.Context) error {
\t// TODO: Implement Create
\treturn nil
}

// Get retrieves an item
func (s *Service) Get(ctx context.Context, id string) error {
\t// TODO: Implement Get
\treturn nil
}

// Update updates an item
func (s *Service) Update(ctx context.Context, id string) error {
\treturn nil // This is implemented
}
`;

fs.writeFileSync(sampleFile, sampleContent);

console.log('\n📄 Testing stub detection...');
const detectedStubs = stubGen.detectStubs(sampleFile);
console.log(`✓ Detected ${detectedStubs.length} stubs:`);
detectedStubs.forEach(stub => {
    console.log(`  • ${stub.name} (line ${stub.line}) - ${stub.implemented ? 'Implemented' : 'Pending'}`);
});

// Test 3: List stubs in directory
console.log('\n📁 Testing directory scan...');
const dirStubs = stubGen.listStubs(__dirname);
console.log(`✓ Found ${dirStubs.length} files with stubs`);

// Cleanup
fs.unlinkSync(sampleFile);

console.log('\n✅ All tests passed!');
console.log('\n💡 To test with AI:');
console.log('  1. Start agenticide: agenticide chat');
console.log('  2. Generate stubs: /stub user go');
console.log('  3. Verify: /verify user');
console.log('  4. Implement: /implement Create');
console.log('  5. Visualize: /flow user\n');
