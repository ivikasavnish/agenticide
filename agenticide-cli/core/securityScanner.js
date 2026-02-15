// Security Scanner - OWASP security checks
const fs = require('fs');
const path = require('path');

class SecurityScanner {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.severity = options.severity || 'medium'; // low, medium, high, critical
    }

    scanFile(filePath) {
        if (!this.enabled) return { passed: true, vulnerabilities: [] };

        const vulnerabilities = [];
        const content = fs.readFileSync(filePath, 'utf8');

        // OWASP Top 10 checks
        vulnerabilities.push(...this._checkInjection(content, filePath));
        vulnerabilities.push(...this._checkAuthentication(content, filePath));
        vulnerabilities.push(...this._checkSensitiveData(content, filePath));
        vulnerabilities.push(...this._checkXXE(content, filePath));
        vulnerabilities.push(...this._checkAccessControl(content, filePath));
        vulnerabilities.push(...this._checkSecurityMisconfig(content, filePath));
        vulnerabilities.push(...this._checkXSS(content, filePath));
        vulnerabilities.push(...this._checkDeserialization(content, filePath));
        vulnerabilities.push(...this._checkDependencies(content, filePath));
        vulnerabilities.push(...this._checkLogging(content, filePath));

        return {
            passed: vulnerabilities.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
            vulnerabilities,
            stats: {
                total: vulnerabilities.length,
                critical: vulnerabilities.filter(v => v.severity === 'critical').length,
                high: vulnerabilities.filter(v => v.severity === 'high').length,
                medium: vulnerabilities.filter(v => v.severity === 'medium').length,
                low: vulnerabilities.filter(v => v.severity === 'low').length
            }
        };
    }

    _checkInjection(content, file) {
        const issues = [];

        // SQL Injection patterns
        if (content.match(/query\s*=\s*['"`][^'"`]*\$\{.*?\}|query\s*\+\s*\w+/)) {
            issues.push({
                type: 'sql-injection',
                severity: 'critical',
                message: 'Potential SQL injection vulnerability',
                recommendation: 'Use parameterized queries or ORM',
                cwe: 'CWE-89'
            });
        }

        // Command Injection
        if (content.match(/exec\(|execSync\(|spawn\([^)]*\$\{|system\(/)) {
            issues.push({
                type: 'command-injection',
                severity: 'critical',
                message: 'Potential command injection vulnerability',
                recommendation: 'Sanitize inputs, use allowlists, avoid shell execution',
                cwe: 'CWE-78'
            });
        }

        // Path Traversal
        if (content.match(/readFile\([^)]*\$\{|readFileSync\([^)]*\+|\.\.\/\.\.\//)) {
            issues.push({
                type: 'path-traversal',
                severity: 'high',
                message: 'Potential path traversal vulnerability',
                recommendation: 'Validate and sanitize file paths, use path.resolve()',
                cwe: 'CWE-22'
            });
        }

        return issues;
    }

    _checkAuthentication(content, file) {
        const issues = [];

        // Hardcoded credentials
        const credPatterns = [
            /password\s*=\s*['"][^'"]+['"]/i,
            /api[_-]?key\s*=\s*['"][^'"]+['"]/i,
            /secret\s*=\s*['"][^'"]+['"]/i,
            /token\s*=\s*['"][A-Za-z0-9+\/=]{20,}['"]/
        ];

        for (const pattern of credPatterns) {
            if (pattern.test(content)) {
                issues.push({
                    type: 'hardcoded-credentials',
                    severity: 'critical',
                    message: 'Hardcoded credentials detected',
                    recommendation: 'Use environment variables or secure vault',
                    cwe: 'CWE-798'
                });
                break;
            }
        }

        // Weak crypto
        if (content.match(/crypto\.(createCipher|createDecipher)/)) {
            issues.push({
                type: 'weak-crypto',
                severity: 'high',
                message: 'Deprecated crypto functions',
                recommendation: 'Use createCipheriv/createDecipheriv with strong algorithms',
                cwe: 'CWE-327'
            });
        }

        return issues;
    }

    _checkSensitiveData(content, file) {
        const issues = [];

        // Logging sensitive data
        if (content.match(/console\.(log|debug|info)\([^)]*(?:password|token|secret|key)/i)) {
            issues.push({
                type: 'sensitive-data-logging',
                severity: 'high',
                message: 'Sensitive data may be logged',
                recommendation: 'Sanitize logs, never log credentials',
                cwe: 'CWE-532'
            });
        }

        return issues;
    }

    _checkXXE(content, file) {
        const issues = [];

        // XML External Entity
        if (content.match(/new\s+DOMParser|parseXML|xmldom/)) {
            issues.push({
                type: 'xxe',
                severity: 'high',
                message: 'Potential XXE vulnerability in XML parsing',
                recommendation: 'Disable external entities in XML parser',
                cwe: 'CWE-611'
            });
        }

        return issues;
    }

    _checkAccessControl(content, file) {
        const issues = [];

        // Missing authorization checks
        if (content.match(/router\.(get|post|put|delete)/) && !content.match(/auth|isAuth|checkAuth|requireAuth/)) {
            issues.push({
                type: 'missing-auth',
                severity: 'medium',
                message: 'Route without apparent authorization check',
                recommendation: 'Add authentication/authorization middleware',
                cwe: 'CWE-862'
            });
        }

        return issues;
    }

    _checkSecurityMisconfig(content, file) {
        const issues = [];

        // Debug mode in production
        if (content.match(/debug\s*:\s*true|DEBUG\s*=\s*true/)) {
            issues.push({
                type: 'debug-enabled',
                severity: 'medium',
                message: 'Debug mode may be enabled',
                recommendation: 'Disable debug in production',
                cwe: 'CWE-489'
            });
        }

        // CORS misconfiguration
        if (content.match(/Access-Control-Allow-Origin['"]?\s*:\s*['"]\*['"]/)) {
            issues.push({
                type: 'cors-misconfiguration',
                severity: 'medium',
                message: 'Overly permissive CORS policy',
                recommendation: 'Restrict CORS to specific origins',
                cwe: 'CWE-942'
            });
        }

        return issues;
    }

    _checkXSS(content, file) {
        const issues = [];

        // innerHTML/dangerouslySetInnerHTML
        if (content.match(/innerHTML\s*=|dangerouslySetInnerHTML/)) {
            issues.push({
                type: 'xss',
                severity: 'high',
                message: 'Potential XSS vulnerability',
                recommendation: 'Sanitize HTML, use textContent or safe rendering',
                cwe: 'CWE-79'
            });
        }

        return issues;
    }

    _checkDeserialization(content, file) {
        const issues = [];

        // Unsafe deserialization
        if (content.match(/eval\(|Function\(|new Function|vm\.runInNewContext/)) {
            issues.push({
                type: 'code-injection',
                severity: 'critical',
                message: 'Unsafe code execution detected',
                recommendation: 'Avoid eval(), use safe alternatives like JSON.parse',
                cwe: 'CWE-94'
            });
        }

        return issues;
    }

    _checkDependencies(content, file) {
        const issues = [];

        // Outdated/vulnerable packages would need package.json analysis
        // This is a placeholder for integration with npm audit

        return issues;
    }

    _checkLogging(content, file) {
        const issues = [];

        // Insufficient logging
        if (content.match(/catch\s*\([^)]*\)\s*\{\s*\}/) || content.match(/\.catch\(\s*\(\)\s*=>\s*\{\s*\}\)/)) {
            issues.push({
                type: 'insufficient-logging',
                severity: 'low',
                message: 'Empty catch block - errors not logged',
                recommendation: 'Log errors for monitoring and debugging',
                cwe: 'CWE-778'
            });
        }

        return issues;
    }

    generateReport(results) {
        const lines = [];
        lines.push('╔════════════════════════════════════════════════════════════════╗');
        lines.push('║           SECURITY SCAN REPORT (OWASP)                        ║');
        lines.push('╚════════════════════════════════════════════════════════════════╝');
        lines.push('');

        if (results.vulnerabilities.length === 0) {
            lines.push('✅ No security issues detected!');
            return lines.join('\n');
        }

        lines.push(`Total vulnerabilities: ${results.stats.total}`);
        lines.push(`  🔴 Critical: ${results.stats.critical}`);
        lines.push(`  🟠 High: ${results.stats.high}`);
        lines.push(`  🟡 Medium: ${results.stats.medium}`);
        lines.push(`  🟢 Low: ${results.stats.low}`);
        lines.push('');

        const grouped = this._groupByType(results.vulnerabilities);
        for (const [type, vulns] of Object.entries(grouped)) {
            lines.push(`${type.toUpperCase().replace(/-/g, ' ')} (${vulns.length})`);
            for (const vuln of vulns.slice(0, 3)) { // Show max 3 per type
                const icon = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }[vuln.severity];
                lines.push(`  ${icon} ${vuln.message}`);
                lines.push(`     CWE: ${vuln.cwe}`);
                lines.push(`     Fix: ${vuln.recommendation}`);
            }
            if (vulns.length > 3) {
                lines.push(`  ... and ${vulns.length - 3} more`);
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    _groupByType(vulnerabilities) {
        const grouped = {};
        for (const vuln of vulnerabilities) {
            if (!grouped[vuln.type]) grouped[vuln.type] = [];
            grouped[vuln.type].push(vuln);
        }
        return grouped;
    }
}

module.exports = SecurityScanner;
