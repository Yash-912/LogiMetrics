const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authValidator } = require("../validators");
const { authenticate } = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validation.middleware");
const {
  authLimiter,
  strictLimiter,
} = require("../middleware/rateLimit.middleware");

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  authLimiter,
  validate(authValidator.register),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get tokens
 * @access  Public
 */
router.post(
  "/login",
  authLimiter,
  validate(authValidator.login),
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate refresh token
 * @access  Private
 */
router.post("/logout", authenticate, authController.logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post(
  "/refresh",
  authLimiter,
  validate(authValidator.refreshToken),
  authController.refreshAccessToken
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post(
  "/forgot-password",
  strictLimiter,
  validate(authValidator.forgotPassword),
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post(
  "/reset-password",
  strictLimiter,
  validate(authValidator.resetPassword),
  authController.resetPassword
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email using token
 * @access  Public
 */
router.post(
  "/verify-email",
  validate(authValidator.verifyEmail),
  authController.verifyEmail
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification link
 * @access  Public
 */
router.post(
  "/resend-verification",
  strictLimiter,
  validate(authValidator.resendVerification),
  authController.resendVerification
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password (authenticated user)
 * @access  Private
 */
router.post(
  "/change-password",
  authenticate,
  validate(authValidator.changePassword),
  authController.changePassword
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user
 * @access  Private
 */
router.get("/me", authenticate, authController.getMe);

module.exports = router;
