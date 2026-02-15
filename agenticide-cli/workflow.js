// Workflow System - Define and execute development workflows
const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');

class Workflow {
    constructor(name, description = '') {
        this.name = name;
        this.description = description;
        this.steps = [];
        this.env = {};
        this.onError = 'stop'; // stop, continue, retry
        this.maxRetries = 3;
    }

    /**
     * Add a step to the workflow
     */
    addStep(step) {
        this.steps.push({
            id: `step-${this.steps.length + 1}`,
            name: step.name,
            command: step.command,
            type: step.type || 'shell', // shell, agenticide, function
            condition: step.condition || null, // when to run
            continueOnError: step.continueOnError || false,
            timeout: step.timeout || 300000, // 5 minutes default
            env: step.env || {},
            ...step
        });
        return this;
    }

    /**
     * Set environment variables
     */
    setEnv(env) {
        this.env = { ...this.env, ...env };
        return this;
    }

    /**
     * Set error handling strategy
     */
    setErrorHandling(strategy, maxRetries = 3) {
        this.onError = strategy;
        this.maxRetries = maxRetries;
        return this;
    }

    /**
     * Export to Makefile format
     */
    toMakefile() {
        let makefile = `# Generated Makefile for workflow: ${this.name}\n`;
        makefile += `# ${this.description}\n\n`;

        // Add environment variables
        if (Object.keys(this.env).length > 0) {
            makefile += '# Environment variables\n';
            Object.entries(this.env).forEach(([key, value]) => {
                makefile += `export ${key}=${value}\n`;
            });
            makefile += '\n';
        }

        // Add phony targets
        makefile += '.PHONY: all ' + this.steps.map(s => s.id).join(' ') + '\n\n';

        // Add all target
        makefile += 'all: ' + this.steps.map(s => s.id).join(' ') + '\n\n';

        // Add each step as a target
        this.steps.forEach((step, i) => {
            const deps = i > 0 ? this.steps[i - 1].id : '';
            makefile += `${step.id}: ${deps}\n`;
            makefile += `\t@echo "==> ${step.name}"\n`;
            
            if (step.type === 'shell') {
                makefile += `\t${step.command}\n`;
            } else if (step.type === 'agenticide') {
                makefile += `\tagenticide chat -c "${step.command}"\n`;
            }
            
            makefile += '\n';
        });

        return makefile;
    }

    /**
     * Export to Taskfile format (Task - modern alternative to Make)
     */
    toTaskfile() {
        const taskfile = {
            version: '3',
            vars: this.env,
            tasks: {}
        };

        // Add default task
        taskfile.tasks.default = {
            desc: this.description,
            cmds: this.steps.map(s => ({ task: s.id }))
        };

        // Add each step as a task
        this.steps.forEach((step, i) => {
            taskfile.tasks[step.id] = {
                desc: step.name,
                cmds: [step.command],
                silent: false
            };

            if (i > 0) {
                taskfile.tasks[step.id].deps = [this.steps[i - 1].id];
            }

            if (step.continueOnError) {
                taskfile.tasks[step.id].ignore_error = true;
            }
        });

        return `# Generated Taskfile for workflow: ${this.name}\n` +
               `# ${this.description}\n\n` +
               `version: '3'\n\n` +
               'vars:\n' +
               Object.entries(this.env).map(([k, v]) => `  ${k}: ${v}`).join('\n') + '\n\n' +
               'tasks:\n' +
               Object.entries(taskfile.tasks).map(([name, task]) => {
                   let yaml = `  ${name}:\n`;
                   if (task.desc) yaml += `    desc: "${task.desc}"\n`;
                   if (task.deps) yaml += `    deps: [${task.deps.join(', ')}]\n`;
                   if (task.cmds) {
                       yaml += `    cmds:\n`;
                       task.cmds.forEach(cmd => {
                           if (typeof cmd === 'string') {
                               yaml += `      - ${cmd}\n`;
                           } else if (cmd.task) {
                               yaml += `      - task: ${cmd.task}\n`;
                           }
                       });
                   }
                   if (task.silent) yaml += `    silent: ${task.silent}\n`;
                   if (task.ignore_error) yaml += `    ignore_error: true\n`;
                   return yaml;
               }).join('\n');
    }

    /**
     * Export to package.json scripts
     */
    toPackageScripts() {
        const scripts = {};
        
        // Add workflow script
        scripts[this.name] = this.steps.map(s => `npm run ${s.id}`).join(' && ');
        
        // Add individual step scripts
        this.steps.forEach(step => {
            scripts[step.id] = step.command;
        });

        return scripts;
    }

    /**
     * Convert to JSON
     */
    toJSON() {
        return {
            name: this.name,
            description: this.description,
            steps: this.steps,
            env: this.env,
            onError: this.onError,
            maxRetries: this.maxRetries
        };
    }

