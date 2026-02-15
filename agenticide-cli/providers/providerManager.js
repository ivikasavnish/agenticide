// Provider Manager
const OllamaProvider = require('./ollamaProvider');
const LMStudioProvider = require('./lmStudioProvider');
const chalk = require('chalk');

class ProviderManager {
    constructor() {
        this.providers = new Map();
        this.activeProvider = null;
    }

    async autoDetect() {
        console.log(chalk.cyan('\n🔍 Auto-detecting AI providers...\n'));
        
        try {
            const ollama = new OllamaProvider();
            if (await ollama.isAvailable()) {
                const models = await ollama.listModels();
                this.providers.set('ollama', ollama);
                console.log(chalk.green('  ✅ Ollama detected'));
                console.log(chalk.gray(`     Models: ${models.slice(0, 3).map(m => m.name || m).join(', ')}`));
            }
        } catch (e) {
            console.log(chalk.gray('  ⊘ Ollama not available'));
        }

        try {
            const lmstudio = new LMStudioProvider();
            if (await lmstudio.isAvailable()) {
                const models = await lmstudio.listModels();
                this.providers.set('lmstudio', lmstudio);
                console.log(chalk.green('  ✅ LM Studio detected'));
                console.log(chalk.gray(`     Models: ${models.slice(0, 3).map(m => m.id || m).join(', ')}`));
            }
        } catch (e) {
            console.log(chalk.gray('  ⊘ LM Studio not available'));
        }

        if (process.env.ANTHROPIC_API_KEY) {
            console.log(chalk.green('  ✅ Claude API key found'));
            this.providers.set('claude', { name: 'claude' });
        } else {
            console.log(chalk.gray('  ⊘ Claude API key not set (ANTHROPIC_API_KEY)'));
        }

        console.log('');

        if (this.providers.size === 0) {
            console.log(chalk.yellow('⚠️  No AI providers detected!\n'));
            console.log(chalk.gray('Setup: Ollama (https://ollama.ai) or LM Studio (https://lmstudio.ai)\n'));
            return null;
        }

        const providers = ['ollama', 'lmstudio', 'claude'];
        for (const name of providers) {
            if (this.providers.has(name)) {
                this.activeProvider = name;
                console.log(chalk.green(`✅ Using ${name.toUpperCase()} as AI provider\n`));
                return name;
            }
        }

        return null;
    }

    getProvider(name = null) {
        const providerName = name || this.activeProvider;
        if (!providerName) throw new Error('No AI provider selected');
        return this.providers.get(providerName);
    }

    async generate(prompt, options = {}) {
        const provider = this.getProvider(options.provider);
        if (!provider) throw new Error('No AI provider available');
        return provider.generate(prompt, options);
    }

    listProviders() {
        const list = [];
        for (const [name, provider] of this.providers.entries()) {
            list.push({ name, active: name === this.activeProvider });
        }
        return list;
    }
}

module.exports = ProviderManager;
