const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Notification, User, NotificationPreference, PushSubscription } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { success, error, paginated } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const { sendEmail } = require('../config/email');
const { sendSMS } = require('../config/sms');
const { sendPushNotification } = require('../config/push');
const { emitToUser } = require('../config/socket');
const logger = require('../utils/logger.util');

/**
 * Get all notifications for current user
 * @route GET /api/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      read,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = { userId: req.user.id };

    if (type) where.type = type;
    if (read !== undefined) where.read = read === 'true';

    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return paginated(res, 'Notifications retrieved successfully', notifications, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get notification by ID
 * @route GET /api/notifications/:id
 */
const getNotificationById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user.id }
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    return success(res, 'Notification retrieved successfully', 200, { notification });
  } catch (err) {
    next(err);
  }
};

/**
 * Get unread notification count
 * @route GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const count = await Notification.count({
      where: { userId: req.user.id, read: false }
    });

    return success(res, 'Unread count retrieved', 200, { count });
  } catch (err) {
    next(err);
  }
};

/**
 * Mark notification as read
 * @route PATCH /api/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user.id }
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    await notification.update({ read: true, readAt: new Date() });

    return success(res, 'Notification marked as read', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Mark all notifications as read
 * @route PATCH /api/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const [affectedCount] = await Notification.update(
      { read: true, readAt: new Date() },
      { where: { userId: req.user.id, read: false } }
    );

    return success(res, 'All notifications marked as read', 200, { affectedCount });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete notification
 * @route DELETE /api/notifications/:id
 */
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findOne({
      where: { id, userId: req.user.id }
    });

    if (!notification) {
      throw new AppError('Notification not found', 404);
    }

    await notification.destroy();

    return success(res, 'Notification deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete all notifications
 * @route DELETE /api/notifications/all
 */
const deleteAllNotifications = async (req, res, next) => {
  try {
    const { olderThan } = req.query;

    const where = { userId: req.user.id };
    
    if (olderThan) {
      where.createdAt = { [Op.lt]: new Date(olderThan) };
    }

    const affectedCount = await Notification.destroy({ where });

    return success(res, 'Notifications deleted successfully', 200, { affectedCount });
  } catch (err) {
    next(err);
  }
};

/**
 * Get notification preferences
 * @route GET /api/notifications/preferences
 */
const getPreferences = async (req, res, next) => {
  try {
    let preferences = await NotificationPreference.findOne({
      where: { userId: req.user.id }
    });

    // Create default preferences if not exists
    if (!preferences) {
      preferences = await NotificationPreference.create({
        userId: req.user.id,
        email: {
          shipmentUpdates: true,
          paymentUpdates: true,
          promotions: false,
          newsletter: false
        },
        push: {
          shipmentUpdates: true,
          paymentUpdates: true,
          alerts: true
        },
        sms: {
          shipmentUpdates: false,
          alerts: true
        },
        inApp: {
          all: true
        }
      });
    }

    return success(res, 'Notification preferences retrieved', 200, { preferences });
  } catch (err) {
    next(err);
  }
};

/**
 * Update notification preferences
 * @route PUT /api/notifications/preferences
 */
const updatePreferences = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { email, push, sms, inApp, quietHours } = req.body;

    let preferences = await NotificationPreference.findOne({
      where: { userId: req.user.id }
    });

    if (!preferences) {
      preferences = await NotificationPreference.create({
        userId: req.user.id,
        email: email || {},
        push: push || {},
        sms: sms || {},
        inApp: inApp || {},
        quietHours: quietHours || null
      });
    } else {
      await preferences.update({
        email: email || preferences.email,
        push: push || preferences.push,
        sms: sms || preferences.sms,
        inApp: inApp || preferences.inApp,
        quietHours: quietHours !== undefined ? quietHours : preferences.quietHours
      });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'NOTIFICATION_PREFERENCES_UPDATED',
      resource: 'NotificationPreference',
      resourceId: preferences.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Notification preferences updated', 200, { preferences });
  } catch (err) {
    next(err);
  }
};

/**
 * Register push subscription
 * @route POST /api/notifications/push/subscribe
 */