    /**
     * Load from JSON
     */
    static fromJSON(json) {
        const workflow = new Workflow(json.name, json.description);
        workflow.steps = json.steps || [];
        workflow.env = json.env || {};
        workflow.onError = json.onError || 'stop';
        workflow.maxRetries = json.maxRetries || 3;
        return workflow;
    }
}

class WorkflowExecutor {
    constructor(workflow, options = {}) {
        this.workflow = workflow;
        this.options = {
            verbose: options.verbose || false,
            dryRun: options.dryRun || false,
            stopOnError: options.stopOnError !== false,
            logFile: options.logFile || null
        };
        this.results = [];
        this.currentStep = 0;
    }

    /**
     * Execute the workflow
     */
    async execute(onProgress = null) {
        const startTime = Date.now();
        this.log(`🚀 Starting workflow: ${this.workflow.name}\n`);

        for (let i = 0; i < this.workflow.steps.length; i++) {
            const step = this.workflow.steps[i];
            this.currentStep = i + 1;

            // Check condition
            if (step.condition && !this.evaluateCondition(step.condition)) {
                this.log(`⏭️  Skipping step ${this.currentStep}/${this.workflow.steps.length}: ${step.name} (condition not met)\n`);
                this.results.push({
                    step: step.id,
                    name: step.name,
                    status: 'skipped',
                    reason: 'condition not met'
                });
                continue;
            }

            this.log(`▶️  Step ${this.currentStep}/${this.workflow.steps.length}: ${step.name}\n`);

            if (onProgress) {
                onProgress({
                    current: this.currentStep,
                    total: this.workflow.steps.length,
                    step: step.name,
                    status: 'running'
                });
            }

            const result = await this.executeStep(step);
            this.results.push(result);

            if (result.status === 'failed' && !step.continueOnError) {
                if (this.options.stopOnError) {
                    this.log(`❌ Workflow failed at step ${this.currentStep}: ${step.name}\n`);
                    break;
                }
            }

            if (onProgress) {
                onProgress({
                    current: this.currentStep,
                    total: this.workflow.steps.length,
                    step: step.name,
                    status: result.status
                });
            }
        }

        const duration = Date.now() - startTime;
        const summary = this.getSummary(duration);
        this.log(`\n${summary.symbol} Workflow ${summary.status} in ${(duration / 1000).toFixed(2)}s\n`);

        return {
            status: summary.status,
            duration,
            results: this.results,
            summary
        };
    }

    /**
     * Execute a single step
     */
    async executeStep(step) {
        const startTime = Date.now();

        if (this.options.dryRun) {
            return {
                step: step.id,
                name: step.name,
                status: 'dry-run',
                command: step.command,
                duration: 0
            };
        }

        try {
            let output = '';
            let error = '';

            if (step.type === 'shell') {
                const result = await this.executeShellCommand(step.command, step.env, step.timeout);
                output = result.stdout;
                error = result.stderr;
                
                if (result.code !== 0) {
                    throw new Error(`Command failed with exit code ${result.code}`);
                }
            } else if (step.type === 'agenticide') {
                output = await this.executeAgenticideCommand(step.command);
            } else if (step.type === 'function') {
                output = await step.fn();
            }

            const duration = Date.now() - startTime;
            this.log(`✅ Completed in ${(duration / 1000).toFixed(2)}s\n`);

            return {
                step: step.id,
                name: step.name,
                status: 'success',
                command: step.command,
                output,
                error,
                duration
            };
        } catch (err) {
            const duration = Date.now() - startTime;
            this.log(`❌ Failed: ${err.message}\n`);

            // Retry logic
            if (step.retry && this.workflow.maxRetries > 0) {
                for (let attempt = 1; attempt <= this.workflow.maxRetries; attempt++) {
                    this.log(`🔄 Retry ${attempt}/${this.workflow.maxRetries}...\n`);
                    const retryResult = await this.executeStep({ ...step, retry: false });
                    if (retryResult.status === 'success') {
                        return retryResult;
                    }
                }
            }

            return {
                step: step.id,
                name: step.name,
                status: 'failed',
                command: step.command,
                error: err.message,
                duration
            };
        }
    }

