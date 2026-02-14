#!/usr/bin/env node

/**
 * Test CodeAnalyzer on agenticide-cli project
 */

const { ProjectManager } = require('./agenticide-core');
const path = require('path');

async function testAnalyzer() {
    const pm = new ProjectManager();
    
    console.log('🚀 Testing CodeAnalyzer\n');
    
    // Analyze agenticide-cli
    const projectPath = path.join(__dirname, 'agenticide-cli');
    console.log(`📂 Project: ${projectPath}\n`);
    
    try {
        // Add project
        const project = await pm.index.addProject(projectPath);
        console.log(`✅ Project registered: ${project.name} (ID: ${project.id})\n`);
        
        // Analyze code
        console.log('🔍 Analyzing code structure...\n');
        const results = await pm.analyzeProjectCode(project.id);
        
        console.log('📊 Analysis Results:');
        console.log('═══════════════════════════════════════');
        console.log(`  Files analyzed: ${results.files}`);
        console.log(`  Functions found: ${results.functions}`);
        console.log(`  Classes found: ${results.classes}`);
        console.log(`  Entrypoints: ${results.entrypoints.length}`);
        console.log('');
        
        if (results.entrypoints.length > 0) {
            console.log('🎯 Entrypoints:');
            results.entrypoints.forEach(entry => {
                console.log(`  - ${entry}`);
            });
            console.log('');
        }
        
        // Get structure summary
        const structure = pm.getProjectStructure(project.id);
        console.log('🏗️  Structure Summary:');
        console.log('═══════════════════════════════════════');
        console.log(`  Total files: ${structure.files}`);
        console.log(`  Total functions: ${structure.functions}`);
        console.log(`  Total classes: ${structure.classes}`);
        console.log(`  Total exports: ${structure.exports}`);
        console.log('');
        
        // Get contracts for index.js
        const indexPath = path.join(projectPath, 'index.js');
        console.log('📄 File Contracts: index.js');
        console.log('═══════════════════════════════════════');
        
        const contracts = pm.getFileContracts(indexPath);
        
        if (contracts) {
            console.log(`  Language: ${contracts.language}`);
            console.log(`  Imports: ${contracts.imports.length}`);
            console.log(`  Exports: ${contracts.exports.length}`);
            console.log(`  Functions: ${contracts.functions.length}`);
            console.log(`  Classes: ${contracts.classes.length}`);
            console.log('');
            
            if (contracts.imports.length > 0) {
                console.log('  📥 Imports:');
                contracts.imports.forEach(imp => {
                    const names = JSON.parse(imp.imported_names);
                    console.log(`    - ${imp.import_path} (${names.join(', ')})`);
                });
                console.log('');
            }
            
            if (contracts.functions.length > 0) {
                console.log('  🔧 Functions:');
                contracts.functions.slice(0, 10).forEach(func => {
                    const async = func.is_async ? 'async ' : '';
                    const exported = func.is_exported ? '(exported)' : '';
                    console.log(`    - ${async}${func.name}${func.signature} ${exported}`);
                });
                if (contracts.functions.length > 10) {
                    console.log(`    ... and ${contracts.functions.length - 10} more`);
                }
                console.log('');
            }
            
            if (contracts.classes.length > 0) {
                console.log('  🏛️  Classes:');
                contracts.classes.forEach(cls => {
                    console.log(`    - ${cls.name}`);
                    if (cls.extends) console.log(`      extends: ${cls.extends}`);
                    if (cls.methods && cls.methods.length > 0) {
                        console.log(`      methods: ${cls.methods.length}`);
                        cls.methods.slice(0, 5).forEach(method => {
                            console.log(`        • ${method.name}${method.signature}`);
                        });
                        if (cls.methods.length > 5) {
                            console.log(`        ... and ${cls.methods.length - 5} more`);
                        }
                    }
                });
                console.log('');
            }
            
            if (contracts.exports.length > 0) {
                console.log('  📤 Exports:');
                contracts.exports.forEach(exp => {
                    const def = exp.is_default ? '(default)' : '';
                    console.log(`    - ${exp.export_name} ${def}`);
                });
                console.log('');
            }
        }
        
        // Get control flow
        console.log('🌊 Control Flow:');
        console.log('═══════════════════════════════════════');
        const flow = pm.getControlFlow(project.id);
        if (flow.length > 0) {
            flow.slice(0, 10).forEach(f => {
                const from = path.basename(f.from);
                const to = path.basename(f.to);
                console.log(`  ${from} → ${to} (${f.type})`);
            });
            if (flow.length > 10) {
                console.log(`  ... and ${flow.length - 10} more connections`);
            }
        } else {
            console.log('  No control flow edges found');
        }
        console.log('');
        
        console.log('✅ Analysis complete!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        pm.close();
    }
}

testAnalyzer();
