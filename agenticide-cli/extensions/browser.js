// Browser Extension - Web automation using Playwright
const { Extension } = require('../core/extensionManager');
const chalk = require('chalk');

class BrowserExtension extends Extension {
    constructor() {
        super();
        this.name = 'browser';
        this.version = '1.0.0';
        this.description = 'Web automation and browser control using Playwright';
        this.author = 'Agenticide';
        
        this.browser = null;
        this.page = null;
        this.playwrightInstalled = false;

        this.commands = [
            {
                name: 'browser',
                description: 'Browser automation commands',
                usage: '/browser <action> [args]',
                actions: ['open', 'close', 'screenshot', 'click', 'type', 'eval']
            }
        ];

        this.hooks = [];
    }

    async install() {
        // Check if playwright is installed
        try {
            require('playwright');
            this.playwrightInstalled = true;
            return { 
                success: true, 
                message: 'Playwright already installed' 
            };
        } catch (error) {
            console.log(chalk.yellow('\nPlaywright not installed. Install with:'));
            console.log(chalk.gray('  npm install playwright'));
            return { 
                success: false, 
                message: 'Playwright not installed',
                installCommand: 'npm install playwright'
            };
        }
    }

    async enable() {
        await this.install();
        this.enabled = true;
        return { success: true };
    }

    async disable() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
        this.enabled = false;
        return { success: true };
    }

    async execute(action, args) {
        if (!this.playwrightInstalled) {
            return {
                success: false,
                error: 'Playwright not installed. Run: npm install playwright'
            };
        }

        try {
            const playwright = require('playwright');

            switch (action) {
                case 'open':
                    return await this.open(playwright, args[0]);
                case 'close':
                    return await this.close();
                case 'screenshot':
                    return await this.screenshot(args[0]);
                case 'click':
                    return await this.click(args[0]);
                case 'type':
                    return await this.type(args[0], args.slice(1).join(' '));
                case 'eval':
                    return await this.evaluate(args.join(' '));
                case 'navigate':
                case 'goto':
                    return await this.navigate(args[0]);
                default:
                    return {
                        success: false,
                        error: `Unknown action: ${action}`
                    };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async open(playwright, url = 'about:blank') {
        if (!this.browser) {
            this.browser = await playwright.chromium.launch({ headless: false });
            this.page = await this.browser.newPage();
        }
        if (url && url !== 'about:blank') {
            await this.page.goto(url);
        }
        return { success: true, message: `Browser opened${url !== 'about:blank' ? ` at ${url}` : ''}` };
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
            return { success: true, message: 'Browser closed' };
        }
        return { success: false, error: 'No browser open' };
    }

    async screenshot(filename = 'screenshot.png') {
        if (!this.page) return { success: false, error: 'No browser page open' };
        await this.page.screenshot({ path: filename });
        return { success: true, message: `Screenshot saved: ${filename}` };
    }

    async click(selector) {
        if (!this.page) return { success: false, error: 'No browser page open' };
        await this.page.click(selector);
        return { success: true, message: `Clicked: ${selector}` };
    }

    async type(selector, text) {
        if (!this.page) return { success: false, error: 'No browser page open' };
        await this.page.fill(selector, text);
        return { success: true, message: `Typed into ${selector}` };
    }

    async evaluate(script) {
        if (!this.page) return { success: false, error: 'No browser page open' };
        const result = await this.page.evaluate(script);
        return { success: true, result };
    }

    async navigate(url) {
        if (!this.page) return { success: false, error: 'No browser page open' };
        await this.page.goto(url);
        return { success: true, message: `Navigated to: ${url}` };
    }
}

module.exports = BrowserExtension;
