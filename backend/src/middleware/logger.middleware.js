/**
 * Logger Middleware
 * HTTP request logging using morgan
 */

const morgan = require('morgan');
const logger = require('../utils/logger.util');

// Custom token for response time in ms
morgan.token('response-time-ms', (req, res) => {
  if (!req._startAt || !res._startAt) return '';
  const ms = (res._startAt[0] - req._startAt[0]) * 1000 +
    (res._startAt[1] - req._startAt[1]) / 1e6;
  return ms.toFixed(2);
});

// Custom token for user ID
morgan.token('user-id', (req) => {
  return req.user?.id || 'anonymous';
});

// Custom token for company ID
morgan.token('company-id', (req) => {
  return req.user?.companyId || '-';
});

// Custom format for development
const devFormat = ':method :url :status :response-time-ms ms - :res[content-length]';

// Custom format for production (JSON-like for log aggregation)
const prodFormat = JSON.stringify({
  method: ':method',
  url: ':url',
  status: ':status',
  responseTime: ':response-time-ms',
  contentLength: ':res[content-length]',
  userAgent: ':user-agent',
  ip: ':remote-addr',
  userId: ':user-id',
  companyId: ':company-id'
});

// Stream for winston integration
const stream = {
  write: (message) => {
    // Remove newline at the end
    const logMessage = message.trim();
    
    // Parse JSON in production for structured logging
    if (process.env.NODE_ENV === 'production') {
      try {
        const parsed = JSON.parse(logMessage);
        logger.http('HTTP Request', parsed);
      } catch {
        logger.http(logMessage);
      }
    } else {
      logger.http(logMessage);
    }
  }
};

// Skip logging for health checks and static files
const skip = (req) => {
  const skipPaths = ['/health', '/ready', '/favicon.ico'];
  return skipPaths.some(path => req.url.startsWith(path));
};

/**
 * Get morgan middleware based on environment
 */
function getLoggerMiddleware() {
  const format = process.env.NODE_ENV === 'production' ? prodFormat : devFormat;
  
  return morgan(format, { stream, skip });
}

/**
 * Request ID middleware
 * Adds unique request ID to each request
 */
function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || 
    `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  next();
}

/**
 * Response time middleware
 * Adds response time header
 */
function responseTimeMiddleware(req, res, next) {
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const time = diff[0] * 1e3 + diff[1] * 1e-6;
    res.setHeader('X-Response-Time', `${time.toFixed(2)}ms`);
  });
  
  next();
}

module.exports = {
  loggerMiddleware: getLoggerMiddleware(),
  requestIdMiddleware,
  responseTimeMiddleware,
  getLoggerMiddleware
};
