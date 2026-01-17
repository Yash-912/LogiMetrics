/**
 * Notification Socket Handler
 * Live notification delivery
 */

const { Notification } = require('../models/mongodb');
const logger = require('../utils/logger.util');

/**
 * Initialize notification socket handlers for a connection
 */
function initialize(io, socket) {
    // Mark notification as read
    socket.on('notification:read', async (notificationId) => {
        try {
            if (!socket.user) {
                socket.emit('notification:error', { message: 'Authentication required' });
                return;
            }

            await Notification.findOneAndUpdate(
                { _id: notificationId, userId: socket.user.id },
                { isRead: true, readAt: new Date() }
            );

            socket.emit('notification:read:success', { notificationId });

            // Emit updated unread count
            const unreadCount = await Notification.countDocuments({
                userId: socket.user.id,
                isRead: false
            });
            socket.emit('notification:unread_count', { count: unreadCount });
        } catch (error) {
            logger.error('Mark notification read error:', error);
            socket.emit('notification:error', { message: 'Failed to mark as read' });
        }
    });

    // Mark all notifications as read
    socket.on('notification:read_all', async () => {
        try {
            if (!socket.user) {
                socket.emit('notification:error', { message: 'Authentication required' });
                return;
            }

            await Notification.updateMany(
                { userId: socket.user.id, isRead: false },
                { isRead: true, readAt: new Date() }
            );

            socket.emit('notification:read_all:success');
            socket.emit('notification:unread_count', { count: 0 });
        } catch (error) {
            logger.error('Mark all notifications read error:', error);
            socket.emit('notification:error', { message: 'Failed to mark all as read' });
        }
    });

    // Get unread count
    socket.on('notification:get_unread_count', async () => {
        try {
            if (!socket.user) {
                socket.emit('notification:unread_count', { count: 0 });
                return;
            }

            const count = await Notification.countDocuments({
                userId: socket.user.id,
                isRead: false
            });

            socket.emit('notification:unread_count', { count });
        } catch (error) {
            logger.error('Get unread count error:', error);
        }
    });

    // Get recent notifications
    socket.on('notification:get_recent', async (limit = 10) => {
        try {
            if (!socket.user) {
                socket.emit('notification:recent', { notifications: [] });
                return;
            }

            const notifications = await Notification.find({ userId: socket.user.id })
                .sort({ createdAt: -1 })
                .limit(limit);

            socket.emit('notification:recent', { notifications });
        } catch (error) {
            logger.error('Get recent notifications error:', error);
        }
    });

    // Delete notification
    socket.on('notification:delete', async (notificationId) => {
        try {
            if (!socket.user) {
                socket.emit('notification:error', { message: 'Authentication required' });
                return;
            }

            await Notification.findOneAndDelete({
                _id: notificationId,
                userId: socket.user.id
            });

            socket.emit('notification:delete:success', { notificationId });
        } catch (error) {
            logger.error('Delete notification error:', error);
            socket.emit('notification:error', { message: 'Failed to delete notification' });
        }
    });

    // Subscribe to notification updates
    socket.on('notification:subscribe', () => {
        if (socket.user) {
            socket.join(`notifications:${socket.user.id}`);
            logger.debug(`Socket ${socket.id} subscribed to notifications`);
        }
    });

    // Send initial unread count on connection
    if (socket.user) {
        sendUnreadCount(socket);
    }
}

/**
 * Initialize namespace for notifications
 */
function initializeNamespace(namespace) {
    namespace.use((socket, next) => {
        // Require authentication for notification namespace
        if (!socket.user) {
            return next(new Error('Authentication required'));
        }
        next();
    });

    namespace.on('connection', (socket) => {
        logger.info(`Notification namespace connection: ${socket.id}`);
        socket.join(`user:${socket.user.id}`);
    });
}

// Helper functions

async function sendUnreadCount(socket) {
    try {
        const count = await Notification.countDocuments({
            userId: socket.user.id,
            isRead: false
        });
        socket.emit('notification:unread_count', { count });
    } catch (error) {
        logger.error('Send unread count error:', error);
    }
}

// Emit functions for external use

/**
 * Send notification to a specific user
 */
function emitToUser(io, userId, notification) {
    io.to(`user:${userId}`).emit('notification:new', notification);
    io.to(`notifications:${userId}`).emit('notification:new', notification);
}

/**
 * Send notification to all users in a company
 */
function emitToCompany(io, companyId, notification) {
    io.to(`company:${companyId}`).emit('notification:new', notification);
}

/**
 * Broadcast system-wide notification
 */
function emitBroadcast(io, notification) {
    io.emit('notification:broadcast', notification);
}

/**
 * Send notification with specific type
 */
function emitTypedNotification(io, userId, type, data) {
    const notification = {
        type,
        data,
        timestamp: new Date()
    };

    io.to(`user:${userId}`).emit(`notification:${type}`, notification);
}

// Pre-defined notification emitters

function emitShipmentUpdate(io, userId, shipment) {
    emitTypedNotification(io, userId, 'shipment_update', {
        shipmentId: shipment.id,
        trackingId: shipment.trackingId,
        status: shipment.status,
        message: `Shipment ${shipment.trackingId} status updated to ${shipment.status}`
    });
}

function emitPaymentReceived(io, userId, payment) {
    emitTypedNotification(io, userId, 'payment_received', {
        paymentId: payment.id,
        amount: payment.amount,
        message: `Payment of ₹${payment.amount} received`
    });
}

function emitDriverAssigned(io, driverId, shipment) {
    emitTypedNotification(io, driverId, 'driver_assigned', {
        shipmentId: shipment.id,
        trackingId: shipment.trackingId,
        message: `New shipment assigned: ${shipment.trackingId}`
    });
}

function emitMaintenanceReminder(io, userId, vehicle) {
    emitTypedNotification(io, userId, 'maintenance_reminder', {
        vehicleId: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        message: `Maintenance due for ${vehicle.registrationNumber}`
    });
}

module.exports = {
    initialize,
    initializeNamespace,
    emitToUser,
    emitToCompany,
    emitBroadcast,
    emitTypedNotification,
    emitShipmentUpdate,
    emitPaymentReceived,
    emitDriverAssigned,
    emitMaintenanceReminder
};
