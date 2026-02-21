// Function Calling System - Agents call functions (one-shot or streaming)
// Extends A2A protocol with function-as-a-service capabilities
const { Extension } = require('../core/extensionManager');
const { EventEmitter } = require('events');
const chalk = require('chalk');
const crypto = require('crypto');

class FunctionSystemExtension extends Extension {
    constructor() {
        super();
        this.name = 'function-system';
        this.version = '1.0.0';
        this.description = 'Function calling system for agents - one-shot and streaming';
        this.author = 'Agenticide';
        
        // Function registry
        this.functions = new Map();
        this.functionCategories = new Map();
        this.functionExecutions = new Map();
        
        // Streaming state
        this.streams = new Map();
        this.streamSubscribers = new Map();
        
        // Event system
        this.eventBus = new EventEmitter();
        
        // Call tracking
        this.callHistory = [];
        this.activeStreams = new Set();

        this.commands = [
            {
                name: 'function',
                description: 'Manage callable functions',
                usage: '/function <register|list|call|stream>',
                aliases: ['fn', 'func']
            },
            {
                name: 'call',
                description: 'Call a function (one-shot)',
                usage: '/call <function-name> <args...>',
                aliases: ['invoke', 'exec']
            },
            {
                name: 'stream',
                description: 'Start streaming function',
                usage: '/stream <function-name> <args...>',
                aliases: ['subscribe', 'watch']
            },
            {
                name: 'functions',
                description: 'List available functions',
                usage: '/functions [category]',
                aliases: ['fns', 'list-functions']
            }
        ];

        this.hooks = [];
        
        // Register built-in functions
        this.registerBuiltInFunctions();
    }

    async enable() {
        console.log(chalk.green('✓ Function System enabled'));
        console.log(chalk.dim(`  ${this.functions.size} functions available`));
        return { success: true, message: 'Function calling ready' };
    }

    async disable() {
        // Stop all active streams
        for (const streamId of this.activeStreams) {
            await this.stopStream(streamId);
        }
        
        return { success: true, message: 'Function system disabled' };
    }

    registerBuiltInFunctions() {
        // Code generation function (one-shot)
        this.registerFunction({
            name: 'generate-code',
            category: 'code',
            type: 'one-shot',
            description: 'Generate code from description',
            parameters: {
                language: { type: 'string', required: true },
                description: { type: 'string', required: true },
                style: { type: 'string', default: 'clean' }
            },
            handler: this.generateCode.bind(this)
        });

        // File watcher (streaming)
        this.registerFunction({
            name: 'watch-files',
            category: 'filesystem',
            type: 'streaming',
            description: 'Watch files for changes',
            parameters: {
                path: { type: 'string', required: true },
                pattern: { type: 'string', default: '*' }
            },
            handler: this.watchFiles.bind(this)
        });

        // Test runner (streaming)
        this.registerFunction({
            name: 'run-tests',
            category: 'testing',
            type: 'streaming',
            description: 'Run tests with live output',
            parameters: {
                path: { type: 'string', required: true },
                watch: { type: 'boolean', default: false }
            },
            handler: this.runTests.bind(this)
        });

        // Code analysis (one-shot)
        this.registerFunction({
            name: 'analyze-code',
            category: 'code',
            type: 'one-shot',
            description: 'Analyze code quality',
            parameters: {
                file: { type: 'string', required: true },
                checks: { type: 'array', default: ['complexity', 'style', 'bugs'] }
            },
            handler: this.analyzeCode.bind(this)
        });

        // Build watcher (streaming)
        this.registerFunction({
            name: 'watch-build',
            category: 'build',
            type: 'streaming',
            description: 'Watch build process',
            parameters: {
                command: { type: 'string', required: true }
            },
            handler: this.watchBuild.bind(this)
        });

        // API call (one-shot)
        this.registerFunction({
            name: 'call-api',
            category: 'network',
            type: 'one-shot',
            description: 'Make HTTP API call',
            parameters: {
                url: { type: 'string', required: true },
                method: { type: 'string', default: 'GET' },
                data: { type: 'object', default: null }
            },
            handler: this.callAPI.bind(this)
        });

        // Log stream (streaming)
        this.registerFunction({
            name: 'stream-logs',
            category: 'monitoring',
            type: 'streaming',
            description: 'Stream application logs',
            parameters: {
                source: { type: 'string', required: true },
                filter: { type: 'string', default: null }
            },
            handler: this.streamLogs.bind(this)
        });
    }

