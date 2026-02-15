// Ollama Provider - Local AI model support via Ollama
const http = require('http');
const https = require('https');

class OllamaProvider {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:11434';
        this.model = options.model || 'codellama';
        this.timeout = options.timeout || 3000;
    }

    async isAvailable() {
        try {
            const response = await this._request('/api/tags', 'GET');
            return response && response.models && response.models.length > 0;
        } catch (error) {
            return false;
        }
    }

    async listModels() {
        try {
            const response = await this._request('/api/tags', 'GET');
            return response.models || [];
        } catch (error) {
            return [];
        }
    }

    async generate(prompt, options = {}) {
        const model = options.model || this.model;
        const system = options.system || 'You are a helpful coding assistant.';
        
        const payload = {
            model,
            prompt,
            system,
            stream: false
        };

        const response = await this._request('/api/generate', 'POST', payload);
        return response.response || '';
    }

    _request(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const client = url.protocol === 'https:' ? https : http;

            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method,
                headers: { 'Content-Type': 'application/json' },
                timeout: this.timeout
            };

            const req = client.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        try { resolve(JSON.parse(body)); } catch (e) { resolve(body); }
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}`));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });

            if (data) req.write(JSON.stringify(data));
            req.end();
        });
    }
}

module.exports = OllamaProvider;
