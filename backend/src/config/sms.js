/**
 * SMS Service Configuration (DEPRECATED)
 * SMS features have been removed from this project.
 * Use email notifications via SendGrid instead.
 */

const logger = require("../utils/logger.util");

logger.warn("SMS service (Twilio) is not available");

// Stub exports for backwards compatibility
module.exports = {
  sendSMS: () => {
    throw new Error("SMS features disabled");
  },
  sendBulkSMS: () => {
    throw new Error("SMS features disabled");
  },
  smsTemplates: {},
};
