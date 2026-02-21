// Skill Validator - Validates skill definitions

class SkillValidator {
    constructor() {
        this.requiredFields = ['name', 'version', 'description', 'execution'];
        this.validExecutionTypes = ['ai-prompt', 'script', 'mcp', 'composite'];
        this.validInputTypes = ['string', 'number', 'boolean', 'array', 'object', 'enum'];
    }

    /**
     * Validate complete skill definition
     * @param {Object} skill - Skill to validate
     * @returns {boolean} True if valid
     * @throws {Error} If invalid
     */
    validate(skill) {
        this.validateMetadata(skill);
        this.validateInputs(skill.inputs);
        this.validateOutputs(skill.outputs);
        this.validateExecution(skill.execution);
        this.validateExamples(skill.examples);
        this.validateDependencies(skill.dependencies);
        return true;
    }

    /**
     * Validate skill metadata
     */
    validateMetadata(skill) {
        // Check required fields
        for (const field of this.requiredFields) {
            if (!skill[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate version format
        if (!/^\d+\.\d+\.\d+$/.test(skill.version)) {
            throw new Error(`Invalid version format: ${skill.version} (expected: X.Y.Z)`);
        }

        // Validate category if present
        if (skill.category && typeof skill.category !== 'string') {
            throw new Error('Category must be a string');
        }
    }

    /**
     * Validate inputs
     */
    validateInputs(inputs) {
        if (!inputs) return; // Inputs are optional

        if (!Array.isArray(inputs)) {
            throw new Error('Inputs must be an array');
        }

        for (const input of inputs) {
            if (!input.name) {
                throw new Error('Input must have a name');
            }

            if (!input.type) {
                throw new Error(`Input ${input.name} must have a type`);
            }

            if (!this.validInputTypes.includes(input.type)) {
                throw new Error(`Invalid input type: ${input.type}. Must be one of: ${this.validInputTypes.join(', ')}`);
            }

            // Enum validation
            if (input.type === 'enum') {
                if (!input.values || !Array.isArray(input.values) || input.values.length === 0) {
                    throw new Error(`Enum input ${input.name} must have values array`);
                }
            }

            // Required must be boolean
            if (input.required !== undefined && typeof input.required !== 'boolean') {
                throw new Error(`Input ${input.name}: required must be boolean`);
            }
        }
    }

    /**
     * Validate outputs
     */
    validateOutputs(outputs) {
        if (!outputs) return; // Outputs are optional

        if (!Array.isArray(outputs)) {
            throw new Error('Outputs must be an array');
        }

        for (const output of outputs) {
            if (!output.name) {
                throw new Error('Output must have a name');
            }

            if (!output.type) {
                throw new Error(`Output ${output.name} must have a type`);
            }
        }
    }

    /**
     * Validate execution configuration
     */
    validateExecution(execution) {
        if (!execution.type) {
            throw new Error('Execution must have a type');
        }

        if (!this.validExecutionTypes.includes(execution.type)) {
            throw new Error(`Invalid execution type: ${execution.type}. Must be one of: ${this.validExecutionTypes.join(', ')}`);
        }

        // Type-specific validation
        switch (execution.type) {
            case 'ai-prompt':
                this.validateAIPromptExecution(execution);
                break;
            case 'script':
                this.validateScriptExecution(execution);
                break;
            case 'mcp':
                this.validateMCPExecution(execution);
                break;
            case 'composite':
                this.validateCompositeExecution(execution);
                break;
        }
    }

    validateAIPromptExecution(execution) {
        if (!execution.prompt) {
            throw new Error('AI-prompt execution must have a prompt');
        }

        if (typeof execution.prompt !== 'string') {
            throw new Error('Prompt must be a string');
        }

        // Optional fields validation
        if (execution.model && typeof execution.model !== 'string') {
            throw new Error('Model must be a string');
        }

        if (execution.temperature !== undefined) {
            if (typeof execution.temperature !== 'number' || execution.temperature < 0 || execution.temperature > 2) {
                throw new Error('Temperature must be a number between 0 and 2');
            }
        }
    }

    validateScriptExecution(execution) {
        if (!execution.code) {
            throw new Error('Script execution must have code');
        }

        if (!execution.language) {
            throw new Error('Script execution must have a language');
        }

        const validLanguages = ['javascript', 'shell'];
        if (!validLanguages.includes(execution.language)) {
            throw new Error(`Invalid script language: ${execution.language}. Must be one of: ${validLanguages.join(', ')}`);
        }
    }

    validateMCPExecution(execution) {
        if (!execution.tool) {
            throw new Error('MCP execution must have a tool');
        }

        if (typeof execution.tool !== 'string') {
            throw new Error('MCP tool must be a string');
        }

        // Validate mapping if present
        if (execution.mapping) {
            if (typeof execution.mapping !== 'object') {
                throw new Error('MCP mapping must be an object');
            }

            if (execution.mapping.inputs && typeof execution.mapping.inputs !== 'object') {
                throw new Error('MCP input mapping must be an object');
            }

            if (execution.mapping.outputs && typeof execution.mapping.outputs !== 'object') {
                throw new Error('MCP output mapping must be an object');
            }
        }
    }

    validateCompositeExecution(execution) {
        if (!execution.steps || !Array.isArray(execution.steps)) {
            throw new Error('Composite execution must have steps array');
        }

        if (execution.steps.length === 0) {
            throw new Error('Composite execution must have at least one step');
        }

        for (const step of execution.steps) {
            if (!step.skill) {
                throw new Error('Composite step must have a skill');
            }

            if (typeof step.skill !== 'string') {
                throw new Error('Step skill must be a string');
            }
        }
    }

    /**
     * Validate examples
     */
    validateExamples(examples) {
        if (!examples) return; // Examples are optional

        if (!Array.isArray(examples)) {
            throw new Error('Examples must be an array');
        }

        for (const example of examples) {
            if (!example.input) {
                throw new Error('Example must have input');
            }

            if (!example.output) {
                throw new Error('Example must have output');
            }

            if (typeof example.input !== 'object') {
                throw new Error('Example input must be an object');
            }

            if (typeof example.output !== 'object') {
                throw new Error('Example output must be an object');
            }
        }
    }

    /**
     * Validate dependencies
     */
    validateDependencies(dependencies) {
        if (!dependencies) return; // Dependencies are optional

        if (!Array.isArray(dependencies)) {
            throw new Error('Dependencies must be an array');
        }

        for (const dep of dependencies) {
            if (!dep.name) {
                throw new Error('Dependency must have a name');
            }

            if (typeof dep.name !== 'string') {
                throw new Error('Dependency name must be a string');
            }

            if (dep.optional !== undefined && typeof dep.optional !== 'boolean') {
                throw new Error('Dependency optional must be boolean');
            }
        }
    }

    /**
     * Validate skill against schema
     * @param {Object} skill - Skill to validate
     * @param {Object} schema - JSON schema
     * @returns {boolean} True if valid
     */
    validateAgainstSchema(skill, schema) {
        // TODO: Implement JSON schema validation
        return true;
    }
}

module.exports = SkillValidator;