const subscribePush = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { endpoint, keys, deviceType, deviceName } = req.body;

    // Check if subscription already exists
    let subscription = await PushSubscription.findOne({
      where: { userId: req.user.id, endpoint }
    });

    if (subscription) {
      await subscription.update({ keys, deviceType, deviceName, active: true });
    } else {
      subscription = await PushSubscription.create({
        userId: req.user.id,
        endpoint,
        keys,
        deviceType,
        deviceName,
        active: true
      });
    }

    logger.info(`Push subscription registered for user ${req.user.id}`);

    return success(res, 'Push subscription registered', 200, { 
      subscriptionId: subscription.id 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Unregister push subscription
 * @route POST /api/notifications/push/unsubscribe
 */
const unsubscribePush = async (req, res, next) => {
  try {
    const { endpoint } = req.body;

    const subscription = await PushSubscription.findOne({
      where: { userId: req.user.id, endpoint }
    });

    if (subscription) {
      await subscription.update({ active: false });
    }

    return success(res, 'Push subscription removed', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Send notification (internal/admin use)
 * @route POST /api/notifications/send
 */
const sendNotification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const {
      userId,
      userIds,
      type,
      title,
      message,
      data,
      channels,
      priority
    } = req.body;

    const targetUserIds = userIds || [userId];
    const results = {
      sent: [],
      failed: []
    };

    for (const targetUserId of targetUserIds) {
      try {
        await createAndSendNotification({
          userId: targetUserId,
          type,
          title,
          message,
          data,
          channels: channels || ['inApp'],
          priority: priority || 'normal',
          senderId: req.user.id
        });

        results.sent.push(targetUserId);
      } catch (sendErr) {
        logger.error(`Failed to send notification to user ${targetUserId}:`, sendErr);
        results.failed.push({ userId: targetUserId, error: sendErr.message });
      }
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'NOTIFICATION_SENT',
      resource: 'Notification',
      details: { targetUserIds, type, sentCount: results.sent.length },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Notification sent', 200, { results });
  } catch (err) {
    next(err);
  }
};

/**
 * Send bulk notification
 * @route POST /api/notifications/send-bulk
 */
const sendBulkNotification = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const {
      companyId,
      roleId,
      type,
      title,
      message,
      data,
      channels
    } = req.body;

    // Get target users
    const where = {};
    if (companyId) where.companyId = companyId;
    if (roleId) where.roleId = roleId;

    const users = await User.findAll({
      where,
      attributes: ['id'],
      raw: true
    });

    const userIds = users.map(u => u.id);

    // Queue notifications for async processing
    // In production, this should use a job queue like Bull
    const results = {
      queued: userIds.length,
      failed: 0
    };

    // Process in batches
    const batchSize = 100;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(userId =>
          createAndSendNotification({
            userId,
            type,
            title,
            message,
            data,
            channels: channels || ['inApp'],
            priority: 'normal',
            senderId: req.user.id
          }).catch(err => {
            results.failed++;
            logger.error(`Bulk notification failed for user ${userId}:`, err);
          })
        )
      );
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'BULK_NOTIFICATION_SENT',
      resource: 'Notification',
      details: { targetCount: userIds.length, type },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Bulk notification sent', 200, { results });
  } catch (err) {
    next(err);
  }
};

/**
 * Get push subscriptions for current user
 * @route GET /api/notifications/push/subscriptions
 */
const getPushSubscriptions = async (req, res, next) => {
  try {
    const subscriptions = await PushSubscription.findAll({
      where: { userId: req.user.id, active: true },
      attributes: ['id', 'deviceType', 'deviceName', 'createdAt']
    });

    return success(res, 'Push subscriptions retrieved', 200, { subscriptions });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper function to create and send notification
 */
const createAndSendNotification = async ({
  userId,
  type,
  title,
  message,
  data,
  channels,
  priority,
  senderId
}) => {
  // Get user preferences
  const preferences = await NotificationPreference.findOne({
    where: { userId }
  });

  // Check quiet hours
  if (preferences?.quietHours?.enabled) {
    const now = new Date();
    const currentHour = now.getHours();
    const { start, end } = preferences.quietHours;
    
    if (priority !== 'high') {
      if (start < end) {
        if (currentHour >= start && currentHour < end) {
          // In quiet hours - store only in-app
          channels = ['inApp'];
        }
      } else {
        if (currentHour >= start || currentHour < end) {
          channels = ['inApp'];
        }
      }
    }
  }

  // Create in-app notification
  const notification = await Notification.create({
    userId,
    type,
    title,
    message,
    data,
    priority,
    read: false,
    createdBy: senderId
  });

  // Emit via WebSocket for real-time
  if (channels.includes('inApp')) {
    emitToUser(userId, 'notification', {
      id: notification.id,
      type,
      title,
      message,
      data,
      createdAt: notification.createdAt
    });
  }

  // Send email notification
  if (channels.includes('email') && preferences?.email?.[type] !== false) {
    const user = await User.findByPk(userId);
    if (user?.email) {
      try {
        await sendEmail({
          to: user.email,
          subject: title,
          template: 'notification',
          context: { title, message, data }
        });
      } catch (emailErr) {
        logger.error(`Failed to send email notification:`, emailErr);
      }
    }
  }

  // Send SMS notification
  if (channels.includes('sms') && preferences?.sms?.[type] !== false) {
    const user = await User.findByPk(userId);
    if (user?.phone) {
      try {
        await sendSMS({
          to: user.phone,
          message: `${title}: ${message}`
        });
      } catch (smsErr) {
        logger.error(`Failed to send SMS notification:`, smsErr);
      }
    }
  }

  // Send push notification
  if (channels.includes('push') && preferences?.push?.[type] !== false) {
    const subscriptions = await PushSubscription.findAll({
      where: { userId, active: true }
    });

    for (const subscription of subscriptions) {
      try {
        await sendPushNotification(subscription, {
          title,
          body: message,
          data,
          icon: '/icon.png',
          badge: '/badge.png'
        });
      } catch (pushErr) {
        logger.error(`Failed to send push notification:`, pushErr);
        // Mark subscription as inactive if it fails
        if (pushErr.statusCode === 410) {
          await subscription.update({ active: false });
        }
      }
    }
  }

  return notification;
};

// Export helper for use by other modules
module.exports.createAndSendNotification = createAndSendNotification;

module.exports = {
  getNotifications,
  getNotificationById,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications,
  getPreferences,
  updatePreferences,
  subscribePush,
  unsubscribePush,
  sendNotification,
  sendBulkNotification,
  getPushSubscriptions,
  createAndSendNotification
};
