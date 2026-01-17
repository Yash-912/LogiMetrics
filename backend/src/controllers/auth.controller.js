const { validationResult } = require("express-validator");
const { User, Company, AuditLog, Driver } = require("../models/mongodb");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require("../utils/jwt.util");
const { hashPassword, comparePassword } = require("../utils/bcrypt.util");
const { successResponse, errorResponse } = require("../utils/response.util");
const { AppError } = require("../middleware/error.middleware");
const logger = require("../utils/logger.util");
const crypto = require("crypto");

/**
 * Register a new user (with optional company creation)
 * @route POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      companyId,
      role,
      // Company fields for new company creation
      company
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError("User with this email already exists", 409);
    }

    let finalCompanyId = companyId;

    // If company object is provided, create new company
    if (company && company.name) {
      // Check if company with same email exists
      const existingCompany = await Company.findOne({ email: company.email || email });
      if (existingCompany) {
        // Use existing company
        finalCompanyId = existingCompany._id;
      } else {
        // Create new company
        const newCompany = await Company.create({
          name: company.name,
          email: company.email || email,
          phone: company.phone || phone,
          registrationNumber: company.registrationNumber || company.gstNumber,
          taxId: company.gstNumber,
          address: company.address?.street || company.address,
          city: company.address?.city || company.city,
          state: company.address?.state || company.state,
          country: company.country || "India",
          status: "active",
          currency: "INR",
          timezone: "Asia/Kolkata",
        });
        finalCompanyId = newCompany._id;

        logger.info(`Company created: ${newCompany.name}`);
      }
    }

    // Validate role against allowed values
    const allowedRoles = ["super_admin", "manager", "dispatcher", "driver"];
    const userRole = allowedRoles.includes(role) ? role : "manager";

    // Generate email verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await User.create({
      email,
      password,
      firstName,
      lastName,
      phone,
      companyId: finalCompanyId,
      role: userRole,
      emailVerificationToken,
      emailVerificationExpires,
      status: "active",
    });

    // Create Driver profile if role is driver
    if (userRole === "driver") {
      await Driver.create({
        userId: user._id,
        firstname: firstName,
        lastname: lastName,
        email: email,
        phone: phone,
        companyId: finalCompanyId,
        status: "available",
      });
    }

    // If this is a new company, update the company with owner
    if (company && company.name && finalCompanyId) {
      await Company.findByIdAndUpdate(finalCompanyId, { ownerId: user._id });
    }

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      companyId: finalCompanyId,
      action: "register",
      resource: "user",
      resourceId: user._id,
      description: `New user registered: ${user.email}`,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
      success: true,
    }).catch((err) => logger.debug("Audit log error:", err.message));

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({ userId: user._id });

    logger.info(`User registered: ${user.email}`);

    return successResponse(
      res,
      {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          companyId: user.companyId,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      "Registration successful",
      201
    );
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
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    // Check if account is active
    if (user.status !== "active") {
      throw new AppError("Account is not active. Please contact support.", 403);
    }

    // Verify password using the model method
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      // Log failed attempt
      await AuditLog.create({
        userId: user._id,
        action: "LOGIN_FAILED",
        resource: "User",
        resourceId: user._id,
        details: { reason: "Invalid password" },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      }).catch((err) => logger.debug("Audit log error:", err.message));
      throw new AppError("Invalid credentials", 401);
    }

    // Auto-detect & fix Driver role
    const driverProfile = await Driver.findOne({
      $or: [
        { userId: user._id },
        { email: { $regex: new RegExp(`^${user.email}$`, "i") } }
      ]
    });

    if (driverProfile) {
      if (!driverProfile.userId) {
        driverProfile.userId = user._id;
        await driverProfile.save();
      }
      if (user.role !== "driver") {
        user.role = "driver";
        await user.save();
      }
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user._id,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({ userId: user._id });



    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLoginAt: new Date() });

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      action: "USER_LOGIN",
      resource: "User",
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    }).catch((err) => logger.debug("Audit log error:", err.message));

    logger.info(`User logged in: ${user.email}`);

    return successResponse(
      res,
      {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          companyId: user.companyId,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      "Login successful",
      200
    );
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
    // Log audit event
    if (req.user) {
      await AuditLog.create({
        userId: req.user._id,
        action: "USER_LOGOUT",
        resource: "User",
        resourceId: req.user._id,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent"),
      });
    }

    return successResponse(res, "Logout successful", 200);
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
      throw new AppError("Refresh token is required", 400);
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (err) {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    // Get user
    const user = await User.findById(decoded.userId);
    if (!user || user.status !== "active") {
      throw new AppError("User not found or inactive", 401);
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user._id,
      role: user.role,
    });

    // Rotate refresh token
    const newRefreshToken = generateRefreshToken({ userId: user._id });

    return successResponse(
      res,
      {
        tokens: {
          accessToken,
          refreshToken: newRefreshToken,
        },
      },
      "Token refreshed",
      200
    );
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
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Return success even if user not found (security)
      return successResponse(
        res,
        null,
        "If an account exists, a password reset email has been sent",
        200
      );
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await User.findByIdAndUpdate(user._id, {
      passwordResetToken: resetTokenHash,
      passwordResetExpires: resetTokenExpires,
    });

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_RESET_REQUESTED",
      resource: "User",
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    // TODO: Send password reset email with resetToken

    logger.info(`Password reset requested for: ${user.email}`);

    return successResponse(
      res,
      "If an account exists, a password reset email has been sent",
      200
    );
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
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { token, password } = req.body;

    // Hash the token for comparison
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid reset token
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
    });

    if (!user) {
      throw new AppError("Invalid or expired reset token", 400);
    }

    // Check if token is expired
    if (new Date() > user.passwordResetExpires) {
      throw new AppError("Reset token has expired", 400);
    }

    // Update password and clear reset token (Mongoose will hash it)
    await User.findByIdAndUpdate(user._id, {
      password: password,
      passwordResetToken: null,
      passwordResetExpires: null,
    });

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_RESET_COMPLETED",
      resource: "User",
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Password reset completed for: ${user.email}`);

    return successResponse(res, "Password reset successful", 200);
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
      throw new AppError("Verification token is required", 400);
    }

    const user = await User.findOne({
      emailVerificationToken: token,
    });

    if (!user) {
      throw new AppError("Invalid verification token", 400);
    }

    if (new Date() > user.emailVerificationExpires) {
      throw new AppError("Verification token has expired", 400);
    }

    await User.findByIdAndUpdate(user._id, {
      emailVerified: true,
      emailVerificationToken: null,
      emailVerificationExpires: null,
    });

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      action: "EMAIL_VERIFIED",
      resource: "User",
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Email verified for: ${user.email}`);

    return successResponse(res, "Email verified successfully", 200);
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

    const user = await User.findOne({ email });
    if (!user) {
      return successResponse(
        res,
        "If an account exists, a verification email has been sent",
        200
      );
    }

    if (user.emailVerified) {
      return successResponse(res, "Email is already verified", 200);
    }

    // Generate new verification token
    const emailVerificationToken = crypto.randomBytes(32).toString("hex");
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await User.findByIdAndUpdate(user._id, {
      emailVerificationToken,
      emailVerificationExpires,
    });

    // TODO: Send verification email

    return successResponse(
      res,
      "If an account exists, a verification email has been sent",
      200
    );
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
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new AppError("Current password is incorrect", 400);
    }

    // Update password (Mongoose pre-save middleware will hash it)
    await User.findByIdAndUpdate(userId, { password: newPassword });

    // Log audit event
    await AuditLog.create({
      userId: user._id,
      action: "PASSWORD_CHANGED",
      resource: "User",
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Password changed for: ${user.email}`);

    return successResponse(res, "Password changed successfully", 200);
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
    const user = await User.findById(req.user._id).select(
      "-password -passwordResetToken -passwordResetExpires -emailVerificationToken -emailVerificationExpires"
    );

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return successResponse(res, "User profile retrieved", 200, { user });
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
  getMe,
};
