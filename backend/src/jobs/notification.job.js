/**
 * Notification Jobs
 * Scheduled tasks for notification queue processing and cleanup
 */

const { Op } = require("sequelize");
const { User } = require("../models/mongodb");
const notificationService = require("../services/notification.service");
const { getRedisClient } = require("../config/redis");
const { sendEmail } = require("../config/email");
const logger = require("../utils/logger.util");

// Queue name for pending notifications
const NOTIFICATION_QUEUE = "notifications:pending";

/**
 * Process pending notifications from the queue
 */
async function processNotificationQueue() {
  logger.info("[NotificationJob] Processing notification queue...");

  try {
    const redis = getRedisClient();
    if (!redis || !redis.isOpen) {
      logger.warn(
        "[NotificationJob] Redis not available, skipping queue processing"
      );
      return;
    }

    // Get batch of pending notifications from Redis queue
    const batchSize = 100;
    const notifications = [];

    for (let i = 0; i < batchSize; i++) {
      const item = await redis.lPop(NOTIFICATION_QUEUE);
      if (!item) break;

      try {
        notifications.push(JSON.parse(item));
      } catch (parseError) {
        logger.error(
          "[NotificationJob] Failed to parse notification:",
          parseError
        );
      }
    }

    if (notifications.length === 0) {
      logger.debug("[NotificationJob] No pending notifications in queue");
      return;
    }

    logger.info(
      `[NotificationJob] Processing ${notifications.length} notifications`
    );

    let successCount = 0;
    let errorCount = 0;

    for (const notification of notifications) {
      try {
        await processNotification(notification);
        successCount++;
      } catch (error) {
        errorCount++;
        logger.error(
          "[NotificationJob] Failed to process notification:",
          error
        );

        // Re-queue failed notifications with retry count
        const retryCount = (notification.retryCount || 0) + 1;
        if (retryCount < 3) {
          await redis.rPush(
            NOTIFICATION_QUEUE,
            JSON.stringify({
              ...notification,
              retryCount,
            })
          );
        }
      }
    }

    logger.info(
      `[NotificationJob] Queue processed: ${successCount} success, ${errorCount} errors`
    );
  } catch (error) {
    logger.error(
      "[NotificationJob] Error processing notification queue:",
      error
    );
    throw error;
  }
}

/**
 * Process a single notification
 */
async function processNotification(notification) {
  const { userId, type, channels, title, message, data } = notification;

  // Send via each requested channel
  for (const channel of channels || ["in_app"]) {
    switch (channel) {
      case "email":
        await sendEmailNotification(userId, title, message, data);
        break;
      case "sms":
        await sendSMSNotification(userId, title, message);
        break;
      case "push":
        await notificationService.sendPushNotification(
          userId,
          title,
          message,
          data
        );
        break;
      case "in_app":
      default:
        await notificationService.createNotification(
          userId,
          type,
          title,
          message,
          data
        );
        break;
    }
  }
}

/**
 * Send email notification
 */
async function sendEmailNotification(userId, title, message, data = {}) {
  const user = await User.findByPk(userId);
  if (!user?.email) return;

  await sendEmail({
    to: user.email,
    subject: title,
    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #2563eb;">${title}</h2>
                <p>${message}</p>
                ${
                  data.actionUrl
                    ? `<p><a href="${data.actionUrl}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>`
                    : ""
                }
            </div>
        `,
  });
}

/**
 * Send SMS notification (placeholder - would integrate with Twilio)
 */
async function sendSMSNotification(userId, title, message) {
  const user = await User.findByPk(userId);
  if (!user?.phone) return;

  // SMS integration would go here
  logger.debug(
    `[NotificationJob] SMS would be sent to ${user.phone}: ${title}`
  );
}

/**
 * Clean up old notifications
 */
async function cleanupOldNotifications() {
  logger.info("[NotificationJob] Cleaning up old notifications...");

  try {
    const daysToKeep = parseInt(process.env.NOTIFICATION_RETENTION_DAYS) || 30;
    const deletedCount = await notificationService.cleanupOldNotifications(
      daysToKeep
    );

    logger.info(
      `[NotificationJob] Cleaned up ${deletedCount} old notifications`
    );
  } catch (error) {
    logger.error(
      "[NotificationJob] Error cleaning up old notifications:",
      error
    );
    throw error;
  }
}

/**
 * Send digest notifications for unread items
 */
async function sendDigestNotifications() {
  logger.info("[NotificationJob] Sending digest notifications...");

  try {
    // Find users with unread notifications who have digest enabled
    const usersWithUnread = await User.findAll({
      where: {
        status: "active",
        "notificationPreferences.emailDigest": true,
      },
      attributes: ["id", "email", "firstName", "lastName"],
    });

    let sentCount = 0;
    let errorCount = 0;

    for (const user of usersWithUnread) {
      try {
        const unreadCount = await notificationService.getUnreadCount(user.id);

        if (unreadCount === 0) continue;

        // Get recent unread notifications
        const notifications = await notificationService.getUserNotifications(
          user.id,
          {
            unreadOnly: true,
            limit: 10,
          }
        );

        if (notifications.length === 0) continue;

        // Send digest email
        const notificationList = notifications
          .map((n) => `<li><strong>${n.title}</strong>: ${n.message}</li>`)
          .join("");

        await sendEmail({
          to: user.email,
          subject: `You have ${unreadCount} unread notifications - LogiMetrics`,
          html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px;">
                            <h2 style="color: #2563eb;">Your Daily Notification Digest</h2>
                            <p>Hi ${user.firstName || "there"},</p>
                            <p>You have ${unreadCount} unread notifications:</p>
                            <ul>${notificationList}</ul>
                            <p><a href="${
                              process.env.FRONTEND_URL
                            }/notifications" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View All Notifications</a></p>
                        </div>
                    `,
        });

        sentCount++;
      } catch (error) {
        errorCount++;
        logger.error(
          `[NotificationJob] Failed to send digest to user ${user.id}:`,
          error
        );
      }
    }

    logger.info(
      `[NotificationJob] Digest notifications sent: ${sentCount} success, ${errorCount} errors`
    );
  } catch (error) {
    logger.error(
      "[NotificationJob] Error sending digest notifications:",
      error
    );
    throw error;
  }
}

/**
 * Add notification to queue for async processing
 */
async function queueNotification(notification) {
  try {
    const redis = getRedisClient();
    if (!redis || !redis.isOpen) {
      // Fallback to direct processing if Redis unavailable
      await processNotification(notification);
      return;
    }

    await redis.rPush(NOTIFICATION_QUEUE, JSON.stringify(notification));
  } catch (error) {
    logger.error("[NotificationJob] Failed to queue notification:", error);
    // Fallback to direct processing
    await processNotification(notification);
  }
}

module.exports = {
  processNotificationQueue,
  cleanupOldNotifications,
  sendDigestNotifications,
  queueNotification,
};