    async handleCommand(command, args, context) {
        switch (command) {
            case 'function':
            case 'fn':
            case 'func':
                return await this.handleFunction(args, context);
            
            case 'call':
            case 'invoke':
            case 'exec':
                return await this.handleCall(args, context);
            
            case 'stream':
            case 'subscribe':
            case 'watch':
                return await this.handleStream(args, context);
            
            case 'functions':
            case 'fns':
            case 'list-functions':
                return this.listFunctions(args[0]);
            
            default:
                return { success: false, message: `Unknown command: ${command}` };
        }
    }

    async handleFunction(args, context) {
        const action = args[0];
        
        switch (action) {
            case 'register':
                return await this.handleRegister(args.slice(1), context);
            
            case 'list':
                return this.listFunctions(args[1]);
            
            case 'call':
                return await this.handleCall(args.slice(1), context);
            
            case 'stream':
                return await this.handleStream(args.slice(1), context);
            
            case 'info':
                return this.getFunctionInfo(args[1]);
            
            default:
                return {
                    success: false,
                    message: 'Usage: /function <register|list|call|stream|info>'
                };
        }
    }

    async handleRegister(args, context) {
        // Parse function definition from args
        const name = args[0];
        const type = args[1] || 'one-shot';
        
        if (!name) {
            return { success: false, message: 'Function name required' };
        }

        // Register with mock handler
        const func = {
            name,
            type,
            category: 'custom',
            description: `Custom ${type} function`,
            parameters: {},
            handler: async (params) => ({ result: 'Mock response' }),
            registered: Date.now()
        };

        this.registerFunction(func);

        console.log(chalk.green(`\n✓ Function registered: ${name}`));
        console.log(chalk.dim(`  Type: ${type}\n`));

        return { success: true, function: func };
    }

    async handleCall(args, context) {
        const functionName = args[0];
        const params = this.parseParams(args.slice(1));

        if (!functionName) {
            return { success: false, message: 'Function name required' };
        }

        console.log(chalk.blue(`\n📞 Calling function: ${functionName}\n`));
        if (Object.keys(params).length > 0) {
            console.log(chalk.dim(`Parameters:`));
            Object.entries(params).forEach(([key, val]) => {
                console.log(chalk.dim(`  ${key}: ${JSON.stringify(val)}`));
            });
            console.log();
        }

        const result = await this.callFunction(functionName, params, context);

        if (result.success) {
            console.log(chalk.green(`✓ Function completed\n`));
            if (result.data) {
                console.log(chalk.white('Result:'));
                console.log(chalk.gray(JSON.stringify(result.data, null, 2)));
                console.log();
            }
        } else {
            console.log(chalk.red(`✗ Function failed: ${result.error}\n`));
        }

        return result;
    }

    async handleStream(args, context) {
        const functionName = args[0];
        const params = this.parseParams(args.slice(1));

        if (!functionName) {
            return { success: false, message: 'Function name required' };
        }

        console.log(chalk.blue(`\n📡 Starting stream: ${functionName}\n`));

        const stream = await this.streamFunction(functionName, params, context);

        if (stream.success) {
            console.log(chalk.green(`✓ Stream started: ${stream.streamId}\n`));
            console.log(chalk.dim('  Press Ctrl+C to stop\n'));
        }

        return stream;
    }

