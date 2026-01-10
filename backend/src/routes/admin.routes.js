const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { apiLimiter, strictLimiter } = require('../middleware/rateLimit.middleware');
const { body, param, query } = require('express-validator');

// Apply authentication to all routes
router.use(authenticate);

// Apply admin authorization to all routes
router.use(authorize(['admin', 'super_admin']));

/**
 * @route   GET /api/admin/stats
 * @desc    Get system statistics (admin dashboard)
 * @access  Private (Admin)
 */
router.get(
    '/stats',
    [
        query('period').optional().isIn(['day', 'week', 'month', 'year']).withMessage('Invalid period')
    ],
    validate,
    adminController.getSystemStats
);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users (admin)
 * @access  Private (Admin)
 */
router.get(
    '/users',
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('Invalid status'),
        query('role').optional().isString().withMessage('Invalid role'),
        query('search').optional().isString().withMessage('Invalid search query')
    ],
    validate,
    adminController.getAllUsers
);

/**
 * @route   PUT /api/admin/users/:id/status
 * @desc    Update user status (admin)
 * @access  Private (Admin)
 */
router.put(
    '/users/:id/status',
    [
        param('id').isUUID().withMessage('Invalid user ID'),
        body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
        body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason too long')
    ],
    validate,
    adminController.updateUserStatus
);

/**
 * @route   PUT /api/admin/users/:id/role
 * @desc    Update user role (admin)
 * @access  Private (Admin)
 */
router.put(
    '/users/:id/role',
    [
        param('id').isUUID().withMessage('Invalid user ID'),
        body('role').notEmpty().withMessage('Role is required')
    ],
    validate,
    adminController.updateUserRole
);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user (admin)
 * @access  Private (Admin)
 */
router.delete(
    '/users/:id',
    strictLimiter,
    [
        param('id').isUUID().withMessage('Invalid user ID')
    ],
    validate,
    adminController.deleteUser
);

/**
 * @route   GET /api/admin/companies
 * @desc    Get all companies (admin)
 * @access  Private (Admin)
 */
router.get(
    '/companies',
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('status').optional().isIn(['active', 'inactive', 'suspended', 'pending']).withMessage('Invalid status'),
        query('search').optional().isString().withMessage('Invalid search query')
    ],
    validate,
    adminController.getAllCompanies
);

/**
 * @route   PUT /api/admin/companies/:id/status
 * @desc    Update company status (admin)
 * @access  Private (Admin)
 */
router.put(
    '/companies/:id/status',
    [
        param('id').isUUID().withMessage('Invalid company ID'),
        body('status').isIn(['active', 'inactive', 'suspended']).withMessage('Invalid status'),
        body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason too long')
    ],
    validate,
    adminController.updateCompanyStatus
);

/**
 * @route   GET /api/admin/settings
 * @desc    Get system settings
 * @access  Private (Admin)
 */
router.get(
    '/settings',
    adminController.getSystemSettings
);

/**
 * @route   PUT /api/admin/settings/:key
 * @desc    Update system setting
 * @access  Private (Admin)
 */
router.put(
    '/settings/:key',
    [
        param('key').trim().notEmpty().withMessage('Setting key is required'),
        body('value').notEmpty().withMessage('Value is required')
    ],
    validate,
    adminController.updateSystemSetting
);

/**
 * @route   POST /api/admin/maintenance
 * @desc    Toggle maintenance mode
 * @access  Private (Admin)
 */
router.post(
    '/maintenance',
    strictLimiter,
    [
        body('enabled').isBoolean().withMessage('Enabled must be boolean'),
        body('message').optional().trim().isLength({ max: 500 }).withMessage('Message too long'),
        body('scheduledEnd').optional().isISO8601().withMessage('Invalid scheduled end date')
    ],
    validate,
    adminController.toggleMaintenanceMode
);

/**
 * @route   GET /api/admin/audit-logs
 * @desc    Get audit logs
 * @access  Private (Admin)
 */
router.get(
    '/audit-logs',
    [
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('userId').optional().isUUID().withMessage('Invalid user ID'),
        query('action').optional().isString().withMessage('Invalid action'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date')
    ],
    validate,
    adminController.getAuditLogs
);

/**
 * @route   POST /api/admin/cache/clear
 * @desc    Clear cache
 * @access  Private (Admin)
 */
router.post(
    '/cache/clear',
    [
        body('pattern').optional().isString().withMessage('Pattern must be a string'),
        body('all').optional().isBoolean().withMessage('All must be boolean')
    ],
    validate,
    adminController.clearCache
);

/**
 * @route   GET /api/admin/health
 * @desc    Get system health
 * @access  Private (Admin)
 */
router.get(
    '/health',
    adminController.getSystemHealth
);

/**
 * @route   POST /api/admin/impersonate/:userId
 * @desc    Impersonate user
 * @access  Private (Super Admin)
 */
router.post(
    '/impersonate/:userId',
    authorize(['super_admin']),
    strictLimiter,
    [
        param('userId').isUUID().withMessage('Invalid user ID')
    ],
    validate,
    adminController.impersonateUser
);

/**
 * @route   POST /api/admin/broadcast
 * @desc    Send broadcast notification
 * @access  Private (Admin)
 */
router.post(
    '/broadcast',
    [
        body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }).withMessage('Title too long'),
        body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 2000 }).withMessage('Message too long'),
        body('channels').optional().isArray().withMessage('Channels must be an array'),
        body('targetRoles').optional().isArray().withMessage('Target roles must be an array'),
        body('targetCompanies').optional().isArray().withMessage('Target companies must be an array')
    ],
    validate,
    adminController.sendBroadcast
);

module.exports = router;
