#!/usr/bin/env node
// Code Quality Check Script
const CodeQualityAnalyzer = require('../core/codeQualityAnalyzer');
const chalk = require('chalk');

const analyzer = new CodeQualityAnalyzer({
    maxFunctionLines: 50,
    maxCyclomaticComplexity: 10,
    maxFileLines: 300,
    maxFunctionParams: 4
});

const results = analyzer.analyzeDirectory(process.cwd(), {
    extensions: ['.js', '.ts'],
    skipTests: false
});

console.log(analyzer.generateReport(results));

if (!results.passed) {
    console.log(chalk.red('\n❌ Code quality check failed!'));
    console.log(chalk.yellow('Fix the issues above before committing.\n'));
    process.exit(1);
} else {
    console.log(chalk.green('\n✅ Code quality check passed!\n'));
    process.exit(0);
}
