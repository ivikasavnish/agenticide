/**
 * TaskManager - Enhanced task management with dependency resolution
 * Improves existing task system with real-time updates and composition
 */

const EventEmitter = require('events');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class TaskManager extends EventEmitter {
    constructor(dbPath) {
        super();
        this.db = new Database(dbPath);
        this.initDatabase();
    }

    initDatabase() {
        // Enhanced tasks table (extends existing project_tasks)
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                parent_id TEXT,
                title TEXT NOT NULL,
                description TEXT,
                type TEXT NOT NULL DEFAULT 'feature',
                status TEXT DEFAULT 'pending',
                priority INTEGER DEFAULT 0,
                estimated_effort INTEGER,
                actual_effort INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                started_at TEXT,
                completed_at TEXT,
                assigned_to TEXT DEFAULT 'ai',
                complexity TEXT DEFAULT 'moderate',
                test_required BOOLEAN DEFAULT 1,
                test_status TEXT DEFAULT 'not_started',
                artifacts TEXT,
                metadata TEXT,
                project_id INTEGER
            )
        `);

        // Task dependencies with relationship types
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS task_dependencies (
                task_id TEXT NOT NULL,
                depends_on TEXT NOT NULL,
                dependency_type TEXT DEFAULT 'blocks',
                PRIMARY KEY (task_id, depends_on),
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
                FOREIGN KEY (depends_on) REFERENCES tasks(id) ON DELETE CASCADE
            )
        `);

        // Task events for audit trail and real-time updates
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS task_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id TEXT NOT NULL,
                event_type TEXT NOT NULL,
                message TEXT,
                timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        `);

        // Task tests tracking
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS task_tests (
                id TEXT PRIMARY KEY,
                task_id TEXT NOT NULL,
                test_file TEXT NOT NULL,
                test_name TEXT NOT NULL,
                status TEXT DEFAULT 'pending',
                last_run TEXT,
                duration_ms INTEGER,
                error_message TEXT,
                FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
            )
        `);

        // Indexes for performance
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
            CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
            CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_events(task_id);
            CREATE INDEX IF NOT EXISTS idx_task_tests_task ON task_tests(task_id);
        `);
    }

    /**
     * Create a new task with validation
     */
    createTask(task) {
        const {
            id = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            parent_id = null,
            title,
            description,
            type = 'feature',
            priority = 0,
            complexity = 'moderate',
            test_required = true,
            metadata = {}
        } = task;

        if (!title) {
            throw new Error('Task title is required');
        }

        const result = this.db.prepare(`
            INSERT INTO tasks (
                id, parent_id, title, description, type, priority,
                complexity, test_required, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            id, parent_id, title, description, type, priority,
            complexity, test_required ? 1 : 0, JSON.stringify(metadata)
        );

        this.emitEvent(id, 'created', `Task created: ${title}`);
        return { id, ...task };
    }

    /**
     * Add dependency between tasks
     */
    addDependency(taskId, dependsOn, type = 'blocks') {
        // Validate both tasks exist
        const task = this.getTask(taskId);
        const dep = this.getTask(dependsOn);

        if (!task || !dep) {
            throw new Error('Both tasks must exist');
        }

        // Check for circular dependencies
        if (this.hasCircularDependency(taskId, dependsOn)) {
            throw new Error('Circular dependency detected');
        }

        this.db.prepare(`
            INSERT OR IGNORE INTO task_dependencies (task_id, depends_on, dependency_type)
            VALUES (?, ?, ?)
        `).run(taskId, dependsOn, type);

        this.emitEvent(taskId, 'dependency_added', `Depends on: ${dependsOn}`, {
            depends_on: dependsOn,
            type
        });
    }

    /**
     * Check for circular dependencies using DFS
     */
    hasCircularDependency(taskId, newDep) {
        const visited = new Set();
        const recursionStack = new Set();

        const hasCycle = (current) => {
            if (recursionStack.has(current)) return true;
            if (visited.has(current)) return false;

            visited.add(current);
            recursionStack.add(current);

            // Get all dependencies
            const deps = this.db.prepare(`
                SELECT depends_on FROM task_dependencies WHERE task_id = ?
            `).all(current);

            for (const dep of deps) {
                if (hasCycle(dep.depends_on)) return true;
            }

            recursionStack.delete(current);
            return false;
        };

        // Temporarily add the new dependency and check
        const tempDeps = this.db.prepare(`
            SELECT depends_on FROM task_dependencies WHERE task_id = ?
        `).all(taskId).map(d => d.depends_on);

        tempDeps.push(newDep);

        // Check if adding this creates a cycle
        return hasCycle(newDep) && tempDeps.includes(taskId);
    }

    /**
     * Get tasks ready to work on (no pending dependencies)
     */
    getReadyTasks() {
        const tasks = this.db.prepare(`
            SELECT t.*
            FROM tasks t
            WHERE t.status = 'pending'
            AND NOT EXISTS (
                SELECT 1 FROM task_dependencies td
                JOIN tasks dep ON td.depends_on = dep.id
                WHERE td.task_id = t.id 
                AND dep.status != 'done'
                AND td.dependency_type = 'blocks'
            )
            ORDER BY t.priority DESC, t.created_at ASC
        `).all();

        return tasks.map(t => this.deserializeTask(t));
    }

    /**
     * Get dependency tree using topological sort (Kahn's algorithm)
     */
    getDependencyOrder() {
        const tasks = this.db.prepare('SELECT id FROM tasks WHERE status != "done"').all();
        const taskIds = tasks.map(t => t.id);
        
        // Build adjacency list and in-degree map
        const adjList = new Map();
        const inDegree = new Map();
        
        taskIds.forEach(id => {
            adjList.set(id, []);
            inDegree.set(id, 0);
        });

        const deps = this.db.prepare(`
            SELECT task_id, depends_on 
            FROM task_dependencies 
            WHERE dependency_type = 'blocks'
        `).all();

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
        
        // Add all nodes with no incoming edges
        inDegree.forEach((degree, id) => {
            if (degree === 0) queue.push(id);
        });

        while (queue.length > 0) {
            const current = queue.shift();
            result.push(current);

            // Reduce in-degree for neighbors
            adjList.get(current).forEach(neighbor => {
                inDegree.set(neighbor, inDegree.get(neighbor) - 1);
                if (inDegree.get(neighbor) === 0) {
                    queue.push(neighbor);
                }
            });
        }

        // Check for cycles
        if (result.length !== taskIds.length) {
            throw new Error('Circular dependency detected in task graph');
        }

        return result;
    }

    /**
     * Get tasks that can run in parallel (same level in dependency tree)
     */
    getParallelGroups() {
        const order = this.getDependencyOrder();
        const groups = [];
        const processed = new Set();

        for (const taskId of order) {
            if (processed.has(taskId)) continue;

            const group = [taskId];
            processed.add(taskId);

            // Find tasks at the same dependency level
            for (const otherId of order) {
                if (processed.has(otherId)) continue;

                if (!this.hasDependencyPath(taskId, otherId) && 
                    !this.hasDependencyPath(otherId, taskId)) {
                    group.push(otherId);
                    processed.add(otherId);
                }
            }

            groups.push(group);
        }

        return groups;
    }

    /**
     * Check if there's a dependency path between two tasks
     */
    hasDependencyPath(from, to) {
        const visited = new Set();
        const queue = [from];

        while (queue.length > 0) {
            const current = queue.shift();
            if (current === to) return true;
            if (visited.has(current)) continue;

            visited.add(current);

            const deps = this.db.prepare(`
                SELECT depends_on FROM task_dependencies WHERE task_id = ?
            `).all(current);

            deps.forEach(d => queue.push(d.depends_on));
        }

        return false;
    }

    /**
     * Update task status with real-time events
     */
    updateTaskStatus(taskId, status, metadata = {}) {
        const validTransitions = {
            'pending': ['ready', 'in_progress', 'blocked', 'cancelled'],
            'ready': ['in_progress', 'blocked', 'cancelled'],
            'in_progress': ['done', 'failed', 'blocked'],
            'blocked': ['pending', 'ready'],
            'failed': ['pending', 'cancelled'],
            'done': [],
            'cancelled': []
        };

        const task = this.getTask(taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        const currentStatus = task.status;
        if (!validTransitions[currentStatus].includes(status)) {
            throw new Error(`Invalid status transition: ${currentStatus} -> ${status}`);
        }

        const updates = { status };
        if (status === 'in_progress') {
            updates.started_at = new Date().toISOString();
        } else if (status === 'done') {
            updates.completed_at = new Date().toISOString();
            
            // Calculate actual effort
            if (task.started_at) {
                const start = new Date(task.started_at).getTime();
                const end = new Date().getTime();
                updates.actual_effort = Math.floor((end - start) / 60000); // minutes
            }
        }

        // Build update query
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        const sql = `UPDATE tasks SET ${fields.map(f => `${f} = ?`).join(', ')} WHERE id = ?`;
        
        this.db.prepare(sql).run(...values, taskId);

        this.emitEvent(taskId, 'status_changed', `Status: ${currentStatus} -> ${status}`, {
            old_status: currentStatus,
            new_status: status,
            ...metadata
        });

        // Update dependent tasks if completed
        if (status === 'done') {
            this.updateDependentTasks(taskId);
        }

        // Update parent task progress
        if (task.parent_id) {
            this.updateParentProgress(task.parent_id);
        }

        this.emit('task:updated', { taskId, status, metadata });
        return this.getTask(taskId);
    }

    /**
     * Update dependent tasks when a task completes
     */
    updateDependentTasks(completedTaskId) {
        const dependents = this.db.prepare(`
            SELECT DISTINCT t.*
            FROM tasks t
            JOIN task_dependencies td ON t.id = td.task_id
            WHERE td.depends_on = ?
            AND t.status = 'pending'
        `).all(completedTaskId);

        for (const task of dependents) {
            // Check if all blocking dependencies are done
            const blockingDeps = this.db.prepare(`
                SELECT COUNT(*) as count
                FROM task_dependencies td
                JOIN tasks dep ON td.depends_on = dep.id
                WHERE td.task_id = ?
                AND td.dependency_type = 'blocks'
                AND dep.status != 'done'
            `).get(task.id);

            if (blockingDeps.count === 0) {
                this.updateTaskStatus(task.id, 'ready');
            }
        }
    }

    /**
     * Update parent task progress based on children
     */
    updateParentProgress(parentId) {
        const children = this.db.prepare(`
            SELECT status FROM tasks WHERE parent_id = ?
        `).all(parentId);

        if (children.length === 0) return;

        const done = children.filter(c => c.status === 'done').length;
        const progress = Math.round((done / children.length) * 100);

        this.db.prepare(`
            UPDATE tasks 
            SET metadata = json_set(COALESCE(metadata, '{}'), '$.progress', ?)
            WHERE id = ?
        `).run(progress, parentId);

        // If all children done, mark parent done
        if (progress === 100) {
            this.updateTaskStatus(parentId, 'done');
        }
    }

    /**
     * Break down large task into subtasks
     */
    decomposeTask(taskId, subtasks) {
        const parent = this.getTask(taskId);
        if (!parent) {
            throw new Error(`Task ${taskId} not found`);
        }

        const createdSubtasks = [];
        for (const subtask of subtasks) {
            const sub = this.createTask({
                ...subtask,
                parent_id: taskId
            });
            createdSubtasks.push(sub);
        }

        this.emitEvent(taskId, 'decomposed', `Broken into ${subtasks.length} subtasks`, {
            subtask_count: subtasks.length
        });

        return createdSubtasks;
    }

    /**
     * Get task with all relationships
     */
    getTask(taskId) {
        const task = this.db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
        if (!task) return null;

        return this.deserializeTask(task);
    }

    /**
     * Get task tree (parent and all children)
     */
    getTaskTree(taskId) {
        const task = this.getTask(taskId);
        if (!task) return null;

        const children = this.db.prepare(`
            SELECT * FROM tasks WHERE parent_id = ? ORDER BY priority DESC, created_at
        `).all(taskId).map(t => this.deserializeTask(t));

        return { ...task, children };
    }

    /**
     * Get all tasks with optional filters
     */
    getTasks(filters = {}) {
        let sql = 'SELECT * FROM tasks WHERE 1=1';
        const params = [];

        if (filters.status) {
            sql += ' AND status = ?';
            params.push(filters.status);
        }

        if (filters.type) {
            sql += ' AND type = ?';
            params.push(filters.type);
        }

        if (filters.parent_id !== undefined) {
            if (filters.parent_id === null) {
                sql += ' AND parent_id IS NULL';
            } else {
                sql += ' AND parent_id = ?';
                params.push(filters.parent_id);
            }
        }

        sql += ' ORDER BY priority DESC, created_at';

        const tasks = this.db.prepare(sql).all(...params);
        return tasks.map(t => this.deserializeTask(t));
    }

    /**
     * Get task summary statistics
     */
    getTaskSummary() {
        const byStatus = this.db.prepare(`
            SELECT status, COUNT(*) as count
            FROM tasks
            GROUP BY status
        `).all();

        const byType = this.db.prepare(`
            SELECT type, COUNT(*) as count
            FROM tasks
            GROUP BY type
        `).all();

        const total = this.db.prepare('SELECT COUNT(*) as count FROM tasks').get();
        const ready = this.getReadyTasks().length;
        
        return {
            total: total.count,
            ready,
            by_status: byStatus,
            by_type: byType
        };
    }

    /**
     * Emit task event
     */
    emitEvent(taskId, eventType, message, metadata = {}) {
        this.db.prepare(`
            INSERT INTO task_events (task_id, event_type, message, metadata)
            VALUES (?, ?, ?, ?)
        `).run(taskId, eventType, message, JSON.stringify(metadata));

        this.emit('task:event', { taskId, eventType, message, metadata });
    }

    /**
     * Get task events (audit trail)
     */
    getTaskEvents(taskId) {
        const events = this.db.prepare(`
            SELECT * FROM task_events 
            WHERE task_id = ? 
            ORDER BY timestamp DESC
        `).all(taskId);

        return events.map(e => ({
            ...e,
            metadata: e.metadata ? JSON.parse(e.metadata) : {}
        }));
    }

    /**
     * Deserialize task (parse JSON fields)
     */
    deserializeTask(task) {
        return {
            ...task,
            test_required: !!task.test_required,
            artifacts: task.artifacts ? JSON.parse(task.artifacts) : [],
            metadata: task.metadata ? JSON.parse(task.metadata) : {}
        };
    }

    /**
     * Export tasks to JSON
     */
    exportTasks() {
        const tasks = this.getTasks();
        const dependencies = this.db.prepare('SELECT * FROM task_dependencies').all();
        
        return {
            tasks,
            dependencies,
            exported_at: new Date().toISOString()
        };
    }

    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}

module.exports = { TaskManager };
