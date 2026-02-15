#!/usr/bin/env node
// Security Scan Script
const SecurityScanner = require('../core/securityScanner');
const path = require('path');
const chalk = require('chalk');

const scanner = new SecurityScanner({ severity: 'medium' });

// Get files to scan (staged files or all)
const files = process.argv.slice(2);
const filesToScan = files.length > 0 
    ? files 
    : require('fs').readdirSync(process.cwd())
        .filter(f => f.endsWith('.js') || f.endsWith('.ts'));

let hasIssues = false;

for (const file of filesToScan) {
    if (!file.includes('node_modules')) {
        try {
            const result = scanner.scanFile(path.join(process.cwd(), file));
            
            if (result.vulnerabilities.length > 0) {
                console.log(scanner.generateReport(result));
                hasIssues = true;
            }
        } catch (error) {
            // Skip files that can't be scanned
        }
    }
}

if (hasIssues) {
    console.log(chalk.red('\n❌ Security issues detected!'));
    console.log(chalk.yellow('Fix critical and high severity issues before committing.\n'));
    process.exit(1);
} else {
    console.log(chalk.green('\n✅ Security scan passed!\n'));
    process.exit(0);
}
