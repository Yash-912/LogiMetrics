const { body } = require('express-validator');

/**
 * Validation rules for user registration
 * Updated to support company creation during registration
 */
const registerValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),

  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),

  body('phone')
    .optional()
    .trim(),

  body('companyId')
    .optional()
    .isMongoId()
    .withMessage('Invalid company ID'),

  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'manager', 'dispatcher', 'driver', 'customer', 'shipper', 'transporter'])
    .withMessage('Invalid role'),

  // Company object validation (optional - for new company creation)
  body('company')
    .optional()
    .isObject()
    .withMessage('Company must be an object'),

  body('company.name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Company name is required when creating a company'),

  body('company.email')
    .optional()
    .isEmail()
    .withMessage('Invalid company email'),

  body('company.city')
    .optional()
    .trim(),

  body('company.state')
    .optional()
    .trim(),
];

/**
 * Validation rules for user login
 */
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for forgot password
 */
const forgotPasswordValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Validation rules for password reset
 */
const resetPasswordValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
];

/**
 * Validation rules for refresh token
 */
const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

/**
 * Validation rules for email verification
 */
const verifyEmailValidation = [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required')
];

/**
 * Validation rules for change password
 */
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .custom((value, { req }) => value !== req.body.currentPassword)
    .withMessage('New password must be different from current password'),

  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('Passwords do not match')
];

/**
 * Validation rules for resend verification email
 */
const resendVerificationValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

module.exports = {
  // Original names (kept for compatibility)
  registerValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  refreshTokenValidation,
  verifyEmailValidation,
  changePasswordValidation,
  resendVerificationValidation,

  // Aliases expected by route files
  register: registerValidation,
  login: loginValidation,
  forgotPassword: forgotPasswordValidation,
  resetPassword: resetPasswordValidation,
  refreshToken: refreshTokenValidation,
  verifyEmail: verifyEmailValidation,
  changePassword: changePasswordValidation,
  resendVerification: resendVerificationValidation
};
