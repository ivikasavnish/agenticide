// API Runner Extension - Test and interact with REST APIs
const { Extension } = require('../core/extensionManager');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class APIRunnerExtension extends Extension {
    constructor() {
        super();
        this.name = 'api';
        this.version = '1.0.0';
        this.description = 'Test and interact with REST APIs';
        this.author = 'Agenticide';
        this.history = [];
        this.savedRequests = new Map();
        this.commands = [
            { name: 'api', description: 'API testing and interaction', usage: '/api <action> [options]' }
        ];
    }

    async install() { return { success: true }; }
    async enable() { this.enabled = true; return { success: true }; }
    async disable() { this.enabled = false; return { success: true }; }

    async execute(action, args) {
        try {
            switch (action) {
                case 'get': return await this.makeRequest('GET', args[0], null, this.parseHeaders(args.slice(1)));
                case 'post': return await this.makeRequest('POST', args[0], args[1], this.parseHeaders(args.slice(2)));
                case 'put': return await this.makeRequest('PUT', args[0], args[1], this.parseHeaders(args.slice(2)));
                case 'patch': return await this.makeRequest('PATCH', args[0], args[1], this.parseHeaders(args.slice(2)));
                case 'delete': return await this.makeRequest('DELETE', args[0], null, this.parseHeaders(args.slice(1)));
                case 'history': return this.showHistory();
                case 'save': return this.saveRequest(args[0], args.slice(1));
                case 'load': return this.loadRequest(args[0]);
                case 'list': return this.listSaved();
                case 'clear': return this.clearHistory();
                default: 
                    return { 
                        success: false, 
                        error: `Unknown action: ${action}. Available: get, post, put, patch, delete, history, save, load, list, clear` 
                    };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    parseHeaders(args) {
        const headers = {};
        for (let i = 0; i < args.length; i++) {
            if (args[i].startsWith('-H') || args[i].startsWith('--header')) {
                const headerValue = args[i + 1] || args[i].split('=')[1];
                if (headerValue) {
                    const [key, ...valueParts] = headerValue.split(':');
                    headers[key.trim()] = valueParts.join(':').trim();
                }
            }
        }
        return headers;
    }

    async makeRequest(method, url, body = null, customHeaders = {}) {
        if (!url) {
            return { success: false, error: 'URL is required' };
        }

        // Add protocol if missing
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        return new Promise((resolve) => {
            const startTime = Date.now();
            const parsedUrl = new URL(url);
            const isHttps = parsedUrl.protocol === 'https:';
            const lib = isHttps ? https : http;

            const headers = {
                'User-Agent': 'Agenticide-API-Runner/1.0',
                ...customHeaders
            };

            if (body && typeof body === 'string') {
                try {
                    JSON.parse(body);
                    headers['Content-Type'] = 'application/json';
                    headers['Content-Length'] = Buffer.byteLength(body);
                } catch {
                    headers['Content-Type'] = 'text/plain';
                }
            }

            const options = {
                method,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname + parsedUrl.search,
                headers
            };

            const req = lib.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    const duration = Date.now() - startTime;
                    let parsedData = data;
                    try {
                        parsedData = JSON.parse(data);
                    } catch {
                        // Keep as string if not JSON
                    }

                    const result = {
                        success: true,
                        method,
                        url,
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        headers: res.headers,
                        body: parsedData,
                        duration: `${duration}ms`,
                        size: Buffer.byteLength(data) + ' bytes'
                    };

                    this.history.push({
                        timestamp: new Date().toISOString(),
                        ...result
                    });

                    resolve(result);
                });
            });

            req.on('error', (error) => {
                resolve({
                    success: false,
                    error: error.message,
                    url,
                    method
                });
            });

            if (body) {
                req.write(body);
            }

            req.end();
        });
    }

    showHistory() {
        if (this.history.length === 0) {
            return { success: true, message: 'No API requests in history' };
        }

        const formatted = this.history.slice(-10).map((req, idx) => ({
            index: this.history.length - 10 + idx,
            method: req.method,
            url: req.url,
            status: req.statusCode,
            duration: req.duration,
            timestamp: req.timestamp
        }));

        return { success: true, history: formatted };
    }

    saveRequest(name, args) {
        if (!name) {
            return { success: false, error: 'Request name is required' };
        }

        const lastRequest = this.history[this.history.length - 1];
        if (!lastRequest) {
            return { success: false, error: 'No request to save' };
        }

        this.savedRequests.set(name, {
            method: lastRequest.method,
            url: lastRequest.url,
            body: lastRequest.body
        });

        return { success: true, message: `Request saved as: ${name}` };
    }

    loadRequest(name) {
        if (!name) {
            return { success: false, error: 'Request name is required' };
        }

        const request = this.savedRequests.get(name);
        if (!request) {
            return { success: false, error: `Request '${name}' not found` };
        }

        return { success: true, request };
    }

    listSaved() {
        if (this.savedRequests.size === 0) {
            return { success: true, message: 'No saved requests' };
        }

        const saved = Array.from(this.savedRequests.entries()).map(([name, req]) => ({
            name,
            method: req.method,
            url: req.url
        }));

        return { success: true, saved };
    }

    clearHistory() {
        this.history = [];
        return { success: true, message: 'History cleared' };
    }
}

module.exports = APIRunnerExtension;
