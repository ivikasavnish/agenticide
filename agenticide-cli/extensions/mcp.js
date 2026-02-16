// MCP Extension - Model Context Protocol
const { Extension } = require('../core/extensionManager');
const fs = require('fs');
const path = require('path');

class MCPExtension extends Extension {
    constructor() {
        super();
        this.name = 'mcp';
        this.version = '1.0.0';
        this.description = 'Model Context Protocol for additional context sources';
        this.author = 'Agenticide';
        this.contextSources = new Map();
        this.commands = [{ name: 'mcp', description: 'MCP context management', usage: '/mcp <action>' }];
    }

    async install() {
        // Register default context sources
        this.registerContextSource('filesystem', this.getFilesystemContext.bind(this));
        this.registerContextSource('git', this.getGitContext.bind(this));
        this.registerContextSource('env', this.getEnvContext.bind(this));
        return { success: true };
    }

    async enable() {
        await this.install();
        this.enabled = true;
        return { success: true };
    }

    async execute(action, args) {
        try {
            switch (action) {
                case 'list':
                    return this.listContextSources();
                case 'get':
                    return await this.getContext(args[0]);
                case 'all':
                    return await this.getAllContext();
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    registerContextSource(name, handler) {
        this.contextSources.set(name, handler);
    }

    listContextSources() {
        return {
            success: true,
            sources: Array.from(this.contextSources.keys())
        };
    }

    async getContext(sourceName) {
        const handler = this.contextSources.get(sourceName);
        if (!handler) {
            return { success: false, error: `Context source '${sourceName}' not found` };
        }

        try {
            const context = await handler();
            return {
                success: true,
                source: sourceName,
                context
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async getAllContext() {
        const contexts = {};
        
        for (const [name, handler] of this.contextSources) {
            try {
                contexts[name] = await handler();
            } catch (error) {
                contexts[name] = { error: error.message };
            }
        }

        return {
            success: true,
            contexts
        };
    }

    async getFilesystemContext() {
        const cwd = process.cwd();
        const files = fs.readdirSync(cwd);
        
        return {
            cwd,
            files: files.slice(0, 20), // First 20 files
            fileCount: files.length
        };
    }

    async getGitContext() {
        try {
            const { execSync } = require('child_process');
            const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
            const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf8' }).trim();
            const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
            
            return {
                branch,
                remoteUrl,
                lastCommit
            };
        } catch (error) {
            return { error: 'Not a git repository' };
        }
    }

    async getEnvContext() {
        return {
            node: process.version,
            platform: process.platform,
            arch: process.arch,
            cwd: process.cwd(),
            home: process.env.HOME || process.env.USERPROFILE
        };
    }
}

module.exports = MCPExtension;
