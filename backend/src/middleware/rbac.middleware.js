/**
 * Role-Based Access Control (RBAC) Middleware
 */

const { forbiddenResponse } = require('../utils/response.util');
const { Role, Permission } = require('../models/postgres');
const logger = require('../utils/logger.util');

// Role hierarchy - higher roles inherit lower role permissions
const roleHierarchy = {
  admin: ['admin', 'fleet_manager', 'accountant', 'support', 'driver', 'customer'],
  fleet_manager: ['fleet_manager', 'driver'],
  accountant: ['accountant'],
  support: ['support', 'customer'],
  driver: ['driver'],
  customer: ['customer']
};

/**
 * Check if user has one of the required roles
 */
const hasRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    const userRole = req.user.role;

    // Admin has access to everything
    if (userRole === 'admin') {
      return next();
    }

    // Check if user's role is in allowed roles
    const hasAllowedRole = allowedRoles.some(role => {
      // Direct role match
      if (role === userRole) return true;
      
      // Check role hierarchy
      const inheritedRoles = roleHierarchy[userRole] || [userRole];
      return inheritedRoles.includes(role);
    });

    if (hasAllowedRole) {
      return next();
    }

    logger.warn(`Access denied for user ${req.user.id} with role ${userRole}. Required: ${allowedRoles.join(', ')}`);
    return forbiddenResponse(res, 'Insufficient permissions');
  };
};

/**
 * Check if user has specific permission
 */
const hasPermission = (...requiredPermissions) => {
  return async (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      // Fetch user's role with permissions
      const role = await Role.findByPk(req.user.roleId, {
        include: [{
          model: Permission,
          as: 'permissions',
          attributes: ['name']
        }]
      });

      if (!role) {
        return forbiddenResponse(res, 'Role not found');
      }

      const userPermissions = role.permissions.map(p => p.name);

      // Check if user has any of the required permissions
      const hasRequiredPermission = requiredPermissions.some(permission => {
        // Direct permission match
        if (userPermissions.includes(permission)) return true;
        
        // Check for 'manage' permission which grants all actions
        const module = permission.split('.')[0];
        if (userPermissions.includes(`${module}.manage`)) return true;
        
        return false;
      });

      if (hasRequiredPermission) {
        return next();
      }

      logger.warn(`Permission denied for user ${req.user.id}. Required: ${requiredPermissions.join(', ')}`);
      return forbiddenResponse(res, 'Insufficient permissions');
    } catch (error) {
      logger.error('Permission check error:', error);
      return forbiddenResponse(res, 'Permission check failed');
    }
  };
};

/**
 * Check if user owns the resource or is admin
 */
const isOwnerOrAdmin = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    // Admin has access to everything
    if (req.user.role === 'admin') {
      return next();
    }

    try {
      const ownerId = await getResourceOwnerId(req);
      
      if (ownerId === req.user.id || ownerId === req.user.companyId) {
        return next();
      }

      return forbiddenResponse(res, 'Access denied to this resource');
    } catch (error) {
      logger.error('Owner check error:', error);
      return forbiddenResponse(res, 'Access check failed');
    }
  };
};

/**
 * Check if user belongs to the same company
 */
const sameCompany = (getCompanyId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    // Admin can access all companies
    if (req.user.role === 'admin' && !req.user.companyId) {
      return next();
    }

    try {
      const resourceCompanyId = await getCompanyId(req);
      
      if (resourceCompanyId === req.user.companyId) {
        return next();
      }

      return forbiddenResponse(res, 'Access denied - different company');
    } catch (error) {
      logger.error('Company check error:', error);
      return forbiddenResponse(res, 'Access check failed');
    }
  };
};

/**
 * Restrict access to specific roles only (no hierarchy)
 */
const strictRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbiddenResponse(res, 'Authentication required');
    }

    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    return forbiddenResponse(res, 'Access restricted');
  };
};

module.exports = {
  hasRole,
  hasPermission,
  isOwnerOrAdmin,
  sameCompany,
  strictRole,
  roleHierarchy,
  // Aliases for routes
  authorize: hasRole,
  checkPermission: hasPermission
};
