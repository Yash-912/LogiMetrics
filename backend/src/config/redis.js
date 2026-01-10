/**
 * Redis Configuration
 * For caching and session management
 */

const { createClient } = require('redis');
const logger = require('../utils/logger.util');

let redisClient = null;

async function initializeRedis() {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      logger.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('end', () => {
      logger.info('Redis client disconnected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    throw error;
  }
}

function getRedisClient() {
  return redisClient;
}

async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
}

// Cache helper functions
async function setCache(key, value, expirationInSeconds = 3600) {
  if (!redisClient || !redisClient.isOpen) return null;
  try {
    await redisClient.setEx(key, expirationInSeconds, JSON.stringify(value));
    return true;
  } catch (error) {
    logger.error('Redis setCache error:', error);
    return false;
  }
}

async function getCache(key) {
  if (!redisClient || !redisClient.isOpen) return null;
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    logger.error('Redis getCache error:', error);
    return null;
  }
}

async function deleteCache(key) {
  if (!redisClient || !redisClient.isOpen) return null;
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    logger.error('Redis deleteCache error:', error);
    return false;
  }
}

async function clearCachePattern(pattern) {
  if (!redisClient || !redisClient.isOpen) return null;
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
    return true;
  } catch (error) {
    logger.error('Redis clearCachePattern error:', error);
    return false;
  }
}

module.exports = {
  initializeRedis,
  getRedisClient,
  closeRedis,
  setCache,
  getCache,
  deleteCache,
  clearCachePattern
};
