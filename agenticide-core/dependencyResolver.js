/**
 * DependencyResolver - Resolves task dependencies using topological sort
 * Uses Kahn's algorithm for efficient O(V+E) dependency resolution
 */

class DependencyResolver {
    constructor(taskManager) {
        this.taskManager = taskManager;
    }

    /**
     * Get execution order for all pending tasks
     */
    getExecutionOrder() {
        const tasks = this.taskManager.getTasks({ status: 'pending' });
        const taskIds = tasks.map(t => t.id);
        
        return this.topologicalSort(taskIds);
    }

    /**
     * Topological sort using Kahn's algorithm
     */
    topologicalSort(taskIds) {
        const adjList = new Map();
        const inDegree = new Map();
        
        // Initialize
        taskIds.forEach(id => {
            adjList.set(id, []);
            inDegree.set(id, 0);
        });

        // Build graph
        const db = this.taskManager.db;
        const deps = db.prepare(`
            SELECT task_id, depends_on 
            FROM task_dependencies 
            WHERE task_id IN (${taskIds.map(() => '?').join(',')})
            AND dependency_type = 'blocks'
        `).all(...taskIds);

        deps.forEach(({ task_id, depends_on }) => {
            if (adjList.has(depends_on)) {
                adjList.get(depends_on).push(task_id);
            }
            if (inDegree.has(task_id)) {
                inDegree.set(task_id, inDegree.get(task_id) + 1);
            }
        });

        // Kahn's algorithm
        const queue = [];
        const result = [];
        const levels = new Map(); // Track dependency level for each task
        
        // Start with nodes having no dependencies
        inDegree.forEach((degree, id) => {
            if (degree === 0) {
                queue.push(id);
                levels.set(id, 0);
            }
        });

        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);
            const currentLevel = levels.get(current);

