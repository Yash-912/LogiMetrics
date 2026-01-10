/**
 * Socket Handlers Index
 * Initializes and exports all socket event handlers
 */

const trackingSocket = require('./tracking.socket');
const notificationSocket = require('./notification.socket');
const shipmentSocket = require('./shipment.socket');
const chatSocket = require('./chat.socket');
const dashboardSocket = require('./dashboard.socket');
const logger = require('../utils/logger.util');

/**
 * Initialize all socket handlers
 * @param {Object} io - Socket.io server instance
 */
function initializeSocketHandlers(io) {
    io.on('connection', (socket) => {
        logger.debug(`Socket handlers initialized for: ${socket.id}`);

        // Initialize tracking handlers
        trackingSocket.initialize(io, socket);

        // Initialize notification handlers
        notificationSocket.initialize(io, socket);

        // Initialize shipment handlers
        shipmentSocket.initialize(io, socket);

        // Initialize chat handlers
        chatSocket.initialize(io, socket);

        // Initialize dashboard handlers
        dashboardSocket.initialize(io, socket);
    });

    logger.info('All socket handlers initialized');
}

/**
 * Get namespace for specific functionality
 */
function createNamespaces(io) {
    // Tracking namespace for GPS updates
    const trackingNamespace = io.of('/tracking');
    trackingSocket.initializeNamespace(trackingNamespace);

    // Notifications namespace
    const notificationNamespace = io.of('/notifications');
    notificationSocket.initializeNamespace(notificationNamespace);

    // Dashboard namespace for metrics
    const dashboardNamespace = io.of('/dashboard');
    dashboardSocket.initializeNamespace(dashboardNamespace);

    return {
        tracking: trackingNamespace,
        notifications: notificationNamespace,
        dashboard: dashboardNamespace
    };
}

module.exports = {
    initializeSocketHandlers,
    createNamespaces,
    trackingSocket,
    notificationSocket,
    shipmentSocket,
    chatSocket,
    dashboardSocket
};
