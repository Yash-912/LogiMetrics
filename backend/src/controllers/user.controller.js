const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { User, Role, Company } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { hashPassword } = require('../utils/bcrypt.util');
const { success, error, paginated } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const { uploadToS3, deleteFromS3 } = require('../utils/fileUpload.util');
const logger = require('../utils/logger.util');

/**
 * Get all users with pagination and filters
 * @route GET /api/users
 */
const getUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      role,
      companyId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [
        { model: Role, as: 'userRole', attributes: ['id', 'name'] },
        { model: Company, as: 'company', attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'emailVerificationToken', 'emailVerificationExpires'] },
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return paginated(res, 'Users retrieved successfully', users, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get user by ID
 * @route GET /api/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [
        { model: Role, as: 'userRole', attributes: ['id', 'name'] },
        { model: Company, as: 'company', attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'emailVerificationToken', 'emailVerificationExpires'] }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return success(res, 'User retrieved successfully', 200, { user });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new user
 * @route POST /api/users
 */
const createUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      companyId,
      roleId,
      status,
      address,
      city,
      state,
      country,
      postalCode
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      companyId,
      roleId,
      status: status || 'active',
      address,
      city,
      state,
      country,
      postalCode,
      emailVerified: true // Admin-created users are pre-verified
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_CREATED',
      resource: 'User',
      resourceId: user.id,
      details: { email: user.email, createdBy: req.user.id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`User created: ${user.email} by ${req.user.email}`);

    // Fetch user with associations
    const createdUser = await User.findByPk(user.id, {
      include: [
        { model: Role, as: 'userRole', attributes: ['id', 'name'] },
        { model: Company, as: 'company', attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'emailVerificationToken', 'emailVerificationExpires'] }
    });

    return success(res, 'User created successfully', 201, { user: createdUser });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user
 * @route PUT /api/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const updateData = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check email uniqueness if being updated
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await User.findOne({ where: { email: updateData.email } });
      if (existingUser) {
        throw new AppError('Email is already in use', 409);
      }
    }

    // Remove sensitive fields from update
    delete updateData.password;
    delete updateData.passwordResetToken;
    delete updateData.passwordResetExpires;

    await user.update(updateData);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_UPDATED',
      resource: 'User',
      resourceId: user.id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`User updated: ${user.email} by ${req.user.email}`);

    // Fetch updated user with associations
    const updatedUser = await User.findByPk(id, {
      include: [
        { model: Role, as: 'userRole', attributes: ['id', 'name'] },
        { model: Company, as: 'company', attributes: ['id', 'name'] }
      ],
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'emailVerificationToken', 'emailVerificationExpires'] }
    });

    return success(res, 'User updated successfully', 200, { user: updatedUser });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete user
 * @route DELETE /api/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent self-deletion
    if (id === req.user.id) {
      throw new AppError('You cannot delete your own account', 400);
    }

    // Store user info for logging
    const userEmail = user.email;

    // Soft delete by updating status
    await user.update({ status: 'inactive', deletedAt: new Date() });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_DELETED',
      resource: 'User',
      resourceId: id,
      details: { email: userEmail, deletedBy: req.user.id },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`User deleted: ${userEmail} by ${req.user.email}`);

    return success(res, 'User deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Update user profile (self)
 * @route PUT /api/users/me/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const userId = req.user.id;
    const {
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      timezone,
      language
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    await user.update({
      firstName,
      lastName,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      timezone,
      language
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'PROFILE_UPDATED',
      resource: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    const updatedUser = await User.findByPk(userId, {
      attributes: { exclude: ['password', 'passwordResetToken', 'passwordResetExpires', 'emailVerificationToken', 'emailVerificationExpires'] }
    });

    return success(res, 'Profile updated successfully', 200, { user: updatedUser });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload user avatar
 * @route POST /api/users/me/avatar
 */
const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Delete old avatar if exists
    if (user.avatarUrl) {
      try {
        await deleteFromS3(user.avatarUrl);
      } catch (deleteErr) {
        logger.warn(`Failed to delete old avatar: ${deleteErr.message}`);
      }
    }

    // Upload new avatar
    const avatarUrl = await uploadToS3(req.file, `avatars/${userId}`);

    await user.update({ avatarUrl });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'AVATAR_UPLOADED',
      resource: 'User',
      resourceId: userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Avatar uploaded successfully', 200, { avatarUrl });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete user avatar
 * @route DELETE /api/users/me/avatar
 */
const deleteAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);

    if (!user) {
      throw new AppError('User not found', 404);
    }

    if (!user.avatarUrl) {
      throw new AppError('No avatar to delete', 400);
    }

    // Delete from S3
    await deleteFromS3(user.avatarUrl);

    await user.update({ avatarUrl: null });

    return success(res, 'Avatar deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Update user status
 * @route PATCH /api/users/:id/status
 */
const updateStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { status, reason } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent self-status change to inactive/suspended
    if (id === req.user.id && (status === 'inactive' || status === 'suspended')) {
      throw new AppError('You cannot deactivate or suspend your own account', 400);
    }

    await user.update({ status });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_STATUS_CHANGED',
      resource: 'User',
      resourceId: id,
      details: { newStatus: status, reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`User status changed: ${user.email} to ${status} by ${req.user.email}`);

    return success(res, 'User status updated successfully', 200, { status });
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk user operations
 * @route POST /api/users/bulk
 */
const bulkOperation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { userIds, action } = req.body;

    // Prevent self-inclusion in bulk operations
    if (userIds.includes(req.user.id) && ['deactivate', 'suspend', 'delete'].includes(action)) {
      throw new AppError('You cannot include yourself in this operation', 400);
    }

    let updateData = {};
    switch (action) {
      case 'activate':
        updateData = { status: 'active' };
        break;
      case 'deactivate':
        updateData = { status: 'inactive' };
        break;
      case 'suspend':
        updateData = { status: 'suspended' };
        break;
      case 'delete':
        updateData = { status: 'inactive', deletedAt: new Date() };
        break;
      default:
        throw new AppError('Invalid action', 400);
    }

    const [affectedCount] = await User.update(updateData, {
      where: { id: { [Op.in]: userIds } }
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: `BULK_USER_${action.toUpperCase()}`,
      resource: 'User',
      details: { userIds, action, affectedCount },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Bulk user operation: ${action} on ${affectedCount} users by ${req.user.email}`);

    return success(res, `Bulk operation completed. ${affectedCount} users affected.`, 200, { affectedCount });
  } catch (err) {
    next(err);
  }
};

/**
 * Get user activity log
 * @route GET /api/users/:id/activity
 */
const getUserActivity = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    const skip = (page - 1) * limit;

    const activities = await AuditLog.find({ userId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await AuditLog.countDocuments({ userId: id });

    return paginated(res, 'User activity retrieved successfully', activities, {
      page: parseInt(page),
      limit: parseInt(limit),
      total
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  updateStatus,
  bulkOperation,
  getUserActivity
};
