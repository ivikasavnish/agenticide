const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs');
const path = require('path');

module.exports = function createAnalyzeAction(CONFIG_DIR) {
    return async (options) => {
        const { LSPAnalyzer } = require('../../agenticide-core/lspAnalyzer');
        const Database = require('better-sqlite3');
        
        const spinner = ora('Analyzing project...').start();
        
        try {
            const analyzer = new LSPAnalyzer(process.cwd());
            const results = await analyzer.analyze();
            
            spinner.succeed('Analysis complete!');
            
            console.log(chalk.cyan('\n📊 Analysis Results:\n'));
            console.log(`  Files: ${results.files?.length || 0}`);
            console.log(`  Symbols: ${results.symbols?.length || 0}`);
            console.log(`  Language: ${results.language || 'unknown'}`);
            
            // Save to database
            const dbPath = path.join(CONFIG_DIR, 'cli.db');
            const db = new Database(dbPath);
            
            db.exec(`
                CREATE TABLE IF NOT EXISTS symbols (
                    id INTEGER PRIMARY KEY,
                    name TEXT,
                    kind TEXT,
                    file TEXT,
                    line INTEGER
                )
            `);
            
            const insert = db.prepare('INSERT INTO symbols (name, kind, file, line) VALUES (?, ?, ?, ?)');
            results.symbols?.forEach(sym => {
                insert.run(sym.name, sym.kind, sym.file, sym.line);
            });
            
            db.close();
            console.log(chalk.green('\n✓ Symbols indexed\n'));
            
        } catch (error) {
            spinner.fail(`Analysis failed: ${error.message}`);
        }
    };
};