            // Process neighbors
            adjList.get(current).forEach(neighbor => {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                
                // Update level (max of all dependencies + 1)
                const neighborLevel = Math.max(
                    levels.get(neighbor) || 0,
                    currentLevel + 1
                );
                levels.set(neighbor, neighborLevel);

                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            });
        }

        // Check for cycles
        if (result.length !== taskIds.length) {
            const remaining = taskIds.filter(id => !result.includes(id));
            throw new Error(`Circular dependency detected involving tasks: ${remaining.join(', ')}`);
        }

        return { order: result, levels };
    }

    /**
     * Group tasks that can execute in parallel
     */
    getParallelGroups() {
        const { order, levels } = this.topologicalSort(
            this.taskManager.getTasks({ status: 'pending' }).map(t => t.id)
        );

        // Group by level
        const groups = new Map();
        order.forEach(taskId => {
            const level = levels.get(taskId);
            if (!groups.has(level)) {
                groups.set(level, []);
            }
            groups.get(level).push(taskId);
        });

        // Convert to array of groups
        return Array.from(groups.entries())
            .sort((a, b) => a[0] - b[0])
            .map(([level, taskIds]) => ({
                level,
                tasks: taskIds.map(id => this.taskManager.getTask(id)),
                canRunInParallel: taskIds.length > 1
            }));
    }

    /**
     * Get next batch of tasks that can execute
     */
    getNextBatch(maxConcurrency = 5) {
        const ready = this.taskManager.getReadyTasks();
        
        // Sort by priority
        ready.sort((a, b) => {
            if (b.priority !== a.priority) {
                return b.priority - a.priority;
            }
            return new Date(a.created_at) - new Date(b.created_at);
        });

        return ready.slice(0, maxConcurrency);
    }

    /**
     * Check if task is blocked by dependencies
     */
    isBlocked(taskId) {
        const db = this.taskManager.db;
        const blocking = db.prepare(`
            SELECT COUNT(*) as count
            FROM task_dependencies td
            JOIN tasks dep ON td.depends_on = dep.id
            WHERE td.task_id = ?
            AND td.dependency_type = 'blocks'
            AND dep.status != 'done'
        `).get(taskId);

        return blocking.count > 0;
    }

    /**
     * Get blocking tasks for a given task
     */
    getBlockingTasks(taskId) {
        const db = this.taskManager.db;
        return db.prepare(`
            SELECT dep.*
            FROM task_dependencies td
            JOIN tasks dep ON td.depends_on = dep.id
            WHERE td.task_id = ?
            AND td.dependency_type = 'blocks'
            AND dep.status != 'done'
        `).all(taskId);
    }

    /**
     * Find critical path (longest dependency chain)
     */
    getCriticalPath() {
        const tasks = this.taskManager.getTasks({ status: 'pending' });
        const taskIds = tasks.map(t => t.id);
        
        // Calculate longest path to each node
        const distances = new Map();
        const predecessors = new Map();
        
        taskIds.forEach(id => distances.set(id, 0));

        const db = this.taskManager.db;
        const deps = db.prepare(`
            SELECT task_id, depends_on 
            FROM task_dependencies 
            WHERE dependency_type = 'blocks'
        `).all();

        // Build reverse graph (from dep to dependent)
        const reverseGraph = new Map();
        taskIds.forEach(id => reverseGraph.set(id, []));
        
        deps.forEach(({ task_id, depends_on }) => {
            if (reverseGraph.has(depends_on)) {
                reverseGraph.get(depends_on).push(task_id);
            }
        });

        // Find longest path using modified topological sort
        const { order } = this.topologicalSort(taskIds);
        
        order.forEach(taskId => {
            const task = tasks.find(t => t.id === taskId);
            const effort = task.estimated_effort || 60; // default 1 hour
            
            reverseGraph.get(taskId).forEach(dependent => {
                const newDist = distances.get(taskId) + effort;
                if (newDist > distances.get(dependent)) {
                    distances.set(dependent, newDist);
                    predecessors.set(dependent, taskId);
                }
            });
        });

        // Find task with longest distance
        let maxDist = 0;
        let endTask = null;
        
        distances.forEach((dist, taskId) => {
            if (dist > maxDist) {
                maxDist = dist;
                endTask = taskId;
            }
        });

        // Reconstruct path
        const path = [];
        let current = endTask;
        while (current) {
            path.unshift(current);
            current = predecessors.get(current);
        }

        return {
            path: path.map(id => this.taskManager.getTask(id)),
            totalEffort: maxDist,
            estimatedDuration: `${Math.ceil(maxDist / 60)} hours`
        };
    }

    /**
     * Suggest task priorities based on dependencies
     */
    suggestPriorities() {
        const tasks = this.taskManager.getTasks({ status: 'pending' });
        const suggestions = [];

        tasks.forEach(task => {
            // Tasks with more dependents should have higher priority
            const dependentCount = this.taskManager.db.prepare(`
                SELECT COUNT(*) as count
                FROM task_dependencies
                WHERE depends_on = ?
            `).get(task.id).count;

            // Tasks on critical path should have highest priority
            const { path } = this.getCriticalPath();
            const onCriticalPath = path.some(t => t.id === task.id);

            let suggestedPriority = task.priority;
            
            if (onCriticalPath) {
                suggestedPriority = Math.max(suggestedPriority, 10);
            }
            
            suggestedPriority += dependentCount;

            if (suggestedPriority !== task.priority) {
                suggestions.push({
                    taskId: task.id,
                    currentPriority: task.priority,
                    suggestedPriority,
                    reason: onCriticalPath 
                        ? 'On critical path' 
                        : `${dependentCount} tasks depend on this`
                });
            }
        });

        return suggestions;
    }

    /**
     * Validate dependency graph (detect issues)
     */
    validate() {
        const issues = [];
        const tasks = this.taskManager.getTasks();

        // Check for orphaned dependencies
        const allTaskIds = new Set(tasks.map(t => t.id));
        const deps = this.taskManager.db.prepare('SELECT * FROM task_dependencies').all();
        
        deps.forEach(dep => {
            if (!allTaskIds.has(dep.task_id)) {
                issues.push({
                    type: 'orphaned_task',
                    taskId: dep.task_id,
                    message: `Task ${dep.task_id} has dependencies but doesn't exist`
                });
            }
            if (!allTaskIds.has(dep.depends_on)) {
                issues.push({
                    type: 'orphaned_dependency',
                    taskId: dep.task_id,
                    dependsOn: dep.depends_on,
                    message: `Task ${dep.task_id} depends on non-existent task ${dep.depends_on}`
                });
            }
        });

        // Check for circular dependencies
        try {
            this.topologicalSort(tasks.map(t => t.id));
        } catch (error) {
            issues.push({
                type: 'circular_dependency',
                message: error.message
            });
        }

        // Check for isolated tasks (no deps, no dependents)
        tasks.forEach(task => {
            const hasDeps = deps.some(d => d.task_id === task.id);
            const hasDependents = deps.some(d => d.depends_on === task.id);
            
            if (!hasDeps && !hasDependents && tasks.length > 1) {
                issues.push({
                    type: 'isolated_task',
                    taskId: task.id,
                    message: `Task ${task.id} has no dependencies or dependents`
                });
            }
        });

        return {
            valid: issues.length === 0,
            issues
        };
    }
}

module.exports = { DependencyResolver };
