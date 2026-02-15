// Git Integration - Manages branches and commits for stub workflow
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GitIntegration {
    constructor(projectPath = '.') {
        this.projectPath = projectPath;
    }

    /**
     * Check if directory is a Git repository
     */
    isGitRepo() {
        try {
            execSync('git rev-parse --git-dir', { 
                cwd: this.projectPath,
                stdio: 'ignore' 
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get current branch name
     */
    getCurrentBranch() {
        try {
            return execSync('git rev-parse --abbrev-ref HEAD', {
                cwd: this.projectPath,
                encoding: 'utf8'
            }).trim();
        } catch (error) {
            return null;
        }
    }

    /**
     * Get Git status
     */
    getStatus() {
        try {
            const status = execSync('git status --porcelain', {
                cwd: this.projectPath,
                encoding: 'utf8'
            });
            
            const files = status.split('\n').filter(Boolean).map(line => {
                const statusCode = line.substring(0, 2);
                const filePath = line.substring(3);
                return {
                    status: this._parseStatusCode(statusCode),
                    path: filePath
                };
            });
            
            return {
                clean: files.length === 0,
                files
            };
        } catch (error) {
            return { clean: true, files: [] };
        }
    }

    _parseStatusCode(code) {
        const map = {
            'M ': 'modified',
            ' M': 'modified',
            'A ': 'added',
            'D ': 'deleted',
            'R ': 'renamed',
            '??': 'untracked',
            'MM': 'modified'
        };
        return map[code] || 'unknown';
    }

    /**
     * Create a new feature branch for stub work
     */
    createStubBranch(moduleName) {
        if (!this.isGitRepo()) {
            throw new Error('Not a Git repository');
        }

        const baseBranch = this.getCurrentBranch();
        const timestamp = new Date().toISOString().split('T')[0];
        const branchName = `feature/stub-${moduleName}-${timestamp}`;

        try {
            // Create and checkout new branch
            execSync(`git checkout -b ${branchName}`, {
                cwd: this.projectPath,
                stdio: 'pipe'
            });

            return {
                branch: branchName,
                baseBranch,
                created: true
            };
        } catch (error) {
            throw new Error(`Failed to create branch: ${error.message}`);
        }
    }

    /**
     * Commit stub files
     */
    commitStubs(moduleName, files, options = {}) {
        if (!this.isGitRepo()) {
            return { committed: false, reason: 'not a git repo' };
        }

        try {
            // Add files
            files.forEach(file => {
                execSync(`git add "${file}"`, {
                    cwd: this.projectPath,
                    stdio: 'pipe'
                });
            });

            // Create commit message
            const style = options.style || 'default';
            const features = [];
            if (options.withTests) features.push('tests');
            if (options.withAnnotations) features.push('annotations');
            
            const featuresStr = features.length > 0 ? ` with ${features.join(' + ')}` : '';
            const message = `feat: Add ${moduleName} stubs (${style} style)${featuresStr}

Generated stub structure for ${moduleName} module:
- ${files.length} files created
- Language: ${options.language || 'unknown'}
- Type: ${options.type || 'service'}
${options.withTests ? '- Test cases included' : ''}
${options.withAnnotations ? '- API annotations included' : ''}

[agenticide stub-first workflow]`;

            execSync(`git commit -m "${message}"`, {
                cwd: this.projectPath,
                stdio: 'pipe'
            });

            const commitHash = execSync('git rev-parse --short HEAD', {
                cwd: this.projectPath,
                encoding: 'utf8'
            }).trim();

            return {
                committed: true,
                commit: commitHash,
                branch: this.getCurrentBranch(),
                files: files.length
            };
        } catch (error) {
            return {
                committed: false,
                reason: error.message
            };
        }
    }

    /**
     * Commit implementation changes
     */
    commitImplementation(functionName, files) {
        if (!this.isGitRepo()) {
            return { committed: false };
        }

        try {
            // Add files
            files.forEach(file => {
                execSync(`git add "${file}"`, {
                    cwd: this.projectPath,
                    stdio: 'pipe'
                });
            });

            const message = `feat: Implement ${functionName}

Implemented ${functionName} function with:
- Production-ready code
- Error handling
${files.some(f => f.includes('test')) ? '- Test cases' : ''}

[agenticide implement]`;

            execSync(`git commit -m "${message}"`, {
                cwd: this.projectPath,
                stdio: 'pipe'
            });

            const commitHash = execSync('git rev-parse --short HEAD', {
                cwd: this.projectPath,
                encoding: 'utf8'
            }).trim();

            return {
                committed: true,
                commit: commitHash,
                branch: this.getCurrentBranch()
            };
        } catch (error) {
            return {
                committed: false,
                reason: error.message
            };
        }
    }

    /**
     * Get list of branches
     */
    listBranches() {
        try {
            const output = execSync('git branch', {
                cwd: this.projectPath,
                encoding: 'utf8'
            });

            return output.split('\n')
                .filter(Boolean)
                .map(line => ({
                    name: line.replace('* ', '').trim(),
                    current: line.startsWith('*')
                }));
        } catch (error) {
            return [];
        }
    }

    /**
     * Switch to a branch
     */
    checkoutBranch(branchName) {
        try {
            execSync(`git checkout ${branchName}`, {
                cwd: this.projectPath,
                stdio: 'pipe'
            });
            return { success: true, branch: branchName };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Create a tag for milestone
     */
    createTag(tagName, message) {
        try {
            execSync(`git tag -a ${tagName} -m "${message}"`, {
                cwd: this.projectPath,
                stdio: 'pipe'
            });
            return { success: true, tag: tagName };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get uncommitted changes
     */
    getUncommittedChanges() {
        const status = this.getStatus();
        return status.files;
    }

    /**
     * Check if there are uncommitted changes
     */
    hasUncommittedChanges() {
        const status = this.getStatus();
        return !status.clean;
    }
}

module.exports = { GitIntegration };
