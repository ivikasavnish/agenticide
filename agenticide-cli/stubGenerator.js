// Stub Generator - Creates empty code structures with function stubs using AI
const fs = require('fs');
const path = require('path');
const { CODING_STYLES, API_ANNOTATIONS, TEST_TEMPLATES } = require('./codingStandards');

// Example structures to guide AI (not hard templates)
const STRUCTURE_EXAMPLES = {
    service: {
        description: 'CRUD service with business logic layer',
        patterns: ['service', 'repository interface', 'models', 'handlers/controllers'],
        operations: ['Create', 'Read/Get', 'Update', 'Delete', 'List'],
        includes: ['error handling', 'dependency injection', 'interfaces']
    },
    api: {
        description: 'REST API with routes and handlers',
        patterns: ['router', 'handlers', 'middleware', 'models', 'requests/responses'],
        operations: ['POST', 'GET', 'PUT', 'DELETE', 'PATCH'],
        includes: ['validation', 'error handling', 'JSON serialization']
    },
    library: {
        description: 'Reusable library module',
        patterns: ['main module', 'utilities', 'types/interfaces', 'tests'],
        operations: ['core functions', 'helpers', 'converters'],
        includes: ['exports', 'documentation', 'type safety']
    }
};

// Language-specific conventions (lightweight guidance)
const LANGUAGE_CONVENTIONS = {
    go: {
        fileExt: '.go',
        todoMarker: '// TODO: Implement',
        fileNaming: 'snake_case',
        structNaming: 'PascalCase',
        functionNaming: 'PascalCase',
        errorHandling: 'explicit return errors',
        packageStructure: 'package-per-module'
    },
    rust: {
        fileExt: '.rs',
        todoMarker: 'unimplemented!',
        fileNaming: 'snake_case',
        structNaming: 'PascalCase',
        functionNaming: 'snake_case',
        errorHandling: 'Result<T, Error>',
        packageStructure: 'mod.rs with submodules'
    },
    typescript: {
        fileExt: '.ts',
        todoMarker: 'throw new Error',
        fileNaming: 'camelCase',
        structNaming: 'PascalCase',
        functionNaming: 'camelCase',
        errorHandling: 'throw errors or Promise.reject',
        packageStructure: 'ES6 modules with exports'
    },
    javascript: {
        fileExt: '.js',
        todoMarker: 'throw new Error',
        fileNaming: 'camelCase',
        structNaming: 'PascalCase',
        functionNaming: 'camelCase',
        errorHandling: 'throw errors or Promise.reject',
        packageStructure: 'CommonJS or ES6 modules'
    },
    python: {
        fileExt: '.py',
        todoMarker: 'raise NotImplementedError',
        fileNaming: 'snake_case',
        structNaming: 'PascalCase',
        functionNaming: 'snake_case',
        errorHandling: 'raise exceptions',
        packageStructure: '__init__.py with submodules'
    },
    java: {
        fileExt: '.java',
        todoMarker: 'throw new UnsupportedOperationException',
        fileNaming: 'PascalCase',
        structNaming: 'PascalCase',
        functionNaming: 'camelCase',
        errorHandling: 'throw exceptions',
        packageStructure: 'package with class-per-file'
    },
    csharp: {
        fileExt: '.cs',
        todoMarker: 'throw new NotImplementedException',
        fileNaming: 'PascalCase',
        structNaming: 'PascalCase',
        functionNaming: 'PascalCase',
        errorHandling: 'throw exceptions',
        packageStructure: 'namespace with class-per-file'
    }
};

class StubGenerator {
    constructor(aiAgent = null) {
        this.aiAgent = aiAgent; // AI agent for dynamic generation
        this.conventions = LANGUAGE_CONVENTIONS;
        this.examples = STRUCTURE_EXAMPLES;
        this.codingStyles = CODING_STYLES;
        this.apiAnnotations = API_ANNOTATIONS;
        this.testTemplates = TEST_TEMPLATES;
    }

