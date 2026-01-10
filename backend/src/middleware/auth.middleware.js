const { User } = require("../models/mongodb");
const { verifyAccessToken } = require("../utils/jwt.util");
const { AppError } = require("./error.middleware");
const logger = require("../utils/logger.util");

/**
 * Middleware to authenticate requests using JWT
 */
const authenticate = async (req, res, next) => {
  try {
    // 1. Get token from header
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("You are not logged in. Please log in to get access.", 401));
    }

    // 2. Verify token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return next(new AppError("Your token has expired. Please log in again.", 401));
      }
      return next(new AppError("Invalid token. Please log in again.", 401));
    }

    // 3. Check if user still exists
    // Support both userId (new) and id (legacy) payloads
    const userId = decoded.userId || decoded.id;
    const user = await User.findById(userId);

    if (!user) {
      return next(new AppError("The user belonging to this token no longer exists.", 401));
    }

    // 4. Check if user changed password after the token was issued? (Optional, skipped for now)

    // 5. Grant access
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware for optional authentication
 * If valid token provided, attaches user. If not, continues without user.
 */
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      const userId = decoded.userId || decoded.id;
      const user = await User.findById(userId);
      if (user) {
        req.user = user;
      }
    } catch (err) {
      // Ignore token errors for optional auth
    }

    next();
  } catch (err) {
    next();
  }
};

/**
 * Middleware to restrict access to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    // roles param is an array of allowed roles
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError("You do not have permission to perform this action", 403));
    }
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  authorize
};
