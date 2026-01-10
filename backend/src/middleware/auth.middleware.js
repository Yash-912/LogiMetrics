/**
 * Authentication Middleware
 * JWT token verification
 */

const { verifyAccessToken } = require('../utils/jwt.util');
const { User, Role } = require('../models/postgres');
const { unauthorizedResponse } = require('../utils/response.util');
const logger = require('../utils/logger.util');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return unauthorizedResponse(res, 'Access token required');
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = verifyAccessToken(token);
      
      // Fetch user from database
      const user = await User.findByPk(decoded.id, {
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'displayName']
          }
        ],
        attributes: { exclude: ['password', 'refreshToken', 'passwordResetToken'] }
      });

      if (!user) {
        return unauthorizedResponse(res, 'User not found');
      }

      if (user.status !== 'active') {
        return unauthorizedResponse(res, 'Account is not active');
      }

      // Attach user to request
      req.user = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role?.name || decoded.role,
        roleId: user.roleId,
        companyId: user.companyId,
        status: user.status
      };

      next();
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return unauthorizedResponse(res, 'Token expired');
      }
      if (error.name === 'JsonWebTokenError') {
        return unauthorizedResponse(res, 'Invalid token');
      }
      throw error;
    }
  } catch (error) {
    logger.error('Authentication error:', error);
    return unauthorizedResponse(res, 'Authentication failed');
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'email', 'firstName', 'lastName', 'roleId', 'companyId', 'status']
      });

      if (user && user.status === 'active') {
        req.user = {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: decoded.role,
          roleId: user.roleId,
          companyId: user.companyId
        };
      } else {
        req.user = null;
      }
    } catch (error) {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuth
};
