/**
 * Push Notification Configuration (DEPRECATED)
 * Web push notifications have been removed from this project.
 * Use email notifications via SendGrid instead.
 */

const logger = require("../utils/logger.util");

logger.warn("Web push notifications (VAPID) are not available");

// Stub exports for backwards compatibility
module.exports = {
  sendPushNotification: () => {
    throw new Error("Push notifications disabled");
  },
  sendBulkPushNotifications: () => {
    throw new Error("Push notifications disabled");
  },
  getVapidPublicKey: () => null,
  isConfigured: false,
  VAPID_PUBLIC_KEY: "",
};
