/**
 * Authentication Service
 * Handles token generation, validation, password reset, and authentication logic
 */

const { User, RefreshToken, PasswordReset, Company } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const {
    generateTokenPair,
    verifyAccessToken,
    verifyRefreshToken,
    generateResetToken,
    hashResetToken,
    generateVerificationToken
} = require('../utils/jwt.util');
const { hashPassword, comparePassword, validatePasswordStrength } = require('../utils/bcrypt.util');
const { sendEmail, emailTemplates } = require('../config/email');
const { redisClient } = require('../config/redis');
const logger = require('../utils/logger.util');
const crypto = require('crypto');

const TOKEN_BLACKLIST_PREFIX = 'blacklist:';
const REFRESH_TOKEN_PREFIX = 'refresh:';
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Register a new user
 */
async function registerUser({ email, password, firstName, lastName, companyId, role = 'user' }) {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        throw new Error('User with this email already exists');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Generate email verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

    // Create user
    const user = await User.create({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        companyId,
        role,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationTokenExpiry,
        isEmailVerified: false,
        status: 'pending'
    });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    try {
        const template = emailTemplates.welcome(firstName);
        await sendEmail({
            to: email,
            subject: template.subject,
            html: template.html
        });
    } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
    }

    // Log the registration
    await logAuthEvent(user.id, 'register', { email });

    // Generate tokens
    const tokens = generateTokenPair(user);

    return {
        user: sanitizeUser(user),
        ...tokens
    };
}

/**
 * Login user
 */
async function loginUser({ email, password, ipAddress, userAgent }) {
    // Find user
    const user = await User.findOne({
        where: { email },
        include: [{ model: Company, as: 'company' }]
    });

    if (!user) {
        throw new Error('Invalid email or password');
    }

    // Check if account is locked
    if (user.status === 'suspended') {
        throw new Error('Your account has been suspended. Please contact support.');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
        throw new Error(`Account is locked. Try again after ${user.lockUntil.toLocaleString()}`);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
        await handleFailedLogin(user);
        throw new Error('Invalid email or password');
    }

    // Reset failed login attempts on successful login
    await user.update({
        failedLoginAttempts: 0,
        lockUntil: null,
        lastLogin: new Date(),
        lastLoginIp: ipAddress
    });

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Store refresh token
    await storeRefreshToken(user.id, tokens.refreshToken, userAgent, ipAddress);

    // Log the login
    await logAuthEvent(user.id, 'login', { ipAddress, userAgent });

    return {
        user: sanitizeUser(user),
        ...tokens
    };
}

/**
 * Logout user - invalidate tokens
 */
async function logoutUser(userId, accessToken, refreshToken) {
    // Blacklist the access token
    if (accessToken) {
        await blacklistToken(accessToken);
    }

    // Remove refresh token
    if (refreshToken) {
        await removeRefreshToken(userId, refreshToken);
    }

    // Log the logout
    await logAuthEvent(userId, 'logout', {});

    return true;
}

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken(refreshToken, ipAddress, userAgent) {
    // Verify refresh token
    let decoded;
    try {
        decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
        throw new Error('Invalid or expired refresh token');
    }

    // Check if refresh token exists in storage
    const storedToken = await getStoredRefreshToken(decoded.id, refreshToken);
    if (!storedToken) {
        throw new Error('Refresh token not found or revoked');
    }

    // Get user
    const user = await User.findByPk(decoded.id);
    if (!user || user.status === 'suspended') {
        throw new Error('User not found or suspended');
    }

    // Generate new tokens
    const tokens = generateTokenPair(user);

    // Rotate refresh token - remove old, store new
    await removeRefreshToken(user.id, refreshToken);
    await storeRefreshToken(user.id, tokens.refreshToken, userAgent, ipAddress);

    return tokens;
}

/**
 * Request password reset
 */
async function requestPasswordReset(email) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
        // Don't reveal if user exists
        return { message: 'If the email exists, a password reset link has been sent' };
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const hashedToken = hashResetToken(resetToken);
    const resetExpiry = new Date(Date.now() + PASSWORD_RESET_EXPIRY);

    // Store reset token
    await user.update({
        passwordResetToken: hashedToken,
        passwordResetExpiry: resetExpiry
    });

    // Send reset email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    try {
        const template = emailTemplates.passwordReset(resetUrl);
        await sendEmail({
            to: email,
            subject: template.subject,
            html: template.html
        });
    } catch (emailError) {
        logger.error('Failed to send password reset email:', emailError);
        throw new Error('Failed to send password reset email');
    }

    // Log the event
    await logAuthEvent(user.id, 'password_reset_requested', { email });

    return { message: 'Password reset link sent to your email' };
}

/**
 * Reset password using token
 */
