/**
 * Push Notification Configuration
 * Web Push and Firebase Cloud Messaging setup
 */

const webpush = require('web-push');
const logger = require('../utils/logger.util');

// Initialize Web Push (only if VAPID keys are provided)
let webPushEnabled = false;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:support@logimetrics.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  webPushEnabled = true;
} else {
  logger.warn('VAPID keys not configured - Web Push features will be disabled');
}

/**
 * Send web push notification
 * @param {Object} subscription - Push subscription object
 * @param {Object} payload - Notification payload
 */
async function sendWebPush(subscription, payload) {
  if (!webPushEnabled) {
    logger.warn('Web Push not sent - VAPID keys not configured');
    return { success: false, status: 'disabled' };
  }

  try {
    const result = await webpush.sendNotification(
      subscription,
      JSON.stringify(payload)
    );
    logger.info('Web push notification sent successfully');
    return { success: true, result };
  } catch (error) {
    logger.error('Web push notification error:', error);
    
    // Handle expired subscriptions
    if (error.statusCode === 410) {
      return { success: false, expired: true, error };
    }
    
    throw error;
  }
}

/**
 * Send push notification to multiple subscriptions
 * @param {Array} subscriptions - Array of push subscription objects
 * @param {Object} payload - Notification payload
 */
async function sendBulkWebPush(subscriptions, payload) {
  if (!webPushEnabled) {
    logger.warn('Bulk Web Push not sent - VAPID keys not configured');
    return { successful: 0, failed: 0, expired: [] };
  }

  const results = await Promise.allSettled(
    subscriptions.map(sub => sendWebPush(sub, payload))
  );

  const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
  const failed = results.filter(r => r.status === 'rejected' || !r.value?.success).length;
  const expired = results
    .filter(r => r.status === 'fulfilled' && r.value.expired)
    .map((r, i) => subscriptions[i]);

  logger.info(`Bulk push: ${successful} sent, ${failed} failed, ${expired.length} expired`);

  return { successful, failed, expired };
}

/**
 * Create notification payload
 * @param {Object} options - Notification options
 */
function createNotificationPayload({
  title,
  body,
  icon = '/icons/notification-icon.png',
  badge = '/icons/badge-icon.png',
  tag = null,
  data = {},
  actions = [],
  requireInteraction = false,
  silent = false
}) {
  return {
    notification: {
      title,
      body,
      icon,
      badge,
      tag: tag || `notification-${Date.now()}`,
      data,
      actions,
      requireInteraction,
      silent,
      timestamp: Date.now()
    }
  };
}

/**
 * Standard notification types
 */
const notificationTypes = {
  SHIPMENT_UPDATE: 'shipment_update',
  DELIVERY_COMPLETE: 'delivery_complete',
  PAYMENT_RECEIVED: 'payment_received',
  DRIVER_ASSIGNED: 'driver_assigned',
  VEHICLE_ALERT: 'vehicle_alert',
  SYSTEM_ALERT: 'system_alert',
  MESSAGE: 'message'
};

/**
 * Create typed notification payload
 */
function createTypedNotification(type, data) {
  const templates = {
    [notificationTypes.SHIPMENT_UPDATE]: {
      title: 'Shipment Update',
      body: `Shipment ${data.trackingNumber} status changed to ${data.status}`,
      icon: '/icons/shipment-icon.png'
    },
    [notificationTypes.DELIVERY_COMPLETE]: {
      title: 'Delivery Complete',
      body: `Shipment ${data.trackingNumber} has been delivered`,
      icon: '/icons/delivery-icon.png'
    },
    [notificationTypes.PAYMENT_RECEIVED]: {
      title: 'Payment Received',
      body: `Payment of ₹${data.amount} received for invoice ${data.invoiceNumber}`,
      icon: '/icons/payment-icon.png'
    },
    [notificationTypes.DRIVER_ASSIGNED]: {
      title: 'Driver Assigned',
      body: `${data.driverName} has been assigned to your shipment`,
      icon: '/icons/driver-icon.png'
    },
    [notificationTypes.VEHICLE_ALERT]: {
      title: 'Vehicle Alert',
      body: data.message || 'Vehicle requires attention',
      icon: '/icons/vehicle-icon.png',
      requireInteraction: true
    },
    [notificationTypes.SYSTEM_ALERT]: {
      title: 'System Alert',
      body: data.message,
      icon: '/icons/alert-icon.png',
      requireInteraction: true
    },
    [notificationTypes.MESSAGE]: {
      title: data.senderName || 'New Message',
      body: data.message,
      icon: '/icons/message-icon.png'
    }
  };

  const template = templates[type] || templates[notificationTypes.SYSTEM_ALERT];
  
  return createNotificationPayload({
    ...template,
    data: { type, ...data }
  });
}

/**
 * Get VAPID public key for client subscription
 */
function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/**
 * Check if push notifications are enabled
 */
function isPushEnabled() {
  return webPushEnabled;
}

module.exports = {
  sendWebPush,
  sendBulkWebPush,
  createNotificationPayload,
  createTypedNotification,
  notificationTypes,
  getVapidPublicKey,
  isPushEnabled
};
