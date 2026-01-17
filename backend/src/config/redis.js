/**
 * Redis Configuration (DEPRECATED)
 * Redis/caching features have been removed from this project.
 * Use MongoDB and PostgreSQL for all data needs.
 */

const logger = require("../utils/logger.util");

logger.warn("Redis service is not available");

// Stub exports for backwards compatibility
async function initializeRedis() {
  return null; // Redis not initialized
}

function getRedisClient() {
  return null;
}

async function closeRedis() {
  // No-op
}

async function setCache(key, value, expirationInSeconds = 3600) {
  return false;
}

async function getCache(key) {
  return null;
}

async function deleteCache(key) {
  return false;
}

async function clearCachePattern(pattern) {
  return false;
}

module.exports = {
  initializeRedis,
  getRedisClient,
  closeRedis,
  setCache,
  getCache,
  deleteCache,
  clearCachePattern,
};
