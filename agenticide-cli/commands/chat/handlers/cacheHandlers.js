// Cache Management Handlers
const chalk = require('chalk');

class CacheHandlers {
    constructor(agentManager) {
        this.agentManager = agentManager;
    }

    async handleCache(args) {
        const subCmd = args[0];
        
        if (subCmd === 'stats') {
            const stats = await this.agentManager.cache.getStats();
            console.log(chalk.cyan('\n📊 Cache Statistics:\n'));
            if (stats.enabled) {
                console.log(chalk.gray('Status:'), chalk.green('Enabled'));
                console.log(chalk.gray('Total Keys:'), stats.totalKeys);
                console.log(chalk.gray('Cache Hits:'), stats.hits);
                console.log(chalk.gray('Cache Misses:'), stats.misses);
                console.log(chalk.gray('Hit Rate:'), stats.hitRate);
            } else {
                console.log(chalk.yellow('Redis not available'));
                console.log(chalk.gray('Install: npm install redis'));
                console.log(chalk.gray('Start: brew services start redis'));
            }
            console.log('');
        } else if (subCmd === 'clear') {
            const success = await this.agentManager.cache.clear();
            if (success) {
                console.log(chalk.green('✅ Cache cleared\n'));
            } else {
                console.log(chalk.yellow('⚠️  Cache not available\n'));
            }
        } else {
            console.log(chalk.cyan('\n💾 Cache Commands:\n'));
            console.log(chalk.gray('  /cache stats    - Show cache statistics'));
            console.log(chalk.gray('  /cache clear    - Clear all cached data'));
            console.log('');
        }
    }
}

module.exports = CacheHandlers;
