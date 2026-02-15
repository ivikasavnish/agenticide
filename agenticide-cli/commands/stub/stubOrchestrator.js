// Stub Orchestrator - Coordinates stub generation with Git, Tasks, and Display
const OutputController = require('../../core/outputController');
const HookManager = require('../../core/hookManager');

class StubOrchestrator {
    constructor(agentManager, options = {}) {
        this.agentManager = agentManager;
        this.output = options.outputController || new OutputController();
        this.hooks = options.hookManager || new HookManager();
        this.stubGen = null;
        this.git = null;
        this.taskTracker = null;
    }

    async generate(spec) {
        const { moduleName, language, type = 'service', outputDir = process.cwd(), requirements, options = {} } = spec;
        
        this._lazyInit(outputDir);
        
        const results = { module: moduleName, steps: [], success: true };
        
        // Execute pre-generation hooks
        await this.hooks.execute(HookManager.HOOKS.PRE_STUB_GENERATION, {
            moduleName,
            language,
            type,
            outputDir,
            requirements
        });
        
        // Step 1: Git branch
        if (options.withGit !== false && this._isGitRepo()) {
            try {
                await this.hooks.execute(HookManager.HOOKS.PRE_GIT_BRANCH, { moduleName, outputDir });
                
                const branchInfo = this.git.createStubBranch(moduleName);
                this.output.success(`✅ Git branch: ${branchInfo.branch}`);
                results.steps.push({ name: 'git-branch', status: 'success', data: branchInfo });
                
                await this.hooks.execute(HookManager.HOOKS.POST_GIT_BRANCH, { 
                    moduleName, 
                    outputDir, 
                    branch: branchInfo.branch 
                });
            } catch (error) {
                this.output.warning(`⚠️ Git branch failed: ${error.message}`);
                results.steps.push({ name: 'git-branch', status: 'failed', error: error.message });
            }
        }
        
        // Step 2: Generate stubs
        try {
            const spinner = this.output.spinner('Generating stubs with AI...');
            spinner.start();
            
            const genResult = await this.stubGen.generateModule(moduleName, language, type, outputDir, requirements, options);
            
            spinner.succeed(`Generated ${genResult.files.length} files with ${genResult.totalStubs} stubs`);
            results.steps.push({ name: 'generate', status: 'success', data: genResult });
            results.genResult = genResult;
        } catch (error) {
            this.output.error(`❌ Generation failed: ${error.message}`);
            results.steps.push({ name: 'generate', status: 'failed', error: error.message });
            results.success = false;
            return results;
        }
        
        // Step 3: Create tasks
        if (options.noTasks !== true && results.genResult) {
            try {
                const taskResult = this.taskTracker.createStubTasks(moduleName, results.genResult.files, {
                    type, language, style: options.style || 'default'
                });
                this.output.success(`✅ Created ${taskResult.totalTasks} tasks`);
                results.steps.push({ name: 'tasks', status: 'success', data: taskResult });
            } catch (error) {
                this.output.warning(`⚠️ Task creation failed: ${error.message}`);
                results.steps.push({ name: 'tasks', status: 'failed', error: error.message });
            }
        }
        
        // Step 4: Git commit
        if (options.withGit !== false && this._isGitRepo() && results.genResult) {
            try {
                const commitResult = this.git.commitStubs(moduleName, results.genResult.files.map(f => f.path), {
                    language, type, style: options.style
                });
                if (commitResult.committed) {
                    this.output.success(`✅ Committed: ${commitResult.commit}`);
                    results.steps.push({ name: 'commit', status: 'success', data: commitResult });
                }
            } catch (error) {
                this.output.warning(`⚠️ Commit failed: ${error.message}`);
                results.steps.push({ name: 'commit', status: 'failed', error: error.message });
            }
        }
        
        // Step 5: Display
        if (results.genResult) {
            this._displayResults(spec, results.genResult);
        }
        
        return results;
    }

    _displayResults(spec, genResult) {
        this.output.displayBox(
            `Module: ${spec.moduleName}\n` +
            `Language: ${spec.language}\n` +
            `Type: ${spec.type}\n` +
            `Files: ${genResult.files.length}\n` +
            `Stubs: ${genResult.totalStubs}`,
            { borderColor: 'green', title: '✅ Complete' }
        );
    }

    _lazyInit(outputDir) {
        if (!this.stubGen) {
            const { StubGenerator } = require('../../stubGenerator');
            this.stubGen = new StubGenerator(this.agentManager);
        }
        if (!this.git) {
            const { GitIntegration } = require('../../gitIntegration');
            this.git = new GitIntegration(outputDir);
        }
        if (!this.taskTracker) {
            const { TaskTracker } = require('../../taskTracker');
            this.taskTracker = new TaskTracker(outputDir);
        }
    }

    _isGitRepo() {
        try {
            require('child_process').execSync('git rev-parse --git-dir', { stdio: 'ignore' });
            return true;
        } catch {
            return false;
        }
    }
}

module.exports = StubOrchestrator;
