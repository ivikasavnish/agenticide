// Skill Executor - Executes different types of skills
// Supports: AI-Prompt, Script, MCP, Composite

const chalk = require('chalk');

class SkillExecutor {
    constructor(skillsCenter) {
        this.skillsCenter = skillsCenter;
    }

    /**
     * Execute a skill
     * @param {Object} skill - Skill definition
     * @param {Object} inputs - Input values
     * @param {Object} context - Execution context
     * @returns {Promise<Object>} Execution result
     */
    async execute(skill, inputs, context) {
        const startTime = Date.now();

        try {
            let result;

            switch (skill.execution.type) {
                case 'ai-prompt':
                    result = await this._executeAIPrompt(skill, inputs, context);
                    break;

                case 'script':
                    result = await this._executeScript(skill, inputs, context);
                    break;

                case 'mcp':
                    result = await this._executeMCP(skill, inputs, context);
                    break;

                case 'composite':
                    result = await this._executeComposite(skill, inputs, context);
                    break;

                default:
                    throw new Error(`Unsupported execution type: ${skill.execution.type}`);
            }

            const duration = Date.now() - startTime;
            console.log(chalk.gray(`✓ Executed ${skill.name} in ${duration}ms`));

            return result;
        } catch (error) {
            throw new Error(`Execution failed: ${error.message}`);
        }
    }

    /**
     * Execute AI-prompt skill
     */
    async _executeAIPrompt(skill, inputs, context) {
        const { prompt, model, temperature, maxTokens } = skill.execution;

        // Interpolate variables in prompt
        let finalPrompt = this._interpolate(prompt, inputs);

        // Add few-shot examples if provided
        if (context.fewShot && context.fewShot.length > 0) {
            const examplesText = this._formatFewShotExamples(context.fewShot);
            finalPrompt = examplesText + '\n\n' + finalPrompt;
        }

        // Call AI provider
        if (!this.skillsCenter.aiProvider) {
            throw new Error('AI provider not available');
        }

        const response = await this.skillsCenter.aiProvider.complete({
            prompt: finalPrompt,
            model: model || 'claude-sonnet-4',
            temperature: temperature || 0.7,
            maxTokens: maxTokens || 2000
        });

        // Parse response based on skill outputs
        return this._parseAIResponse(response, skill.outputs);
    }

    /**
     * Execute script skill
     */
    async _executeScript(skill, inputs, context) {
        const { language, code } = skill.execution;

        if (language === 'javascript') {
            return await this._executeJavaScript(code, inputs, context);
        } else if (language === 'shell') {
            return await this._executeShell(code, inputs, context);
        } else {
            throw new Error(`Unsupported script language: ${language}`);
        }
    }

    /**
     * Execute JavaScript code
     */
    async _executeJavaScript(code, inputs, context) {
        try {
            // Create function from code
            const fn = new Function('inputs', 'context', code);
            const result = await fn(inputs, context);
            return result;
        } catch (error) {
            throw new Error(`JavaScript execution error: ${error.message}`);
        }
    }

    /**
     * Execute shell command
     */
    async _executeShell(code, inputs, context) {
        const { spawn } = require('child_process');

        return new Promise((resolve, reject) => {
            // Interpolate variables in command
            const command = this._interpolate(code, inputs);

            const child = spawn('sh', ['-c', command]);
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            child.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            child.on('close', (exitCode) => {
                if (exitCode !== 0) {
                    reject(new Error(`Command failed with exit code ${exitCode}: ${stderr}`));
                } else {
                    resolve({ stdout, stderr, exitCode });
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to execute command: ${error.message}`));
            });
        });
    }

    /**
     * Execute MCP skill
     */
    async _executeMCP(skill, inputs, context) {
        if (!this.skillsCenter.mcpClient) {
            throw new Error('MCP client not available');
        }

        const { tool, mapping } = skill.execution;

        // Map inputs
        const mcpInputs = {};
        if (mapping && mapping.inputs) {
            for (const [mcpKey, skillKey] of Object.entries(mapping.inputs)) {
                mcpInputs[mcpKey] = this._interpolate(skillKey, inputs);
            }
        } else {
            // Direct mapping
            Object.assign(mcpInputs, inputs);
        }

        // Call MCP tool
        const mcpResult = await this.skillsCenter.mcpClient.callTool(tool, mcpInputs);

        // Map outputs
        let result = mcpResult;
        if (mapping && mapping.outputs) {
            result = {};
            for (const [skillKey, mcpKey] of Object.entries(mapping.outputs)) {
                result[skillKey] = this._getNestedValue(mcpResult, mcpKey);
            }
        }

        return result;
    }

    /**
     * Execute composite skill (chain of skills)
     */
    async _executeComposite(skill, inputs, context) {
        const { steps } = skill.execution;
        let currentData = { ...inputs };

        for (const step of steps) {
            const stepSkill = step.skill;
            const stepInputs = this._mapStepInputs(step.inputs || {}, currentData);

            // Execute step
            const stepResult = await this.skillsCenter.execute(stepSkill, stepInputs, context);

            // Merge results
            currentData = { ...currentData, ...stepResult };
        }

        return currentData;
    }

    /**
     * Interpolate variables in text
     */
    _interpolate(text, variables) {
        if (typeof text !== 'string') return text;

        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key] !== undefined ? variables[key] : match;
        });
    }

    /**
     * Format few-shot examples
     */
    _formatFewShotExamples(examples) {
        let text = 'Here are some examples:\n\n';
        
        examples.forEach((ex, idx) => {
            text += `Example ${idx + 1}:\n`;
            text += `Input: ${JSON.stringify(ex.input)}\n`;
            text += `Output: ${JSON.stringify(ex.output)}\n`;
            if (ex.explanation) {
                text += `Explanation: ${ex.explanation}\n`;
            }
            text += '\n';
        });

        return text;
    }

    /**
     * Parse AI response based on expected outputs
     */
    _parseAIResponse(response, outputs) {
        // Try to parse as JSON first
        try {
            const parsed = JSON.parse(response);
            return parsed;
        } catch {
            // Not JSON, try to extract fields
            const result = {};

            for (const output of outputs || []) {
                // Try to find field in response
                const regex = new RegExp(`${output.name}:\\s*(.+)`, 'i');
                const match = response.match(regex);
                
                if (match) {
                    result[output.name] = match[1].trim();
                }
            }

            // If no fields extracted, return full response
            if (Object.keys(result).length === 0) {
                return { response };
            }

            return result;
        }
    }

    /**
     * Get nested value from object
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            return current?.[key];
        }, obj);
    }

    /**
     * Map step inputs from current data
     */
    _mapStepInputs(inputsMapping, currentData) {
        const inputs = {};
        
        for (const [key, value] of Object.entries(inputsMapping)) {
            if (typeof value === 'string' && value.startsWith('{{') && value.endsWith('}}')) {
                const varName = value.slice(2, -2);
                inputs[key] = currentData[varName];
            } else {
                inputs[key] = value;
            }
        }

        return inputs;
    }
}

module.exports = SkillExecutor;
