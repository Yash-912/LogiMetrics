/**
 * Notification Service
 * Multi-channel notifications (email, SMS, push, in-app)
 */

const { Op } = require('sequelize');
const { Notification, User } = require('../models/postgres');
const { sendEmail } = require('../config/email');
const { sendSMS, smsTemplates } = require('../config/sms');
const { getRedisClient } = require('../config/redis');
const { getSocketIO } = require('../config/socket');
const logger = require('../utils/logger.util');

// Notification types
const NOTIFICATION_TYPES = {
    SHIPMENT_CREATED: 'shipment_created',
    SHIPMENT_PICKED_UP: 'shipment_picked_up',
    SHIPMENT_IN_TRANSIT: 'shipment_in_transit',
    SHIPMENT_OUT_FOR_DELIVERY: 'shipment_out_for_delivery',
    SHIPMENT_DELIVERED: 'shipment_delivered',
    SHIPMENT_DELAYED: 'shipment_delayed',
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_FAILED: 'payment_failed',
    INVOICE_GENERATED: 'invoice_generated',
    INVOICE_OVERDUE: 'invoice_overdue',
    DRIVER_ASSIGNED: 'driver_assigned',
    VEHICLE_MAINTENANCE: 'vehicle_maintenance',
    LICENSE_EXPIRY: 'license_expiry',
    ALERT: 'alert',
    SYSTEM: 'system'
};

// Notification channels
const CHANNELS = {
    EMAIL: 'email',
    SMS: 'sms',
    PUSH: 'push',
    IN_APP: 'in_app'
};

/**
 * Create in-app notification
 */
async function createNotification(userId, type, title, message, data = {}) {
    const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        data,
        isRead: false,
        createdAt: new Date()
    });

    // Emit real-time notification via Socket.io
    try {
        const io = getSocketIO();
        if (io) {
            io.to(`user:${userId}`).emit('notification', {
                id: notification.id,
                type,
                title,
                message,
                data,
                createdAt: notification.createdAt
            });
        }
    } catch (err) {
        logger.warn('Failed to emit socket notification:', err.message);
    }

    logger.info(`Notification created for user ${userId}: ${title}`);
    return notification;
}

/**
 * Send multi-channel notification
 */
async function sendNotification(userId, options) {
    const {
        type,
        title,
        message,
        data = {},
        channels = [CHANNELS.IN_APP],
        emailOptions = {},
        smsMessage = null
    } = options;

    const user = await User.findByPk(userId);
    if (!user) {
        throw new Error('User not found');
    }

    const results = {
        inApp: false,
        email: false,
        sms: false,
        push: false
    };

    // In-app notification
    if (channels.includes(CHANNELS.IN_APP)) {
        try {
            await createNotification(userId, type, title, message, data);
            results.inApp = true;
        } catch (err) {
            logger.error('In-app notification failed:', err);
        }
    }

    // Email notification
    if (channels.includes(CHANNELS.EMAIL) && user.email) {
        try {
            await sendEmail({
                to: user.email,
                subject: emailOptions.subject || title,
                html: emailOptions.html || `<p>${message}</p>`,
                ...emailOptions
            });
            results.email = true;
        } catch (err) {
            logger.error('Email notification failed:', err);
        }
    }

    // SMS notification
    if (channels.includes(CHANNELS.SMS) && user.phone) {
        try {
            await sendSMS(user.phone, smsMessage || message);
            results.sms = true;
        } catch (err) {
            logger.error('SMS notification failed:', err);
        }
    }

    // Push notification
    if (channels.includes(CHANNELS.PUSH)) {
        try {
            await sendPushNotification(userId, title, message, data);
            results.push = true;
        } catch (err) {
            logger.error('Push notification failed:', err);
        }
    }

    return results;
}

/**
 * Send push notification (Web Push)
 */
