/**
 * Push Notification Configuration
 * Web Push notifications using VAPID
 */

const logger = require('../utils/logger.util');

// VAPID keys for web push (placeholder - generate actual keys for production)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@logimetrics.com';

// Check if web push is configured
const isConfigured = !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (!isConfigured) {
    logger.warn('VAPID keys not configured - web push notifications will be disabled');
}

/**
 * Initialize web push with VAPID keys
 */
let webpush = null;
try {
    webpush = require('web-push');
    if (isConfigured) {
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        logger.info('Web push notifications initialized successfully');
    }
} catch (error) {
    logger.warn('web-push module not installed - push notifications disabled');
}

/**
 * Send push notification to a subscription
 * @param {Object} subscription - Push subscription object
 * @param {Object} payload - Notification payload
 * @returns {Promise}
 */
async function sendPushNotification(subscription, payload) {
    if (!webpush || !isConfigured) {
        logger.warn('Push notifications not configured - skipping');
        return null;
    }

    try {
        const result = await webpush.sendNotification(
            subscription,
            JSON.stringify(payload)
        );
        logger.info('Push notification sent successfully');
        return result;
    } catch (error) {
        logger.error('Push notification error:', error);
        throw error;
    }
}

/**
 * Send push notification to multiple subscriptions
 * @param {Array} subscriptions - Array of push subscriptions
 * @param {Object} payload - Notification payload
 * @returns {Promise<Object>}
 */
async function sendBulkPushNotifications(subscriptions, payload) {
    if (!webpush || !isConfigured) {
        logger.warn('Push notifications not configured - skipping bulk send');
        return { successful: 0, failed: 0, results: [] };
    }

    const results = await Promise.allSettled(
        subscriptions.map(sub => sendPushNotification(sub, payload))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Bulk push notifications: ${successful} successful, ${failed} failed`);
    return { successful, failed, results };
}

/**
 * Get VAPID public key for client-side subscription
 */
function getVapidPublicKey() {
    return VAPID_PUBLIC_KEY;
}

module.exports = {
    sendPushNotification,
    sendBulkPushNotifications,
    getVapidPublicKey,
    isConfigured,
    VAPID_PUBLIC_KEY
};
