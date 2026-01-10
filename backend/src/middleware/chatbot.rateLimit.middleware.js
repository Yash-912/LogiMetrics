const rateLimit = require("express-rate-limit");
const logger = require("../config/logger");

/**
 * ChatBot Rate Limiter
 * 20 messages per minute per user
 * Works with or without Redis
 */
let store;

try {
  // Try to use Redis store if available
  const RedisStore = require("rate-limit-redis");
  const redis = require("../config/redis");

  if (redis && redis.status === "ready") {
    store = new RedisStore({
      client: redis,
      prefix: "chatbot_ratelimit:",
    });
    logger.info("ChatBot rate limiter: Using Redis store");
  } else {
    store = undefined; // Fallback to memory store
    logger.warn("ChatBot rate limiter: Redis not available, using memory store (not distributed)");
  }
} catch (error) {
  // Fallback to memory store if Redis isn't available
  logger.warn("ChatBot rate limiter: Redis unavailable, using memory store (not distributed)");
  store = undefined;
}

const chatBotRateLimiter = rateLimit({
  ...(store && { store }), // Only add store if Redis is available
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  keyGenerator: (req, res) => {
    // Key by userId for authenticated requests
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: "RATE_LIMIT_EXCEEDED",
      message: "Too many chat requests. Please wait before sending another message.",
      retryAfter: req.rateLimit?.resetTime,
    });
  },
  skip: (req, res) => {
    // Skip rate limiting for health checks or non-chat endpoints
    return req.path === "/health";
  },
});

module.exports = chatBotRateLimiter;
