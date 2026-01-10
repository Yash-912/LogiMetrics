const { validationResult } = require('express-validator');
const { User, RefreshToken } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt.util');
const { hashPassword, comparePassword } = require('../utils/bcrypt.util');
const { success, error, paginated } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const logger = require('../utils/logger.util');
const crypto = require('crypto');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { email, password, firstName, lastName, phone, companyId, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      companyId,
      role: role || 'customer',
      emailVerificationToken,
      emailVerificationExpires,
      status: 'active'
    });

    // Log audit event
    await AuditLog.create({
      userId: user.id,
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // TODO: Send verification email

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token
    await RefreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    logger.info(`User registered: ${user.email}`);

    return success(res, 'Registration successful', 201, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Login user
 * @route POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    // Check if account is active
    if (user.status !== 'active') {
      throw new AppError('Account is not active. Please contact support.', 403);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      // Log failed attempt
      await AuditLog.create({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'User',
        resourceId: user.id,
        details: { reason: 'Invalid password' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      throw new AppError('Invalid credentials', 401);
    }

    // Generate tokens
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Store refresh token
    await RefreshToken.create({
      userId: user.id,
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    // Update last login
    await user.update({ lastLoginAt: new Date() });

    // Log audit event
    await AuditLog.create({
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`User logged in: ${user.email}`);

    return success(res, 'Login successful', 200, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyId: user.companyId
      },
      tokens: {
        accessToken,
        refreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout user
 * @route POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Delete refresh token
      await RefreshToken.destroy({ where: { token: refreshToken } });
    }

    // Log audit event
    if (req.user) {
      await AuditLog.create({
        userId: req.user.id,
        action: 'USER_LOGOUT',
        resource: 'User',
        resourceId: req.user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    return success(res, 'Logout successful', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh access token
 * @route POST /api/auth/refresh
 */
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken, 'refresh');
    if (!decoded) {
      throw new AppError('Invalid refresh token', 401);
    }

    // Check if token exists in database
    const storedToken = await RefreshToken.findOne({
      where: { token: refreshToken, userId: decoded.userId }
    });

    if (!storedToken) {
      throw new AppError('Refresh token not found', 401);
    }

    // Check if token is expired
    if (new Date() > storedToken.expiresAt) {
      await storedToken.destroy();
      throw new AppError('Refresh token expired', 401);
    }

    // Get user
    const user = await User.findByPk(decoded.userId);
    if (!user || user.status !== 'active') {
      throw new AppError('User not found or inactive', 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken({ userId: user.id, role: user.role });

    // Optionally rotate refresh token
    const newRefreshToken = generateRefreshToken({ userId: user.id });
    await storedToken.update({
      token: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

    return success(res, 'Token refreshed', 200, {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Request password reset
 * @route POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // Return success even if user not found (security)
      return success(res, 'If an account exists, a password reset email has been sent', 200);
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await user.update({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: resetTokenExpires
    });

    // Log audit event
    await AuditLog.create({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // TODO: Send password reset email with resetToken

    logger.info(`Password reset requested for: ${user.email}`);

    return success(res, 'If an account exists, a password reset email has been sent', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Reset password
 * @route POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { token, password } = req.body;

    // Hash the token for comparison
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid reset token
    const user = await User.findOne({
      where: {
        passwordResetToken: resetTokenHash
      }
    });

    if (!user) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Check if token is expired
    if (new Date() > user.passwordResetExpires) {
      throw new AppError('Reset token has expired', 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear reset token
    await user.update({
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpires: null
    });

    // Invalidate all refresh tokens
    await RefreshToken.destroy({ where: { userId: user.id } });

    // Log audit event
    await AuditLog.create({
      userId: user.id,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Password reset completed for: ${user.email}`);

    return success(res, 'Password reset successful', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Verify email
 * @route POST /api/auth/verify-email
 */
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      throw new AppError('Verification token is required', 400);
    }

    const user = await User.findOne({
      where: { emailVerificationToken: token }
    });

    if (!user) {
      throw new AppError('Invalid verification token', 400);
    }

    if (new Date() > user.emailVerificationExpires) {
      throw new AppError('Verification token has expired', 400);
    }

    await user.update({
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null
    });

    // Log audit event
    await AuditLog.create({
      userId: user.id,
      action: 'EMAIL_VERIFIED',
      resource: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Email verified for: ${user.email}`);

    return success(res, 'Email verified successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Resend verification email
 * @route POST /api/auth/resend-verification
 */
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return success(res, 'If an account exists, a verification email has been sent', 200);
    }

    if (user.emailVerified) {
      return success(res, 'Email is already verified', 200);
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.update({
      emailVerificationToken,
      emailVerificationExpires
    });

    // TODO: Send verification email

    return success(res, 'If an account exists, a verification email has been sent', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Change password (authenticated)
 * @route POST /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    await user.update({ password: hashedPassword });

    // Invalidate all refresh tokens except current
    await RefreshToken.destroy({
      where: { userId: user.id }
    });

    // Log audit event
    await AuditLog.create({
      userId: user.id,
      action: 'PASSWORD_CHANGED',
      resource: 'User',
      resourceId: user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Password changed for: ${user.email}`);

    return success(res, 'Password changed successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Get current user profile
 * @route GET /api/auth/me
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'emailVerificationToken', 'emailVerificationExpires'] }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return success(res, 'User profile retrieved', 200, { user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  changePassword,
  getMe
};