    /**
     * Execute shell command
     */
    executeShellCommand(command, env = {}, timeout = 300000) {
        return new Promise((resolve, reject) => {
            const fullEnv = { ...process.env, ...this.workflow.env, ...env };
            
            const child = spawn('sh', ['-c', command], {
                env: fullEnv,
                cwd: process.cwd()
            });

            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const output = data.toString();
                stdout += output;
                if (this.options.verbose) {
                    process.stdout.write(output);
                }
            });

            child.stderr.on('data', (data) => {
                const output = data.toString();
                stderr += output;
                if (this.options.verbose) {
                    process.stderr.write(output);
                }
            });

            const timeoutId = setTimeout(() => {
                child.kill();
                reject(new Error(`Command timeout after ${timeout}ms`));
            }, timeout);

            child.on('close', (code) => {
                clearTimeout(timeoutId);
                resolve({ code, stdout, stderr });
            });

            child.on('error', (err) => {
                clearTimeout(timeoutId);
                reject(err);
            });
        });
    }

    /**
     * Execute Agenticide command
     */
    async executeAgenticideCommand(command) {
        // This would integrate with the AI agent
        return `Executed: ${command}`;
    }

    /**
     * Evaluate condition
     */
    evaluateCondition(condition) {
        try {
            // Simple condition evaluation
            // Could be enhanced with more complex logic
            if (typeof condition === 'function') {
                return condition();
            }
            return eval(condition);
        } catch (err) {
            return false;
        }
    }

    /**
     * Get execution summary
     */
    getSummary(duration) {
        const total = this.results.length;
        const success = this.results.filter(r => r.status === 'success').length;
        const failed = this.results.filter(r => r.status === 'failed').length;
        const skipped = this.results.filter(r => r.status === 'skipped').length;

        const status = failed > 0 ? 'failed' : success === total ? 'completed' : 'partial';
        const symbol = status === 'completed' ? '✅' : status === 'failed' ? '❌' : '⚠️';

        return {
            status,
            symbol,
            total,
            success,
            failed,
            skipped,
            duration
        };
    }

    /**
     * Log message
     */
    log(message) {
        if (this.options.logFile) {
            fs.appendFileSync(this.options.logFile, message);
        }
        if (!this.options.dryRun || this.options.verbose) {
            process.stdout.write(message);
        }
    }
}

// Pre-defined workflows for stub-first development
class StubWorkflows {
    /**
     * Create full stub-to-production workflow
     */
    static createFullWorkflow(moduleName, language) {
        const workflow = new Workflow(
            `stub-${moduleName}`,
            `Complete workflow for ${moduleName} module from stub to production`
        );

        workflow
            .addStep({
                name: 'Generate Stubs',
                type: 'agenticide',
                command: `/stub ${moduleName} ${language} service`
            })
            .addStep({
                name: 'Verify Structure',
                type: 'agenticide',
                command: `/verify ${moduleName}`
            })
            .addStep({
                name: 'Implement Functions',
                type: 'agenticide',
                command: `/implement-all ${moduleName}`
            })
            .addStep({
                name: 'Run Tests',
                type: 'shell',
                command: this.getTestCommand(language)
            })
            .addStep({
                name: 'Lint Code',
                type: 'shell',
                command: this.getLintCommand(language)
            })
            .addStep({
                name: 'Build',
                type: 'shell',
                command: this.getBuildCommand(language)
            });

        return workflow;
    }

    /**
     * Create quick prototype workflow
     */
    static createPrototypeWorkflow(moduleName, language) {
        const workflow = new Workflow(
            `prototype-${moduleName}`,
            `Quick prototype workflow for ${moduleName}`
        );

        workflow
            .addStep({
                name: 'Generate Stubs (no tests)',
                type: 'agenticide',
                command: `/stub ${moduleName} ${language} service --no-tests`
            })
            .addStep({
                name: 'Quick Verify',
                type: 'agenticide',
                command: `/verify ${moduleName}`
            });

        return workflow;
    }

    static getTestCommand(language) {
        const commands = {
            go: 'go test ./...',
            rust: 'cargo test',
            typescript: 'npm test',
            javascript: 'npm test',
            python: 'pytest',
            java: 'mvn test',
            csharp: 'dotnet test'
        };
        return commands[language] || 'echo "No test command for this language"';
    }

    static getLintCommand(language) {
        const commands = {
            go: 'golangci-lint run',
            rust: 'cargo clippy',
            typescript: 'eslint .',
            javascript: 'eslint .',
            python: 'pylint **/*.py',
            java: 'mvn checkstyle:check',
            csharp: 'dotnet format --verify-no-changes'
        };
        return commands[language] || 'echo "No lint command for this language"';
    }

    static getBuildCommand(language) {
        const commands = {
            go: 'go build',
            rust: 'cargo build --release',
            typescript: 'npm run build',
            javascript: 'npm run build',
            python: 'python setup.py build',
            java: 'mvn package',
            csharp: 'dotnet build --configuration Release'
        };
        return commands[language] || 'echo "No build command for this language"';
    }
}

module.exports = {
    Workflow,
    WorkflowExecutor,
    StubWorkflows
};
