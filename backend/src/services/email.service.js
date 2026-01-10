/**
 * Email Service
 * Email template rendering and SendGrid integration
 */

const { sendEmail, sendBulkEmail, emailTemplates } = require('../config/email');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger.util');

/**
 * Send templated email
 */
async function sendTemplatedEmail(to, templateName, data, options = {}) {
    const template = emailTemplates[templateName];
    if (!template) {
        throw new Error(`Email template not found: ${templateName}`);
    }

    const { subject, html } = typeof template === 'function' ? template(data) : template;

    await sendEmail({
        to,
        subject: options.subject || subject,
        html,
        ...options
    });

    logger.info(`Templated email sent: ${templateName} to ${to}`);
    return true;
}

/**
 * Send welcome email
 */
async function sendWelcomeEmail(user) {
    return sendTemplatedEmail(user.email, 'welcome', user.name || user.firstName);
}

/**
 * Send password reset email
 */
async function sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    return sendTemplatedEmail(email, 'passwordReset', resetUrl);
}

/**
 * Send shipment created notification
 */
async function sendShipmentCreatedEmail(email, shipment) {
    return sendTemplatedEmail(email, 'shipmentCreated', shipment);
}

/**
 * Send shipment status update email
 */
async function sendShipmentStatusEmail(email, shipment, status) {
    return sendTemplatedEmail(email, 'shipmentStatusUpdate', shipment, status);
}

/**
 * Send invoice email
 */
async function sendInvoiceEmail(email, invoice) {
    return sendTemplatedEmail(email, 'invoiceGenerated', invoice);
}

/**
 * Send payment received email
 */
async function sendPaymentReceivedEmail(email, payment) {
    return sendTemplatedEmail(email, 'paymentReceived', payment);
}

/**
 * Send maintenance reminder email
 */
async function sendMaintenanceReminderEmail(email, vehicle, maintenanceDate) {
    return sendTemplatedEmail(email, 'maintenanceReminder', vehicle, maintenanceDate);
}

/**
 * Send custom email
 */
async function sendCustomEmail(to, subject, htmlContent, options = {}) {
    await sendEmail({
        to,
        subject,
        html: htmlContent,
        ...options
    });

    logger.info(`Custom email sent to ${to}: ${subject}`);
    return true;
}

/**
 * Send bulk templated emails
 */
async function sendBulkTemplatedEmails(recipients, templateName, getData) {
    const template = emailTemplates[templateName];
    if (!template) {
        throw new Error(`Email template not found: ${templateName}`);
    }

    const results = await Promise.allSettled(
        recipients.map(async (recipient) => {
            const data = typeof getData === 'function' ? getData(recipient) : getData;
            const { subject, html } = typeof template === 'function' ? template(data) : template;

            return sendEmail({
                to: recipient.email || recipient,
                subject,
                html
            });
        })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    logger.info(`Bulk templated email sent: ${successful} successful, ${failed} failed`);
    return { successful, failed };
}

/**
 * Queue email for later sending
 */
async function queueEmail(emailData, sendAt) {
    const emailId = `email:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
    const queueData = {
        ...emailData,
        sendAt: sendAt || new Date(),
        status: 'queued',
        createdAt: new Date()
    };

    await setCache(emailId, queueData, 86400 * 7); // 7 days TTL

    // Add to queue list
    const queueKey = 'email:queue';
    const queue = await getCache(queueKey) || [];
    queue.push(emailId);
    await setCache(queueKey, queue, 86400 * 7);

    logger.info(`Email queued: ${emailId}`);
    return emailId;
}

/**
 * Process email queue
 */
async function processEmailQueue() {
    const queueKey = 'email:queue';
    const queue = await getCache(queueKey) || [];

    const now = new Date();
    const processed = [];

    for (const emailId of queue) {
        const emailData = await getCache(emailId);
        if (!emailData) continue;

        if (new Date(emailData.sendAt) <= now && emailData.status === 'queued') {
            try {
                await sendEmail({
                    to: emailData.to,
                    subject: emailData.subject,
                    html: emailData.html
                });
                emailData.status = 'sent';
                emailData.sentAt = new Date();
                processed.push(emailId);
            } catch (err) {
                emailData.status = 'failed';
                emailData.error = err.message;
                logger.error(`Email send failed: ${emailId}`, err);
            }
            await setCache(emailId, emailData, 86400);
        }
    }

    // Remove processed from queue
    const remainingQueue = queue.filter(id => !processed.includes(id));
    await setCache(queueKey, remainingQueue, 86400 * 7);

    logger.info(`Email queue processed: ${processed.length} emails sent`);
    return { processed: processed.length };
}

/**
 * Validate email address
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Get email templates list
 */
function getAvailableTemplates() {
    return Object.keys(emailTemplates);
}

module.exports = {
    sendTemplatedEmail,
    sendWelcomeEmail,
    sendPasswordResetEmail,
    sendShipmentCreatedEmail,
    sendShipmentStatusEmail,
    sendInvoiceEmail,
    sendPaymentReceivedEmail,
    sendMaintenanceReminderEmail,
    sendCustomEmail,
    sendBulkTemplatedEmails,
    queueEmail,
    processEmailQueue,
    validateEmail,
    getAvailableTemplates
};
