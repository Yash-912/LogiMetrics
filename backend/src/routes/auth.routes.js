const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authValidator } = require('../validators');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { authLimiter, strictLimiter } = require('../middleware/rateLimit.middleware');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  authLimiter,
  authValidator.register,
  validate,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get tokens
 * @access  Public
 */
router.post(
  '/login',
  authLimiter,
  authValidator.login,
  validate,
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  '/refresh',
  authLimiter,
  authValidator.refreshToken,
  validate,
  authController.refreshAccessToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post(
  '/forgot-password',
  strictLimiter,
  authValidator.forgotPassword,
  validate,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post(
  '/reset-password',
  strictLimiter,
  authValidator.resetPassword,
  validate,
  authController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email using token
 * @access  Public
 */
router.post(
  '/verify-email',
  authValidator.verifyEmail,
  validate,
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
  '/resend-verification',
  strictLimiter,
  authValidator.resendVerification,
  validate,
  authController.resendVerification
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  authValidator.changePassword,
  validate,
  authController.changePassword
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  authController.getMe
);

module.exports = router;
