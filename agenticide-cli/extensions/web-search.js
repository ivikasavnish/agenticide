// Web Search Extension - Advanced web search with content extraction and console analysis
const { Extension } = require('../core/extensionManager');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs');

class WebSearchExtension extends Extension {
    constructor() {
        super();
        this.name = 'web-search';
        this.version = '1.0.0';
        this.description = 'Advanced web search with content cleaning, console capture, and text-mode browsing';
        this.author = 'Agenticide';
        
        this.browser = null;
        this.context = null;
        this.pages = new Map();
        this.consoleLogs = [];
        this.playwrightInstalled = false;

        this.commands = [
            {
                name: 'search',
                description: 'Search the web and extract clean content',
                usage: '/search <query> [options]',
                aliases: ['find', 'lookup']
            },
            {
                name: 'browse',
                description: 'Browse URL with content extraction',
                usage: '/browse <url> [--text|--clean|--raw|--console]',
                aliases: ['open', 'visit']
            },
            {
                name: 'extract',
                description: 'Extract content from current page',
                usage: '/extract [--text|--links|--images|--data]',
                aliases: ['scrape', 'get']
            }
        ];

        this.hooks = [];
    }

    async install() {
        try {
            this.playwright = require('playwright');
            this.playwrightInstalled = true;
            return { 
                success: true, 
                message: 'Playwright available' 
            };
        } catch (error) {
            console.log(chalk.yellow('\nPlaywright not installed. Install with:'));
            console.log(chalk.gray('  npm install playwright'));
            return { 
                success: false, 
                message: 'Playwright required for web search',
                installCommand: 'npm install playwright'
            };
        }
    }

    async enable() {
        const result = await this.install();
        if (!result.success) {
            return result;
        }
        
        // Initialize browser
        await this.initBrowser();
        
        return { success: true, message: 'Web search extension enabled' };
    }

    async disable() {
        await this.closeBrowser();
        return { success: true, message: 'Web search extension disabled' };
    }

    async initBrowser() {
        if (!this.playwrightInstalled || this.browser) return;
        
        try {
            this.browser = await this.playwright.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            
            this.context = await this.browser.newContext({
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                viewport: { width: 1280, height: 720 }
            });
            
            console.log(chalk.green('✓ Browser initialized'));
        } catch (error) {
            console.error(chalk.red('Failed to initialize browser:'), error.message);
        }
    }

