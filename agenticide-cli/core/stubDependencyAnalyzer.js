// Stub Dependency Analyzer - Analyzes function dependencies in stubs
const fs = require('fs');
const path = require('path');

class StubDependencyAnalyzer {
    constructor() {
        this.dependencies = new Map(); // function -> Set of dependencies
        this.callGraph = new Map(); // function -> Set of callers
    }

    /**
     * Analyze dependencies in generated stub files
     */
    analyzeModule(moduleDir) {
        const files = this._scanFiles(moduleDir);
        const allFunctions = new Map(); // name -> {file, line, stub}
        
        // First pass: collect all functions
        for (const file of files) {
            const content = fs.readFileSync(file, 'utf8');
            const functions = this._extractFunctions(content, file);
            functions.forEach(fn => allFunctions.set(fn.name, fn));
        }
        
        // Second pass: analyze dependencies
        for (const [name, fn] of allFunctions.entries()) {
            const deps = this._analyzeFunctionDependencies(fn.content, allFunctions);
            this.dependencies.set(name, deps);
            
            // Build reverse graph (callers)
            for (const dep of deps) {
                if (!this.callGraph.has(dep)) {
                    this.callGraph.set(dep, new Set());
                }
                this.callGraph.get(dep).add(name);
            }
        }
        
        return allFunctions;
    }

    /**
     * Get implementation order (leaves first, bottom-up)
     */
    getImplementationOrder(functions) {
        const order = [];
        const visited = new Set();
        const levels = this._computeLevels(functions);
        
        // Sort by level (lowest first) then alphabetically
        const sorted = Array.from(functions.keys()).sort((a, b) => {
            const levelDiff = levels.get(a) - levels.get(b);
            return levelDiff !== 0 ? levelDiff : a.localeCompare(b);
        });
        
        return sorted.map(name => ({
            name,
            level: levels.get(name),
            dependencies: Array.from(this.dependencies.get(name) || []),
            callers: Array.from(this.callGraph.get(name) || [])
        }));
    }

    /**
     * Get dependency graph as text (for /flow visualization)
     */
    getGraphVisualization(functions) {
        const order = this.getImplementationOrder(functions);
        const levels = new Map();
        
        // Group by level
        for (const item of order) {
            if (!levels.has(item.level)) {
                levels.set(item.level, []);
            }
            levels.get(item.level).push(item);
        }
        
        const lines = [];
        lines.push('📊 Implementation Order (Bottom-Up):');
        lines.push('');
        
        const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);
        
        for (const level of sortedLevels) {
            const items = levels.get(level);
            const emoji = level === 0 ? '🟢' : level === 1 ? '🟡' : '🔴';
            lines.push(`${emoji} Level ${level} (${items.length} functions):`);
            lines.push('');
            
            for (const item of items) {
                const deps = item.dependencies.length > 0 
                    ? ` → depends on: ${item.dependencies.join(', ')}`
                    : ' (no dependencies)';
                const callers = item.callers.length > 0
                    ? ` ← called by: ${item.callers.join(', ')}`
                    : '';
                lines.push(`  • ${item.name}${deps}${callers}`);
            }
            lines.push('');
        }
        
        lines.push('💡 Tip: Implement from Level 0 upwards for best results');
        
