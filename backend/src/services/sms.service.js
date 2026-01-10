/**
 * SMS Service
 * SMS sending, OTP generation, and Twilio integration
 */

const { sendSMS, sendBulkSMS, smsTemplates } = require('../config/sms');
const { getCache, setCache, deleteCache } = require('../config/redis');
const logger = require('../utils/logger.util');

/**
 * Send templated SMS
 */
async function sendTemplatedSMS(phone, templateName, ...args) {
    const template = smsTemplates[templateName];
    if (!template) {
        throw new Error(`SMS template not found: ${templateName}`);
    }

    const message = typeof template === 'function' ? template(...args) : template;
    await sendSMS(phone, message);

    logger.info(`Templated SMS sent: ${templateName} to ${phone}`);
    return true;
}

/**
 * Generate and send OTP
 */
async function sendOTP(phone, purpose = 'verification') {
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store OTP in Redis with 10-minute expiry
    const otpKey = `otp:${purpose}:${phone}`;
    await setCache(otpKey, { otp, attempts: 0, createdAt: new Date() }, 600);

    // Send SMS
    const message = smsTemplates.otpVerification(otp);
    await sendSMS(phone, message);

    logger.info(`OTP sent to ${phone} for ${purpose}`);
    return true;
}

/**
 * Verify OTP
 */
async function verifyOTP(phone, otp, purpose = 'verification') {
    const otpKey = `otp:${purpose}:${phone}`;
    const stored = await getCache(otpKey);

    if (!stored) {
        return { valid: false, error: 'OTP expired or not found' };
    }

    if (stored.attempts >= 3) {
        await deleteCache(otpKey);
        return { valid: false, error: 'Maximum attempts exceeded' };
    }

    if (stored.otp !== otp) {
        stored.attempts += 1;
        await setCache(otpKey, stored, 600);
        return { valid: false, error: 'Invalid OTP' };
    }

    // OTP is valid, delete it
    await deleteCache(otpKey);
    logger.info(`OTP verified for ${phone}`);
    return { valid: true };
}

/**
 * Send welcome SMS
 */
async function sendWelcomeSMS(phone, name) {
    return sendTemplatedSMS(phone, 'welcome', name);
}

/**
 * Send shipment created SMS
 */
async function sendShipmentCreatedSMS(phone, trackingId) {
    return sendTemplatedSMS(phone, 'shipmentCreated', trackingId);
}

/**
 * Send shipment picked up SMS
 */
async function sendShipmentPickedUpSMS(phone, trackingId) {
    return sendTemplatedSMS(phone, 'shipmentPickedUp', trackingId);
}

/**
 * Send shipment out for delivery SMS
 */
async function sendShipmentOutForDeliverySMS(phone, trackingId) {
    return sendTemplatedSMS(phone, 'shipmentOutForDelivery', trackingId);
}

/**
 * Send shipment delivered SMS
 */
async function sendShipmentDeliveredSMS(phone, trackingId) {
    return sendTemplatedSMS(phone, 'shipmentDelivered', trackingId);
}

/**
 * Send delivery assigned SMS to driver
 */
async function sendDeliveryAssignedSMS(phone, driverName, shipmentCount) {
    return sendTemplatedSMS(phone, 'deliveryAssigned', driverName, shipmentCount);
}

/**
 * Send payment reminder SMS
 */
async function sendPaymentReminderSMS(phone, invoiceNumber, amount, dueDate) {
    return sendTemplatedSMS(phone, 'paymentReminder', invoiceNumber, amount, dueDate);
}

/**
 * Send maintenance reminder SMS
 */
async function sendMaintenanceReminderSMS(phone, vehicleNumber, date) {
    return sendTemplatedSMS(phone, 'maintenanceReminder', vehicleNumber, date);
}

/**
 * Send delay alert SMS
 */
async function sendDelayAlertSMS(phone, trackingId, newEta) {
    return sendTemplatedSMS(phone, 'delayAlert', trackingId, newEta);
}

/**
 * Send custom SMS
 */
async function sendCustomSMS(phone, message) {
    await sendSMS(phone, message);
    logger.info(`Custom SMS sent to ${phone}`);
    return true;
}

/**
 * Send bulk SMS
 */
async function sendBulkSMSMessage(phones, message) {
    const result = await sendBulkSMS(phones, message);
    logger.info(`Bulk SMS sent to ${phones.length} recipients`);
    return result;
}

/**
 * Validate phone number (basic validation)
 */
function validatePhoneNumber(phone) {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Check if it's between 10 and 15 digits (international format)
    return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Format phone number to E.164 format
 */
function formatPhoneNumber(phone, countryCode = '+91') {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) {
        return countryCode + cleaned.slice(1);
    }
    if (!cleaned.startsWith(countryCode.replace('+', ''))) {
        return countryCode + cleaned;
    }
    return '+' + cleaned;
}

/**
 * Get available SMS templates
 */
function getAvailableTemplates() {
    return Object.keys(smsTemplates);
}

/**
 * Queue SMS for later sending
 */
async function queueSMS(phone, message, sendAt) {
    const smsId = `sms:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const queueData = {
        phone,
        message,
        sendAt: sendAt || new Date(),
        status: 'queued',
        createdAt: new Date()
    };

    await setCache(smsId, queueData, 86400 * 7);

    // Add to queue
    const queueKey = 'sms:queue';
    const queue = await getCache(queueKey) || [];
    queue.push(smsId);
    await setCache(queueKey, queue, 86400 * 7);

    logger.info(`SMS queued: ${smsId}`);
    return smsId;
}

/**
 * Process SMS queue
 */
async function processSMSQueue() {
    const queueKey = 'sms:queue';
    const queue = await getCache(queueKey) || [];

    const now = new Date();
    const processed = [];

    for (const smsId of queue) {
        const smsData = await getCache(smsId);
        if (!smsData) continue;

        if (new Date(smsData.sendAt) <= now && smsData.status === 'queued') {
            try {
                await sendSMS(smsData.phone, smsData.message);
                smsData.status = 'sent';
                smsData.sentAt = new Date();
                processed.push(smsId);
            } catch (err) {
                smsData.status = 'failed';
                smsData.error = err.message;
                logger.error(`SMS send failed: ${smsId}`, err);
            }
            await setCache(smsId, smsData, 86400);
        }
    }

    const remainingQueue = queue.filter(id => !processed.includes(id));
    await setCache(queueKey, remainingQueue, 86400 * 7);

    logger.info(`SMS queue processed: ${processed.length} messages sent`);
    return { processed: processed.length };
}

module.exports = {
    sendTemplatedSMS,
    sendOTP,
    verifyOTP,
    sendWelcomeSMS,
    sendShipmentCreatedSMS,
    sendShipmentPickedUpSMS,
    sendShipmentOutForDeliverySMS,
    sendShipmentDeliveredSMS,
    sendDeliveryAssignedSMS,
    sendPaymentReminderSMS,
    sendMaintenanceReminderSMS,
    sendDelayAlertSMS,
    sendCustomSMS,
    sendBulkSMSMessage,
    validatePhoneNumber,
    formatPhoneNumber,
    getAvailableTemplates,
    queueSMS,
    processSMSQueue
};