    // Core Function System
    registerFunction(func) {
        if (!func.name) {
            throw new Error('Function name required');
        }

        const definition = {
            name: func.name,
            type: func.type || 'one-shot',
            category: func.category || 'general',
            description: func.description || '',
            parameters: func.parameters || {},
            handler: func.handler,
            registered: Date.now(),
            callCount: 0,
            streamCount: 0
        };

        this.functions.set(func.name, definition);

        // Add to category
        if (!this.functionCategories.has(definition.category)) {
            this.functionCategories.set(definition.category, []);
        }
        this.functionCategories.get(definition.category).push(func.name);

        return definition;
    }

    async callFunction(functionName, params = {}, context = {}) {
        const func = this.functions.get(functionName);
        
        if (!func) {
            return {
                success: false,
                error: `Function not found: ${functionName}`
            };
        }

        if (func.type !== 'one-shot') {
            return {
                success: false,
                error: `Function ${functionName} is streaming, use /stream instead`
            };
        }

        // Validate parameters
        const validation = this.validateParams(func.parameters, params);
        if (!validation.valid) {
            return {
                success: false,
                error: `Invalid parameters: ${validation.errors.join(', ')}`
            };
        }

        // Create execution context
        const executionId = this.generateExecutionId();
        const execution = {
            id: executionId,
            function: functionName,
            params,
            started: Date.now(),
            status: 'running'
        };

        this.functionExecutions.set(executionId, execution);
        func.callCount++;

        // Track call
        this.callHistory.push({
            function: functionName,
            params,
            timestamp: Date.now(),
            type: 'one-shot'
        });

        // Execute
        try {
            const result = await func.handler(validation.params, context);
            
            execution.status = 'completed';
            execution.completed = Date.now();
            execution.duration = execution.completed - execution.started;
            execution.result = result;

            this.eventBus.emit('function:completed', execution);

            return {
                success: true,
                executionId,
                data: result,
                duration: execution.duration
            };
        } catch (error) {
            execution.status = 'failed';
            execution.error = error.message;
            execution.completed = Date.now();

            this.eventBus.emit('function:failed', execution);

            return {
                success: false,
                executionId,
                error: error.message
            };
        }
    }

    async streamFunction(functionName, params = {}, context = {}) {
        const func = this.functions.get(functionName);
        
        if (!func) {
            return {
                success: false,
                error: `Function not found: ${functionName}`
            };
        }

        if (func.type !== 'streaming') {
            return {
                success: false,
                error: `Function ${functionName} is one-shot, use /call instead`
            };
        }

        // Validate parameters
        const validation = this.validateParams(func.parameters, params);
        if (!validation.valid) {
            return {
                success: false,
                error: `Invalid parameters: ${validation.errors.join(', ')}`
            };
        }

        // Create stream
        const streamId = this.generateStreamId();
        const stream = {
            id: streamId,
            function: functionName,
            params: validation.params,
            started: Date.now(),
            status: 'active',
            events: [],
            subscribers: new Set()
        };

        this.streams.set(streamId, stream);
        this.activeStreams.add(streamId);
        func.streamCount++;

        // Track
        this.callHistory.push({
            function: functionName,
            params,
            timestamp: Date.now(),
            type: 'streaming',
            streamId
        });

        // Start streaming
        this.eventBus.emit('stream:started', stream);

        // Execute with streaming callback
        const streamCallback = (event) => {
            stream.events.push({
                timestamp: Date.now(),
                data: event
            });
            
            this.eventBus.emit('stream:data', {
                streamId,
                event
            });

            // Display event
            this.displayStreamEvent(functionName, event);

            // Notify subscribers
            for (const subscriber of stream.subscribers) {
                subscriber(event);
            }
        };

        // Run handler
        try {
            await func.handler(validation.params, context, streamCallback);
        } catch (error) {
            stream.status = 'failed';
            stream.error = error.message;
            this.eventBus.emit('stream:error', { streamId, error });
        }

        return {
            success: true,
            streamId,
            function: functionName
        };
    }

