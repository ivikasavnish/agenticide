// Extension Manager - Plugin system for Agenticide
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

/**
 * Base Extension Interface
 * All extensions must implement these methods
 */
class Extension {
    constructor() {
        this.name = 'base-extension';
        this.version = '1.0.0';
        this.description = 'Base extension class';
        this.author = 'Agenticide';
        this.enabled = false;
        this.commands = [];
        this.hooks = [];
    }

    /**
     * Install extension (one-time setup)
     */
    async install() {
        throw new Error('install() must be implemented by extension');
    }

    /**
     * Enable extension
     */
    async enable() {
        this.enabled = true;
        return { success: true };
    }

    /**
     * Disable extension
     */
    async disable() {
        this.enabled = false;
        return { success: true };
    }

    /**
     * Register commands with chat
     */
    registerCommands() {
        return this.commands;
    }

    /**
     * Register hooks with HookManager
     */
    registerHooks() {
        return this.hooks;
    }

    /**
     * Get extension info
     */
    getInfo() {
        return {
            name: this.name,
            version: this.version,
            description: this.description,
            author: this.author,
            enabled: this.enabled,
            commands: this.commands.map(c => c.name),
            hooks: this.hooks.map(h => h.name)
        };
    }
}

/**
 * Extension Manager
 * Loads, enables, disables, and manages extensions
 */
class ExtensionManager {
    constructor(options = {}) {
        this.extensionsDir = options.extensionsDir || path.join(
            __dirname,
            '..',
            'extensions'
        );
        
        this.configFile = options.configFile || path.join(
            process.env.HOME || process.env.USERPROFILE,
            '.agenticide',
            'extensions.json'
        );

        this.extensions = new Map();
        this.loadedExtensions = [];
        
        // Ensure directories exist
        if (!fs.existsSync(this.extensionsDir)) {
            fs.mkdirSync(this.extensionsDir, { recursive: true });
        }
        
        const configDir = path.dirname(this.configFile);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
    }

    /**
     * Load all extensions from directory
     */
    async loadExtensions() {
        try {
            const files = fs.readdirSync(this.extensionsDir)
                .filter(f => f.endsWith('.js') && !f.startsWith('.'));

            for (const file of files) {
                try {
                    await this.loadExtension(file.replace('.js', ''));
                } catch (error) {
                    console.error(chalk.red(`Failed to load extension ${file}: ${error.message}`));
                }
            }

            // Load enabled status from config
            this.loadConfig();

            return {
                success: true,
                loaded: this.loadedExtensions.length
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load single extension
     */
    async loadExtension(name) {
        try {
            const extensionPath = path.join(this.extensionsDir, `${name}.js`);
            
            if (!fs.existsSync(extensionPath)) {
                throw new Error(`Extension file not found: ${extensionPath}`);
            }

            // Clear require cache to allow reloading
            delete require.cache[require.resolve(extensionPath)];
            
            const ExtensionClass = require(extensionPath);
            const extension = new ExtensionClass();

            // Validate extension
            if (!(extension instanceof Extension)) {
                throw new Error('Extension must extend Extension base class');
            }

            this.extensions.set(name, extension);
            this.loadedExtensions.push(name);

            return {
                success: true,
                extension: extension.getInfo()
            };
        } catch (error) {
            throw new Error(`Failed to load extension ${name}: ${error.message}`);
        }
    }

    /**
     * Register extension programmatically
     */
    registerExtension(extension) {
        if (!(extension instanceof Extension)) {
            throw new Error('Extension must extend Extension base class');
        }

        this.extensions.set(extension.name, extension);
        this.loadedExtensions.push(extension.name);

        return {
            success: true,
            extension: extension.getInfo()
        };
    }

    /**
     * Enable extension
     */
    async enableExtension(name) {
        const extension = this.extensions.get(name);
        
        if (!extension) {
            return {
                success: false,
                error: `Extension '${name}' not found`
            };
        }

        if (extension.enabled) {
            return {
                success: true,
                message: `Extension '${name}' already enabled`
            };
        }

        try {
            const result = await extension.enable();
            
            if (result.success) {
                this.saveConfig();
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Disable extension
     */
    async disableExtension(name) {
        const extension = this.extensions.get(name);
        
        if (!extension) {
            return {
                success: false,
                error: `Extension '${name}' not found`
            };
        }

        if (!extension.enabled) {
            return {
                success: true,
                message: `Extension '${name}' already disabled`
            };
        }

        try {
            const result = await extension.disable();
            
            if (result.success) {
                this.saveConfig();
            }

            return result;
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get extension
     */
    getExtension(name) {
        return this.extensions.get(name);
    }

    /**
     * List all extensions
     */
    listExtensions() {
        return Array.from(this.extensions.values()).map(ext => ext.getInfo());
    }

    /**
     * Get all commands from enabled extensions
     */
    getAllCommands() {
        const commands = [];
        
        for (const extension of this.extensions.values()) {
            if (extension.enabled) {
                commands.push(...extension.registerCommands());
            }
        }

        return commands;
    }

    /**
     * Get all hooks from enabled extensions
     */
    getAllHooks() {
        const hooks = [];
        
        for (const extension of this.extensions.values()) {
            if (extension.enabled) {
                hooks.push(...extension.registerHooks());
            }
        }

        return hooks;
    }

    /**
     * Load config from file
     */
    loadConfig() {
        try {
            if (fs.existsSync(this.configFile)) {
                const config = JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
                
                for (const [name, settings] of Object.entries(config.extensions || {})) {
                    const extension = this.extensions.get(name);
                    if (extension && settings.enabled) {
                        extension.enabled = true;
                    }
                }
            }
        } catch (error) {
            console.error(chalk.yellow(`Warning: Could not load extension config: ${error.message}`));
        }
    }

    /**
     * Save config to file
     */
    saveConfig() {
        try {
            const config = {
                extensions: {}
            };

            for (const [name, extension] of this.extensions) {
                config.extensions[name] = {
                    enabled: extension.enabled,
                    version: extension.version
                };
            }

            fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2));
        } catch (error) {
            console.error(chalk.yellow(`Warning: Could not save extension config: ${error.message}`));
        }
    }

    /**
     * Display extensions in formatted table
     */
    displayExtensions() {
        const extensions = this.listExtensions();
        
        if (extensions.length === 0) {
            console.log(chalk.gray('\n  No extensions loaded\n'));
            return;
        }

        console.log(chalk.cyan('\n🧩 Available Extensions:\n'));
        
        extensions.forEach((ext, index) => {
            const num = chalk.gray(`${index + 1}.`);
            const name = chalk.bold(ext.name);
            const status = ext.enabled 
                ? chalk.green('✓ Enabled') 
                : chalk.gray('○ Disabled');
            const version = chalk.gray(`v${ext.version}`);
            
            console.log(`  ${num} ${name} ${version} ${status}`);
            console.log(`     ${chalk.gray(ext.description)}`);
            
            if (ext.commands.length > 0) {
                console.log(`     ${chalk.gray('Commands:')} ${ext.commands.join(', ')}`);
            }
            
            console.log();
        });
    }

    /**
     * Get extension statistics
     */
    getStatistics() {
        const extensions = this.listExtensions();
        
        return {
            total: extensions.length,
            enabled: extensions.filter(e => e.enabled).length,
            disabled: extensions.filter(e => !e.enabled).length,
            totalCommands: extensions.reduce((sum, e) => sum + e.commands.length, 0),
            totalHooks: extensions.reduce((sum, e) => sum + e.hooks.length, 0)
        };
    }
}

module.exports = { Extension, ExtensionManager };
