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

        // Set default options
        const generationOptions = {
            style: options.style || this._detectDefaultStyle(language),
            withTests: options.withTests !== false, // Default true
            withAnnotations: options.withAnnotations !== false, // Default true
            ...options
        };

        // PHASE 1: Generate Plan (AI returns structured plan)
        const plan = await this._generatePlan(
            moduleName,
            language,
            type,
            structure,
            convention,
            customRequirements,
            generationOptions
        );

        // PHASE 2: Execute Plan (Create directories and files)
        const executionResult = await this._executePlan(plan, moduleDir, convention);

        return {
            module: moduleName,
            language,
            type,
            directory: moduleDir,
            plan: plan,
            files: executionResult.files,
            totalStubs: executionResult.files.reduce((sum, f) => sum + f.stubs, 0)
        };
    }

    /**
     * PHASE 1: Generate actionable plan from AI
     * Returns structured JSON plan that can be executed
     */
    async _generatePlan(moduleName, language, type, structure, convention, customRequirements, options) {
        const style = this.codingStyles[options.style];
        
        const planPrompt = `Generate a detailed implementation plan for a ${type} module in ${language}.

MODULE: ${moduleName}
TYPE: ${type}
LANGUAGE: ${language}

REQUIREMENTS:
- Patterns: ${structure.patterns.join(', ')}
- Operations: ${structure.operations.join(', ')}
- Must have: ${structure.includes.join(', ')}
${customRequirements ? `- Additional: ${customRequirements}` : ''}

LANGUAGE CONVENTIONS:
- File extension: ${convention.fileExt}
- File naming: ${convention.fileNaming}
- Function naming: ${convention.functionNaming}
- Package structure: ${convention.packageStructure}

CODING STYLE: ${style.name}

OUTPUT A JSON PLAN with this exact structure:

{
  "module": "${moduleName}",
  "language": "${language}",
  "type": "${type}",
  "directories": [
    "models",
    "handlers",
    "tests"
  ],
  "files": [
    {
      "path": "mod.rs",
      "type": "main",
      "description": "Main module file with exports",
      "functions": [
        {
          "name": "init",
          "signature": "pub fn init() -> Result<(), Error>",
          "description": "Initialize the module",
          "returns": "Result<(), Error>"
        }
      ],
      "structs": [
        {
          "name": "Config",
          "fields": ["host: String", "port: u16"],
          "description": "Configuration structure"
        }
      ],
      "imports": ["std::error::Error"],
      "exports": ["init", "Config"]
    }
  ],
  "dependencies": [
    {
      "name": "tokio",
      "version": "1.0",
      "reason": "Async runtime"
    }
  ],
  "testStrategy": {
    "framework": "rust built-in",
    "coverage": ["unit tests", "integration tests"],
    "files": ["tests/mod_test.rs"]
  }
}

RULES:
1. Include ALL files needed (main, models, handlers, tests, config)
2. Each file must have: path, type, description, functions, structs (if applicable)
3. Each function needs: name, signature, description, returns
4. Specify all imports and exports
5. List dependencies with versions
6. Define test strategy
7. Output ONLY valid JSON, no markdown, no explanations

Generate the complete plan now:`;

        const response = await this._generateWithAI(planPrompt);
        
        // Parse JSON from response
        const plan = this._parsePlanJSON(response);
        
        return plan;
    }

    /**
     * Parse JSON plan from AI response (handles markdown wrapping)
     */
    _parsePlanJSON(response) {
        // Remove markdown code blocks if present
        let jsonStr = response.trim();
        jsonStr = jsonStr.replace(/^```json?\n?/i, '').replace(/\n?```$/,'').trim();
        
        try {
            const plan = JSON.parse(jsonStr);
            
            // Validate required fields
            if (!plan.module || !plan.language || !plan.files) {
                throw new Error('Plan missing required fields: module, language, files');
            }
            
            if (!Array.isArray(plan.files) || plan.files.length === 0) {
                throw new Error('Plan must include at least one file');
            }
            
            return plan;
        } catch (error) {
            throw new Error(`Failed to parse plan JSON: ${error.message}\nResponse: ${jsonStr.substring(0, 200)}`);
        }
    }

    /**
     * PHASE 2: Execute the plan - create directories and files
     */
    async _executePlan(plan, moduleDir, convention) {
        const createdFiles = [];
        
        // Create base module directory
        if (!fs.existsSync(moduleDir)) {
            fs.mkdirSync(moduleDir, { recursive: true });
        }
        
        // Create subdirectories from plan
        if (plan.directories && Array.isArray(plan.directories)) {
            for (const dir of plan.directories) {
                const dirPath = path.join(moduleDir, dir);
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }
            }
        }
        
        // Generate and write each file from plan
        for (const fileSpec of plan.files) {
            const fileContent = this._generateFileFromSpec(fileSpec, plan, convention);
            const filePath = path.join(moduleDir, fileSpec.path);
            
            // Ensure parent directory exists
            const fileDir = path.dirname(filePath);
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }
            
            fs.writeFileSync(filePath, fileContent);
            
            // Count stubs
            const stubs = this.detectStubs(filePath);
            
            createdFiles.push({
                path: filePath,
                name: fileSpec.path,
                type: fileSpec.type,
                description: fileSpec.description,
                stubs: stubs.length,
                stubList: stubs,
                functions: fileSpec.functions?.length || 0,
                structs: fileSpec.structs?.length || 0
            });
        }
        
        return {
            files: createdFiles,
            directories: plan.directories || []
        };
    }

    /**
     * Generate file content from file specification
     */
    _generateFileFromSpec(fileSpec, plan, convention) {
        const lines = [];
        const language = plan.language.toLowerCase();
        
        // Add file header comment
        lines.push(`// ${fileSpec.description || fileSpec.path}`);
        lines.push(`// Generated stub for ${plan.module}`);
        lines.push('');
        
        // Add imports
        if (fileSpec.imports && fileSpec.imports.length > 0) {
            if (language === 'rust') {
                fileSpec.imports.forEach(imp => lines.push(`use ${imp};`));
            } else if (language === 'go') {
                lines.push('import (');
                fileSpec.imports.forEach(imp => lines.push(`\t"${imp}"`));
                lines.push(')');
            } else if (['javascript', 'typescript'].includes(language)) {
                fileSpec.imports.forEach(imp => lines.push(`import ${imp};`));
            } else if (language === 'python') {
                fileSpec.imports.forEach(imp => lines.push(`import ${imp}`));
            }
            lines.push('');
        }
        
        // Add structs/classes
        if (fileSpec.structs && fileSpec.structs.length > 0) {
            fileSpec.structs.forEach(struct => {
                lines.push(`/// ${struct.description || struct.name}`);
                
                if (language === 'rust') {
                    lines.push(`pub struct ${struct.name} {`);
                    if (struct.fields) {
                        struct.fields.forEach(field => lines.push(`    pub ${field},`));
                    }
                    lines.push('}');
                } else if (language === 'go') {
                    lines.push(`type ${struct.name} struct {`);
                    if (struct.fields) {
                        struct.fields.forEach(field => lines.push(`\t${field}`));
                    }
                    lines.push('}');
                } else if (['javascript', 'typescript'].includes(language)) {
                    lines.push(`export class ${struct.name} {`);
                    if (struct.fields) {
                        struct.fields.forEach(field => lines.push(`  ${field};`));
                    }
                    lines.push('}');
                } else if (language === 'python') {
                    lines.push(`class ${struct.name}:`);
                    lines.push(`    """${struct.description || struct.name}"""`);
                    if (struct.fields) {
                        lines.push('    def __init__(self):');
                        struct.fields.forEach(field => {
                            const fieldName = field.split(':')[0].trim();
                            lines.push(`        self.${fieldName} = None`);
                        });
                    } else {
                        lines.push('    pass');
                    }
                }
                lines.push('');
            });
        }
        
        // Add functions
        if (fileSpec.functions && fileSpec.functions.length > 0) {
            fileSpec.functions.forEach(func => {
                lines.push(`/// ${func.description || func.name}`);
                
                if (language === 'rust') {
                    lines.push(`${func.signature} {`);
                    lines.push(`    unimplemented!("${func.name}")`);
                    lines.push('}');
                } else if (language === 'go') {
                    lines.push(`${func.signature} {`);
                    lines.push(`    // TODO: Implement ${func.name}`);
                    lines.push(`    panic("not implemented")`);
                    lines.push('}');
                } else if (language === 'typescript') {
                    lines.push(`${func.signature} {`);
                    lines.push(`    // TODO: Implement ${func.name}`);
                    lines.push(`    throw new Error("Not implemented");`);
                    lines.push('}');
                } else if (language === 'javascript') {
                    lines.push(`${func.signature} {`);
                    lines.push(`    // TODO: Implement ${func.name}`);
                    lines.push(`    throw new Error("Not implemented");`);
                    lines.push('}');
                } else if (language === 'python') {
                    lines.push(`${func.signature}:`);
                    lines.push(`    """${func.description || func.name}"""`);
                    lines.push(`    raise NotImplementedError("${func.name}")`);
                }
                lines.push('');
            });
        }
        
        return lines.join('\n');
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

IMPORTANT: File names should be RELATIVE to the module root (no src/ prefix).
Examples:
- CORRECT: mod.rs, lib.rs, service.go, handler.go
- CORRECT: models/user.rs, handlers/http.go (with subdirectory)
- WRONG: src/websocket/mod.rs, src/models/user.rs (removes src/ prefix)

For Rust: Use mod.rs as the main module file.
For Go: Use <module>.go as the main file.
For Python: Use __init__.py as the package entry.
For TypeScript/JavaScript: Use index.ts/index.js as entry.

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
            let filename = match[1];
            let content = match[2].trim();
            
            // Remove markdown code blocks if present
            content = content.replace(/^```[\w]*\n|```$/g, '').trim();
            
            // Fix: Remove src/<moduleName>/ prefix if AI included it
            // This prevents path duplication like /src/websocket/src/websocket/mod.rs
            const moduleBasename = path.basename(moduleDir);
            const duplicatePrefix = `src/${moduleBasename}/`;
            if (filename.startsWith(duplicatePrefix)) {
                filename = filename.substring(duplicatePrefix.length);
            }
            // Also handle just src/ prefix
            if (filename.startsWith('src/')) {
                filename = filename.substring(4);
            }
            
            const filePath = path.join(moduleDir, filename);
            
            // Ensure parent directory exists
            const fileDir = path.dirname(filePath);
            if (!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir, { recursive: true });
            }
            
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