    /**
     * Generate stubs for a module using AI
     * @param {string} moduleName - Name of the module
     * @param {string} language - Programming language
     * @param {string} type - Module type (service, api, library)
     * @param {string} basePath - Base directory path
     * @param {string} customRequirements - Additional requirements
     * @param {object} options - Generation options
     * @param {string} options.style - Coding style (google, airbnb, uber, microsoft, rust, pep8)
     * @param {boolean} options.withTests - Generate test cases
     * @param {boolean} options.withAnnotations - Add API annotations
     */
    async generateModule(moduleName, language, type = 'service', basePath = '.', customRequirements = null, options = {}) {
        const lang = language.toLowerCase();
        const convention = this.conventions[lang];
        
        if (!convention) {
            throw new Error(`Unsupported language: ${language}`);
        }

        const structure = this.examples[type];
        if (!structure) {
            throw new Error(`Unsupported module type: ${type}`);
        }

        const moduleDir = path.join(basePath, 'src', moduleName);
        
        // Create directory
        if (!fs.existsSync(moduleDir)) {
            fs.mkdirSync(moduleDir, { recursive: true });
        }

        // Set default options
        const generationOptions = {
            style: options.style || this._detectDefaultStyle(language),
            withTests: options.withTests !== false, // Default true
            withAnnotations: options.withAnnotations !== false, // Default true
            ...options
        };

        // Build AI prompt for stub generation
        const prompt = this._buildStubPrompt(
            moduleName, 
            language, 
            type, 
            structure, 
            convention, 
            customRequirements,
            generationOptions
        );
        
        // Generate stubs using AI
        const response = await this._generateWithAI(prompt);
        
        // Parse AI response and create files
        const files = this._parseAndCreateFiles(response, moduleDir, convention);

        return {
            module: moduleName,
            language,
            type,
            directory: moduleDir,
            files,
            totalStubs: files.reduce((sum, f) => sum + f.stubs, 0)
        };
    }

    /**
     * Detect default coding style for language
     */
    _detectDefaultStyle(language) {
        const styleMap = {
            go: 'google',
            javascript: 'airbnb',
            typescript: 'airbnb',
            python: 'pep8',
            rust: 'rust',
            csharp: 'microsoft',
            java: 'google'
        };
        return styleMap[language] || 'google';
    }

    /**
     * Build prompt for AI to generate stubs
     */
    _buildStubPrompt(moduleName, language, type, structure, convention, customRequirements, options) {
        const style = this.codingStyles[options.style];
        const apiAnnotation = this.apiAnnotations[language];
        const testTemplate = this._getTestTemplate(language, options.style);

        let prompt = `Generate professional stub code for a ${type} module in ${language}.

MODULE: ${moduleName}
TYPE: ${type}
DESCRIPTION: ${structure.description}

REQUIREMENTS:
- Create ${structure.patterns.join(', ')}
- Include ${structure.operations.join(', ')} operations
- Must have: ${structure.includes.join(', ')}
${customRequirements ? `- Additional: ${customRequirements}` : ''}

LANGUAGE CONVENTIONS for ${language}:
- File extension: ${convention.fileExt}
- TODO marker: ${convention.todoMarker}
- File naming: ${convention.fileNaming}
- Struct naming: ${convention.structNaming}
- Function naming: ${convention.functionNaming}
- Error handling: ${convention.errorHandling}
- Package structure: ${convention.packageStructure}

CODING STYLE: ${style.name}
- Indentation: ${style.features.indentation} (${style.features.indentSize} ${style.features.indentation})
- Line length: ${style.features.lineLength} characters
- Function naming: ${style.features.naming.functions}
- Constants: ${style.features.naming.constants}
- Comments: ${style.features.comments}
- Documentation: ${style.features.documentation}
- Error handling: ${style.features.errorHandling}
- Testing: ${style.features.testing}
`;

        // Add API annotations section if enabled
        if (options.withAnnotations && apiAnnotation) {
            prompt += `
API ANNOTATIONS (Required for all public APIs):
${apiAnnotation.example}

Use these markers consistently:
${Object.entries(apiAnnotation.markers).map(([key, val]) => `- ${key}: ${val}`).join('\n')}
`;
        }

        // Add test generation section if enabled
        if (options.withTests && testTemplate) {
            prompt += `
TEST CASES (Required):
Generate comprehensive test files following ${testTemplate.name}.

Test structure: ${testTemplate.patterns.structure}
Test naming: ${testTemplate.patterns.naming}
Assertions: ${testTemplate.patterns.assertions}

For each function, generate tests for:
1. Happy path (successful execution)
2. Edge cases (empty input, nil/null, boundary values)
3. Error cases (invalid input, authorization failures)

Example test structure:
${testTemplate.example}

Test files should be named: <filename>_test${convention.fileExt} (Go), <filename>.test${convention.fileExt} (JS/TS), test_<filename>${convention.fileExt} (Python/Rust)
`;
        }

        prompt += `
CRITICAL RULES:
1. ALL functions must be EMPTY stubs with ${convention.todoMarker}
2. Include proper imports and package declarations
3. Add comprehensive type definitions and interfaces
4. Follow ${style.name} strictly
${options.withAnnotations ? '5. Add API annotations for all public functions' : ''}
${options.withTests ? '6. Generate test files with stub test cases' : ''}
7. Each file should be syntactically valid but NOT implemented
8. Include constructor/factory methods where appropriate
9. Add proper error return types

OUTPUT FORMAT:
Provide ONLY the code files in this format:

=== FILE: <filename>${convention.fileExt} ===
<complete file content>

=== FILE: <filename>_test${convention.fileExt} ===
<complete test file content>

Do NOT include explanations, only the files.`;

        return prompt;
    }

