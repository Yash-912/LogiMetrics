/**
 * SMS Service Configuration
 * Using Twilio for SMS delivery
 */

const twilio = require('twilio');
const logger = require('../utils/logger.util');

// Initialize Twilio client (only if credentials are provided)
let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
} else {
  logger.warn('Twilio credentials not configured - SMS features will be disabled');
}

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER;

/**
 * Send SMS
 */
async function sendSMS(to, message) {
  if (!client) {
    logger.warn('SMS not sent - Twilio not configured');
    return { sid: null, status: 'disabled' };
  }
  try {
    const result = await client.messages.create({
      body: message,
      from: FROM_NUMBER,
      to
    });

    logger.info(`SMS sent to ${to}: ${result.sid}`);
    return result;
  } catch (error) {
    logger.error('SMS send error:', error);
    throw error;
  }
}

/**
 * Send bulk SMS
 */
async function sendBulkSMS(recipients, message) {
  try {
    const results = await Promise.allSettled(
      recipients.map(recipient => sendSMS(recipient, message))
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Bulk SMS sent: ${successful} successful, ${failed} failed`);
    return { successful, failed, results };
  } catch (error) {
    logger.error('Bulk SMS send error:', error);
    throw error;
  }
}

/**
 * SMS templates
 */
const smsTemplates = {
  welcome: (name) => 
    `Welcome to LogiMetrics, ${name}! Your logistics management is now simplified. Login to get started.`,

  otpVerification: (otp) => 
    `Your LogiMetrics OTP is: ${otp}. Valid for 10 minutes. Do not share with anyone.`,

  shipmentCreated: (trackingId) => 
    `Your shipment ${trackingId} has been created. Track it at: ${process.env.FRONTEND_URL}/track/${trackingId}`,

  shipmentPickedUp: (trackingId) => 
    `Your shipment ${trackingId} has been picked up and is on its way!`,

  shipmentOutForDelivery: (trackingId) => 
    `Your shipment ${trackingId} is out for delivery. Expected today!`,

  shipmentDelivered: (trackingId) => 
    `Your shipment ${trackingId} has been delivered. Thank you for using LogiMetrics!`,

  deliveryAssigned: (driverName, shipmentCount) => 
    `Hi ${driverName}, you have ${shipmentCount} new delivery(ies) assigned. Check your app for details.`,

  paymentReminder: (invoiceNumber, amount, dueDate) => 
    `Reminder: Invoice ${invoiceNumber} for ₹${amount} is due on ${dueDate}. Pay now to avoid late fees.`,

  maintenanceReminder: (vehicleNumber, date) => 
    `Reminder: Vehicle ${vehicleNumber} is due for maintenance on ${date}. Please schedule accordingly.`,

  delayAlert: (trackingId, newEta) => 
    `Alert: Your shipment ${trackingId} is delayed. New ETA: ${newEta}. We apologize for the inconvenience.`
};

module.exports = {
  sendSMS,
  sendBulkSMS,
  smsTemplates
};
