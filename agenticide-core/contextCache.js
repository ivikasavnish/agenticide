/**
 * Context Cache Manager - Redis-based caching for LLM efficiency
 * Caches: file contents, symbols, embeddings, AI responses
 */

const crypto = require('crypto');

class ContextCache {
    constructor(options = {}) {
        this.redis = null;
        this.enabled = false;
        this.prefix = options.prefix || 'agenticide:';
        this.ttl = options.ttl || 3600; // 1 hour default
        this.debug = options.debug || false;
        
        this.initRedis(options);
    }

    /**
     * Initialize Redis connection
     */
    initRedis(options) {
        try {
            // Try to load redis client
            const redis = require('redis');
            
            const redisOptions = {
                socket: {
                    host: options.host || 'localhost',
                    port: options.port || 6379
                },
                ...options.redisOptions
            };
            
            this.redis = redis.createClient(redisOptions);
            
            this.redis.on('error', (err) => {
                if (this.debug) {
                    console.error('Redis error:', err);
                }
                this.enabled = false;
            });
            
            this.redis.on('connect', () => {
                if (this.debug) {
                    console.log('✅ Redis connected');
                }
                this.enabled = true;
            });
            
            // Connect async
            this.redis.connect().catch(err => {
                if (this.debug) {
                    console.error('Redis connection failed:', err.message);
                }
                this.enabled = false;
            });
            
        } catch (error) {
            if (this.debug) {
                console.error('Redis module not found. Run: npm install redis');
            }
            this.enabled = false;
        }
    }

    /**
     * Generate cache key
     */
    generateKey(type, identifier, hash = null) {
        if (hash) {
            return `${this.prefix}${type}:${identifier}:${hash}`;
        }
        return `${this.prefix}${type}:${identifier}`;
    }

    /**
     * Generate hash for content
     */
    hash(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }

    /**
     * Cache file content with hash
     */
    async cacheFile(filePath, content) {
        if (!this.enabled) return false;
        
        const fileHash = this.hash(content);
        const key = this.generateKey('file', filePath, fileHash);
        
        try {
            await this.redis.setEx(key, this.ttl, content);
            
            // Store hash reference
            await this.redis.setEx(
                this.generateKey('file:hash', filePath),
                this.ttl,
                fileHash
            );
            
            if (this.debug) {
                console.log(`📦 Cached file: ${filePath} (${fileHash.slice(0, 8)})`);
            }
            
            return true;
        } catch (error) {
            if (this.debug) {
                console.error('Cache write error:', error);
            }
            return false;
        }
    }

    /**
     * Get cached file content
     */
    async getFile(filePath, currentContent = null) {
        if (!this.enabled) return null;
        
        try {
            // Get stored hash
            const storedHash = await this.redis.get(
                this.generateKey('file:hash', filePath)
            );
            
            if (!storedHash) return null;
            
            // If currentContent provided, check if hash matches
            if (currentContent) {
                const currentHash = this.hash(currentContent);
                if (currentHash !== storedHash) {
                    // File changed, invalidate cache
                    await this.invalidateFile(filePath);
                    return null;
                }
            }
            
            // Get cached content
            const key = this.generateKey('file', filePath, storedHash);
            const cached = await this.redis.get(key);
            
            if (cached && this.debug) {
                console.log(`✅ Cache hit: ${filePath}`);
            }
            
            return cached;
        } catch (error) {
            if (this.debug) {
                console.error('Cache read error:', error);
            }
            return null;
        }
    }

