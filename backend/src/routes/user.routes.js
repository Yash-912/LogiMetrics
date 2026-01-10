const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { userValidator } = require('../validators');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, checkPermission } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { uploadSingle } = require('../middleware/upload.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filters
 * @access  Private (Admin, Manager)
 */
router.get(
  '/',
  authorize(['admin', 'manager']),
  userValidator.getUsers,
  validate,
  userController.getUsers
);

/**
 * @route   GET /api/users/me/profile
 * @desc    Get current user's profile
 * @access  Private
 */
router.get(
  '/me/profile',
  userController.getUserById
);

/**
 * @route   PUT /api/users/me/profile
 * @desc    Update current user's profile
 * @access  Private
 */
router.put(
  '/me/profile',
  userValidator.updateProfile,
  validate,
  userController.updateProfile
);

/**
 * @route   POST /api/users/me/avatar
 * @desc    Upload user avatar
 * @access  Private
 */
router.post(
  '/me/avatar',
  uploadSingle('avatar'),
  userController.uploadAvatar
);

/**
 * @route   DELETE /api/users/me/avatar
 * @desc    Delete user avatar
 * @access  Private
 */
router.delete(
  '/me/avatar',
  userController.deleteAvatar
);

/**
 * @route   GET /api/users/me/activity
 * @desc    Get current user's activity log
 * @access  Private
 */
router.get(
  '/me/activity',
  userController.getUserActivity
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private (Admin, Manager, or self)
 */
router.get(
  '/:id',
  userValidator.getUserById,
  validate,
  userController.getUserById
);

/**
 * @route   POST /api/users
 * @desc    Create a new user
 * @access  Private (Admin)
 */
router.post(
  '/',
  authorize(['admin']),
  userValidator.createUser,
  validate,
  userController.createUser
);

/**
 * @route   PUT /api/users/:id
 * @desc    Update user by ID
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id',
  authorize(['admin', 'manager']),
  userValidator.updateUser,
  validate,
  userController.updateUser
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user by ID
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authorize(['admin']),
  userValidator.getUserById,
  validate,
  userController.deleteUser
);

/**
 * @route   PUT /api/users/:id/status
 * @desc    Update user status (active, inactive, suspended)
 * @access  Private (Admin)
 */
router.put(
  '/:id/status',
  authorize(['admin']),
  userValidator.updateStatus,
  validate,
  userController.updateStatus
);

/**
 * @route   GET /api/users/:id/activity
 * @desc    Get user activity log by ID
 * @access  Private (Admin, Manager)
 */
router.get(
  '/:id/activity',
  authorize(['admin', 'manager']),
  userValidator.getUserById,
  validate,
  userController.getUserActivity
);

/**
 * @route   POST /api/users/bulk
 * @desc    Bulk user operations (create, update, delete)
 * @access  Private (Admin)
 */
router.post(
  '/bulk',
  authorize(['admin']),
  userValidator.bulkOperation,
  validate,
  userController.bulkOperation
);

module.exports = router;
