/**
 * TaskExecutor - Executes tasks in dependency order with real-time updates
 */

const EventEmitter = require('events');
const { DependencyResolver } = require('./dependencyResolver');

class TaskExecutor extends EventEmitter {
    constructor(taskManager, options = {}) {
        super();
        this.taskManager = taskManager;
        this.resolver = new DependencyResolver(taskManager);
        this.options = {
            maxConcurrency: options.maxConcurrency || 3,
            autoStart: options.autoStart !== false,
            stopOnError: options.stopOnError !== false,
            enableRollback: options.enableRollback !== false
        };
        this.running = false;
        this.currentTasks = new Map();
        this.executionLog = [];
    }

    /**
     * Execute all pending tasks
     */
    async executeAll() {
        if (this.running) {
            throw new Error('Executor is already running');
        }

        this.running = true;
        this.emit('execution:started', { timestamp: new Date().toISOString() });

        try {
            const groups = this.resolver.getParallelGroups();
            
            for (const group of groups) {
                this.emit('group:started', { 
                    level: group.level, 
                    taskCount: group.tasks.length 
                });

                // Execute tasks in this group (parallel if possible)
                if (group.canRunInParallel && group.tasks.length > 1) {
                    await this.executeParallel(group.tasks);
                } else {
                    for (const task of group.tasks) {
                        await this.executeTask(task.id);
                    }
                }

                this.emit('group:completed', { 
                    level: group.level,
                    taskCount: group.tasks.length
                });
            }

            this.emit('execution:completed', { 
                timestamp: new Date().toISOString(),
                tasksExecuted: this.executionLog.length
            });

        } catch (error) {
            this.emit('execution:failed', { 
                error: error.message,
                timestamp: new Date().toISOString()
            });
            throw error;
        } finally {
            this.running = false;
        }
    }

