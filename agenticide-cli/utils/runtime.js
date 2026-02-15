// Runtime detection and utilities for Node.js and Bun compatibility

/**
 * Detect if running on Bun runtime
 */
const isBun = typeof Bun !== 'undefined';

/**
 * Detect if running on Node.js runtime
 */
const isNode = typeof process !== 'undefined' && !isBun;

/**
 * Get runtime name
 */
const runtime = isBun ? 'bun' : 'node';

/**
 * Get runtime version
 */
const version = isBun ? Bun.version : process.version;

/**
 * Runtime-optimized file read
 */
async function readFile(filePath) {
    if (isBun) {
        // Bun's fast native file API
        return await Bun.file(filePath).text();
    } else {
        // Node.js fallback
        const fs = require('fs');
        return fs.readFileSync(filePath, 'utf8');
    }
}

/**
 * Runtime-optimized file write
 */
async function writeFile(filePath, content) {
    if (isBun) {
        // Bun's fast native write
        await Bun.write(filePath, content);
    } else {
        // Node.js fallback
        const fs = require('fs');
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

/**
 * Runtime-optimized shell command execution
 */
async function execCommand(command) {
    if (isBun) {
        // Bun's fast spawn API
        const proc = Bun.spawn(command.split(' '), {
            stdout: 'pipe',
            stderr: 'pipe'
        });
        
        const stdout = await new Response(proc.stdout).text();
        const stderr = await new Response(proc.stderr).text();
        const exitCode = await proc.exited;
        
        return {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode
        };
    } else {
        // Node.js fallback
        const { execSync } = require('child_process');
        try {
            const stdout = execSync(command, { encoding: 'utf8' });
            return {
                stdout: stdout.trim(),
                stderr: '',
                exitCode: 0
            };
        } catch (error) {
            return {
                stdout: '',
                stderr: error.message,
                exitCode: error.status || 1
            };
        }
    }
}

/**
 * Get appropriate database class
 */
async function getDatabase(dbPath) {
    if (isBun) {
        // Bun has built-in SQLite (much faster)
        try {
            const { Database } = await import('bun:sqlite');
            return new Database(dbPath);
        } catch (e) {
            // Fallback to better-sqlite3 if bun:sqlite not available
            const Database = require('better-sqlite3');
            return new Database(dbPath);
        }
    } else {
        // Node.js uses better-sqlite3
        const Database = require('better-sqlite3');
        return new Database(dbPath);
    }
}

/**
 * Performance info
 */
function getRuntimeInfo() {
    return {
        runtime,
        version,
        isBun,
        isNode,
        platform: process.platform,
        arch: process.arch,
        features: {
            nativeSQLite: isBun,
            nativeTypeScript: isBun,
            nativeJSX: isBun,
            hotReload: isBun
        }
    };
}

module.exports = {
    isBun,
    isNode,
    runtime,
    version,
    readFile,
    writeFile,
    execCommand,
    getDatabase,
    getRuntimeInfo
};
