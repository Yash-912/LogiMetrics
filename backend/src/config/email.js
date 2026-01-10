/**
 * Email Service Configuration
 * Using SendGrid for email delivery
 */

const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger.util');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@logimetrics.com';
const FROM_NAME = 'LogiMetrics';

/**
 * Send single email
 */
async function sendEmail({ to, subject, text, html, attachments = [] }) {
  try {
    const msg = {
      to,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject,
      text,
      html,
      attachments
    };

    await sgMail.send(msg);
    logger.info(`Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    logger.error('Email send error:', error.response?.body || error);
    throw error;
  }
}

/**
 * Send email to multiple recipients
 */
async function sendBulkEmail({ recipients, subject, text, html }) {
  try {
    const messages = recipients.map(recipient => ({
      to: recipient,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      subject,
      text,
      html
    }));

    await sgMail.send(messages);
    logger.info(`Bulk email sent to ${recipients.length} recipients: ${subject}`);
    return true;
  } catch (error) {
    logger.error('Bulk email send error:', error.response?.body || error);
    throw error;
  }
}

/**
 * Email templates
 */
const emailTemplates = {
  welcome: (userName) => ({
    subject: 'Welcome to LogiMetrics!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Welcome to LogiMetrics!</h1>
        <p>Hi ${userName},</p>
        <p>Thank you for joining LogiMetrics. We're excited to have you on board!</p>
        <p>With LogiMetrics, you can:</p>
        <ul>
          <li>Track shipments in real-time</li>
          <li>Manage your fleet efficiently</li>
          <li>Get predictive insights</li>
          <li>Automate your logistics workflows</li>
        </ul>
        <p>Get started by logging into your dashboard.</p>
        <p>Best regards,<br>The LogiMetrics Team</p>
      </div>
    `
  }),

  passwordReset: (resetUrl) => ({
    subject: 'Password Reset Request - LogiMetrics',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Password Reset Request</h1>
        <p>You requested a password reset for your LogiMetrics account.</p>
        <p>Click the button below to reset your password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The LogiMetrics Team</p>
      </div>
    `
  }),

  shipmentCreated: (shipment) => ({
    subject: `Shipment Created - ${shipment.trackingId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Shipment Created</h1>
        <p>Your shipment has been created successfully!</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Tracking ID:</strong> ${shipment.trackingId}</p>
          <p><strong>Origin:</strong> ${shipment.origin}</p>
          <p><strong>Destination:</strong> ${shipment.destination}</p>
          <p><strong>Estimated Delivery:</strong> ${shipment.estimatedDelivery}</p>
        </div>
        <p>Track your shipment: <a href="${process.env.FRONTEND_URL}/track/${shipment.trackingId}">Click here</a></p>
        <p>Best regards,<br>The LogiMetrics Team</p>
      </div>
    `
  }),

  shipmentStatusUpdate: (shipment, status) => ({
    subject: `Shipment Update - ${shipment.trackingId} - ${status}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Shipment Status Update</h1>
        <p>Your shipment status has been updated!</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Tracking ID:</strong> ${shipment.trackingId}</p>
          <p><strong>New Status:</strong> <span style="color: #059669; font-weight: bold;">${status}</span></p>
        </div>
        <p>Track your shipment: <a href="${process.env.FRONTEND_URL}/track/${shipment.trackingId}">Click here</a></p>
        <p>Best regards,<br>The LogiMetrics Team</p>
      </div>
    `
  }),

  invoiceGenerated: (invoice) => ({
    subject: `Invoice Generated - ${invoice.invoiceNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2563eb;">Invoice Generated</h1>
        <p>Your invoice has been generated.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Amount:</strong> ₹${invoice.total}</p>
          <p><strong>Due Date:</strong> ${invoice.dueDate}</p>
        </div>
        <p>View and pay your invoice in your dashboard.</p>
        <p>Best regards,<br>The LogiMetrics Team</p>
      </div>
    `
  }),

  paymentReceived: (payment) => ({
    subject: `Payment Received - ${payment.transactionId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #059669;">Payment Received</h1>
        <p>We've received your payment!</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Transaction ID:</strong> ${payment.transactionId}</p>
          <p><strong>Amount:</strong> ₹${payment.amount}</p>
          <p><strong>Date:</strong> ${payment.date}</p>
        </div>
        <p>Thank you for your payment!</p>
        <p>Best regards,<br>The LogiMetrics Team</p>
      </div>
    `
  }),

  maintenanceReminder: (vehicle, maintenanceDate) => ({
    subject: `Maintenance Reminder - ${vehicle.registrationNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #f59e0b;">Maintenance Reminder</h1>
        <p>Your vehicle is due for maintenance!</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Vehicle:</strong> ${vehicle.registrationNumber}</p>
          <p><strong>Type:</strong> ${vehicle.type}</p>
          <p><strong>Scheduled Date:</strong> ${maintenanceDate}</p>
        </div>
        <p>Please schedule the maintenance to keep your fleet in optimal condition.</p>
        <p>Best regards,<br>The LogiMetrics Team</p>
      </div>
    `
  })
};

module.exports = {
  sendEmail,
  sendBulkEmail,
  emailTemplates
};
