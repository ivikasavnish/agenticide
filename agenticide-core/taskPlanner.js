/**
 * Task Planner - Creates structured execution plans
 */

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { execSync } = require('child_process');

class TaskPlanner {
    constructor(dbPath, projectPath = process.cwd()) {
        const Database = require('better-sqlite3');
        this.db = new Database(dbPath);
        this.projectPath = projectPath;
        this.initDB();
    }

    initDB() {
        // Plans table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS plans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'draft',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                completed_at DATETIME
            )
        `);

        // Tasks table with hierarchy and dependencies
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS plan_tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plan_id INTEGER NOT NULL,
                parent_id INTEGER,
                level INTEGER DEFAULT 0,
                sequence INTEGER DEFAULT 0,
                type TEXT NOT NULL,
                target TEXT,
                description TEXT,
                status TEXT DEFAULT 'pending',
                can_work BOOLEAN DEFAULT 0,
                execution_mode TEXT DEFAULT 'single',
                context_group TEXT,
                dependencies TEXT,
                requires_test BOOLEAN DEFAULT 1,
                test_status TEXT DEFAULT 'not_run',
                test_command TEXT,
                git_tag TEXT,
                work_log TEXT,
                result TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                started_at DATETIME,
                completed_at DATETIME,
                FOREIGN KEY (plan_id) REFERENCES plans(id),
                FOREIGN KEY (parent_id) REFERENCES plan_tasks(id)
            )
        `);

        // Diffs table for tracking changes
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS file_diffs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                task_id INTEGER NOT NULL,
                file_path TEXT NOT NULL,
                old_content TEXT,
                new_content TEXT,
                diff TEXT,
                lines_added INTEGER DEFAULT 0,
                lines_removed INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (task_id) REFERENCES plan_tasks(id)
            )
        `);
    }

    /**
     * Create a new plan from natural language
     */
    createPlan(name, description, goal) {
        const result = this.db.prepare(`
            INSERT INTO plans (name, description, status)
            VALUES (?, ?, 'draft')
        `).run(name, description);

        return result.lastInsertRowid;
    }

    /**
     * Add task to plan with hierarchy
     */
    addTask(planId, task) {
        const {
            parentId = null,
            level = 0,
            sequence = 0,
            type,
            target,
            description,
            executionMode = 'single',
            contextGroup = null,
            dependencies = null
        } = task;

        const result = this.db.prepare(`
            INSERT INTO plan_tasks (
                plan_id, parent_id, level, sequence, type, target,
                description, execution_mode, context_group, dependencies
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            planId, parentId, level, sequence, type, target,
            description, executionMode, contextGroup,
            dependencies ? JSON.stringify(dependencies) : null
        );

        return result.lastInsertRowid;
    }

    /**
     * Get plan structure with tasks
     */
    getPlan(planId) {
        const plan = this.db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
        if (!plan) return null;

        const tasks = this.db.prepare(`
            SELECT * FROM plan_tasks
            WHERE plan_id = ?
            ORDER BY level, sequence
        `).all(planId);

        return { ...plan, tasks };
    }

    /**
     * Get tasks that can be worked on (dependencies met)
     */
    getWorkableTasks(planId) {
        const tasks = this.db.prepare(`
            SELECT * FROM plan_tasks
            WHERE plan_id = ?
            AND status = 'pending'
            AND can_work = 1
            ORDER BY level, sequence
        `).all(planId);

        return tasks;
    }

    /**
     * Get tasks that can be batched together
     */
    getBatchableTasks(planId) {
        const tasks = this.db.prepare(`
            SELECT context_group, GROUP_CONCAT(id) as task_ids,
                   COUNT(*) as count
            FROM plan_tasks
            WHERE plan_id = ?
            AND status = 'pending'
            AND can_work = 1
            AND execution_mode = 'batch'
            AND context_group IS NOT NULL
            GROUP BY context_group
        `).all(planId);

        return tasks;
    }

    /**
     * Update task status and work log
     */
    updateTask(taskId, updates) {
        const { status, workLog, result, canWork } = updates;
        
        let sql = 'UPDATE plan_tasks SET ';
        const values = [];
        const sets = [];

        if (status) {
            sets.push('status = ?');
            values.push(status);
            
            if (status === 'in_progress') {
                sets.push('started_at = CURRENT_TIMESTAMP');
            } else if (status === 'completed') {
                sets.push('completed_at = CURRENT_TIMESTAMP');
            }
        }

        if (workLog !== undefined) {
            sets.push('work_log = ?');
            values.push(workLog);
        }

        if (result !== undefined) {
            sets.push('result = ?');
            values.push(result);
        }

        if (canWork !== undefined) {
            sets.push('can_work = ?');
            values.push(canWork ? 1 : 0);
        }

        sql += sets.join(', ') + ' WHERE id = ?';
        values.push(taskId);

        this.db.prepare(sql).run(...values);

        // Update dependencies - mark tasks as workable if all deps completed
        this.updateDependencies(taskId);
    }

    /**
     * Update dependencies after task completion
     */
    updateDependencies(completedTaskId) {
        // Find tasks that depend on this one
        const dependentTasks = this.db.prepare(`
            SELECT * FROM plan_tasks
            WHERE dependencies LIKE ?
            AND status = 'pending'
        `).all(`%${completedTaskId}%`);

        for (const task of dependentTasks) {
            const deps = JSON.parse(task.dependencies || '[]');
            
            // Check if all dependencies are completed
            const completedDeps = this.db.prepare(`
                SELECT COUNT(*) as count
                FROM plan_tasks
                WHERE id IN (${deps.join(',')})
                AND status = 'completed'
            `).get();

            if (completedDeps.count === deps.length) {
                this.updateTask(task.id, { canWork: true });
            }
        }
    }

    /**
     * Record file diff
     */
    recordDiff(taskId, filePath, oldContent, newContent) {
        const diff = this.generateDiff(oldContent, newContent);
        const stats = this.countDiffLines(diff);

        this.db.prepare(`
            INSERT INTO file_diffs (
                task_id, file_path, old_content, new_content,
                diff, lines_added, lines_removed
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
            taskId, filePath, oldContent, newContent,
            diff, stats.added, stats.removed
        );
    }

    /**
     * Generate unified diff
     */
    generateDiff(oldContent, newContent) {
        const oldLines = (oldContent || '').split('\n');
        const newLines = (newContent || '').split('\n');
        
        const diff = [];
        const maxLen = Math.max(oldLines.length, newLines.length);
        
        for (let i = 0; i < maxLen; i++) {
            const oldLine = oldLines[i];
            const newLine = newLines[i];
            
            if (oldLine === newLine) {
                diff.push({ type: 'same', line: oldLine, num: i + 1 });
            } else if (oldLine === undefined) {
                diff.push({ type: 'add', line: newLine, num: i + 1 });
            } else if (newLine === undefined) {
                diff.push({ type: 'remove', line: oldLine, num: i + 1 });
            } else {
                diff.push({ type: 'remove', line: oldLine, num: i + 1 });
                diff.push({ type: 'add', line: newLine, num: i + 1 });
            }
        }
        
        return JSON.stringify(diff);
    }

    /**
     * Count diff statistics
     */
    countDiffLines(diffJson) {
        const diff = JSON.parse(diffJson);
        return {
            added: diff.filter(d => d.type === 'add').length,
            removed: diff.filter(d => d.type === 'remove').length
        };
    }

    /**
     * Get task execution summary
     */
    getExecutionSummary(planId) {
        const plan = this.db.prepare('SELECT * FROM plans WHERE id = ?').get(planId);
        
        const stats = this.db.prepare(`
            SELECT 
                status,
                COUNT(*) as count
            FROM plan_tasks
            WHERE plan_id = ?
            GROUP BY status
        `).all(planId);

        const diffs = this.db.prepare(`
            SELECT 
                SUM(lines_added) as total_added,
                SUM(lines_removed) as total_removed,
                COUNT(DISTINCT file_path) as files_changed
            FROM file_diffs d
            JOIN plan_tasks t ON d.task_id = t.id
            WHERE t.plan_id = ?
        `).get(planId);

        return { plan, stats, diffs };
    }

    /**
     * Create git checkpoint for task
     */
    createGitCheckpoint(taskId, taskDescription) {
        const task = this.db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(taskId);
        if (!task) return null;

        const timestamp = Date.now();
        const startTime = task.started_at ? new Date(task.started_at).getTime() : timestamp;
        const endTime = timestamp;
        
        // Use dashes instead of colons (git tag format)
        const tag = `agentic-task-${taskId}-${startTime}-${endTime}`;
        
        try {
            // Check if git repo exists
            const isGitRepo = fs.existsSync(path.join(this.projectPath, '.git'));
            
            if (!isGitRepo) {
                console.log(chalk.yellow('⚠️  Not a git repository. Skipping git tag.\n'));
                return null;
            }

            // Stage all changes
            execSync('git add -A', { 
                cwd: this.projectPath,
                stdio: 'pipe'
            });

            // Commit changes
            const commitMsg = `🤖 Task #${taskId}: ${taskDescription || task.description}

Type: ${task.type}
Target: ${task.target || 'N/A'}
Status: ${task.status}
`;
            
            execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, {
                cwd: this.projectPath,
                stdio: 'pipe'
            });

            // Create tag
            execSync(`git tag -a "${tag}" -m "Checkpoint for task ${taskId}"`, {
                cwd: this.projectPath,
                stdio: 'pipe'
            });

            // Update task with git tag
            this.db.prepare('UPDATE plan_tasks SET git_tag = ? WHERE id = ?')
                .run(tag, taskId);

            console.log(chalk.green(`✅ Git checkpoint: ${tag}\n`));
            
            return tag;
        } catch (error) {
            console.log(chalk.yellow(`⚠️  Git checkpoint failed: ${error.message}\n`));
            return null;
        }
    }

    /**
     * Prompt for test creation
     */
    async promptForTest(taskId, taskDescription, aiAgent) {
        const inquirer = require('inquirer');
        
        console.log(chalk.cyan(`\n🧪 Test Recommendation:\n`));
        console.log(chalk.gray(`This task should be tested in isolation.\n`));
        
        const { shouldTest } = await inquirer.default.prompt([
            {
                type: 'confirm',
                name: 'shouldTest',
                message: 'Create unit test for this task?',
                default: true
            }
        ]);

        if (!shouldTest) {
            this.db.prepare('UPDATE plan_tasks SET requires_test = 0, test_status = "skipped" WHERE id = ?')
                .run(taskId);
            return null;
        }

        const { testFramework } = await inquirer.default.prompt([
            {
                type: 'list',
                name: 'testFramework',
                message: 'Select test framework:',
                choices: [
                    { name: 'Auto-detect from project', value: 'auto' },
                    { name: 'Jest (JavaScript)', value: 'jest' },
                    { name: 'Cargo test (Rust)', value: 'cargo' },
                    { name: 'pytest (Python)', value: 'pytest' },
                    { name: 'Go test', value: 'go' },
                    { name: 'Custom command', value: 'custom' }
                ]
            }
        ]);

        let testCommand = '';
        if (testFramework === 'custom') {
            const { customCmd } = await inquirer.default.prompt([
                {
                    type: 'input',
                    name: 'customCmd',
                    message: 'Enter test command:'
                }
            ]);
            testCommand = customCmd;
        } else if (testFramework === 'auto') {
            testCommand = this.detectTestCommand();
        } else {
            const commands = {
                jest: 'npm test',
                cargo: 'cargo test',
                pytest: 'pytest',
                go: 'go test'
            };
            testCommand = commands[testFramework];
        }

        // Store test command
        this.db.prepare('UPDATE plan_tasks SET test_command = ? WHERE id = ?')
            .run(testCommand, taskId);

        // Ask AI to generate test
        if (aiAgent) {
            console.log(chalk.cyan('\n🤖 Generating test with AI...\n'));
            
            const task = this.db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(taskId);
            
            const testPrompt = `Generate a unit test for this task:

Task: ${task.description}
Type: ${task.type}
Target: ${task.target}
Framework: ${testFramework}

Requirements:
- Test in isolation (mock dependencies)
- Cover happy path and edge cases
- Minimal, focused tests
- Clear test names

Provide ONLY the test file content, no explanations.`;

            try {
                const testCode = await aiAgent.sendMessage(testPrompt);
                
                // Extract code from response
                let code = testCode;
                const codeMatch = testCode.match(/```[\w]*\n([\s\S]*?)\n```/);
                if (codeMatch) {
                    code = codeMatch[1];
                }

                console.log(chalk.green('✅ Test generated:\n'));
                console.log(chalk.gray(code.substring(0, 500)));
                if (code.length > 500) {
                    console.log(chalk.gray('...'));
                }
                console.log('');

                const { saveTest } = await inquirer.default.prompt([
                    {
                        type: 'confirm',
                        name: 'saveTest',
                        message: 'Save this test?',
                        default: true
                    }
                ]);

                if (saveTest) {
                    const { testPath } = await inquirer.default.prompt([
                        {
                            type: 'input',
                            name: 'testPath',
                            message: 'Test file path:',
                            default: this.suggestTestPath(task.target, testFramework)
                        }
                    ]);

                    const fullPath = path.resolve(this.projectPath, testPath);
                    const dir = path.dirname(fullPath);
                    
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }

                    fs.writeFileSync(fullPath, code, 'utf8');
                    console.log(chalk.green(`✅ Test saved: ${testPath}\n`));

                    return { testPath, testCommand, code };
                }
            } catch (error) {
                console.log(chalk.red(`Error generating test: ${error.message}\n`));
            }
        }

        return { testCommand };
    }

    /**
     * Detect test command from project
     */
    detectTestCommand() {
        const projectPath = this.projectPath;
        
        // Check for Cargo.toml
        if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
            return 'cargo test';
        }
        
        // Check for package.json
        if (fs.existsSync(path.join(projectPath, 'package.json'))) {
            const pkg = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
            if (pkg.scripts && pkg.scripts.test) {
                return 'npm test';
            }
        }
        
        // Check for pytest
        if (fs.existsSync(path.join(projectPath, 'pytest.ini')) || 
            fs.existsSync(path.join(projectPath, 'setup.py'))) {
            return 'pytest';
        }
        
        // Check for go.mod
        if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
            return 'go test';
        }
        
        return 'make test';
    }

    /**
     * Suggest test file path
     */
    suggestTestPath(target, framework) {
        if (!target) return 'test/test_file.js';
        
        const ext = path.extname(target);
        const base = path.basename(target, ext);
        const dir = path.dirname(target);
        
        if (framework === 'cargo') {
            return path.join(dir, `${base}_test.rs`);
        } else if (framework === 'pytest') {
            return path.join(dir, `test_${base}.py`);
        } else if (framework === 'go') {
            return path.join(dir, `${base}_test.go`);
        } else {
            return path.join(dir, `${base}.test${ext}`);
        }
    }

    /**
     * Run test for task
     */
    runTest(taskId) {
        const task = this.db.prepare('SELECT * FROM plan_tasks WHERE id = ?').get(taskId);
        
        if (!task || !task.test_command) {
            console.log(chalk.yellow('⚠️  No test command configured\n'));
            return false;
        }

        console.log(chalk.cyan(`\n🧪 Running test: ${task.test_command}\n`));
        
        try {
            const output = execSync(task.test_command, {
                cwd: this.projectPath,
                encoding: 'utf8',
                stdio: 'pipe'
            });

            console.log(chalk.green('✅ Tests passed!\n'));
            console.log(chalk.gray(output.substring(0, 500)));
            if (output.length > 500) {
                console.log(chalk.gray('...'));
            }
            console.log('');

            this.db.prepare('UPDATE plan_tasks SET test_status = ? WHERE id = ?')
                .run('passed', taskId);
            
            return true;
        } catch (error) {
            console.log(chalk.red('❌ Tests failed!\n'));
            console.log(chalk.red(error.stdout || error.message));
            console.log('');

            this.db.prepare('UPDATE plan_tasks SET test_status = ? WHERE id = ?')
                .run('failed', taskId);
            
            return false;
        }
    }

    close() {
        this.db.close();
    }
}

module.exports = { TaskPlanner };
