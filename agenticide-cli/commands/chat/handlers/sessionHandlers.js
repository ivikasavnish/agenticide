// Session Management Handlers
const chalk = require('chalk');

class SessionHandlers {
    constructor(sessionManager) {
        this.sessionManager = sessionManager;
    }

    handleSessions() {
        const sessions = this.sessionManager.listSessions();
        console.log(chalk.cyan('\n💾 Saved Sessions:\n'));
        if (sessions.length === 0) {
            console.log(chalk.gray('  No saved sessions yet\n'));
        } else {
            sessions.forEach(s => {
                console.log(`  • ${s.name} ${chalk.gray(`(${s.date})`)}`);
            });
            console.log('');
        }
    }

    async handleSession(args, conversationHistory) {
        const subCmd = args[0];
        const sessionName = args[1];
        
        if (subCmd === 'save') {
            if (!sessionName) {
                console.log(chalk.red('\n✗ Please provide a session name\n'));
                console.log(chalk.gray('Usage: /session save <name>\n'));
            } else {
                const result = this.sessionManager.saveSession(sessionName, {
                    history: conversationHistory,
                    timestamp: Date.now()
                });
                
                if (result.success) {
                    console.log(chalk.green(`\n✓ Session saved: ${sessionName}\n`));
                } else {
                    console.log(chalk.red(`\n✗ Failed to save session: ${result.error}\n`));
                }
            }
        } else if (subCmd === 'load') {
            if (!sessionName) {
                console.log(chalk.red('\n✗ Please provide a session name\n'));
                console.log(chalk.gray('Usage: /session load <name>\n'));
            } else {
                const result = this.sessionManager.loadSession(sessionName);
                
                if (result.success) {
                    console.log(chalk.green(`\n✓ Loaded session: ${sessionName}\n`));
                    console.log(chalk.gray(`Messages: ${result.session.history.length}\n`));
                    return result.session.history;
                } else {
                    console.log(chalk.red(`\n✗ Failed to load session: ${result.error}\n`));
                }
            }
        } else {
            console.log(chalk.cyan('\n💾 Session Commands:\n'));
            console.log(chalk.gray('  /sessions              - List all saved sessions'));
            console.log(chalk.gray('  /session save <name>   - Save current session'));
            console.log(chalk.gray('  /session load <name>   - Load a session'));
            console.log('');
        }
        
        return conversationHistory;
    }
}

module.exports = SessionHandlers;