async function resetPassword(token, newPassword) {
    const hashedToken = hashResetToken(token);

    // Find user with valid reset token
    const user = await User.findOne({
        where: {
            passwordResetToken: hashedToken,
            passwordResetExpiry: { [require('sequelize').Op.gt]: new Date() }
        }
    });

    if (!user) {
        throw new Error('Invalid or expired password reset token');
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user
    await user.update({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
        passwordChangedAt: new Date()
    });

    // Invalidate all refresh tokens for security
    await invalidateAllUserTokens(user.id);

    // Log the event
    await logAuthEvent(user.id, 'password_reset_completed', {});

    return { message: 'Password reset successful' };
}

/**
 * Verify email
 */
async function verifyEmail(token) {
    const user = await User.findOne({
        where: {
            emailVerificationToken: token,
            emailVerificationExpiry: { [require('sequelize').Op.gt]: new Date() }
        }
    });

    if (!user) {
        throw new Error('Invalid or expired verification token');
    }

    await user.update({
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpiry: null,
        status: 'active'
    });

    // Log the event
    await logAuthEvent(user.id, 'email_verified', {});

    return { message: 'Email verified successfully' };
}

/**
 * Resend verification email
 */
async function resendVerificationEmail(email) {
    const user = await User.findOne({ where: { email } });

    if (!user) {
        throw new Error('User not found');
    }

    if (user.isEmailVerified) {
        throw new Error('Email is already verified');
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

    await user.update({
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationTokenExpiry
    });

    // Send verification email
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const template = emailTemplates.welcome(user.firstName);
    await sendEmail({
        to: email,
        subject: template.subject,
        html: template.html
    });

    return { message: 'Verification email sent' };
}

/**
 * Change password (authenticated user)
 */
async function changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);

    if (!user) {
        throw new Error('User not found');
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, user.password);
    if (!isPasswordValid) {
        throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '));
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update user
    await user.update({
        password: hashedPassword,
        passwordChangedAt: new Date()
    });

    // Log the event
    await logAuthEvent(userId, 'password_changed', {});

    return { message: 'Password changed successfully' };
}

/**
 * Validate access token
 */
async function validateToken(token) {
    // Check if token is blacklisted
    const isBlacklisted = await isTokenBlacklisted(token);
    if (isBlacklisted) {
        throw new Error('Token has been revoked');
    }

    // Verify token
    const decoded = verifyAccessToken(token);
    return decoded;
}

// Helper functions

async function handleFailedLogin(user) {
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const maxAttempts = 5;
    const lockDuration = 15 * 60 * 1000; // 15 minutes

    const updateData = { failedLoginAttempts: failedAttempts };

    if (failedAttempts >= maxAttempts) {
        updateData.lockUntil = new Date(Date.now() + lockDuration);
        logger.warn(`Account locked for user ${user.id} after ${failedAttempts} failed attempts`);
    }

    await user.update(updateData);
}

async function storeRefreshToken(userId, token, userAgent, ipAddress) {
    const key = `${REFRESH_TOKEN_PREFIX}${userId}:${crypto.createHash('md5').update(token).digest('hex')}`;
    const data = JSON.stringify({
        token,
        userAgent,
        ipAddress,
        createdAt: new Date().toISOString()
    });
    await redisClient.setex(key, 7 * 24 * 60 * 60, data); // 7 days
}

async function getStoredRefreshToken(userId, token) {
    const key = `${REFRESH_TOKEN_PREFIX}${userId}:${crypto.createHash('md5').update(token).digest('hex')}`;
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
}

async function removeRefreshToken(userId, token) {
    const key = `${REFRESH_TOKEN_PREFIX}${userId}:${crypto.createHash('md5').update(token).digest('hex')}`;
    await redisClient.del(key);
}

async function invalidateAllUserTokens(userId) {
    const pattern = `${REFRESH_TOKEN_PREFIX}${userId}:*`;
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
        await redisClient.del(...keys);
    }
}

async function blacklistToken(token) {
    const decoded = verifyAccessToken(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
    if (expiresIn > 0) {
        const key = `${TOKEN_BLACKLIST_PREFIX}${crypto.createHash('md5').update(token).digest('hex')}`;
        await redisClient.setex(key, expiresIn, '1');
    }
}

async function isTokenBlacklisted(token) {
    const key = `${TOKEN_BLACKLIST_PREFIX}${crypto.createHash('md5').update(token).digest('hex')}`;
    const result = await redisClient.get(key);
    return result === '1';
}

async function logAuthEvent(userId, action, metadata) {
    try {
        await AuditLog.create({
            userId,
            action: `auth:${action}`,
            resource: 'auth',
            resourceId: userId,
            metadata,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Failed to log auth event:', error);
    }
}

function sanitizeUser(user) {
    const { password, passwordResetToken, emailVerificationToken, ...sanitized } = user.toJSON ? user.toJSON() : user;
    return sanitized;
}

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    requestPasswordReset,
    resetPassword,
    verifyEmail,
    resendVerificationEmail,
    changePassword,
    validateToken,
    sanitizeUser
};
