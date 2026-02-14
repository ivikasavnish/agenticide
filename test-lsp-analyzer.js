#!/usr/bin/env node

/**
 * Test LSP Analyzer on agenticide-cli project
 */

const LSPAnalyzer = require('./agenticide-core/lspAnalyzer');
const Database = require('better-sqlite3');
const path = require('path');

async function testLSPAnalyzer() {
    console.log('🚀 Testing LSP Analyzer\n');
    
    const db = new Database(':memory:');
    
    // Initialize project table
    db.exec(`
        CREATE TABLE projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE
        );
        INSERT INTO projects (id, name, path) VALUES (1, 'test', '/tmp');
    `);
    
    const analyzer = new LSPAnalyzer(db);
    
    try {
        const projectPath = path.join(__dirname, 'agenticide-cli');
        console.log(`📂 Project: ${projectPath}\n`);
        
        console.log('🔍 Analyzing with LSP...\n');
        const results = await analyzer.analyzeProject(1, projectPath);
        
        console.log('📊 LSP Analysis Results:');
        console.log('═══════════════════════════════════════');
        console.log(`  Files analyzed: ${results.files}`);
        console.log(`  Symbols found: ${results.symbols}`);
        console.log(`  Errors: ${results.errors}`);
        console.log('');
        
        const structure = analyzer.getProjectStructure(1);
        console.log('🏗️  Structure Summary:');
        console.log('═══════════════════════════════════════');
        console.log(`  Total files: ${structure.files}`);
        console.log(`  Total symbols: ${structure.symbols}`);
        console.log(`  Functions/Methods: ${structure.functions}`);
        console.log(`  Classes/Interfaces: ${structure.classes}`);
        console.log('');
        
        // Get symbols for index.js
        const indexPath = path.join(projectPath, 'index.js');
        console.log('📄 File Symbols: index.js');
        console.log('═══════════════════════════════════════');
        
        const symbols = analyzer.getFileSymbols(indexPath);
        
        if (symbols && symbols.symbols) {
            console.log(`  Language: ${symbols.language}`);
            console.log(`  Top-level symbols: ${symbols.symbols.length}`);
            console.log('');
            
            symbols.symbols.slice(0, 15).forEach(symbol => {
                const indent = '  ';
                console.log(`${indent}${symbol.kind}: ${symbol.name}`);
                if (symbol.signature) {
                    console.log(`${indent}  ${symbol.signature}`);
                }
                
                if (symbol.children && symbol.children.length > 0) {
                    console.log(`${indent}  children: ${symbol.children.length}`);
                    symbol.children.slice(0, 5).forEach(child => {
                        console.log(`${indent}    • ${child.kind}: ${child.name}`);
                    });
                    if (symbol.children.length > 5) {
                        console.log(`${indent}    ... and ${symbol.children.length - 5} more`);
                    }
                }
                console.log('');
            });
            
            if (symbols.symbols.length > 15) {
                console.log(`  ... and ${symbols.symbols.length - 15} more symbols\n`);
            }
        }
        
        console.log('✅ LSP Analysis complete!\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        analyzer.close();
        db.close();
    }
}

testLSPAnalyzer();