    /**
     * Get test template for language and style
     */
    _getTestTemplate(language, style) {
        // Map language to test framework
        if (language === 'go') return this.testTemplates.google;
        if (['javascript', 'typescript'].includes(language)) return this.testTemplates.jest;
        if (language === 'python') return this.testTemplates.pytest;
        if (language === 'rust') return this.testTemplates.rust;
        return this.testTemplates.google; // fallback
    }

    /**
     * Generate stubs using AI agent
     */
    async _generateWithAI(prompt) {
        if (!this.aiAgent) {
            throw new Error('AI agent not initialized. Pass aiAgent to StubGenerator constructor.');
        }

        try {
            const response = await this.aiAgent.sendMessage(prompt, {
                context: { operation: 'stub_generation' }
            });
            return response;
        } catch (error) {
            throw new Error(`AI generation failed: ${error.message}`);
        }
    }

    /**
     * Parse AI response and create files
     */
    _parseAndCreateFiles(response, moduleDir, convention) {
        const files = [];
        
        // Split response into files using === FILE: marker
        const fileRegex = /=== FILE: ([^\s]+) ===\s*\n([\s\S]*?)(?=\n=== FILE:|$)/g;
        let match;
        
        while ((match = fileRegex.exec(response)) !== null) {
            const filename = match[1];
            let content = match[2].trim();
            
            // Remove markdown code blocks if present
            content = content.replace(/^```[\w]*\n|```$/g, '').trim();
            
            const filePath = path.join(moduleDir, filename);
            fs.writeFileSync(filePath, content);
            
            // Count stubs
            const stubs = this.detectStubs(filePath);
            
            files.push({
                path: filePath,
                name: filename,
                stubs: stubs.length,
                stubList: stubs
            });
        }

        if (files.length === 0) {
            throw new Error('AI did not generate any files. Check response format.');
        }

        return files;
    }

    /**
     * Detect stubs in a file
     */
    detectStubs(filePath) {
        const content = fs.readFileSync(filePath, 'utf8');
        const ext = path.extname(filePath);
        const stubs = [];

        // Detect TODO comments
        const todoRegex = /\/\/ TODO: Implement (\w+)|# TODO: Implement (\w+)|\/\*\* TODO: Implement (\w+)/g;
        let match;
        while ((match = todoRegex.exec(content)) !== null) {
            stubs.push({
                name: match[1] || match[2] || match[3],
                implemented: false,
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // Detect unimplemented! macro (Rust)
        const unimplRegex = /unimplemented!\("(\w+)/g;
        while ((match = unimplRegex.exec(content)) !== null) {
            stubs.push({
                name: match[1],
                implemented: false,
                line: content.substring(0, match.index).split('\n').length
            });
        }

        // Detect NotImplementedError (Python)
        const notImplRegex = /raise NotImplementedError\("(\w+)/g;
        while ((match = notImplRegex.exec(content)) !== null) {
            stubs.push({
                name: match[1],
                implemented: false,
                line: content.substring(0, match.index).split('\n').length
            });
        }

        return stubs;
    }

    /**
     * Check if a function is implemented
     */
    isImplemented(filePath, functionName) {
        const stubs = this.detectStubs(filePath);
        const stub = stubs.find(s => s.name === functionName);
        return !stub || stub.implemented;
    }

    /**
     * List all stubs in a directory
     */
    listStubs(dirPath) {
        const results = [];
        
        const scan = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                    scan(fullPath);
                } else if (entry.isFile() && this.isSourceFile(entry.name)) {
                    const stubs = this.detectStubs(fullPath);
                    if (stubs.length > 0) {
                        results.push({
                            file: fullPath,
                            stubs
                        });
                    }
                }
            }
        };
        
        scan(dirPath);
        return results;
    }

    isSourceFile(filename) {
        const ext = path.extname(filename);
        return ['.go', '.rs', '.ts', '.js', '.py', '.java', '.cs', '.cpp', '.c', '.h'].includes(ext);
    }

    /**
     * Get supported languages
     */
    getSupportedLanguages() {
        return Object.keys(this.conventions);
    }

    /**
     * Get supported module types
     */
    getSupportedTypes() {
        return Object.keys(this.examples);
    }
}

module.exports = { StubGenerator, STRUCTURE_EXAMPLES, LANGUAGE_CONVENTIONS };
