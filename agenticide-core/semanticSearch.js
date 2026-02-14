/**
 * Semantic Search Engine for Code
 * 
 * Features:
 * - Extract descriptions from code (comments, function names, JSDoc)
 * - Generate embeddings using local models or OpenAI
 * - Vector storage and similarity search
 * - Natural language queries: "where do I update authentication?"
 */

const fs = require('fs');
const path = require('path');

class SemanticSearch {
    constructor(db) {
        this.db = db;
        this.initDatabase();
    }

    initDatabase() {
        this.db.exec(`
            -- Code embeddings
            CREATE TABLE IF NOT EXISTS code_embeddings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                file_path TEXT NOT NULL,
                symbol_name TEXT NOT NULL,
                symbol_kind TEXT,
                description TEXT,
                code_snippet TEXT,
                embedding BLOB,
                vector_length INTEGER,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_embeddings_file ON code_embeddings(file_path);
            CREATE INDEX IF NOT EXISTS idx_embeddings_kind ON code_embeddings(symbol_kind);

            -- Search history
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                query TEXT NOT NULL,
                results_count INTEGER,
                searched_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
        `);
    }

    /**
     * Extract descriptions from code symbols
     */
    extractDescriptions(projectId, projectPath) {
        // Get all symbols from intelligent analyzer
        const symbols = this.db.prepare(`
            SELECT cs.*, fh.file_path
            FROM code_symbols cs
            JOIN file_hashes fh ON cs.file_path = fh.file_path
            WHERE fh.project_id = ?
        `).all(projectId);

        const descriptions = [];

        for (const symbol of symbols) {
            const desc = this.buildDescription(symbol, projectPath);
            if (desc) {
                descriptions.push({
                    file_path: symbol.file_path,
                    symbol_name: symbol.name,
                    symbol_kind: symbol.kind,
                    description: desc.text,
                    code_snippet: desc.snippet
                });
            }
        }

        return descriptions;
    }

    /**
     * Build description from symbol
     */
    buildDescription(symbol, projectPath) {
        const parts = [];

        // Add kind and name
        parts.push(`${symbol.kind} ${symbol.name}`);

        // Add detail (signature, type info)
        if (symbol.detail) {
            parts.push(symbol.detail);
        }

        // Try to read comments from source file
        try {
            const code = fs.readFileSync(symbol.file_path, 'utf-8');
            const lines = code.split('\n');
            
            // Get code snippet around the symbol
            const startLine = Math.max(0, symbol.range_start_line - 2);
            const endLine = Math.min(lines.length - 1, symbol.range_end_line + 2);
            const snippet = lines.slice(startLine, endLine + 1).join('\n');

            // Look for comments before the symbol
            for (let i = symbol.range_start_line - 1; i >= Math.max(0, symbol.range_start_line - 10); i--) {
                const line = lines[i];
                if (line.trim().startsWith('//') || line.trim().startsWith('*') || line.trim().startsWith('/*')) {
                    const comment = line.trim()
                        .replace(/^\/\*\*?/, '')
                        .replace(/\*\/$/, '')
                        .replace(/^\*/, '')
                        .replace(/^\/\//, '')
                        .trim();
                    if (comment) {
                        parts.push(comment);
                    }
                } else if (line.trim() && !line.trim().startsWith('*')) {
                    break;
                }
            }

            // Extract keywords from file path
            const relativePath = path.relative(projectPath, symbol.file_path);
            const pathParts = relativePath.split(path.sep);
            parts.push(`Located in: ${pathParts.join(' > ')}`);

            return {
                text: parts.join(' | '),
                snippet: snippet
            };

        } catch (err) {
            return {
                text: parts.join(' | '),
                snippet: null
            };
        }
    }

    /**
     * Generate embedding (simple bag-of-words for now, can be upgraded to real embeddings)
     */
    generateEmbedding(text) {
        // Simple TF-IDF style embedding
        // In production, use: OpenAI embeddings, sentence-transformers, etc.
        
        const words = text.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2);

        // Create a simple word frequency vector
        const wordCounts = {};
        for (const word of words) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        }