        return lines.join('\n');
    }

    /**
     * Get ASCII graph visualization
     */
    getAsciiGraph(functions) {
        const order = this.getImplementationOrder(functions);
        const levels = new Map();
        
        // Group by level
        for (const item of order) {
            if (!levels.has(item.level)) {
                levels.set(item.level, []);
            }
            levels.get(item.level).push(item);
        }
        
        const lines = [];
        lines.push('');
        lines.push('╔═══════════════════════════════════════════════╗');
        lines.push('║         Dependency Graph (Bottom-Up)          ║');
        lines.push('╚═══════════════════════════════════════════════╝');
        lines.push('');
        
        const sortedLevels = Array.from(levels.keys()).sort((a, b) => a - b);
        
        for (let i = 0; i < sortedLevels.length; i++) {
            const level = sortedLevels[i];
            const items = levels.get(level);
            const isLast = i === sortedLevels.length - 1;
            
            // Draw level header
            lines.push(`Level ${level}:`);
            
            // Draw functions
            for (let j = 0; j < items.length; j++) {
                const item = items[j];
                const isLastItem = j === items.length - 1;
                const prefix = isLastItem ? '└─' : '├─';
                
                lines.push(`${prefix} ${item.name}`);
                
                // Show dependencies
                if (item.dependencies.length > 0) {
                    const depPrefix = isLastItem ? '  ' : '│ ';
                    for (let k = 0; k < item.dependencies.length; k++) {
                        const dep = item.dependencies[k];
                        const depIsLast = k === item.dependencies.length - 1;
                        const depSymbol = depIsLast ? '└→' : '├→';
                        lines.push(`${depPrefix} ${depSymbol} ${dep}`);
                    }
                }
            }
            
            if (!isLast) {
                lines.push('│');
                lines.push('↑ Implement these first');
                lines.push('│');
            }
        }
        
        lines.push('');
        return lines.join('\n');
    }

    /**
     * Find functions matching pattern
     */
    findMatching(pattern, functions) {
        const regex = this._patternToRegex(pattern);
        const matches = [];
        
        for (const [name, fn] of functions.entries()) {
            if (regex.test(name)) {
                const deps = this.dependencies.get(name) || new Set();
                const callers = this.callGraph.get(name) || new Set();
                matches.push({
                    name,
                    file: fn.file,
                    line: fn.line,
                    dependencies: Array.from(deps),
                    callers: Array.from(callers)
                });
            }
        }
        
        return matches;
    }

    /**
     * Get all functions that should be implemented for a given function
     * (the function + its dependencies, in correct order)
     */
    getImplementationChain(functionName, functions) {
        const chain = [];
        const visited = new Set();
        
        const visit = (name) => {
            if (visited.has(name)) return;
            visited.add(name);
            
            const deps = this.dependencies.get(name) || new Set();
            for (const dep of deps) {
                if (functions.has(dep)) {
                    visit(dep);
                }
            }
            
            if (functions.has(name)) {
                chain.push(name);
            }
        };
        
        visit(functionName);
        return chain;
    }

    // Private methods

    _scanFiles(dir) {
        const files = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
                files.push(...this._scanFiles(fullPath));
            } else if (entry.isFile() && this._isSourceFile(entry.name)) {
                files.push(fullPath);
            }
        }
        
        return files;
    }

    _isSourceFile(filename) {
        const ext = path.extname(filename);
        return ['.rs', '.go', '.ts', '.js', '.py', '.java', '.cs'].includes(ext);
    }

    _extractFunctions(content, file) {
        const functions = [];
        const lines = content.split('\n');
        
        // Patterns for different languages
        const patterns = [
            /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/,  // Rust
            /^func\s+(\w+)/,                         // Go
            /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/, // JS/TS
            /^(?:export\s+)?(?:async\s+)?(\w+)\s*\(/,        // JS/TS arrow
            /^def\s+(\w+)/,                          // Python
            /^(?:public|private|protected)?\s*(?:static\s+)?(?:async\s+)?\w+\s+(\w+)/ // Java/C#
        ];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    const name = match[1];
                    // Get function body (next 20 lines or until closing brace)
                    const body = lines.slice(i, Math.min(i + 20, lines.length)).join('\n');
                    
                    functions.push({
                        name,
                        file,
                        line: i + 1,
                        content: body
                    });
                    break;
                }
            }
        }
        
        return functions;
    }

    _analyzeFunctionDependencies(functionContent, allFunctions) {
        const deps = new Set();
        
        // Look for function calls in the content
        for (const [name, _] of allFunctions.entries()) {
            // Simple heuristic: if function name appears in content followed by (
            const regex = new RegExp(`\\b${name}\\s*\\(`, 'g');
            if (regex.test(functionContent)) {
                deps.add(name);
            }
        }
        
        return deps;
    }

    _computeLevels(functions) {
        const levels = new Map();
        const visited = new Set();
        
        const computeLevel = (name) => {
            if (levels.has(name)) {
                return levels.get(name);
            }
            
            if (visited.has(name)) {
                // Circular dependency, assign high level
                return 999;
            }
            
            visited.add(name);
            
            const deps = this.dependencies.get(name) || new Set();
            if (deps.size === 0) {
                levels.set(name, 0);
                return 0;
            }
            
            let maxDepLevel = -1;
            for (const dep of deps) {
                if (functions.has(dep)) {
                    const depLevel = computeLevel(dep);
                    maxDepLevel = Math.max(maxDepLevel, depLevel);
                }
            }
            
            const level = maxDepLevel + 1;
            levels.set(name, level);
            visited.delete(name);
            return level;
        };
        
        for (const name of functions.keys()) {
            computeLevel(name);
        }
        
        return levels;
    }

    _patternToRegex(pattern) {
        // Convert glob-like pattern to regex
        // * -> .*
        // ? -> .
        let regex = pattern
            .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
            .replace(/\*/g, '.*')                   // * -> .*
            .replace(/\?/g, '.');                   // ? -> .
        
        return new RegExp(`^${regex}$`, 'i');
    }
}

module.exports = StubDependencyAnalyzer;
