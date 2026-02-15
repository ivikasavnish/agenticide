// Hook Manager - Extensible hook system for integrating external tools
const chalk = require('chalk');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class HookManager {
    constructor(options = {}) {
        this.hooks = new Map();
        this.config = options.config || this._loadConfig();
        this.verbose = options.verbose || false;
        this._registerBuiltInHooks();
    }

    _loadConfig() {
        // Load hooks from .agenticide/hooks.json
        const configPath = path.join(process.cwd(), '.agenticide', 'hooks.json');
        if (fs.existsSync(configPath)) {
            try {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            } catch (e) {
                console.warn(chalk.yellow(`⚠️  Failed to load hooks config: ${e.message}`));
            }
        }
        return { hooks: {} };
    }

    _registerBuiltInHooks() {
        // Register any built-in hooks from config
        if (this.config.hooks) {
            Object.entries(this.config.hooks).forEach(([hookName, hookConfig]) => {
                if (Array.isArray(hookConfig)) {
                    hookConfig.forEach(hook => this.register(hookName, hook));
                } else {
                    this.register(hookName, hookConfig);
                }
            });
        }
    }

    register(hookName, hookConfig) {
        if (!this.hooks.has(hookName)) {
            this.hooks.set(hookName, []);
        }

        const hook = {
            name: hookConfig.name || 'anonymous',
            type: hookConfig.type || 'command', // command, function, script
            command: hookConfig.command,
            function: hookConfig.function,
            script: hookConfig.script,
            enabled: hookConfig.enabled !== false,
            blocking: hookConfig.blocking !== false, // default: blocking
            timeout: hookConfig.timeout || 30000,
            onError: hookConfig.onError || 'warn' // warn, ignore, fail
        };

        this.hooks.get(hookName).push(hook);
        
        if (this.verbose) {
            console.log(chalk.gray(`  Registered hook: ${hookName} -> ${hook.name}`));
        }

        return hook;
    }

    async execute(hookName, context = {}) {
        const hooks = this.hooks.get(hookName);
        if (!hooks || hooks.length === 0) {
            return { success: true, results: [] };
        }

        if (this.verbose) {
            console.log(chalk.cyan(`\n🔗 Executing hooks: ${hookName}\n`));
        }

        const results = [];

        for (const hook of hooks) {
            if (!hook.enabled) continue;

            try {
                const result = await this._executeHook(hook, context);
                results.push({ hook: hook.name, success: true, result });
                
                if (this.verbose) {
                    console.log(chalk.green(`  ✅ ${hook.name}`));
                }
            } catch (error) {
                const errorResult = { hook: hook.name, success: false, error: error.message };
                results.push(errorResult);

                if (hook.onError === 'fail') {
                    throw new Error(`Hook '${hook.name}' failed: ${error.message}`);
                } else if (hook.onError === 'warn') {
                    console.log(chalk.yellow(`  ⚠️  ${hook.name}: ${error.message}`));
                }
                // 'ignore' - do nothing
            }
        }

        return { success: true, results };
    }

    async _executeHook(hook, context) {
        switch (hook.type) {
            case 'command':
                return this._executeCommand(hook, context);
            case 'function':
                return this._executeFunction(hook, context);
            case 'script':
                return this._executeScript(hook, context);
            default:
                throw new Error(`Unknown hook type: ${hook.type}`);
        }
    }

    async _executeCommand(hook, context) {
        const command = this._interpolate(hook.command, context);
        
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error(`Timeout after ${hook.timeout}ms`));
            }, hook.timeout);

            try {
                const output = execSync(command, {
                    cwd: context.cwd || process.cwd(),
                    encoding: 'utf8',
                    stdio: this.verbose ? 'inherit' : 'pipe',
                    timeout: hook.timeout
                });
                clearTimeout(timeout);
                resolve(output);
            } catch (error) {
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    async _executeFunction(hook, context) {
        if (typeof hook.function !== 'function') {
            throw new Error('Hook function is not a function');
        }
        return hook.function(context);
    }

    async _executeScript(hook, context) {
        const scriptPath = path.resolve(hook.script);
        if (!fs.existsSync(scriptPath)) {
            throw new Error(`Script not found: ${scriptPath}`);
        }

        const command = `node ${scriptPath}`;
        return this._executeCommand({ ...hook, command }, context);
    }

    _interpolate(template, context) {
        // Simple template interpolation: {{variable}}
        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return context[key] !== undefined ? context[key] : match;
        });
    }

    list() {
        const list = [];
        for (const [hookName, hooks] of this.hooks.entries()) {
            list.push({
                name: hookName,
                hooks: hooks.map(h => ({
                    name: h.name,
                    type: h.type,
                    enabled: h.enabled
                }))
            });
        }
        return list;
    }

    clear(hookName) {
        if (hookName) {
            this.hooks.delete(hookName);
        } else {
            this.hooks.clear();
        }
    }
}

// Hook Points (standard hooks)
HookManager.HOOKS = {
    // Stub generation hooks
    PRE_STUB_GENERATION: 'pre-stub-generation',
    POST_STUB_GENERATION: 'post-stub-generation',
    PRE_FILE_WRITE: 'pre-file-write',
    POST_FILE_WRITE: 'post-file-write',
    
    // Git hooks
    PRE_GIT_BRANCH: 'pre-git-branch',
    POST_GIT_BRANCH: 'post-git-branch',
    PRE_GIT_COMMIT: 'pre-git-commit',
    POST_GIT_COMMIT: 'post-git-commit',
    
    // Task hooks
    PRE_TASK_CREATE: 'pre-task-create',
    POST_TASK_CREATE: 'post-task-create',
    PRE_TASK_UPDATE: 'pre-task-update',
    POST_TASK_UPDATE: 'post-task-update',
    
    // Workflow hooks
    PRE_WORKFLOW: 'pre-workflow',
    POST_WORKFLOW: 'post-workflow',
    PRE_WORKFLOW_STEP: 'pre-workflow-step',
    POST_WORKFLOW_STEP: 'post-workflow-step',
    
    // Implementation hooks
    PRE_IMPLEMENT: 'pre-implement',
    POST_IMPLEMENT: 'post-implement',
    
    // Verification hooks
    PRE_VERIFY: 'pre-verify',
    POST_VERIFY: 'post-verify'
};

module.exports = HookManager;
