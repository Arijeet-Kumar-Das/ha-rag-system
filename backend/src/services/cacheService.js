const cache = new Map();
const TTL = 5 * 60 * 1000; // 5 minutes

const normalizeKey = (query) => query.toLowerCase().trim();

export const getCache = (query) => {
    const key = normalizeKey(query);
    const entry = cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > TTL) {
        cache.delete(key);
        return null;
    }
    
    return entry.data;
};

export const setCache = (query, response) => {
    const key = normalizeKey(query);
    cache.set(key, {
        timestamp: Date.now(),
        data: response
    });
};

// Auto cleanup expired entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > TTL) {
            cache.delete(key);
        }
    }
}, 60 * 1000);
