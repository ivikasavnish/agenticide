// Debugger Extension - Simple debugging utilities
const { Extension } = require('../core/extensionManager');
const { execSync } = require('child_process');

class DebuggerExtension extends Extension {
    constructor() {
        super();
        this.name = 'debugger';
        this.version = '1.0.0';
        this.description = 'Debugging utilities and helpers';
        this.author = 'Agenticide';
        this.commands = [{ name: 'debug', description: 'Debug commands', usage: '/debug <action>' }];
    }

    async install() {
        return { success: true };
    }

    async enable() {
        this.enabled = true;
        return { success: true };
    }

    async execute(action, args) {
        try {
            switch (action) {
                case 'inspect':
                    return this.inspectVariable(args.join(' '));
                case 'trace':
                    return this.traceExecution(args[0]);
                case 'log':
                    return this.viewLogs(args[0]);
                default:
                    return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    inspectVariable(varName) {
        return {
            success: true,
            message: `Inspecting: ${varName}`,
            note: 'Run node --inspect to enable full debugging'
        };
    }

    traceExecution(file) {
        return {
            success: true,
            message: `Tracing: ${file}`,
            note: 'Use: node --trace-warnings ' + file
        };
    }

    viewLogs(file = 'app.log') {
        try {
            const content = execSync(`tail -n 50 ${file}`, { encoding: 'utf8' });
            return {
                success: true,
                logs: content
            };
        } catch (error) {
            return {
                success: false,
                error: `Cannot read logs: ${error.message}`
            };
        }
    }
}

module.exports = DebuggerExtension;