async function sendPushNotification(userId, title, body, data = {}) {
    const redis = getRedisClient();
    if (!redis) return false;

    // Get user's push subscriptions from Redis
    const subscriptionsKey = `push:subscriptions:${userId}`;
    const subscriptionsData = await redis.get(subscriptionsKey);

    if (!subscriptionsData) {
        return false;
    }

    const subscriptions = JSON.parse(subscriptionsData);
    const webpush = require('web-push');

    const payload = JSON.stringify({
        title,
        body,
        icon: '/icons/logo-192.png',
        badge: '/icons/badge-72.png',
        data
    });

    const results = await Promise.allSettled(
        subscriptions.map(subscription =>
            webpush.sendNotification(subscription, payload)
        )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    logger.info(`Push notifications sent: ${successful}/${subscriptions.length}`);

    return successful > 0;
}

/**
 * Subscribe to push notifications
 */
async function subscribeToPush(userId, subscription) {
    const redis = getRedisClient();
    if (!redis) return false;

    const subscriptionsKey = `push:subscriptions:${userId}`;
    let subscriptions = [];

    const existing = await redis.get(subscriptionsKey);
    if (existing) {
        subscriptions = JSON.parse(existing);
    }

    // Add new subscription if not exists
    const exists = subscriptions.some(
        s => s.endpoint === subscription.endpoint
    );

    if (!exists) {
        subscriptions.push(subscription);
        await redis.set(subscriptionsKey, JSON.stringify(subscriptions));
    }

    logger.info(`Push subscription added for user ${userId}`);
    return true;
}

/**
 * Unsubscribe from push notifications
 */
async function unsubscribeFromPush(userId, endpoint) {
    const redis = getRedisClient();
    if (!redis) return false;

    const subscriptionsKey = `push:subscriptions:${userId}`;
    const existing = await redis.get(subscriptionsKey);

    if (existing) {
        let subscriptions = JSON.parse(existing);
        subscriptions = subscriptions.filter(s => s.endpoint !== endpoint);
        await redis.set(subscriptionsKey, JSON.stringify(subscriptions));
    }

    logger.info(`Push subscription removed for user ${userId}`);
    return true;
}

/**
 * Get user notifications
 */
async function getUserNotifications(userId, options = {}) {
    const {
        page = 1,
        limit = 20,
        unreadOnly = false
    } = options;

    const where = { userId };
    if (unreadOnly) {
        where.isRead = false;
    }

    const { count, rows: notifications } = await Notification.findAndCountAll({
        where,
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: (page - 1) * limit
    });

    return {
        notifications,
        total: count,
        page: parseInt(page),
        totalPages: Math.ceil(count / limit)
    };
}

/**
 * Mark notification as read
 */
async function markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
        where: { id: notificationId, userId }
    });

    if (!notification) {
        throw new Error('Notification not found');
    }

    await notification.update({ isRead: true, readAt: new Date() });
    return notification;
}

/**
 * Mark all notifications as read
 */
async function markAllAsRead(userId) {
    await Notification.update(
        { isRead: true, readAt: new Date() },
        { where: { userId, isRead: false } }
    );

    return true;
}

/**
 * Delete notification
 */
async function deleteNotification(notificationId, userId) {
    const deleted = await Notification.destroy({
        where: { id: notificationId, userId }
    });

    return deleted > 0;
}

/**
 * Get unread notification count
 */
async function getUnreadCount(userId) {
    const count = await Notification.count({
        where: { userId, isRead: false }
    });

    return count;
}

/**
 * Send shipment status notification
 */
async function sendShipmentNotification(shipment, status, recipientUserId) {
    const typeMap = {
        picked_up: NOTIFICATION_TYPES.SHIPMENT_PICKED_UP,
        in_transit: NOTIFICATION_TYPES.SHIPMENT_IN_TRANSIT,
        out_for_delivery: NOTIFICATION_TYPES.SHIPMENT_OUT_FOR_DELIVERY,
        delivered: NOTIFICATION_TYPES.SHIPMENT_DELIVERED,
        delayed: NOTIFICATION_TYPES.SHIPMENT_DELAYED
    };

    const type = typeMap[status] || NOTIFICATION_TYPES.SHIPMENT_IN_TRANSIT;
    const title = `Shipment ${shipment.trackingNumber} - ${status.replace(/_/g, ' ').toUpperCase()}`;
    const message = `Your shipment ${shipment.trackingNumber} status has been updated to: ${status.replace(/_/g, ' ')}`;

    return sendNotification(recipientUserId, {
        type,
        title,
        message,
        data: {
            shipmentId: shipment.id,
            trackingNumber: shipment.trackingNumber,
            status
        },
        channels: [CHANNELS.IN_APP, CHANNELS.EMAIL, CHANNELS.SMS],
        smsMessage: smsTemplates[`shipment${status.charAt(0).toUpperCase() + status.slice(1).replace(/_./g, m => m[1].toUpperCase())}`]?.(shipment.trackingNumber)
    });
}

/**
 * Send bulk notification
 */
async function sendBulkNotification(userIds, options) {
    const results = await Promise.allSettled(
        userIds.map(userId => sendNotification(userId, options))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Bulk notification sent: ${successful} successful, ${failed} failed`);

    return { successful, failed };
}

/**
 * Clean up old notifications
 */
async function cleanupOldNotifications(daysOld = 30) {
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    const deleted = await Notification.destroy({
        where: {
            createdAt: { [Op.lt]: cutoffDate },
            isRead: true
        }
    });

    logger.info(`Cleaned up ${deleted} old notifications`);
    return deleted;
}

module.exports = {
    NOTIFICATION_TYPES,
    CHANNELS,
    createNotification,
    sendNotification,
    sendPushNotification,
    subscribeToPush,
    unsubscribeFromPush,
    getUserNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    getUnreadCount,
    sendShipmentNotification,
    sendBulkNotification,
    cleanupOldNotifications
};
