const redis = require("../redis");

const cache = (prefix, ttl = 60) => {
    return async (req, res, next) => {
        if (!req.user) {
            return next();
        }
        const key = `${prefix}:${req.user.tenantId || req.user.id}:${req.originalUrl}`;
        const cached = await redis.get(key);
        if (cached) {
            return res.json(JSON.parse(cached));
        }

        const originalJson = res.json.bind(res);

        res.json = (body) => {
            redis.setEx(key, ttl, JSON.stringify(body))
                .catch(err => console.error("Redis set error:", err));
            return originalJson(body);
        };

        next();
    };
};

const clearCacheByPrefix = async (prefix, user) => {
    const pattern = `${prefix}:${user.tenantId || user.id}:*`;
    const keysToDelete = [];

    for await (const key of redis.scanIterator({ MATCH: pattern })) {
        if (key) keysToDelete.push(key);
    }

    if (keysToDelete.length === 0) return;

    // faqat haqiqiy string bo‘lsa
    const validKeys = keysToDelete.filter(k => typeof k === 'string' && k.length > 0);
    if (validKeys.length === 0) return;

    try {
        await redis.del(...validKeys);
        console.log(`Deleted ${validKeys.length} keys with prefix: ${prefix}`);
    } catch (err) {
        console.error("Redis del error:", err);
    }
};

module.exports = { cache, clearCacheByPrefix };
