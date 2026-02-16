// Session Manager - Save, load, and manage named chat sessions
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

class SessionManager {
    constructor(sessionsDir = null) {
        this.sessionsDir = sessionsDir || path.join(
            process.env.HOME || process.env.USERPROFILE,
            '.agenticide',
            'sessions'
        );
        
        // Ensure sessions directory exists
        if (!fs.existsSync(this.sessionsDir)) {
            fs.mkdirSync(this.sessionsDir, { recursive: true });
        }
        
        this.metadataFile = path.join(this.sessionsDir, 'metadata.json');
        this.lastSessionFile = path.join(this.sessionsDir, '.last-session');
    }

    /**
     * Generate session name from timestamp
     */
    generateSessionName() {
        const now = new Date();
        const date = now.toISOString().split('T')[0];
        const time = now.toTimeString().split(' ')[0].replace(/:/g, '-');
        return `session-${date}-${time}`;
    }

    /**
     * Save session
     */
    saveSession(name, data) {
        try {
            const sessionName = name || this.generateSessionName();
            const sessionFile = path.join(this.sessionsDir, `${sessionName}.json`);
            
            const sessionData = {
                name: sessionName,
                createdAt: data.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messageCount: data.messages?.length || 0,
                context: data.context || {},
                messages: data.messages || [],
                tasks: data.tasks || [],
                metadata: data.metadata || {}
            };

            fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
            
            // Update metadata index
            this.updateMetadata(sessionName, {
                createdAt: sessionData.createdAt,
                updatedAt: sessionData.updatedAt,
                messageCount: sessionData.messageCount,
                directory: sessionData.context.cwd || process.cwd()
            });
            
            // Update last session reference
            fs.writeFileSync(this.lastSessionFile, sessionName);
            
            return {
                success: true,
                sessionName,
                path: sessionFile
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Load session
     */
    loadSession(name) {
        try {
            const sessionFile = path.join(this.sessionsDir, `${name}.json`);
            
            if (!fs.existsSync(sessionFile)) {
                return {
                    success: false,
                    error: `Session '${name}' not found`
                };
            }

            const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
            
            // Update last access time
            sessionData.lastAccessedAt = new Date().toISOString();
            fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
            
            return {
                success: true,
                session: sessionData
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List all sessions
     */
    listSessions(options = {}) {
        try {
            const files = fs.readdirSync(this.sessionsDir)
                .filter(f => f.endsWith('.json') && f !== 'metadata.json');
            
            const sessions = files.map(file => {
                const sessionFile = path.join(this.sessionsDir, file);
                try {
                    const data = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
                    return {
                        name: data.name,
                        createdAt: data.createdAt,
                        updatedAt: data.updatedAt,
                        lastAccessedAt: data.lastAccessedAt,
                        messageCount: data.messageCount,
                        directory: data.context?.cwd || 'unknown',
                        size: fs.statSync(sessionFile).size
                    };
                } catch (err) {
                    return null;
                }
            }).filter(Boolean);

            // Sort by updated time (most recent first)
            sessions.sort((a, b) => 
                new Date(b.updatedAt) - new Date(a.updatedAt)
            );

            if (options.limit) {
                return sessions.slice(0, options.limit);
            }

            return sessions;
        } catch (error) {
            console.error(chalk.red(`Error listing sessions: ${error.message}`));
            return [];
        }
    }

    /**
     * Delete session
     */
    deleteSession(name) {
        try {
            const sessionFile = path.join(this.sessionsDir, `${name}.json`);
            
            if (!fs.existsSync(sessionFile)) {
                return {
                    success: false,
                    error: `Session '${name}' not found`
                };
            }

            fs.unlinkSync(sessionFile);
            
            // Remove from metadata
            this.removeFromMetadata(name);
            
            return {
                success: true,
                message: `Session '${name}' deleted`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get last session name
     */
    getLastSession() {
        try {
            if (fs.existsSync(this.lastSessionFile)) {
                return fs.readFileSync(this.lastSessionFile, 'utf8').trim();
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Clean old sessions (older than days)
     */
    cleanOldSessions(days = 30) {
        try {
            const sessions = this.listSessions();
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - days);
            
            let deleted = 0;
            sessions.forEach(session => {
                const updatedAt = new Date(session.updatedAt);
                if (updatedAt < cutoff) {
                    const result = this.deleteSession(session.name);
                    if (result.success) {
                        deleted++;
                    }
                }
            });

            return {
                success: true,
                deleted,
                message: `Deleted ${deleted} old sessions`
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Update metadata index
     */
    updateMetadata(sessionName, data) {
        try {
            let metadata = {};
            if (fs.existsSync(this.metadataFile)) {
                metadata = JSON.parse(fs.readFileSync(this.metadataFile, 'utf8'));
            }

            metadata[sessionName] = {
                ...data,
                updatedAt: new Date().toISOString()
            };

            fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
        } catch (error) {
            console.error(chalk.yellow(`Warning: Could not update metadata: ${error.message}`));
        }
    }

    /**
     * Remove from metadata
     */
    removeFromMetadata(sessionName) {
        try {
            if (fs.existsSync(this.metadataFile)) {
                const metadata = JSON.parse(fs.readFileSync(this.metadataFile, 'utf8'));
                delete metadata[sessionName];
                fs.writeFileSync(this.metadataFile, JSON.stringify(metadata, null, 2));
            }
        } catch (error) {
            console.error(chalk.yellow(`Warning: Could not update metadata: ${error.message}`));
        }
    }

    /**
     * Display sessions in formatted table
     */
    displaySessions(sessions = null) {
        const list = sessions || this.listSessions();
        
        if (list.length === 0) {
            console.log(chalk.gray('\n  No sessions found\n'));
            return;
        }

        console.log(chalk.cyan('\n📁 Available Sessions:\n'));
        
        list.forEach((session, index) => {
            const num = chalk.gray(`${index + 1}.`);
            const name = chalk.bold(session.name);
            const messages = chalk.gray(`${session.messageCount} messages`);
            const date = new Date(session.updatedAt).toLocaleString();
            const dateStr = chalk.gray(date);
            const size = chalk.gray(`(${this.formatSize(session.size)})`);
            
            console.log(`  ${num} ${name}`);
            console.log(`     ${messages} • ${dateStr} ${size}`);
            console.log(chalk.gray(`     ${session.directory}`));
            console.log();
        });
    }

    /**
     * Format file size
     */
    formatSize(bytes) {
        if (bytes < 1024) return `${bytes}B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    }

    /**
     * Get session statistics
     */
    getStatistics() {
        const sessions = this.listSessions();
        
        const totalMessages = sessions.reduce((sum, s) => sum + s.messageCount, 0);
        const totalSize = sessions.reduce((sum, s) => sum + s.size, 0);
        const avgMessages = sessions.length > 0 
            ? Math.round(totalMessages / sessions.length) 
            : 0;

        return {
            totalSessions: sessions.length,
            totalMessages,
            averageMessages: avgMessages,
            totalSize: this.formatSize(totalSize),
            oldestSession: sessions.length > 0 
                ? sessions[sessions.length - 1].name 
                : null,
            newestSession: sessions.length > 0 
                ? sessions[0].name 
                : null
        };
    }
}

module.exports = SessionManager;
