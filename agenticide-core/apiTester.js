const fetch = require('node-fetch');

/**
 * APITester - Test HTTP APIs and curl commands
 * Store test history and assertions
 */
class APITester {
    constructor(projectIndex) {
        this.projectIndex = projectIndex;
    }

    /**
     * Execute HTTP request
     */
    async request(projectId, options = {}) {
        const {
            name = 'Unnamed Test',
            method = 'GET',
            url,
            headers = {},
            body = null,
            timeout = 30000
        } = options;

        const startTime = Date.now();
        let response, responseBody, statusCode, error;

        try {
            const fetchOptions = {
                method,
                headers,
                timeout
            };

            if (body && method !== 'GET' && method !== 'HEAD') {
                fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
                if (!headers['Content-Type']) {
                    headers['Content-Type'] = 'application/json';
                }
            }

            response = await fetch(url, fetchOptions);
            statusCode = response.status;
            responseBody = await response.text();

            // Try to parse as JSON
            try {
                responseBody = JSON.parse(responseBody);
            } catch (e) {
                // Keep as text
            }
        } catch (e) {
            error = e.message;
            statusCode = 0;
            responseBody = { error: e.message };
        }

        const duration = Date.now() - startTime;

        // Save to database
        const stmt = this.projectIndex.db.prepare(`
            INSERT INTO api_tests (project_id, name, method, url, headers, body, response, status_code, duration, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            projectId,
            name,
            method,
            url,
            JSON.stringify(headers),
            body ? JSON.stringify(body) : null,
            JSON.stringify(responseBody),
            statusCode,
            duration,
            Date.now()
        );

        return {
            success: statusCode >= 200 && statusCode < 300,
            statusCode,
            headers: response?.headers || {},
            body: responseBody,
            duration,
            error
        };
    }

    /**
     * Execute curl command
     */
    async curl(projectId, curlCommand, options = {}) {
        const { name = 'Curl Test' } = options;

        // Parse curl command
        const parsed = this.parseCurlCommand(curlCommand);
        
        return await this.request(projectId, {
            name,
            method: parsed.method,
            url: parsed.url,
            headers: parsed.headers,
            body: parsed.body
        });
    }

    /**
     * Parse curl command to HTTP options
     */
    parseCurlCommand(curlCommand) {
        const result = {
            method: 'GET',
            url: '',
            headers: {},
            body: null
        };

        // Remove 'curl' prefix
        let cmd = curlCommand.trim().replace(/^curl\s+/, '');

        // Extract method
        const methodMatch = cmd.match(/-X\s+(\w+)/);
        if (methodMatch) {
            result.method = methodMatch[1];
            cmd = cmd.replace(methodMatch[0], '');
        }

        // Extract headers
        const headerMatches = cmd.matchAll(/-H\s+['"]([^'"]+)['"]/g);
        for (const match of headerMatches) {
            const [key, value] = match[1].split(':').map(s => s.trim());
            result.headers[key] = value;
            cmd = cmd.replace(match[0], '');
        }

        // Extract body
        const bodyMatch = cmd.match(/--data(?:-raw)?\s+['"]([^'"]+)['"]/);
        if (bodyMatch) {
            result.body = bodyMatch[1];
            cmd = cmd.replace(bodyMatch[0], '');
        }

        // Extract URL (remaining text)
        result.url = cmd.trim().replace(/['"]|^\s+|\s+$/g, '');

        return result;
    }

    /**
     * Get test history
     */
    getHistory(projectId, options = {}) {
        let query = 'SELECT * FROM api_tests WHERE project_id = ?';
        const params = [projectId];

        if (options.url) {
            query += ' AND url LIKE ?';
            params.push(`%${options.url}%`);
        }

        if (options.method) {
            query += ' AND method = ?';
            params.push(options.method);
        }

        query += ' ORDER BY created_at DESC';

        if (options.limit) {
            query += ` LIMIT ${options.limit}`;
        }

        const stmt = this.projectIndex.db.prepare(query);
        const tests = stmt.all(...params);

        return tests.map(t => ({
            ...t,
            headers: JSON.parse(t.headers),
            body: t.body ? JSON.parse(t.body) : null,
            response: JSON.parse(t.response)
        }));
    }

    /**
     * Get test by ID
     */
    getTest(testId) {
        const stmt = this.projectIndex.db.prepare('SELECT * FROM api_tests WHERE id = ?');
        const test = stmt.get(testId);
        
        if (test) {
            test.headers = JSON.parse(test.headers);
            test.body = test.body ? JSON.parse(test.body) : null;
            test.response = JSON.parse(test.response);
        }

        return test;
    }

    /**
     * Replay test
     */
    async replayTest(testId) {
        const test = this.getTest(testId);
        if (!test) {
            throw new Error('Test not found');
        }

        return await this.request(test.project_id, {
            name: test.name + ' (Replay)',
            method: test.method,
            url: test.url,
            headers: test.headers,
            body: test.body
        });
    }

    /**
     * Create test collection
     */
    createCollection(projectId, name, tests) {
        // Store as metadata in project
        const project = this.projectIndex.getProject(
            this.projectIndex.db.prepare('SELECT path FROM projects WHERE id = ?').get(projectId).path
        );

        const metadata = project.metadata || {};
        if (!metadata.testCollections) {
            metadata.testCollections = [];
        }

        metadata.testCollections.push({
            name,
            tests,
            createdAt: Date.now()
        });

        const stmt = this.projectIndex.db.prepare('UPDATE projects SET metadata = ? WHERE id = ?');
        stmt.run(JSON.stringify(metadata), projectId);
    }

    /**
     * Run test collection
     */
    async runCollection(projectId, collectionName) {
        const project = this.projectIndex.db.prepare('SELECT metadata FROM projects WHERE id = ?').get(projectId);
        const metadata = JSON.parse(project.metadata || '{}');
        const collection = metadata.testCollections?.find(c => c.name === collectionName);

        if (!collection) {
            throw new Error('Collection not found');
        }

        const results = [];
        for (const test of collection.tests) {
            const result = await this.request(projectId, test);
            results.push({ ...test, result });
        }

        return results;
    }

    /**
     * Assert response
     */
    assert(response, assertions) {
        const results = [];

        for (const [key, expected] of Object.entries(assertions)) {
            let actual, passed;

            if (key === 'statusCode') {
                actual = response.statusCode;
                passed = actual === expected;
            } else if (key === 'bodyContains') {
                actual = JSON.stringify(response.body);
                passed = actual.includes(expected);
            } else if (key.startsWith('body.')) {
                const path = key.split('.').slice(1);
                actual = path.reduce((obj, prop) => obj?.[prop], response.body);
                passed = actual === expected;
            } else if (key.startsWith('header.')) {
                const headerName = key.split('.')[1];
                actual = response.headers.get(headerName);
                passed = actual === expected;
            }

            results.push({
                assertion: key,
                expected,
                actual,
                passed
            });
        }

        return {
            passed: results.every(r => r.passed),
            results
        };
    }
}

module.exports = APITester;
