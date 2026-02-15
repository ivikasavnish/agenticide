// Code Quality Analyzer - Enforces clean code standards
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CodeQualityAnalyzer {
    constructor(options = {}) {
        this.maxFunctionLines = options.maxFunctionLines || 50;
        this.maxCyclomaticComplexity = options.maxCyclomaticComplexity || 10;
        this.maxFileLines = options.maxFileLines || 300;
        this.maxFunctionParams = options.maxFunctionParams || 4;
        this.enabled = options.enabled !== false;
    }

    analyzeFile(filePath) {
        if (!this.enabled) return { passed: true, issues: [] };

        const issues = [];
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');

        // Check file length
        if (lines.length > this.maxFileLines) {
            issues.push({
                type: 'file-length',
                severity: 'warning',
                message: `File has ${lines.length} lines (max: ${this.maxFileLines})`,
                suggestion: 'Consider splitting into smaller modules'
            });
        }

        // Analyze functions
        const functions = this._extractFunctions(content);
        for (const func of functions) {
            // Check function length
            if (func.lines > this.maxFunctionLines) {
                issues.push({
                    type: 'function-length',
                    severity: 'error',
                    function: func.name,
                    line: func.startLine,
                    message: `Function '${func.name}' has ${func.lines} lines (max: ${this.maxFunctionLines})`,
                    suggestion: 'Break into smaller functions with single responsibility'
                });
            }

            // Check cyclomatic complexity
            const complexity = this._calculateComplexity(func.body);
            if (complexity > this.maxCyclomaticComplexity) {
                issues.push({
                    type: 'complexity',
                    severity: 'error',
                    function: func.name,
                    line: func.startLine,
                    message: `Function '${func.name}' has complexity ${complexity} (max: ${this.maxCyclomaticComplexity})`,
                    suggestion: 'Reduce conditional logic, extract helper functions'
                });
            }

            // Check parameter count
            if (func.params > this.maxFunctionParams) {
                issues.push({
                    type: 'parameters',
                    severity: 'warning',
                    function: func.name,
                    line: func.startLine,
                    message: `Function '${func.name}' has ${func.params} parameters (max: ${this.maxFunctionParams})`,
                    suggestion: 'Use object destructuring or options object'
                });
            }
        }

        return {
            passed: issues.filter(i => i.severity === 'error').length === 0,
            issues,
            stats: {
                fileLines: lines.length,
                functions: functions.length,
                avgFunctionLength: functions.length > 0 
                    ? Math.round(functions.reduce((sum, f) => sum + f.lines, 0) / functions.length)
                    : 0,
                maxComplexity: functions.length > 0
                    ? Math.max(...functions.map(f => this._calculateComplexity(f.body)))
                    : 0
            }
        };
    }

    analyzeDirectory(dirPath, options = {}) {
        const results = [];
        const extensions = options.extensions || ['.js', '.ts', '.jsx', '.tsx'];
        
        const files = this._getFiles(dirPath, extensions);
        
        for (const file of files) {
            // Skip node_modules, test files if requested
            if (options.skipTests && (file.includes('.test.') || file.includes('.spec.'))) {
                continue;
            }
            
            try {
                const result = this.analyzeFile(file);
                if (result.issues.length > 0) {
                    results.push({
                        file: path.relative(dirPath, file),
                        ...result
                    });
                }
            } catch (error) {
                results.push({
                    file: path.relative(dirPath, file),
                    passed: false,
                    error: error.message
                });
            }
        }

        return {
            passed: results.every(r => r.passed !== false),
            files: files.length,
            results,
            summary: this._generateSummary(results)
        };
    }

    _extractFunctions(content) {
        const functions = [];
        const lines = content.split('\n');
        
        // Simple regex-based extraction (can be enhanced with AST parsing)
        const functionPattern = /(?:function\s+(\w+)|const\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>)|(\w+)\s*\([^)]*\)\s*{)/g;
        
        let match;
        while ((match = functionPattern.exec(content)) !== null) {
            const name = match[1] || match[2] || match[3] || 'anonymous';
            const startPos = match.index;
            const startLine = content.substring(0, startPos).split('\n').length;
            
            // Find function body
            const bodyStart = content.indexOf('{', startPos);
            if (bodyStart === -1) continue;
            
            const bodyEnd = this._findMatchingBrace(content, bodyStart);
            if (bodyEnd === -1) continue;
            
            const body = content.substring(bodyStart, bodyEnd + 1);
            const functionLines = body.split('\n').length;
            
            // Count parameters
            const paramMatch = content.substring(startPos, bodyStart).match(/\(([^)]*)\)/);
            const params = paramMatch ? paramMatch[1].split(',').filter(p => p.trim()).length : 0;
            
            functions.push({
                name,
                startLine,
                lines: functionLines,
                params,
                body
            });
        }
        
        return functions;
    }

    _calculateComplexity(code) {
        // Cyclomatic complexity = decision points + 1
        let complexity = 1;
        
        // Count decision points
        const patterns = [
            /\bif\s*\(/g,           // if statements
            /\belse\s+if\s*\(/g,    // else if
            /\bfor\s*\(/g,          // for loops
            /\bwhile\s*\(/g,        // while loops
            /\bcase\s+/g,           // switch cases
            /\&\&/g,                // logical AND
            /\|\|/g,                // logical OR
            /\?/g,                  // ternary
            /\bcatch\s*\(/g         // catch blocks
        ];
        
        for (const pattern of patterns) {
            const matches = code.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }
        
        return complexity;
    }

    _findMatchingBrace(content, start) {
        let depth = 1;
        for (let i = start + 1; i < content.length; i++) {
            if (content[i] === '{') depth++;
            if (content[i] === '}') depth--;
            if (depth === 0) return i;
        }
        return -1;
    }

    _getFiles(dir, extensions) {
        const files = [];
        const items = fs.readdirSync(dir);
        
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                files.push(...this._getFiles(fullPath, extensions));
            } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    _generateSummary(results) {
        const issuesByType = {};
        let totalIssues = 0;
        
        for (const result of results) {
            if (!result.issues) continue;
            
            for (const issue of result.issues) {
                issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
                totalIssues++;
            }
        }
        
        return {
            totalIssues,
            issuesByType,
            filesWithIssues: results.filter(r => r.issues && r.issues.length > 0).length
        };
    }

    generateReport(results) {
        const lines = [];
        lines.push('╔════════════════════════════════════════════════════════════════╗');
        lines.push('║           CODE QUALITY ANALYSIS REPORT                         ║');
        lines.push('╚════════════════════════════════════════════════════════════════╝');
        lines.push('');
        
        if (results.passed) {
            lines.push('✅ All checks passed!');
            lines.push('');
            lines.push(`Files analyzed: ${results.files}`);
            return lines.join('\n');
        }
        
        lines.push(`Files analyzed: ${results.files}`);
        lines.push(`Files with issues: ${results.summary.filesWithIssues}`);
        lines.push(`Total issues: ${results.summary.totalIssues}`);
        lines.push('');
        lines.push('Issues by type:');
        for (const [type, count] of Object.entries(results.summary.issuesByType)) {
            lines.push(`  ${type}: ${count}`);
        }
        lines.push('');
        
        for (const result of results.results) {
            if (!result.issues || result.issues.length === 0) continue;
            
            lines.push(`File: ${result.file}`);
            for (const issue of result.issues) {
                const icon = issue.severity === 'error' ? '❌' : '⚠️';
                lines.push(`  ${icon} ${issue.message}`);
                if (issue.line) lines.push(`     Line ${issue.line}`);
                if (issue.suggestion) lines.push(`     💡 ${issue.suggestion}`);
            }
            lines.push('');
        }
        
        return lines.join('\n');
    }
}

module.exports = CodeQualityAnalyzer;
