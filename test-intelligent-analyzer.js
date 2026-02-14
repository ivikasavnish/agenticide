#!/usr/bin/env node

/**
 * Test Intelligent Analyzer
 */

const IntelligentAnalyzer = require('./agenticide-core/intelligentAnalyzer');
const Database = require('better-sqlite3');
const path = require('path');

async function test() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║        Intelligent Project Analyzer - Test Suite              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    const db = new Database(':memory:');
    
    // Initialize
    db.exec(`
        CREATE TABLE projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            path TEXT NOT NULL UNIQUE
        );
        INSERT INTO projects (id, name, path) VALUES (1, 'test', '/tmp');
    `);
    
    const analyzer = new IntelligentAnalyzer(db);
    
    try {
        const projectPath = path.join(__dirname, 'agenticide-cli');
        
        // First analysis
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('  FIRST ANALYSIS (Full Scan)');
        console.log('═══════════════════════════════════════════════════════════════');
        
        const results1 = await analyzer.analyzeProject(1, projectPath);
        
        console.log('\n📊 Results:');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  Files analyzed: ${results1.analyzed}`);
        console.log(`  Symbols found: ${results1.symbols}`);
        console.log(`  Functions/Methods: ${results1.functions}`);
        console.log(`  Classes/Interfaces: ${results1.classes}`);
        console.log(`  Errors: ${results1.errors}`);
        console.log('');
        
        console.log('📝 By Language:');
        for (const [lang, stats] of Object.entries(results1.byLanguage || {})) {
            console.log(`  ${lang}:`);
            console.log(`    Files: ${stats.files}`);
            console.log(`    Symbols: ${stats.symbols}`);
            console.log(`    Errors: ${stats.errors}`);
        }
        
        // Show hash tree
        console.log('\n\n═══════════════════════════════════════════════════════════════');
        console.log('  HASH TREE');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        const hashTree = analyzer.getHashTree(1);
        hashTree.slice(0, 10).forEach(file => {
            const relPath = path.relative(projectPath, file.file_path);
            console.log(`  ${relPath}`);
            console.log(`    Hash: ${file.hash}`);
            console.log(`    Lang: ${file.language}`);
            console.log(`    Size: ${file.size} bytes`);
            console.log('');
        });
        
        if (hashTree.length > 10) {
            console.log(`  ... and ${hashTree.length - 10} more files\n`);
        }
        
        // Show file outline
        if (hashTree.length > 0) {
            console.log('\n═══════════════════════════════════════════════════════════════');
            console.log('  FILE OUTLINE: index.js');
            console.log('═══════════════════════════════════════════════════════════════\n');
            
            const indexPath = path.join(projectPath, 'index.js');
            const outline = analyzer.getFileOutline(indexPath);
            
            function printSymbol(symbol, indent = '  ') {
                console.log(`${indent}${symbol.kind}: ${symbol.name}`);
                if (symbol.detail) {
                    console.log(`${indent}  ${symbol.detail}`);
                }
                console.log(`${indent}  Lines: ${symbol.range_start_line}-${symbol.range_end_line}`);
                
                if (symbol.children && symbol.children.length > 0) {
                    symbol.children.forEach(child => printSymbol(child, indent + '  '));
                }
                console.log('');
            }
            
            outline.slice(0, 10).forEach(symbol => printSymbol(symbol));
            
            if (outline.length > 10) {
                console.log(`  ... and ${outline.length - 10} more symbols\n`);
            }
        }
        
        // Second analysis (should detect no changes)
        console.log('\n═══════════════════════════════════════════════════════════════');
        console.log('  SECOND ANALYSIS (Incremental - No Changes)');
        console.log('═══════════════════════════════════════════════════════════════\n');
        
        const results2 = await analyzer.analyzeProject(1, projectPath);
        
        console.log('📊 Results:');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`  Files analyzed: ${results2.analyzed || 0}`);
        console.log(`  Total files tracked: ${results2.totalFiles}`);
        console.log(`  Total symbols: ${results2.totalSymbols}`);
        console.log('');
        
        console.log('✅ Test Complete!\n');
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        analyzer.close();
        db.close();
    }
}

test();
