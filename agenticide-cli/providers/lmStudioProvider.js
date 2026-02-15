// LM Studio Provider
const http = require('http');

class LMStudioProvider {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || 'http://localhost:1234';
        this.model = options.model || 'local-model';
        this.timeout = options.timeout || 3000;
    }

    async isAvailable() {
        try {
            const response = await this._request('/v1/models', 'GET');
            return response && response.data && response.data.length > 0;
        } catch (error) {
            return false;
        }
    }

    async listModels() {
        try {
            const response = await this._request('/v1/models', 'GET');
            return response.data || [];
        } catch (error) {
            return [];
        }
    }

    async generate(prompt, options = {}) {
        const messages = [{ role: 'user', content: prompt }];
        const payload = {
            model: options.model || this.model,
            messages,
            temperature: 0.7,
            stream: false
        };

        const response = await this._request('/v1/chat/completions', 'POST', payload);
        return response.choices?.[0]?.message?.content || '';
    }

    _request(path, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(path, this.baseUrl);
            const req = http.request({ hostname: url.hostname, port: url.port, path: url.pathname, method, headers: { 'Content-Type': 'application/json' }, timeout: this.timeout }, (res) => {
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

module.exports = LMStudioProvider;