    async closeBrowser() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.context = null;
            this.pages.clear();
        }
    }

    async handleCommand(command, args, context) {
        if (!this.playwrightInstalled) {
            return {
                success: false,
                message: 'Playwright not installed. Run: npm install playwright'
            };
        }

        await this.initBrowser();

        switch (command) {
            case 'search':
            case 'find':
            case 'lookup':
                return await this.handleSearch(args, context);
            
            case 'browse':
            case 'open':
            case 'visit':
                return await this.handleBrowse(args, context);
            
            case 'extract':
            case 'scrape':
            case 'get':
                return await this.handleExtract(args, context);
            
            default:
                return {
                    success: false,
                    message: `Unknown command: ${command}`
                };
        }
    }

    async handleSearch(args, context) {
        const query = args.join(' ');
        if (!query) {
            return {
                success: false,
                message: 'Usage: /search <query>'
            };
        }

        console.log(chalk.blue(`\n🔍 Searching for: ${query}\n`));

        // Search multiple engines in parallel
        const results = await Promise.allSettled([
            this.searchGoogle(query),
            this.searchDuckDuckGo(query)
        ]);

        const allResults = [];
        results.forEach((result, idx) => {
            if (result.status === 'fulfilled' && result.value) {
                allResults.push(...result.value);
            }
        });

        // Deduplicate by URL
        const uniqueResults = this.deduplicateResults(allResults);

        // Display results
        this.displaySearchResults(uniqueResults);

        return {
            success: true,
            data: uniqueResults,
            message: `Found ${uniqueResults.length} unique results`
        };
    }

    async searchGoogle(query) {
        try {
            const page = await this.context.newPage();
            this.setupConsoleCapture(page);

            const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

            // Extract search results
            const results = await page.evaluate(() => {
                const items = [];
                const resultElements = document.querySelectorAll('div.g, div[data-sokoban-container]');
                
                resultElements.forEach(el => {
                    const linkEl = el.querySelector('a[href]');
                    const titleEl = el.querySelector('h3');
                    const snippetEl = el.querySelector('div[data-sncf], div.VwiC3b, div.s3v9rd');
                    
                    if (linkEl && titleEl) {
                        const href = linkEl.href;
                        if (href && !href.includes('google.com') && !href.startsWith('#')) {
                            items.push({
                                title: titleEl.textContent.trim(),
                                url: href,
                                snippet: snippetEl ? snippetEl.textContent.trim() : '',
                                source: 'google'
                            });
                        }
                    }
                });
                
                return items;
            });

            await page.close();
            return results;
        } catch (error) {
            console.error(chalk.red('Google search failed:'), error.message);
            return [];
        }
    }

    async searchDuckDuckGo(query) {
        try {
            const page = await this.context.newPage();
            this.setupConsoleCapture(page);

            const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
            await page.goto(url, { waitUntil: 'networkidle', timeout: 10000 });

            // Wait for results
            await page.waitForSelector('article[data-testid="result"]', { timeout: 5000 }).catch(() => {});

            const results = await page.evaluate(() => {
                const items = [];
                const resultElements = document.querySelectorAll('article[data-testid="result"], li[data-layout="organic"]');
                
                resultElements.forEach(el => {
                    const linkEl = el.querySelector('a[href]');
                    const titleEl = el.querySelector('h2, .result__title');
                    const snippetEl = el.querySelector('div[data-result="snippet"], .result__snippet');
                    
                    if (linkEl && titleEl) {
                        items.push({
                            title: titleEl.textContent.trim(),
                            url: linkEl.href,
                            snippet: snippetEl ? snippetEl.textContent.trim() : '',
                            source: 'duckduckgo'
                        });
                    }
                });
                
                return items;
            });

            await page.close();
            return results;
        } catch (error) {
            console.error(chalk.red('DuckDuckGo search failed:'), error.message);
            return [];
        }
    }

    async handleBrowse(args, context) {
        if (args.length === 0) {
            return {
                success: false,
                message: 'Usage: /browse <url> [--text|--clean|--raw|--console]'
            };
        }

        let url = args[0];
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        const options = {
            text: args.includes('--text'),
            clean: args.includes('--clean'),
            raw: args.includes('--raw'),
            console: args.includes('--console')
        };

        // Default to clean mode
        if (!options.text && !options.clean && !options.raw) {
            options.clean = true;
        }

        console.log(chalk.blue(`\n🌐 Browsing: ${url}\n`));

        try {
            const page = await this.context.newPage();
            this.setupConsoleCapture(page);
            this.pages.set(url, page);

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

            const result = {
                url,
                title: await page.title(),
                content: null,
                consoleLogs: [],
                success: true
            };

            if (options.text) {
                result.content = await this.extractTextContent(page);
                this.displayTextMode(result);
            } else if (options.clean) {
                result.content = await this.extractCleanContent(page);
                this.displayCleanContent(result);
            } else if (options.raw) {
                result.content = await page.content();
                console.log(chalk.gray(result.content.substring(0, 2000) + '...'));
            }

            if (options.console) {
                result.consoleLogs = this.consoleLogs;
                this.displayConsoleLogs();
            }

            return result;
        } catch (error) {
            return {
                success: false,
                message: `Failed to browse ${url}: ${error.message}`
            };
        }
    }

    async handleExtract(args, context) {
        const options = {
            text: args.includes('--text'),
            links: args.includes('--links'),
            images: args.includes('--images'),
            data: args.includes('--data')
        };

        if (!options.text && !options.links && !options.images && !options.data) {
            options.text = true; // default
        }

        const activePages = Array.from(this.pages.values());
        if (activePages.length === 0) {
            return {
                success: false,
                message: 'No active page. Use /browse <url> first'
            };
        }

        const page = activePages[activePages.length - 1];

        const result = {
            success: true,
            data: {}
        };

        if (options.text) {
            result.data.text = await this.extractTextContent(page);
            console.log(chalk.white(result.data.text));
        }

        if (options.links) {
            result.data.links = await this.extractLinks(page);
            console.log(chalk.blue('\nLinks:'));
            result.data.links.forEach((link, idx) => {
                console.log(chalk.gray(`  ${idx + 1}. ${link.text || '(no text)'}`));
                console.log(chalk.dim(`     ${link.href}`));
            });
        }

        if (options.images) {
            result.data.images = await this.extractImages(page);
            console.log(chalk.blue('\nImages:'));
            result.data.images.forEach((img, idx) => {
                console.log(chalk.gray(`  ${idx + 1}. ${img.alt || '(no alt)'} - ${img.src}`));
            });
        }

        if (options.data) {
            result.data.structured = await this.extractStructuredData(page);
            console.log(chalk.blue('\nStructured Data:'));
            console.log(JSON.stringify(result.data.structured, null, 2));
        }

        return result;
    }

    setupConsoleCapture(page) {
        this.consoleLogs = [];
        
        page.on('console', msg => {
            this.consoleLogs.push({
                type: msg.type(),
                text: msg.text(),
                timestamp: Date.now()
            });
        });

        page.on('pageerror', error => {
            this.consoleLogs.push({
                type: 'error',
                text: error.message,
                stack: error.stack,
                timestamp: Date.now()
            });
        });
    }

    async extractTextContent(page) {
        return await page.evaluate(() => {
            // Remove scripts, styles, and hidden elements
            const elementsToRemove = document.querySelectorAll('script, style, noscript, iframe, [hidden], [style*="display: none"], [style*="display:none"]');
            elementsToRemove.forEach(el => el.remove());

            // Get body text with basic formatting
            const body = document.body;
            if (!body) return '';

            let text = '';
            const walk = (node) => {
                if (node.nodeType === Node.TEXT_NODE) {
                    const content = node.textContent.trim();
                    if (content) {
                        text += content + ' ';
                    }
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                    const tag = node.tagName.toLowerCase();
                    
                    // Add line breaks for block elements
                    if (['p', 'div', 'br', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
                        text += '\n';
                    }
                    
                    // Add double line break for major sections
                    if (['h1', 'h2', 'article', 'section'].includes(tag)) {
                        text += '\n';
                    }
                    
                    Array.from(node.childNodes).forEach(walk);
                }
            };

            walk(body);
            
            // Clean up whitespace
            return text.replace(/\n{3,}/g, '\n\n').trim();
        });
    }

    async extractCleanContent(page) {
        return await page.evaluate(() => {
            // Readability-style content extraction
            const cloneDoc = document.cloneNode(true);
            
            // Remove unwanted elements
            const unwanted = cloneDoc.querySelectorAll([
                'script', 'style', 'noscript', 'iframe', 'nav', 'header', 'footer',
                'aside', '[role="navigation"]', '[role="banner"]', '[role="complementary"]',
                '.ad', '.ads', '.advertisement', '.social-share', '.comments',
                '#comments', '.sidebar', '#sidebar', '.menu', '#menu'
            ].join(','));
            
            unwanted.forEach(el => el.remove());

            // Find main content
            let mainContent = cloneDoc.querySelector('main, article, [role="main"], .main-content, #main-content');
            if (!mainContent) {
                mainContent = cloneDoc.body;
            }

            // Extract paragraphs with good text density
            const paragraphs = [];
            const pElements = mainContent.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6');
            
            pElements.forEach(el => {
                const text = el.textContent.trim();
                if (text.length > 40) { // Min length for meaningful content
                    paragraphs.push({
                        tag: el.tagName.toLowerCase(),
                        text: text
                    });
                }
            });

            return {
                title: document.title,
                headings: Array.from(mainContent.querySelectorAll('h1, h2, h3')).map(h => ({
                    level: h.tagName,
                    text: h.textContent.trim()
                })),
                paragraphs: paragraphs,
                wordCount: paragraphs.reduce((sum, p) => sum + p.text.split(/\s+/).length, 0)
            };
        });
    }

    async extractLinks(page) {
        return await page.evaluate(() => {
            const links = [];
            document.querySelectorAll('a[href]').forEach(a => {
                const href = a.href;
                if (href && !href.startsWith('javascript:') && !href.startsWith('#')) {
                    links.push({
                        text: a.textContent.trim(),
                        href: href,
                        title: a.title || null
                    });
                }
            });
            return links;
        });
    }

    async extractImages(page) {
        return await page.evaluate(() => {
            const images = [];
            document.querySelectorAll('img[src]').forEach(img => {
                images.push({
                    src: img.src,
                    alt: img.alt || null,
                    width: img.width,
                    height: img.height
                });
            });
            return images;
        });
    }

    async extractStructuredData(page) {
        return await page.evaluate(() => {
            const structured = {
                meta: {},
                jsonLd: [],
                microdata: []
            };

            // Extract meta tags
            document.querySelectorAll('meta[property], meta[name]').forEach(meta => {
                const key = meta.getAttribute('property') || meta.getAttribute('name');
                const value = meta.getAttribute('content');
                if (key && value) {
                    structured.meta[key] = value;
                }
            });

            // Extract JSON-LD
            document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
                try {
                    structured.jsonLd.push(JSON.parse(script.textContent));
                } catch (e) {}
            });

            return structured;
        });
    }

    deduplicateResults(results) {
        const seen = new Set();
        return results.filter(result => {
            if (seen.has(result.url)) {
                return false;
            }
            seen.add(result.url);
            return true;
        });
    }

    displaySearchResults(results) {
        console.log(chalk.bold(`\n📊 Found ${results.length} results:\n`));
        
        results.forEach((result, idx) => {
            console.log(chalk.cyan(`${idx + 1}. ${result.title}`));
            console.log(chalk.dim(`   ${result.url}`));
            if (result.snippet) {
                console.log(chalk.gray(`   ${result.snippet.substring(0, 150)}...`));
            }
            console.log(chalk.dim(`   Source: ${result.source}`));
            console.log();
        });
    }

    displayTextMode(result) {
        console.log(chalk.bold.white(`\n━━━ ${result.title} ━━━\n`));
        console.log(chalk.dim(result.url));
        console.log(chalk.white('\n' + result.content + '\n'));
        console.log(chalk.dim(`\n━━━ End of page ━━━\n`));
    }

    displayCleanContent(result) {
        const content = result.content;
        
        console.log(chalk.bold.white(`\n━━━ ${content.title} ━━━\n`));
        console.log(chalk.dim(result.url));
        
        if (content.headings && content.headings.length > 0) {
            console.log(chalk.bold('\nTable of Contents:'));
            content.headings.forEach(h => {
                const indent = '  '.repeat(parseInt(h.level[1]) - 1);
                console.log(chalk.blue(indent + '• ' + h.text));
            });
        }

        console.log(chalk.bold('\nContent:'));
        if (content.paragraphs) {
            content.paragraphs.forEach(p => {
                if (p.tag.startsWith('h')) {
                    console.log(chalk.bold.cyan(`\n${p.text}\n`));
                } else {
                    console.log(chalk.white(p.text));
                    console.log();
                }
            });
        }

        console.log(chalk.dim(`\n📝 ${content.wordCount} words\n`));
    }

    displayConsoleLogs() {
        if (this.consoleLogs.length === 0) {
            console.log(chalk.dim('\nNo console output'));
            return;
        }

        console.log(chalk.bold('\n📋 Console Output:\n'));
        this.consoleLogs.forEach(log => {
            const icon = {
                'log': '📘',
                'info': 'ℹ️',
                'warn': '⚠️',
                'error': '❌'
            }[log.type] || '📝';

            const color = {
                'log': chalk.gray,
                'info': chalk.blue,
                'warn': chalk.yellow,
                'error': chalk.red
            }[log.type] || chalk.white;

            console.log(color(`${icon} [${log.type}] ${log.text}`));
        });
        console.log();
    }
}

module.exports = WebSearchExtension;
