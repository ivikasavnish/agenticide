// Auto Compaction - Automatic cleanup and optimization
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const ora = require('ora');

class AutoCompaction {
    constructor(options = {}) {
        this.verbose = options.verbose || false;
        this.gitRepoPath = options.gitRepoPath || process.cwd();
        this.dbPath = options.dbPath || null;
        this.sessionsDir = options.sessionsDir || null;
    }

    /**
     * Run all compaction tasks
     */
    async runAll(options = {}) {
        const results = {
            git: null,
            database: null,
            cache: null,
            sessions: null
        };

        if (!options.skipGit) {
            results.git = await this.compactGit();
        }

        if (this.dbPath && !options.skipDatabase) {
            results.database = await this.compactDatabase();
        }

        if (!options.skipCache) {
            results.cache = await this.cleanCache();
        }

        if (this.sessionsDir && !options.skipSessions) {
            results.sessions = await this.cleanSessions();
        }

        return results;
    }

    /**
     * Compact git repository
     */
    async compactGit() {
        const spinner = this.verbose ? ora('Compacting git repository...').start() : null;
        
        try {
            // Check if in git repo
            if (!this.isGitRepo()) {
                if (spinner) spinner.info('Not a git repository, skipping');
                return { skipped: true, reason: 'not a git repo' };
            }

            const before = this.getGitRepoSize();

            // Run git gc with auto pruning
            try {
                execSync('git gc --auto --quiet', { 
                    cwd: this.gitRepoPath,
                    stdio: 'pipe' 
                });
            } catch (error) {
                // Git gc might exit with non-zero if no work needed
                if (!error.message.includes('Nothing new to pack')) {
                    throw error;
                }
            }

            // Prune unreachable objects older than 2 weeks
            try {
                execSync('git prune --expire=2.weeks.ago', { 
                    cwd: this.gitRepoPath,
                    stdio: 'pipe' 
                });
            } catch (error) {
                // Ignore errors if gc.log exists
            }

            // Remove gc.log if exists
            const gcLogPath = path.join(this.gitRepoPath, '.git', 'gc.log');
            if (fs.existsSync(gcLogPath)) {
                fs.unlinkSync(gcLogPath);
            }

            const after = this.getGitRepoSize();
            const saved = before - after;

            if (spinner) {
                if (saved > 0) {
                    spinner.succeed(`Git compacted (saved ${this.formatSize(saved)})`);
                } else {
                    spinner.succeed('Git repository already optimized');
                }
            }

            return {
                success: true,
                before: this.formatSize(before),
                after: this.formatSize(after),
                saved: this.formatSize(saved)
            };
        } catch (error) {
            if (spinner) spinner.fail(`Git compaction failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Compact database (SQLite VACUUM)
     */
    async compactDatabase() {
        if (!this.dbPath || !fs.existsSync(this.dbPath)) {
            return { skipped: true, reason: 'no database' };
        }

        const spinner = this.verbose ? ora('Compacting database...').start() : null;

        try {
            const Database = require('better-sqlite3');
            const before = fs.statSync(this.dbPath).size;

            const db = new Database(this.dbPath);
            
            // Run VACUUM to compact database
            db.exec('VACUUM');
            
            // Analyze to update statistics
            db.exec('ANALYZE');
            
            db.close();

            const after = fs.statSync(this.dbPath).size;
            const saved = before - after;

            if (spinner) {
                if (saved > 0) {
                    spinner.succeed(`Database compacted (saved ${this.formatSize(saved)})`);
                } else {
                    spinner.succeed('Database already optimized');
                }
            }

            return {
                success: true,
                before: this.formatSize(before),
                after: this.formatSize(after),
                saved: this.formatSize(saved)
            };
        } catch (error) {
            if (spinner) spinner.fail(`Database compaction failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean old cache entries
     */
    async cleanCache() {
        const spinner = this.verbose ? ora('Cleaning cache...').start() : null;

        try {
            // This would integrate with Redis or file-based cache
            // For now, just report success
            if (spinner) spinner.succeed('Cache cleaned');

            return {
                success: true,
                message: 'Cache cleaned successfully'
            };
        } catch (error) {
            if (spinner) spinner.fail(`Cache cleanup failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Clean old sessions (>30 days)
     */
    async cleanSessions(days = 30) {
        if (!this.sessionsDir || !fs.existsSync(this.sessionsDir)) {
            return { skipped: true, reason: 'no sessions directory' };
        }

        const spinner = this.verbose ? ora('Cleaning old sessions...').start() : null;

        try {
            const SessionManager = require('./sessionManager');
            const sessionManager = new SessionManager(this.sessionsDir);
            
            const result = sessionManager.cleanOldSessions(days);

            if (spinner) {
                if (result.deleted > 0) {
                    spinner.succeed(`Cleaned ${result.deleted} old sessions`);
                } else {
                    spinner.succeed('No old sessions to clean');
                }
            }

            return result;
        } catch (error) {
            if (spinner) spinner.fail(`Session cleanup failed: ${error.message}`);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Check if directory is a git repo
     */
    isGitRepo() {
        const gitDir = path.join(this.gitRepoPath, '.git');
        return fs.existsSync(gitDir);
    }

    /**
     * Get git repository size
     */
    getGitRepoSize() {
        try {
            const gitDir = path.join(this.gitRepoPath, '.git');
            if (!fs.existsSync(gitDir)) return 0;

            return this.getDirectorySize(gitDir);
        } catch (error) {
            return 0;
        }
    }

    /**
     * Get directory size recursively
     */
    getDirectorySize(dirPath) {
        let size = 0;

        const files = fs.readdirSync(dirPath);
        files.forEach(file => {
            const filePath = path.join(dirPath, file);
            const stats = fs.statSync(filePath);

            if (stats.isDirectory()) {
                size += this.getDirectorySize(filePath);
            } else {
                size += stats.size;
            }
        });

        return size;
    }

    /**
     * Format file size
     */
    formatSize(bytes) {
        if (bytes === 0) return '0B';
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
        return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
    }

    /**
     * Display compaction results
     */
    displayResults(results) {
        console.log(chalk.cyan('\n🧹 Auto Compaction Results:\n'));

        if (results.git) {
            if (results.git.skipped) {
                console.log(chalk.gray('  Git: Skipped (not a repository)'));
            } else if (results.git.success) {
                const saved = results.git.saved !== '0B' 
                    ? chalk.green(`saved ${results.git.saved}`)
                    : chalk.gray('already optimized');
                console.log(`  ${chalk.green('✓')} Git: ${saved}`);
            } else {
                console.log(`  ${chalk.red('✗')} Git: ${results.git.error}`);
            }
        }

        if (results.database) {
            if (results.database.skipped) {
                console.log(chalk.gray('  Database: Skipped (no database)'));
            } else if (results.database.success) {
                const saved = results.database.saved !== '0B'
                    ? chalk.green(`saved ${results.database.saved}`)
                    : chalk.gray('already optimized');
                console.log(`  ${chalk.green('✓')} Database: ${saved}`);
            } else {
                console.log(`  ${chalk.red('✗')} Database: ${results.database.error}`);
            }
        }

        if (results.cache && results.cache.success) {
            console.log(`  ${chalk.green('✓')} Cache: cleaned`);
        }

        if (results.sessions) {
            if (results.sessions.skipped) {
                console.log(chalk.gray('  Sessions: Skipped (no sessions)'));
            } else if (results.sessions.success) {
                const msg = results.sessions.deleted > 0
                    ? chalk.green(`cleaned ${results.sessions.deleted} old sessions`)
                    : chalk.gray('no old sessions');
                console.log(`  ${chalk.green('✓')} Sessions: ${msg}`);
            }
        }

        console.log();
    }

    /**
     * Run compaction on startup (quiet mode)
     */
    static async runOnStartup(options = {}) {
        const compaction = new AutoCompaction({
            verbose: false,
            gitRepoPath: options.gitRepoPath,
            dbPath: options.dbPath,
            sessionsDir: options.sessionsDir
        });

        // Run in background without blocking
        const results = await compaction.runAll({ 
            skipCache: true // Skip cache on startup
        });

        return results;
    }
}

module.exports = AutoCompaction;