    async stopStream(streamId) {
        const stream = this.streams.get(streamId);
        if (!stream) {
            return { success: false, error: 'Stream not found' };
        }

        stream.status = 'stopped';
        stream.stopped = Date.now();
        this.activeStreams.delete(streamId);

        this.eventBus.emit('stream:stopped', stream);

        console.log(chalk.yellow(`\n⏸️  Stream stopped: ${streamId}\n`));

        return { success: true };
    }

    // Built-in Function Implementations
    async generateCode(params, context) {
        // Mock code generation
        const code = `// Generated ${params.language} code\n// ${params.description}\n\nfunction example() {\n  return "Hello World";\n}`;
        
        return {
            language: params.language,
            code,
            style: params.style
        };
    }

    async watchFiles(params, context, stream) {
        // Mock file watching
        console.log(chalk.dim(`  Watching: ${params.path}`));
        
        const files = ['file1.js', 'file2.js', 'file3.js'];
        
        for (const file of files) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            stream({
                type: 'file-changed',
                file,
                timestamp: Date.now()
            });
        }
    }

    async runTests(params, context, stream) {
        // Mock test execution
        const tests = [
            { name: 'Test 1', status: 'passed', duration: 123 },
            { name: 'Test 2', status: 'passed', duration: 89 },
            { name: 'Test 3', status: 'failed', duration: 234, error: 'Assertion failed' }
        ];

        for (const test of tests) {
            await new Promise(resolve => setTimeout(resolve, 500));
            stream({
                type: 'test-result',
                ...test
            });
        }

        stream({
            type: 'summary',
            total: tests.length,
            passed: tests.filter(t => t.status === 'passed').length,
            failed: tests.filter(t => t.status === 'failed').length
        });
    }

    async analyzeCode(params, context) {
        // Mock code analysis
        return {
            file: params.file,
            complexity: 12,
            issues: [
                { type: 'style', message: 'Inconsistent indentation', line: 42 },
                { type: 'bug', message: 'Potential null reference', line: 67 }
            ],
            metrics: {
                lines: 234,
                functions: 8,
                classes: 2
            }
        };
    }

    async watchBuild(params, context, stream) {
        // Mock build watching
        const steps = [
            { step: 'clean', status: 'running' },
            { step: 'clean', status: 'completed', duration: 234 },
            { step: 'compile', status: 'running' },
            { step: 'compile', status: 'completed', duration: 2341, files: 45 },
            { step: 'bundle', status: 'running' },
            { step: 'bundle', status: 'completed', duration: 1234, size: '2.3MB' }
        ];

        for (const event of steps) {
            await new Promise(resolve => setTimeout(resolve, 300));
            stream({
                type: 'build-event',
                ...event
            });
        }
    }

    async callAPI(params, context) {
        // Mock API call
        return {
            url: params.url,
            method: params.method,
            status: 200,
            data: { message: 'Success', timestamp: Date.now() }
        };
    }

    async streamLogs(params, context, stream) {
        // Mock log streaming
        const logs = [
            { level: 'info', message: 'Server started on port 3000' },
            { level: 'info', message: 'Connected to database' },
            { level: 'warn', message: 'Slow query detected' },
            { level: 'error', message: 'Failed to connect to cache' },
            { level: 'info', message: 'Request processed: GET /api/users' }
        ];

        for (const log of logs) {
            await new Promise(resolve => setTimeout(resolve, 800));
            stream({
                type: 'log',
                source: params.source,
                ...log,
                timestamp: Date.now()
            });
        }
    }

    // Utilities
    validateParams(schema, params) {
        const validated = {};
        const errors = [];

        for (const [key, spec] of Object.entries(schema)) {
            const value = params[key];

            if (spec.required && value === undefined) {
                errors.push(`Missing required parameter: ${key}`);
                continue;
            }

            if (value === undefined && spec.default !== undefined) {
                validated[key] = spec.default;
                continue;
            }

            if (value !== undefined) {
                validated[key] = value;
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            params: validated
        };
    }

    parseParams(args) {
        const params = {};
        
        args.forEach(arg => {
            if (arg.includes('=')) {
                const [key, value] = arg.split('=');
                try {
                    params[key] = JSON.parse(value);
                } catch {
                    params[key] = value;
                }
            }
        });

        return params;
    }

    listFunctions(category = null) {
        const functions = category
            ? Array.from(this.functions.values()).filter(f => f.category === category)
            : Array.from(this.functions.values());

        if (functions.length === 0) {
            console.log(chalk.dim('\nNo functions available\n'));
            return { success: true, functions: [] };
        }

        console.log(chalk.bold(`\n📦 Available Functions${category ? ` (${category})` : ''}:\n`));

        // Group by category
        const byCategory = {};
        functions.forEach(func => {
            if (!byCategory[func.category]) {
                byCategory[func.category] = [];
            }
            byCategory[func.category].push(func);
        });

        Object.entries(byCategory).forEach(([cat, funcs]) => {
            console.log(chalk.cyan(`  ${cat.toUpperCase()}:`));
            funcs.forEach(func => {
                const typeIcon = func.type === 'streaming' ? '📡' : '📞';
                console.log(chalk.white(`    ${typeIcon} ${func.name}`));
                console.log(chalk.dim(`       ${func.description}`));
                console.log(chalk.dim(`       Type: ${func.type}, Calls: ${func.callCount}`));
            });
            console.log();
        });

        return { success: true, functions };
    }

    getFunctionInfo(functionName) {
        const func = this.functions.get(functionName);
        
        if (!func) {
            return { success: false, error: 'Function not found' };
        }

        console.log(chalk.bold(`\n📦 Function: ${func.name}\n`));
        console.log(chalk.white(`  Type: ${func.type}`));
        console.log(chalk.white(`  Category: ${func.category}`));
        console.log(chalk.white(`  Description: ${func.description}`));
        
        if (Object.keys(func.parameters).length > 0) {
            console.log(chalk.white(`\n  Parameters:`));
            Object.entries(func.parameters).forEach(([key, spec]) => {
                const required = spec.required ? ' (required)' : '';
                const defaultVal = spec.default !== undefined ? ` = ${spec.default}` : '';
                console.log(chalk.dim(`    ${key}: ${spec.type}${required}${defaultVal}`));
            });
        }

        console.log(chalk.white(`\n  Stats:`));
        console.log(chalk.dim(`    Calls: ${func.callCount}`));
        console.log(chalk.dim(`    Streams: ${func.streamCount}`));
        console.log();

        return { success: true, function: func };
    }

    displayStreamEvent(functionName, event) {
        if (event.type === 'file-changed') {
            console.log(chalk.yellow(`  📝 ${event.file} changed`));
        } else if (event.type === 'test-result') {
            const icon = event.status === 'passed' ? '✓' : '✗';
            const color = event.status === 'passed' ? chalk.green : chalk.red;
            console.log(color(`  ${icon} ${event.name} (${event.duration}ms)`));
        } else if (event.type === 'summary') {
            console.log(chalk.bold(`\n  Summary: ${event.passed}/${event.total} passed\n`));
        } else if (event.type === 'build-event') {
            if (event.status === 'running') {
                console.log(chalk.yellow(`  ⏳ ${event.step}...`));
            } else {
                console.log(chalk.green(`  ✓ ${event.step} (${event.duration}ms)`));
            }
        } else if (event.type === 'log') {
            const icons = { info: 'ℹ️', warn: '⚠️', error: '❌' };
            const colors = { info: chalk.blue, warn: chalk.yellow, error: chalk.red };
            const icon = icons[event.level] || '📝';
            const color = colors[event.level] || chalk.white;
            console.log(color(`  ${icon} ${event.message}`));
        }
    }

    generateExecutionId() {
        return `exec-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }

    generateStreamId() {
        return `stream-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    }
}

module.exports = FunctionSystemExtension;
