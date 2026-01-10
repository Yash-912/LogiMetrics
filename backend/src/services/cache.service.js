/**
 * Cache Service
 * Redis caching operations
 */

const { getRedisClient, setCache, getCache, deleteCache, clearCachePattern } = require('../config/redis');
const logger = require('../utils/logger.util');

// Default TTL values in seconds
const TTL = {
    SHORT: 300,       // 5 minutes
    MEDIUM: 1800,     // 30 minutes
    LONG: 3600,       // 1 hour
    DAY: 86400,       // 24 hours
    WEEK: 604800      // 7 days
};

/**
 * Get from cache with fallback
 */
async function getOrSet(key, fallbackFn, ttl = TTL.MEDIUM) {
    const cached = await getCache(key);
    if (cached !== null) return cached;

    const value = await fallbackFn();
    await setCache(key, value, ttl);
    return value;
}

/**
 * Set multiple cache entries
 */
async function setMultiple(entries, ttl = TTL.MEDIUM) {
    const results = await Promise.allSettled(
        entries.map(({ key, value }) => setCache(key, value, ttl))
    );
    return results.filter(r => r.status === 'fulfilled').length;
}

/**
 * Get multiple cache entries
 */
async function getMultiple(keys) {
    const results = await Promise.all(keys.map(key => getCache(key)));
    return keys.reduce((acc, key, i) => {
        acc[key] = results[i];
        return acc;
    }, {});
}

/**
 * Delete multiple cache entries
 */
async function deleteMultiple(keys) {
    const results = await Promise.allSettled(keys.map(key => deleteCache(key)));
    return results.filter(r => r.status === 'fulfilled').length;
}

/**
 * Invalidate cache by pattern
 */
async function invalidatePattern(pattern) {
    const result = await clearCachePattern(pattern);
    logger.info(`Cache invalidated for pattern: ${pattern}`);
    return result;
}

/**
 * Invalidate user-related cache
 */
async function invalidateUserCache(userId) {
    return invalidatePattern(`user:${userId}:*`);
}

/**
 * Invalidate company-related cache
 */
async function invalidateCompanyCache(companyId) {
    return invalidatePattern(`company:${companyId}:*`);
}

/**
 * Invalidate shipment cache
 */
async function invalidateShipmentCache(shipmentId) {
    return invalidatePattern(`shipment:${shipmentId}:*`);
}

/**
 * Cache user session data
 */
async function cacheUserSession(userId, sessionData, ttl = TTL.DAY) {
    return setCache(`session:${userId}`, sessionData, ttl);
}

/**
 * Get user session data
 */
async function getUserSession(userId) {
    return getCache(`session:${userId}`);
}

/**
 * Delete user session
 */
async function deleteUserSession(userId) {
    return deleteCache(`session:${userId}`);
}

/**
 * Cache API response
 */
async function cacheAPIResponse(endpoint, params, data, ttl = TTL.MEDIUM) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return setCache(key, data, ttl);
}

/**
 * Get cached API response
 */
async function getCachedAPIResponse(endpoint, params) {
    const key = `api:${endpoint}:${JSON.stringify(params)}`;
    return getCache(key);
}

/**
 * Increment counter
 */
async function incrementCounter(key, amount = 1) {
    const client = getRedisClient();
    if (!client || !client.isOpen) return null;

    try {
        const result = await client.incrBy(key, amount);
        return result;
    } catch (error) {
        logger.error('Redis increment error:', error);
        return null;
    }
}

/**
 * Decrement counter
 */
async function decrementCounter(key, amount = 1) {
    const client = getRedisClient();
    if (!client || !client.isOpen) return null;

    try {
        const result = await client.decrBy(key, amount);
        return result;
    } catch (error) {
        logger.error('Redis decrement error:', error);
        return null;
    }
}

/**
 * Set cache with hash
 */
async function setHashField(key, field, value) {
    const client = getRedisClient();
    if (!client || !client.isOpen) return null;

    try {
        await client.hSet(key, field, JSON.stringify(value));
        return true;
    } catch (error) {
        logger.error('Redis hash set error:', error);
        return false;
    }
}

/**
 * Get hash field
 */
async function getHashField(key, field) {
    const client = getRedisClient();
    if (!client || !client.isOpen) return null;

    try {
        const value = await client.hGet(key, field);
        return value ? JSON.parse(value) : null;
    } catch (error) {
        logger.error('Redis hash get error:', error);
        return null;
    }
}

/**
 * Get all hash fields
 */
async function getAllHashFields(key) {
    const client = getRedisClient();
    if (!client || !client.isOpen) return null;

    try {
        const hash = await client.hGetAll(key);
        const result = {};
        for (const [field, value] of Object.entries(hash)) {
            result[field] = JSON.parse(value);
        }
        return result;
    } catch (error) {
        logger.error('Redis hash getAll error:', error);
        return null;
    }
}

/**
 * Add to set
 */
async function addToSet(key, value) {
    const client = getRedisClient();
    if (!client || !client.isOpen) return null;

    try {
        await client.sAdd(key, JSON.stringify(value));
        return true;
    } catch (error) {
        logger.error('Redis set add error:', error);
        return false;
    }
}

/**
 * Get set members
 */
async function getSetMembers(key) {
    const client = getRedisClient();
    if (!client || !client.isOpen) return [];

    try {
        const members = await client.sMembers(key);
        return members.map(m => JSON.parse(m));
    } catch (error) {
        logger.error('Redis set get error:', error);
        return [];
    }
}

/**
 * Check if member exists in set
 */
async function isSetMember(key, value) {
    const client = getRedisClient();
    if (!client || !client.isOpen) return false;

    try {
        return await client.sIsMember(key, JSON.stringify(value));
    } catch (error) {
        logger.error('Redis set check error:', error);
        return false;
    }
}

/**
 * Get cache stats
 */
async function getCacheStats() {
    const client = getRedisClient();
    if (!client || !client.isOpen) return null;

    try {
        const info = await client.info('memory');
        return { raw: info };
    } catch (error) {
        logger.error('Redis info error:', error);
        return null;
    }
}

module.exports = {
    TTL,
    getOrSet,
    setMultiple,
    getMultiple,
    deleteMultiple,
    invalidatePattern,
    invalidateUserCache,
    invalidateCompanyCache,
    invalidateShipmentCache,
    cacheUserSession,
    getUserSession,
    deleteUserSession,
    cacheAPIResponse,
    getCachedAPIResponse,
    incrementCounter,
    decrementCounter,
    setHashField,
    getHashField,
    getAllHashFields,
    addToSet,
    getSetMembers,
    isSetMember,
    getCacheStats,
    // Re-export basic functions
    set: setCache,
    get: getCache,
    del: deleteCache,
    clear: clearCachePattern
};