        // Common programming keywords
        const keywords = [
            'function', 'class', 'method', 'variable', 'const', 'let',
            'async', 'await', 'promise', 'callback', 'error', 'try', 'catch',
            'get', 'post', 'put', 'delete', 'create', 'update', 'read',
            'auth', 'authentication', 'login', 'logout', 'user', 'password',
            'database', 'query', 'insert', 'select', 'where', 'join',
            'api', 'endpoint', 'route', 'handler', 'middleware', 'request', 'response',
            'validate', 'check', 'verify', 'ensure', 'test', 'assert',
            'render', 'component', 'props', 'state', 'hook', 'effect',
            'model', 'view', 'controller', 'service', 'repository',
            'config', 'settings', 'options', 'parameters', 'arguments'
        ];

        // Create vector based on keyword presence and frequency
        const vector = keywords.map(keyword => {
            const count = wordCounts[keyword] || 0;
            // Add partial matches
            let partialCount = 0;
            for (const word in wordCounts) {
                if (word.includes(keyword) || keyword.includes(word)) {
                    partialCount += wordCounts[word] * 0.5;
                }
            }
            return count + partialCount;
        });

        return vector;
    }

    /**
     * Store embeddings
     */
    async storeEmbeddings(descriptions) {
        console.log(`\n📝 Generating embeddings for ${descriptions.length} symbols...`);

        const stmt = this.db.prepare(`
            INSERT OR REPLACE INTO code_embeddings 
            (file_path, symbol_name, symbol_kind, description, code_snippet, embedding, vector_length)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        let stored = 0;
        for (const desc of descriptions) {
            try {
                const vector = this.generateEmbedding(desc.description);
                const vectorBlob = Buffer.from(new Float32Array(vector).buffer);

                stmt.run(
                    desc.file_path,
                    desc.symbol_name,
                    desc.symbol_kind,
                    desc.description,
                    desc.code_snippet || null,
                    vectorBlob,
                    vector.length
                );
                stored++;
            } catch (err) {
                console.error(`Error storing embedding for ${desc.symbol_name}:`, err.message);
            }
        }

        console.log(`✅ Stored ${stored} embeddings\n`);
        return stored;
    }

    /**
     * Semantic search
     */
    search(query, limit = 10) {
        console.log(`\n🔍 Searching for: "${query}"\n`);

        // Generate query embedding
        const queryVector = this.generateEmbedding(query);

        // Get all embeddings
        const embeddings = this.db.prepare(`
            SELECT id, file_path, symbol_name, symbol_kind, description, code_snippet, embedding
            FROM code_embeddings
        `).all();

        // Calculate cosine similarity
        const results = embeddings.map(emb => {
            const embVector = new Float32Array(emb.embedding.buffer);
            const similarity = this.cosineSimilarity(queryVector, Array.from(embVector));

            return {
                ...emb,
                similarity,
                embedding: undefined // Remove blob from result
            };
        });

        // Sort by similarity
        results.sort((a, b) => b.similarity - a.similarity);

        // Save search history
        this.db.prepare(`
            INSERT INTO search_history (query, results_count)
            VALUES (?, ?)
        `).run(query, results.length);

        return results.slice(0, limit);
    }

    /**
     * Cosine similarity
     */
    cosineSimilarity(a, b) {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Index project for semantic search
     */
    async indexProject(projectId, projectPath) {
        console.log('🔍 Extracting descriptions from code...');
        const descriptions = this.extractDescriptions(projectId, projectPath);
        console.log(`   Found ${descriptions.length} symbols\n`);

        await this.storeEmbeddings(descriptions);

        return descriptions.length;
    }

    /**
     * Get search statistics
     */
    getStats() {
        const embeddingCount = this.db.prepare('SELECT COUNT(*) as count FROM code_embeddings').get();
        const searchCount = this.db.prepare('SELECT COUNT(*) as count FROM search_history').get();
        const recentSearches = this.db.prepare(`
            SELECT query, results_count, searched_at
            FROM search_history
            ORDER BY searched_at DESC
            LIMIT 10
        `).all();

        return {
            embeddings: embeddingCount.count,
            searches: searchCount.count,
            recent: recentSearches
        };
    }
}

module.exports = SemanticSearch;
