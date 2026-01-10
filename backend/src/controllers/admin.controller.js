const { validationResult } = require('express-validator');
const { Op, Sequelize } = require('sequelize');
const { User, Company, Shipment, Vehicle, Driver, Setting, SystemLog } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { success, error } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const { redisClient } = require('../config/redis');
const logger = require('../utils/logger.util');
const bcrypt = require('bcryptjs');

/**
 * Get system statistics (admin dashboard)
 * @route GET /api/admin/stats
 */
const getSystemStats = async (req, res, next) => {
  try {
    // User stats
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const usersByRole = await User.findAll({
      attributes: ['role', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['role'],
      raw: true
    });

    // Company stats
    const totalCompanies = await Company.count();
    const activeCompanies = await Company.count({ where: { status: 'active' } });
    const companiesByPlan = await Company.findAll({
      attributes: ['subscriptionPlan', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['subscriptionPlan'],
      raw: true
    });

    // Shipment stats
    const totalShipments = await Shipment.count();
    const shipmentsByStatus = await Shipment.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    // Vehicle stats
    const totalVehicles = await Vehicle.count();
    const vehiclesByStatus = await Vehicle.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    // Driver stats
    const totalDrivers = await Driver.count();
    const driversByStatus = await Driver.findAll({
      attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
      group: ['status'],
      raw: true
    });

    // Recent activity
    const recentLogs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return success(res, 'System statistics retrieved', 200, {
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole
        },
        companies: {
          total: totalCompanies,
          active: activeCompanies,
          byPlan: companiesByPlan
        },
        shipments: {
          total: totalShipments,
          byStatus: shipmentsByStatus
        },
        vehicles: {
          total: totalVehicles,
          byStatus: vehiclesByStatus
        },
        drivers: {
          total: totalDrivers,
          byStatus: driversByStatus
        },
        recentActivity: recentLogs
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all users (admin)
 * @route GET /api/admin/users
 */
const getAllUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      role,
      companyId,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (role) where.role = role;
    if (companyId) where.companyId = companyId;

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { rows: users, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password', 'refreshToken'] },
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset
    });

    return success(res, 'Users retrieved', 200, {
      users,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user status (admin)
 * @route PUT /api/admin/users/:id/status
 */
const updateUserStatus = async (req, res, next) => {
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

    // Prevent self-suspension
    if (user.id === req.user.id && status !== 'active') {
      throw new AppError('Cannot change your own status', 400);
    }

    const oldStatus = user.status;
    await user.update({
      status,
      statusChangedAt: new Date(),
      statusChangeReason: reason
    });

    // Invalidate user sessions if suspended
    if (status === 'suspended' || status === 'inactive') {
      await redisClient.del(`user:${id}:sessions`);
      await user.update({ refreshToken: null });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_STATUS_CHANGED',
      resource: 'User',
      resourceId: id,
      details: { oldStatus, newStatus: status, reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('User status changed', { userId: id, oldStatus, newStatus: status, by: req.user.id });

    return success(res, 'User status updated successfully', 200, { user });
  } catch (err) {
    next(err);
  }
};

/**
 * Update user role (admin)
 * @route PUT /api/admin/users/:id/role
 */
const updateUserRole = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { role } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent self-demotion from admin
    if (user.id === req.user.id && user.role === 'admin' && role !== 'admin') {
      throw new AppError('Cannot demote yourself from admin', 400);
    }

    const oldRole = user.role;
    await user.update({ role });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_ROLE_CHANGED',
      resource: 'User',
      resourceId: id,
      details: { oldRole, newRole: role },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'User role updated successfully', 200, { user });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete user (admin)
 * @route DELETE /api/admin/users/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const user = await User.findByPk(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Prevent self-deletion
    if (user.id === req.user.id) {
      throw new AppError('Cannot delete yourself', 400);
    }

    if (permanent === 'true') {
      await user.destroy();
      logger.info('User permanently deleted', { userId: id, by: req.user.id });
    } else {
      await user.update({
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy: req.user.id
      });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: permanent === 'true' ? 'USER_PERMANENTLY_DELETED' : 'USER_DELETED',
      resource: 'User',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'User deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Get all companies (admin)
 * @route GET /api/admin/companies
 */
const getAllCompanies = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      subscriptionPlan,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (subscriptionPlan) where.subscriptionPlan = subscriptionPlan;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { rows: companies, count } = await Company.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'users',
          attributes: ['id'],
          required: false
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // Add user count
    const companiesWithStats = companies.map(company => ({
      ...company.toJSON(),
      userCount: company.users?.length || 0
    }));

    return success(res, 'Companies retrieved', 200, {
      companies: companiesWithStats,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update company status (admin)
 * @route PUT /api/admin/companies/:id/status
 */
const updateCompanyStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    const company = await Company.findByPk(id);
    if (!company) {
      throw new AppError('Company not found', 404);
    }

    const oldStatus = company.status;
    await company.update({
      status,
      statusChangedAt: new Date(),
      statusChangeReason: reason
    });

    // If suspending, also suspend all company users
    if (status === 'suspended') {
      await User.update(
        { status: 'suspended', statusChangeReason: 'Company suspended' },
        { where: { companyId: id, status: 'active' } }
      );
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'COMPANY_STATUS_CHANGED',
      resource: 'Company',
      resourceId: id,
      details: { oldStatus, newStatus: status, reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Company status updated successfully', 200, { company });
  } catch (err) {
    next(err);
  }
};

/**
 * Get system settings
 * @route GET /api/admin/settings
 */
const getSystemSettings = async (req, res, next) => {
  try {
    const settings = await Setting.findAll({
      where: { isSystem: true },
      order: [['category', 'ASC'], ['key', 'ASC']]
    });

    // Group by category
    const grouped = settings.reduce((acc, setting) => {
      const category = setting.category || 'general';
      if (!acc[category]) acc[category] = [];
      acc[category].push(setting);
      return acc;
    }, {});

    return success(res, 'System settings retrieved', 200, { settings: grouped });
  } catch (err) {
    next(err);
  }
};

/**
 * Update system setting
 * @route PUT /api/admin/settings/:key
 */
const updateSystemSetting = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    let setting = await Setting.findOne({ where: { key, isSystem: true } });

    if (!setting) {
      // Create new setting
      setting = await Setting.create({
        key,
        value,
        description,
        isSystem: true,
        updatedBy: req.user.id
      });
    } else {
      const oldValue = setting.value;
      await setting.update({
        value,
        description,
        updatedBy: req.user.id
      });

      // Log change
      await AuditLog.create({
        userId: req.user.id,
        action: 'SETTING_UPDATED',
        resource: 'Setting',
        resourceId: key,
        details: { oldValue, newValue: value },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
    }

    // Clear settings cache
    await redisClient.del('system:settings');

    return success(res, 'Setting updated successfully', 200, { setting });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle maintenance mode
 * @route POST /api/admin/maintenance
 */
const toggleMaintenanceMode = async (req, res, next) => {
  try {
    const { enabled, message, estimatedEndTime, allowedIPs } = req.body;

    const maintenanceConfig = {
      enabled,
      message: message || 'System is under maintenance. Please try again later.',
      estimatedEndTime,
      allowedIPs: allowedIPs || [],
      startedAt: enabled ? new Date() : null,
      startedBy: enabled ? req.user.id : null
    };

    // Store in Redis for quick access
    await redisClient.set(
      'system:maintenance',
      JSON.stringify(maintenanceConfig)
    );

    // Also store in database for persistence
    await Setting.upsert({
      key: 'maintenanceMode',
      value: JSON.stringify(maintenanceConfig),
      isSystem: true,
      category: 'system'
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
      resource: 'System',
      details: maintenanceConfig,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, { by: req.user.id });

    return success(res, `Maintenance mode ${enabled ? 'enabled' : 'disabled'}`, 200, {
      maintenance: maintenanceConfig
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get audit logs
 * @route GET /api/admin/audit-logs
 */
const getAuditLogs = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      resource,
      startDate,
      endDate,
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (userId) query.userId = userId;
    if (action) query.action = { $regex: action, $options: 'i' };
    if (resource) query.resource = resource;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      AuditLog.countDocuments(query)
    ]);

    return success(res, 'Audit logs retrieved', 200, {
      logs,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Clear cache
 * @route POST /api/admin/cache/clear
 */
const clearCache = async (req, res, next) => {
  try {
    const { pattern } = req.body;

    let keysDeleted = 0;

    if (pattern) {
      // Clear specific pattern
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(keys);
        keysDeleted = keys.length;
      }
    } else {
      // Clear all cache (except critical keys)
      const keys = await redisClient.keys('*');
      const excludePatterns = ['system:maintenance', 'system:settings'];
      const keysToDelete = keys.filter(key =>
        !excludePatterns.some(p => key.startsWith(p))
      );

      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
        keysDeleted = keysToDelete.length;
      }
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'CACHE_CLEARED',
      resource: 'System',
      details: { pattern, keysDeleted },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('Cache cleared', { pattern, keysDeleted, by: req.user.id });

    return success(res, 'Cache cleared successfully', 200, { keysDeleted });
  } catch (err) {
    next(err);
  }
};

/**
 * Get system health
 * @route GET /api/admin/health
 */
const getSystemHealth = async (req, res, next) => {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date(),
      services: {}
    };

    // Database health
    try {
      await User.findOne();
      health.services.postgres = { status: 'healthy' };
    } catch (err) {
      health.services.postgres = { status: 'unhealthy', error: err.message };
      health.status = 'degraded';
    }

    // MongoDB health
    try {
      await AuditLog.findOne();
      health.services.mongodb = { status: 'healthy' };
    } catch (err) {
      health.services.mongodb = { status: 'unhealthy', error: err.message };
      health.status = 'degraded';
    }

    // Redis health
    try {
      await redisClient.ping();
      health.services.redis = { status: 'healthy' };
    } catch (err) {
      health.services.redis = { status: 'unhealthy', error: err.message };
      health.status = 'degraded';
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    health.memory = {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB',
      rss: Math.round(memUsage.rss / 1024 / 1024) + ' MB'
    };

    // Uptime
    health.uptime = process.uptime();

    return success(res, 'System health retrieved', 200, { health });
  } catch (err) {
    next(err);
  }
};

/**
 * Impersonate user
 * @route POST /api/admin/impersonate/:userId
 */
const impersonateUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const targetUser = await User.findByPk(userId, {
      include: [{ model: Company, as: 'company' }]
    });

    if (!targetUser) {
      throw new AppError('User not found', 404);
    }

    // Cannot impersonate another admin
    if (targetUser.role === 'admin' && targetUser.id !== req.user.id) {
      throw new AppError('Cannot impersonate another admin', 403);
    }

    // Generate impersonation token
    const { generateToken } = require('../utils/jwt.util');
    const token = generateToken({
      id: targetUser.id,
      email: targetUser.email,
      role: targetUser.role,
      companyId: targetUser.companyId,
      impersonatedBy: req.user.id,
      isImpersonation: true
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'USER_IMPERSONATED',
      resource: 'User',
      resourceId: userId,
      details: { targetEmail: targetUser.email },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.warn('User impersonation', { adminId: req.user.id, targetUserId: userId });

    return success(res, 'Impersonation token generated', 200, {
      token,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        role: targetUser.role,
        company: targetUser.company
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Send broadcast notification
 * @route POST /api/admin/broadcast
 */
const sendBroadcast = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { title, message, type, targetRoles, targetCompanies, priority } = req.body;

    // Build target user query
    const where = { status: 'active' };
    if (targetRoles && targetRoles.length > 0) {
      where.role = { [Op.in]: targetRoles };
    }
    if (targetCompanies && targetCompanies.length > 0) {
      where.companyId = { [Op.in]: targetCompanies };
    }

    const targetUsers = await User.findAll({
      where,
      attributes: ['id', 'email', 'firstName']
    });

    // Create notifications for all target users
    const { Notification } = require('../models/postgres');
    const notifications = await Notification.bulkCreate(
      targetUsers.map(user => ({
        userId: user.id,
        title,
        message,
        type: type || 'system',
        priority: priority || 'normal',
        data: { broadcast: true, sentBy: req.user.id }
      }))
    );

    // Send real-time notification via Socket.io
    const io = req.app.get('io');
    if (io) {
      targetUsers.forEach(user => {
        io.to(`user:${user.id}`).emit('notification', {
          title,
          message,
          type,
          priority
        });
      });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'BROADCAST_SENT',
      resource: 'System',
      details: {
        title,
        recipientCount: targetUsers.length,
        targetRoles,
        targetCompanies
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('Broadcast sent', {
      by: req.user.id,
      recipientCount: targetUsers.length
    });

    return success(res, 'Broadcast sent successfully', 200, {
      recipientCount: targetUsers.length,
      notificationIds: notifications.map(n => n.id)
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSystemStats,
  getAllUsers,
  updateUserStatus,
  updateUserRole,
  deleteUser,
  getAllCompanies,
  updateCompanyStatus,
  getSystemSettings,
  updateSystemSetting,
  toggleMaintenanceMode,
  getAuditLogs,
  clearCache,
  getSystemHealth,
  impersonateUser,
  sendBroadcast
};
