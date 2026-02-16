// Process Manager Extension - Manage background processes
const { Extension } = require('../core/extensionManager');
const { spawn } = require('child_process');

class ProcessManagerExtension extends Extension {
    constructor() {
        super();
        this.name = 'process';
        this.version = '1.0.0';
        this.description = 'Manage background processes and terminals';
        this.author = 'Agenticide';
        this.processes = new Map();
        this.nextId = 1;
        this.commands = [{ name: 'process', description: 'Process management', usage: '/process <action>' }];
    }

    async install() { return { success: true }; }
    async enable() { this.enabled = true; return { success: true }; }
    
    async disable() {
        for (const [id, procInfo] of this.processes) {
            if (procInfo.process && !procInfo.process.killed) {
                procInfo.process.kill('SIGTERM');
            }
        }
        this.processes.clear();
        this.enabled = false;
        return { success: true };
    }

    async execute(action, args) {
        try {
            switch (action) {
                case 'start': case 'run': return this.startProcess(args.join(' '));
                case 'list': case 'ps': return this.listProcesses();
                case 'logs': case 'output': return this.getProcessOutput(parseInt(args[0]));
                case 'stop': return this.stopProcess(parseInt(args[0]));
                case 'stopall': return this.stopAllProcesses();
                case 'status': return this.getProcessStatus(parseInt(args[0]));
                default: return { success: false, error: `Unknown action: ${action}` };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    startProcess(command) {
        if (!command) return { success: false, error: 'Command required' };

        const processId = this.nextId++;
        const childProcess = spawn(command, { shell: true, detached: false, stdio: ['ignore', 'pipe', 'pipe'] });

        const procInfo = {
            id: processId,
            process: childProcess,
            command: command,
            startTime: new Date(),
            output: [],
            status: 'running',
            exitCode: null
        };

        childProcess.stdout.on('data', (data) => {
            procInfo.output.push({ type: 'stdout', data: data.toString(), timestamp: new Date() });
            if (procInfo.output.length > 1000) procInfo.output.shift();
        });

        childProcess.stderr.on('data', (data) => {
            procInfo.output.push({ type: 'stderr', data: data.toString(), timestamp: new Date() });
            if (procInfo.output.length > 1000) procInfo.output.shift();
        });

        childProcess.on('exit', (code) => {
            procInfo.status = 'exited';
            procInfo.exitCode = code;
            procInfo.endTime = new Date();
        });

        this.processes.set(processId, procInfo);
        return { success: true, message: `Process started: ${command}`, processId, pid: childProcess.pid };
    }

    listProcesses() {
        if (this.processes.size === 0) return { success: true, message: 'No processes running', processes: [] };

        const processesInfo = [];
        for (const [id, procInfo] of this.processes) {
            const uptime = procInfo.status === 'running' ? this.formatDuration(new Date() - procInfo.startTime) : 'exited';
            processesInfo.push({
                id, pid: procInfo.process.pid, command: procInfo.command.substring(0, 50),
                status: procInfo.status, uptime, outputLines: procInfo.output.length
            });
        }
        return { success: true, processes: processesInfo };
    }

    getProcessOutput(processId, tailLines = 50) {
        if (!processId) return { success: false, error: 'Process ID required' };
        const procInfo = this.processes.get(processId);
        if (!procInfo) return { success: false, error: `Process ${processId} not found` };

        const output = procInfo.output.slice(-tailLines);
        const lines = output.map(o => `[${o.type}] ${o.data}`).join('');
        return { success: true, processId, command: procInfo.command, status: procInfo.status, output: lines };
    }

    stopProcess(processId) {
        if (!processId) return { success: false, error: 'Process ID required' };
        const procInfo = this.processes.get(processId);
        if (!procInfo) return { success: false, error: `Process ${processId} not found` };
        if (procInfo.status !== 'running') return { success: false, error: `Process not running` };

        try {
            procInfo.process.kill('SIGTERM');
            procInfo.status = 'stopped';
            return { success: true, message: `Process ${processId} stopped` };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    stopAllProcesses() {
        let stopped = 0;
        for (const [id, procInfo] of this.processes) {
            if (procInfo.status === 'running' && !procInfo.process.killed) {
                try { procInfo.process.kill('SIGTERM'); procInfo.status = 'stopped'; stopped++; } catch {}
            }
        }
        return { success: true, message: `Stopped ${stopped} processes` };
    }

    getProcessStatus(processId) {
        if (!processId) return { success: false, error: 'Process ID required' };
        const procInfo = this.processes.get(processId);
        if (!procInfo) return { success: false, error: `Process ${processId} not found` };

        return {
            success: true,
            process: {
                id: processId, pid: procInfo.process.pid, command: procInfo.command,
                status: procInfo.status, startTime: procInfo.startTime,
                uptime: procInfo.status === 'running' ? this.formatDuration(new Date() - procInfo.startTime) : null,
                exitCode: procInfo.exitCode, outputLines: procInfo.output.length
            }
        };
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        if (seconds < 60) return `${seconds}s`;
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m`;
        return `${Math.floor(minutes / 60)}h`;
    }
}

module.exports = ProcessManagerExtension;