    /**
     * Cache symbols for a file
     */
    async cacheSymbols(filePath, symbols, fileHash) {
        if (!this.enabled) return false;
        
        const key = this.generateKey('symbols', filePath, fileHash);
        
        try {
            await this.redis.setEx(key, this.ttl, JSON.stringify(symbols));
            
            if (this.debug) {
                console.log(`📦 Cached symbols: ${filePath} (${symbols.length} items)`);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get cached symbols
     */
    async getSymbols(filePath, fileHash) {
        if (!this.enabled) return null;
        
        const key = this.generateKey('symbols', filePath, fileHash);
        
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                if (this.debug) {
                    console.log(`✅ Cache hit: symbols for ${filePath}`);
                }
                return JSON.parse(cached);
            }
        } catch (error) {
            return null;
        }
        
        return null;
    }

    /**
     * Cache context group (for batching)
     */
    async cacheContextGroup(groupId, context, filesHash) {
        if (!this.enabled) return false;
        
        const key = this.generateKey('context', groupId, filesHash);
        
        try {
            await this.redis.setEx(key, this.ttl, JSON.stringify(context));
            
            if (this.debug) {
                console.log(`📦 Cached context group: ${groupId}`);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get cached context group
     */
    async getContextGroup(groupId, filesHash) {
        if (!this.enabled) return null;
        
        const key = this.generateKey('context', groupId, filesHash);
        
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                if (this.debug) {
                    console.log(`✅ Cache hit: context group ${groupId}`);
                }
                return JSON.parse(cached);
            }
        } catch (error) {
            return null;
        }
        
        return null;
    }

    /**
     * Cache AI response
     */
    async cacheResponse(prompt, contextHash, response) {
        if (!this.enabled) return false;
        
        const promptHash = this.hash(prompt);
        const key = this.generateKey('response', promptHash, contextHash);
        
        try {
            // Cache for shorter time (responses are less reusable)
            await this.redis.setEx(key, Math.floor(this.ttl / 2), response);
            
            if (this.debug) {
                console.log(`📦 Cached AI response (prompt: ${promptHash.slice(0, 8)})`);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get cached AI response
     */
    async getResponse(prompt, contextHash) {
        if (!this.enabled) return null;
        
        const promptHash = this.hash(prompt);
        const key = this.generateKey('response', promptHash, contextHash);
        
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                if (this.debug) {
                    console.log(`✅ Cache hit: AI response`);
                }
                return cached;
            }
        } catch (error) {
            return null;
        }
        
        return null;
    }

    /**
     * Cache embeddings
     */
    async cacheEmbedding(text, embedding) {
        if (!this.enabled) return false;
        
        const textHash = this.hash(text);
        const key = this.generateKey('embedding', textHash);
        
        try {
            await this.redis.setEx(key, this.ttl * 24, JSON.stringify(embedding));
            
            if (this.debug) {
                console.log(`📦 Cached embedding (${textHash.slice(0, 8)})`);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get cached embedding
     */
    async getEmbedding(text) {
        if (!this.enabled) return null;
        
        const textHash = this.hash(text);
        const key = this.generateKey('embedding', textHash);
        
        try {
            const cached = await this.redis.get(key);
            if (cached) {
                if (this.debug) {
                    console.log(`✅ Cache hit: embedding`);
                }
                return JSON.parse(cached);
            }
        } catch (error) {
            return null;
        }
        
        return null;
    }

    /**
     * Invalidate file cache
     */
    async invalidateFile(filePath) {
        if (!this.enabled) return false;
        
        try {
            // Get current hash to delete specific key
            const storedHash = await this.redis.get(
                this.generateKey('file:hash', filePath)
            );
            
            if (storedHash) {
                await this.redis.del(this.generateKey('file', filePath, storedHash));
                await this.redis.del(this.generateKey('symbols', filePath, storedHash));
            }
            
            await this.redis.del(this.generateKey('file:hash', filePath));
            
            if (this.debug) {
                console.log(`🗑️  Invalidated cache: ${filePath}`);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Invalidate context group
     */
    async invalidateContextGroup(groupId) {
        if (!this.enabled) return false;
        
        try {
            // Delete all keys matching this context group
            const pattern = this.generateKey('context', groupId, '*');
            const keys = await this.redis.keys(pattern);
            
            if (keys.length > 0) {
                await this.redis.del(keys);
                
                if (this.debug) {
                    console.log(`🗑️  Invalidated context group: ${groupId} (${keys.length} keys)`);
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        if (!this.enabled) {
            return { enabled: false };
        }
        
        try {
            const info = await this.redis.info('stats');
            const keys = await this.redis.dbSize();
            
            // Parse info string
            const stats = {};
            info.split('\r\n').forEach(line => {
                const [key, value] = line.split(':');
                if (key && value) {
                    stats[key] = value;
                }
            });
            
            return {
                enabled: true,
                totalKeys: keys,
                hits: stats.keyspace_hits || 0,
                misses: stats.keyspace_misses || 0,
                hitRate: stats.keyspace_hits 
                    ? (stats.keyspace_hits / (parseInt(stats.keyspace_hits) + parseInt(stats.keyspace_misses)) * 100).toFixed(2) + '%'
                    : '0%'
            };
        } catch (error) {
            return { enabled: true, error: error.message };
        }
    }

    /**
     * Clear all cache
     */
    async clear() {
        if (!this.enabled) return false;
        
        try {
            const keys = await this.redis.keys(`${this.prefix}*`);
            if (keys.length > 0) {
                await this.redis.del(keys);
                
                if (this.debug) {
                    console.log(`🗑️  Cleared ${keys.length} cache entries`);
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Close Redis connection
     */
    async close() {
        if (this.redis) {
            await this.redis.quit();
        }
    }
}

module.exports = { ContextCache };
