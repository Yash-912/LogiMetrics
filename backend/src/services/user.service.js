/**
 * User Service
 * Handles user business logic and profile management
 */

const { Op } = require("sequelize");
const { User, Company, Role, Permission } = require("../models/mongodb");
const { AuditLog } = require("../models/mongodb");
const { hashPassword, comparePassword } = require("../utils/bcrypt.util");
const { uploadToS3, deleteFromS3 } = require("../utils/fileUpload.util");
const logger = require("../utils/logger.util");

/**
 * Get all users with pagination and filters
 */
async function getUsers({
  page = 1,
  limit = 10,
  search,
  status,
  role,
  companyId,
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { email: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (status) {
    where.status = status;
  }

  if (role) {
    where.role = role;
  }

  if (companyId) {
    where.companyId = companyId;
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    include: [{ model: Company, as: "company", attributes: ["id", "name"] }],
    attributes: {
      exclude: ["password", "passwordResetToken", "emailVerificationToken"],
    },
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit,
    offset,
  });

  return {
    users: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get user by ID
 */
async function getUserById(userId) {
  const user = await User.findByPk(userId, {
    include: [
      { model: Company, as: "company", attributes: ["id", "name", "logo"] },
    ],
    attributes: {
      exclude: ["password", "passwordResetToken", "emailVerificationToken"],
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}

/**
 * Get user by email
 */
async function getUserByEmail(email) {
  const user = await User.findOne({
    where: { email },
    include: [{ model: Company, as: "company" }],
  });

  return user;
}

/**
 * Create a new user
 */
async function createUser(userData, createdBy) {
  const {
    email,
    password,
    firstName,
    lastName,
    companyId,
    role = "user",
    phone,
    avatar,
  } = userData;

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new Error("User with this email already exists");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await User.create({
    email,
    password: hashedPassword,
    firstName,
    lastName,
    companyId,
    role,
    phone,
    avatar,
    isEmailVerified: true, // Admin-created users are pre-verified
    status: "active",
  });

  // Log the action
  await logUserAction(createdBy, "create", user.id, { email, role });

  return sanitizeUser(user);
}

/**
 * Update user
 */
async function updateUser(userId, updateData, updatedBy) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Prevent updating sensitive fields directly
  const {
    password,
    passwordResetToken,
    emailVerificationToken,
    ...safeUpdateData
  } = updateData;

  await user.update(safeUpdateData);

  // Log the action
  await logUserAction(updatedBy, "update", userId, {
    fields: Object.keys(safeUpdateData),
  });

  return sanitizeUser(user);
}

/**
 * Delete user (soft delete)
 */
async function deleteUser(userId, deletedBy) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Prevent deleting self or super admin
  if (userId === deletedBy) {
    throw new Error("Cannot delete your own account");
  }

  if (user.role === "super_admin") {
    throw new Error("Cannot delete super admin");
  }

  await user.update({
    status: "deleted",
    deletedAt: new Date(),
    email: `deleted_${Date.now()}_${user.email}`, // Free up the email for reuse
  });

  // Log the action
  await logUserAction(deletedBy, "delete", userId, {});

  return { message: "User deleted successfully" };
}

/**
 * Update user status
 */
async function updateUserStatus(userId, status, reason, updatedBy) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const validStatuses = ["active", "inactive", "suspended", "pending"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  await user.update({
    status,
    statusReason: reason,
    statusUpdatedAt: new Date(),
    statusUpdatedBy: updatedBy,
  });

  // Log the action
  await logUserAction(updatedBy, "status_change", userId, { status, reason });

  return sanitizeUser(user);
}

/**
 * Update user profile
 */
async function updateProfile(userId, profileData) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error("User not found");
  }

  const allowedFields = [
    "firstName",
    "lastName",
    "phone",
    "timezone",
    "language",
    "bio",
    "address",
  ];
  const updateData = {};

  for (const field of allowedFields) {
    if (profileData[field] !== undefined) {
      updateData[field] = profileData[field];
    }
  }

  await user.update(updateData);

  return sanitizeUser(user);
}

/**
 * Upload user avatar
 */
async function uploadAvatar(userId, file) {
  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Delete old avatar if exists
  if (user.avatar) {
    try {
      await deleteFromS3(user.avatar);
    } catch (error) {
      logger.error("Failed to delete old avatar:", error);
    }
  }

  // Upload new avatar
  const avatarUrl = await uploadToS3(file, `avatars/${userId}`);

  await user.update({ avatar: avatarUrl });

  return { avatarUrl };
}

/**
 * Get user activity log
 */
async function getUserActivity(userId, { page = 1, limit = 20 }) {
  const skip = (page - 1) * limit;

  const logs = await AuditLog.find({ userId })
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit);

  const total = await AuditLog.countDocuments({ userId });

  return {
    activities: logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get user permissions
 */
async function getUserPermissions(userId) {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: "roleDetails",
        include: [{ model: Permission, as: "permissions" }],
      },
    ],
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Return permissions from role
  const permissions = user.roleDetails?.permissions?.map((p) => p.name) || [];

  return permissions;
}

/**
 * Bulk update users
 */
async function bulkUpdateUsers(userIds, updateData, updatedBy) {
  const { status, role } = updateData;
  const updated = [];
  const failed = [];

  for (const userId of userIds) {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        failed.push({ userId, error: "User not found" });
        continue;
      }

      const updates = {};
      if (status) updates.status = status;
      if (role) updates.role = role;

      await user.update(updates);
      updated.push(userId);

      // Log the action
      await logUserAction(updatedBy, "bulk_update", userId, updates);
    } catch (error) {
      failed.push({ userId, error: error.message });
    }
  }

  return { updated, failed };
}

/**
 * Get users by company
 */
async function getUsersByCompany(companyId, options = {}) {
  return getUsers({ ...options, companyId });
}

/**
 * Count users
 */
async function countUsers(filters = {}) {
  const where = {};

  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.status) where.status = filters.status;
  if (filters.role) where.role = filters.role;

  return User.count({ where });
}

/**
 * Search users
 */
async function searchUsers(query, companyId, limit = 10) {
  const where = {
    [Op.or]: [
      { firstName: { [Op.iLike]: `%${query}%` } },
      { lastName: { [Op.iLike]: `%${query}%` } },
      { email: { [Op.iLike]: `%${query}%` } },
    ],
    status: "active",
  };

  if (companyId) {
    where.companyId = companyId;
  }

  const users = await User.findAll({
    where,
    attributes: ["id", "firstName", "lastName", "email", "avatar", "role"],
    limit,
  });

  return users;
}

// Helper functions

async function logUserAction(actorId, action, targetId, metadata) {
  try {
    await AuditLog.create({
      userId: actorId,
      action: `user:${action}`,
      resource: "user",
      resourceId: targetId,
      metadata,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to log user action:", error);
  }
}

function sanitizeUser(user) {
  const userData = user.toJSON ? user.toJSON() : user;
  const { password, passwordResetToken, emailVerificationToken, ...sanitized } =
    userData;
  return sanitized;
}

module.exports = {
  getUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  updateUserStatus,
  updateProfile,
  uploadAvatar,
  getUserActivity,
  getUserPermissions,
  bulkUpdateUsers,
  getUsersByCompany,
  countUsers,
  searchUsers,
  sanitizeUser,
};
