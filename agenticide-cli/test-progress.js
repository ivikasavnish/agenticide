#!/usr/bin/env node

// Test Enhanced Progress Tracker

const ProgressTracker = require('./core/progressTracker');
const { TaskTracker } = require('./taskTracker');

console.log('\n=== Testing Progress Tracker ===\n');

const progress = new ProgressTracker();

// Test 1: Basic task tracking
console.log('Test 1: Basic Task Tracking\n');
progress.start('task1', 'Creating authentication module');
setTimeout(() => {
    progress.update('task1', 'in_progress', 'Generating stubs');
}, 500);

setTimeout(() => {
    progress.update('task1', 'in_progress', 'Writing tests');
}, 1000);

setTimeout(() => {
    progress.complete('task1', 'done', 'Authentication module created');
}, 1500);

// Test 2: Progress bar
setTimeout(() => {
    console.log('\nTest 2: Progress Bar\n');
    progress.showProgress(3, 10, 'Implementation');
    progress.showProgress(7, 10, 'Testing');
    progress.showProgress(10, 10, 'Complete');
}, 2000);

// Test 3: Task summary with mock data
setTimeout(() => {
    console.log('\nTest 3: Task Summary\n');
    const mockTasks = [
        { function: 'login', status: 'done', file: 'auth.js' },
        { function: 'logout', status: 'done', file: 'auth.js' },
        { function: 'register', status: 'in_progress', file: 'auth.js' },
        { function: 'resetPassword', status: 'todo', file: 'auth.js' },
        { function: 'validateToken', status: 'todo', file: 'auth.js' },
    ];
    
    progress.showSummary(mockTasks);
}, 2500);

// Test 4: Task list
setTimeout(() => {
    console.log('\nTest 4: Task List\n');
    const mockTasks = [
        { function: 'getUserProfile', status: 'done', file: 'user.js' },
        { function: 'updateProfile', status: 'in_progress', file: 'user.js' },
        { function: 'deleteAccount', status: 'todo', file: 'user.js' },
        { function: 'listUsers', status: 'todo', file: 'admin.js' },
        { function: 'banUser', status: 'failed', file: 'admin.js' },
    ];
    
    progress.showTaskList(mockTasks);
}, 3000);

// Test 5: Spinner
setTimeout(() => {
    console.log('\nTest 5: Spinner\n');
    const spinner = progress.startSpinner('Processing complex operation...');
    
    setTimeout(() => {
        progress.stopSpinner(true, 'Operation completed successfully!');
    }, 2000);
}, 3500);

// Test 6: Status icons
setTimeout(() => {
    console.log('\nTest 6: All Status Icons\n');
    const statuses = [
        'pending', 'queued', 'starting', 'in_progress', 
        'completing', 'done', 'success', 'failed', 
        'error', 'skipped', 'cancelled'
    ];
    
    statuses.forEach(status => {
        console.log(`  ${progress.getStatusIcon(status)} - ${status}`);
    });
    
    console.log('\n=== All Tests Complete ===\n');
}, 6000);