    /**
     * Execute next available task
     */
    async executeNext() {
        const readyTasks = this.taskManager.getReadyTasks();
        
        if (readyTasks.length === 0) {
            return null;
        }

        // Get highest priority task
        const task = readyTasks.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return new Date(a.created_at) - new Date(b.created_at);
        })[0];

        return await this.executeTask(task.id);
    }

    /**
     * Execute a specific task
     */
    async executeTask(taskId, executor = null) {
        const task = this.taskManager.getTask(taskId);
        
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        if (this.resolver.isBlocked(taskId)) {
            const blocking = this.resolver.getBlockingTasks(taskId);
            throw new Error(
                `Task ${taskId} is blocked by: ${blocking.map(t => t.id).join(', ')}`
            );
        }

        this.currentTasks.set(taskId, { 
            startTime: Date.now(),
            status: 'in_progress'
        });

        this.emit('task:started', { taskId, task });
        
        try {
            // Update status to in_progress
            this.taskManager.updateTaskStatus(taskId, 'in_progress');

            // Execute the task
            const result = await this.performTaskExecution(task, executor);

            // Mark as done
            this.taskManager.updateTaskStatus(taskId, 'done', { result });

            const duration = Date.now() - this.currentTasks.get(taskId).startTime;
            this.executionLog.push({
                taskId,
                status: 'success',
                duration,
                timestamp: new Date().toISOString()
            });

            this.emit('task:completed', { taskId, task, result, duration });
            
            this.currentTasks.delete(taskId);
            return { success: true, result };

        } catch (error) {
            const duration = Date.now() - this.currentTasks.get(taskId).startTime;
            
            this.executionLog.push({
                taskId,
                status: 'failed',
                error: error.message,
                duration,
                timestamp: new Date().toISOString()
            });

            this.emit('task:failed', { taskId, task, error: error.message, duration });

            // Update status to failed
            this.taskManager.updateTaskStatus(taskId, 'failed', { 
                error: error.message 
            });

            this.currentTasks.delete(taskId);

            if (this.options.stopOnError) {
                throw error;
            }

            return { success: false, error: error.message };
        }
    }

    /**
     * Execute tasks in parallel
     */
    async executeParallel(tasks) {
        const limit = Math.min(tasks.length, this.options.maxConcurrency);
        const batches = [];
        
        for (let i = 0; i < tasks.length; i += limit) {
            batches.push(tasks.slice(i, i + limit));
        }

        for (const batch of batches) {
            const promises = batch.map(task => this.executeTask(task.id));
            const results = await Promise.allSettled(promises);
            
            // Check for failures
            const failures = results.filter(r => r.status === 'rejected');
            if (failures.length > 0 && this.options.stopOnError) {
                throw new Error(
                    `${failures.length} tasks failed: ${failures.map(f => f.reason).join(', ')}`
                );
            }
        }
    }

    /**
     * Perform actual task execution (override or provide executor)
     */
    async performTaskExecution(task, executor = null) {
        // If custom executor provided, use it
        if (executor && typeof executor === 'function') {
            return await executor(task);
        }

        // Default: emit event for external handler
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Task execution timeout'));
            }, 300000); // 5 minutes

            this.emit('task:execute', {
                task,
                complete: (result) => {
                    clearTimeout(timeout);
                    resolve(result);
                },
                fail: (error) => {
                    clearTimeout(timeout);
                    reject(error);
                }
            });
        });
    }

    /**
     * Pause execution
     */
    pause() {
        if (!this.running) return;
        this.running = false;
        this.emit('execution:paused', { 
            currentTasks: Array.from(this.currentTasks.keys())
        });
    }

    /**
     * Resume execution
     */
    resume() {
        if (this.running) return;
        this.running = true;
        this.emit('execution:resumed');
    }

    /**
     * Cancel task execution
     */
    async cancel(taskId) {
        if (!this.currentTasks.has(taskId)) {
            throw new Error(`Task ${taskId} is not currently executing`);
        }

        this.currentTasks.delete(taskId);
        this.taskManager.updateTaskStatus(taskId, 'cancelled');
        
        this.emit('task:cancelled', { taskId });
    }

    /**
     * Rollback failed task
     */
    async rollback(taskId) {
        if (!this.options.enableRollback) {
            throw new Error('Rollback is not enabled');
        }

        const task = this.taskManager.getTask(taskId);
        if (!task || task.status !== 'failed') {
            throw new Error('Can only rollback failed tasks');
        }

        this.emit('task:rollback_started', { taskId });

        try {
            // Reset task to pending
            this.taskManager.db.prepare(`
                UPDATE tasks 
                SET status = 'pending', 
                    started_at = NULL, 
                    completed_at = NULL,
                    actual_effort = NULL
                WHERE id = ?
            `).run(taskId);

            this.taskManager.emitEvent(taskId, 'rolled_back', 'Task rolled back to pending');
            this.emit('task:rollback_completed', { taskId });

            return { success: true };
        } catch (error) {
            this.emit('task:rollback_failed', { taskId, error: error.message });
            throw error;
        }
    }

    /**
     * Get execution status
     */
    getStatus() {
        const summary = this.taskManager.getTaskSummary();
        const ready = this.taskManager.getReadyTasks();
        const current = Array.from(this.currentTasks.entries()).map(([id, info]) => ({
            taskId: id,
            ...info
        }));

        return {
            running: this.running,
            currentTasks: current,
            readyTasks: ready.length,
            summary,
            executionLog: this.executionLog.slice(-10) // Last 10 entries
        };
    }

    /**
     * Get execution metrics
     */
    getMetrics() {
        const successful = this.executionLog.filter(e => e.status === 'success');
        const failed = this.executionLog.filter(e => e.status === 'failed');
        
        const avgDuration = successful.length > 0
            ? successful.reduce((sum, e) => sum + e.duration, 0) / successful.length
            : 0;

        return {
            totalExecuted: this.executionLog.length,
            successful: successful.length,
            failed: failed.length,
            successRate: this.executionLog.length > 0
                ? (successful.length / this.executionLog.length * 100).toFixed(2) + '%'
                : '0%',
            averageDuration: Math.round(avgDuration / 1000) + 's',
            totalDuration: Math.round(
                this.executionLog.reduce((sum, e) => sum + e.duration, 0) / 1000
            ) + 's'
        };
    }

    /**
     * Clear execution log
     */
    clearLog() {
        this.executionLog = [];
    }

    /**
     * Export execution report
     */
    exportReport() {
        return {
            timestamp: new Date().toISOString(),
            status: this.getStatus(),
            metrics: this.getMetrics(),
            executionLog: this.executionLog,
            options: this.options
        };
    }
}

module.exports = { TaskExecutor };
