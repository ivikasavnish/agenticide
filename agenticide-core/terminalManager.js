const { spawn } = require('child_process');
const EventEmitter = require('events');

/**
 * TerminalManager - Manage foreground and background terminals
 * Supports multiple terminals per project with state tracking
 */
class TerminalManager extends EventEmitter {
    constructor(projectIndex) {
        super();
        this.projectIndex = projectIndex;
        this.terminals = new Map(); // pid -> terminal info
    }

    /**
     * Create a new terminal (foreground or background)
     */
    createTerminal(projectId, options = {}) {
        const {
            name = `Terminal ${Date.now()}`,
            command = process.env.SHELL || '/bin/bash',
            args = [],
            cwd,
            background = false,
            env = process.env
        } = options;

        const terminal = spawn(command, args, {
            cwd,
            env,
            stdio: background ? ['pipe', 'pipe', 'pipe'] : 'inherit',
            detached: background
        });

        const terminalInfo = {
            id: terminal.pid,
            pid: terminal.pid,
            projectId,
            name,
            command: `${command} ${args.join(' ')}`,
            type: background ? 'background' : 'foreground',
            status: 'active',
            output: [],
            createdAt: Date.now(),
            process: terminal
        };

        this.terminals.set(terminal.pid, terminalInfo);

        // Save to database
        const stmt = this.projectIndex.db.prepare(`
            INSERT INTO project_terminals (project_id, name, type, pid, command, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(projectId, name, terminalInfo.type, terminal.pid, terminalInfo.command, 'active', Date.now());

        // Handle output for background terminals
        if (background) {
            terminal.stdout.on('data', (data) => {
                const output = data.toString();
                terminalInfo.output.push({ type: 'stdout', data: output, timestamp: Date.now() });
                this.emit('terminal:output', { pid: terminal.pid, type: 'stdout', data: output });
            });

            terminal.stderr.on('data', (data) => {
                const output = data.toString();
                terminalInfo.output.push({ type: 'stderr', data: output, timestamp: Date.now() });
                this.emit('terminal:output', { pid: terminal.pid, type: 'stderr', data: output });
            });
        }

        // Handle exit
        terminal.on('exit', (code) => {
            terminalInfo.status = 'exited';
            terminalInfo.exitCode = code;
            terminalInfo.exitedAt = Date.now();

            // Update database
            const updateStmt = this.projectIndex.db.prepare(
                'UPDATE project_terminals SET status = ? WHERE pid = ?'
            );
            updateStmt.run('exited', terminal.pid);

            this.emit('terminal:exit', { pid: terminal.pid, code });
        });

        this.emit('terminal:created', terminalInfo);
        return terminalInfo;
    }

    /**
     * Send command to background terminal
     */
    sendCommand(pid, command) {
        const terminal = this.terminals.get(pid);
        if (!terminal || terminal.type !== 'background') {
            throw new Error('Terminal not found or not a background terminal');
        }

        terminal.process.stdin.write(command + '\n');
    }

    /**
     * Get terminal output
     */
    getOutput(pid, options = {}) {
        const terminal = this.terminals.get(pid);
        if (!terminal) {
            throw new Error('Terminal not found');
        }

        let output = terminal.output;

        if (options.since) {
            output = output.filter(o => o.timestamp >= options.since);
        }

        if (options.type) {
            output = output.filter(o => o.type === options.type);
        }

        if (options.tail) {
            output = output.slice(-options.tail);
        }

        return output;
    }

    /**
     * List terminals for a project
     */
    listTerminals(projectId) {
        const stmt = this.projectIndex.db.prepare(
            'SELECT * FROM project_terminals WHERE project_id = ? ORDER BY created_at DESC'
        );
        return stmt.all(projectId);
    }

    /**
     * Kill terminal
     */
    killTerminal(pid) {
        const terminal = this.terminals.get(pid);
        if (!terminal) {
            throw new Error('Terminal not found');
        }

        terminal.process.kill();
        this.terminals.delete(pid);

        // Update database
        const stmt = this.projectIndex.db.prepare(
            'UPDATE project_terminals SET status = ? WHERE pid = ?'
        );
        stmt.run('killed', pid);
    }

    /**
     * Get terminal info
     */
    getTerminal(pid) {
        return this.terminals.get(pid);
    }

    /**
     * Run command in background and return immediately
     */
    async runBackground(projectId, command, options = {}) {
        const { name = `BG: ${command}`, cwd } = options;
        
        const [cmd, ...args] = command.split(' ');
        const terminal = this.createTerminal(projectId, {
            name,
            command: cmd,
            args,
            cwd,
            background: true
        });

        return terminal;
    }

    /**
     * Run command and wait for completion
     */
    async runForeground(projectId, command, options = {}) {
        const { name = `FG: ${command}`, cwd } = options;
        
        const [cmd, ...args] = command.split(' ');
        const terminal = this.createTerminal(projectId, {
            name,
            command: cmd,
            args,
            cwd,
            background: false
        });

        return new Promise((resolve, reject) => {
            terminal.process.on('exit', (code) => {
                if (code === 0) {
                    resolve({ code, output: terminal.output });
                } else {
                    reject(new Error(`Command exited with code ${code}`));
                }
            });

            terminal.process.on('error', reject);
        });
    }

    /**
     * Cleanup all terminals
     */
    cleanup() {
        for (const [pid, terminal] of this.terminals.entries()) {
            if (terminal.status === 'active') {
                terminal.process.kill();
            }
        }
        this.terminals.clear();
    }
}

module.exports = TerminalManager;
