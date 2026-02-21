#!/usr/bin/env node

// Test super keywords: ultraloop and ultrathink
const chalk = require('./agenticide-cli/node_modules/chalk');

console.log(chalk.bold.cyan('\n🧪 Testing Super Keywords\n'));

// Test Agentic Dev Extension
console.log(chalk.bold('\n1️⃣  Agentic Development Extension:\n'));

const AgenticDev = require('./agenticide-cli/extensions/agentic-dev');
const agentic = new AgenticDev();

console.log(chalk.yellow('Without ultraloop (default single pass):'));
console.log(chalk.dim('  /plan "Build REST API" --execute'));
console.log();

console.log(chalk.magenta('With ULTRALOOP (loops until complete):'));
console.log(chalk.dim('  /plan "Build REST API" --execute ultraloop'));
console.log();

console.log(chalk.magenta('With ULTRATHINK (extended reasoning):'));
console.log(chalk.dim('  /plan "Build REST API" ultrathink --execute'));
console.log();

console.log(chalk.magenta('With BOTH:'));
console.log(chalk.dim('  /plan "Build REST API" ultraloop ultrathink --execute'));
console.log();

// Test A2A Protocol
console.log(chalk.bold('\n2️⃣  A2A Protocol Extension:\n'));

const A2AProtocol = require('./agenticide-cli/extensions/a2a-protocol');
const a2a = new A2AProtocol();

console.log(chalk.yellow('Without ultraloop (1 retry per phase):'));
console.log(chalk.dim('  /collaborate agent1 agent2 "Build feature"'));
console.log();

console.log(chalk.magenta('With ULTRALOOP (up to 10 retries):'));
console.log(chalk.dim('  /collaborate agent1 agent2 "Build feature" ultraloop'));
console.log();

// Test Function System
console.log(chalk.bold('\n3️⃣  Function System Extension:\n'));

const FunctionSystem = require('./agenticide-cli/extensions/function-system');
const functions = new FunctionSystem();

console.log(chalk.yellow('Without ultraloop (fire and forget):'));
console.log(chalk.dim('  /stream watch-files path=./src'));
console.log(chalk.dim('  Returns immediately, stream runs in background'));
console.log();

console.log(chalk.magenta('With ULTRALOOP (waits for completion):'));
console.log(chalk.dim('  /stream watch-files path=./src ultraloop'));
console.log(chalk.dim('  Blocks until stream completes or errors'));
console.log();

// Summary
console.log(chalk.bold.cyan('\n📚 Super Keywords Summary:\n'));

console.log(chalk.bold('ULTRALOOP ⚡'));
console.log(chalk.white('  Purpose: Loop until all phases/tasks complete'));
console.log(chalk.white('  Behavior:'));
console.log(chalk.dim('    - Agentic Dev: Loops through dependency tree until all tasks done'));
console.log(chalk.dim('    - A2A Protocol: Retries failed phases up to 10 times'));
console.log(chalk.dim('    - Functions: Waits for streaming functions to complete'));
console.log(chalk.white('  Usage: Add "ultraloop" or "--ultraloop" to command'));
console.log();

console.log(chalk.bold('ULTRATHINK 🧠'));
console.log(chalk.white('  Purpose: Extended reasoning and planning'));
console.log(chalk.white('  Behavior:'));
console.log(chalk.dim('    - Agentic Dev: Deep task analysis, dependency mapping, complexity estimation'));
console.log(chalk.dim('    - A2A Protocol: Extended collaboration planning'));
console.log(chalk.dim('    - Functions: Verbose execution with step-by-step output'));
console.log(chalk.white('  Usage: Add "ultrathink" or "--ultrathink" to command'));
console.log();

console.log(chalk.green('✓ Default behavior: Single-pass, non-blocking, minimal retries'));
console.log(chalk.magenta('⚡ Ultra modes: Optional for intensive tasks requiring full completion\n'));

// Example usage table
console.log(chalk.bold.cyan('📋 Usage Examples:\n'));

const examples = [
    { command: '/plan "Feature" --execute', modes: 'None', behavior: 'Single pass, skip blocked tasks' },
    { command: '/plan "Feature" ultraloop --execute', modes: 'ULTRALOOP', behavior: 'Loop until all complete' },
    { command: '/plan "Feature" ultrathink', modes: 'ULTRATHINK', behavior: 'Deep analysis before planning' },
    { command: '/plan "Feature" ultraloop ultrathink', modes: 'BOTH', behavior: 'Deep analysis + loop until done' },
    { command: '/collaborate a1 a2 "Task"', modes: 'None', behavior: '1 try per phase' },
    { command: '/collaborate a1 a2 "Task" ultraloop', modes: 'ULTRALOOP', behavior: 'Retry up to 10 times' },
    { command: '/stream watch-files path=.', modes: 'None', behavior: 'Fire and forget' },
    { command: '/stream watch-files path=. ultraloop', modes: 'ULTRALOOP', behavior: 'Wait for completion' }
];

const maxCmd = Math.max(...examples.map(e => e.command.length));
const maxMode = Math.max(...examples.map(e => e.modes.length));

examples.forEach(ex => {
    console.log(
        chalk.cyan(ex.command.padEnd(maxCmd + 2)) +
        chalk.magenta(ex.modes.padEnd(maxMode + 2)) +
        chalk.dim(ex.behavior)
    );
});

console.log();
