const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { notification: notificationValidator } = require("../validators");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validation.middleware");
const { apiLimiter } = require("../middleware/rateLimit.middleware");

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/notifications
 * @desc    Get all notifications for current user
 * @access  Private
 */
router.get(
  "/",
  validate(notificationValidator.getNotificationsValidation),
  notificationController.getNotifications
);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get(
  "/unread-count",
  validate(notificationValidator.getCountValidation),
  notificationController.getUnreadCount
);

/**
 * @route   GET /api/notifications/preferences
 * @desc    Get notification preferences
 * @access  Private
 */
router.get(
  "/preferences",
  validate(notificationValidator.getPreferencesValidation),
  notificationController.getPreferences
);

/**
 * @route   PUT /api/notifications/preferences
 * @desc    Update notification preferences
 * @access  Private
 */
router.put(
  "/preferences",
  validate(notificationValidator.updatePreferencesValidation),
  notificationController.updatePreferences
);

/**
 * @route   GET /api/notifications/push/subscriptions
 * @desc    Get push subscriptions for current user
 * @access  Private
 */
router.get("/push/subscriptions", notificationController.getPushSubscriptions);

/**
 * @route   POST /api/notifications/push/subscribe
 * @desc    Register push subscription
 * @access  Private
 */
router.post(
  "/push/subscribe",
  validate(notificationValidator.subscribePushValidation),
  notificationController.subscribePush
);

/**
 * @route   POST /api/notifications/push/unsubscribe
 * @desc    Unregister push subscription
 * @access  Private
 */
router.post(
  "/push/unsubscribe",
  validate(notificationValidator.unsubscribePushValidation),
  notificationController.unsubscribePush
);

/**
 * @route   GET /api/notifications/:id
 * @desc    Get notification by ID
 * @access  Private
 */
router.get(
  "/:id",
  validate(notificationValidator.markAsReadValidation),
  notificationController.getNotificationById
);

/**
 * @route   PATCH /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.patch(
  "/:id/read",
  validate(notificationValidator.markAsReadValidation),
  notificationController.markAsRead
);

/**
 * @route   PATCH /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.patch(
  "/read-all",
  validate(notificationValidator.markAllAsReadValidation),
  notificationController.markAllAsRead
);

/**
 * @route   DELETE /api/notifications/all
 * @desc    Delete all notifications
 * @access  Private
 */
router.delete("/all", notificationController.deleteAllNotifications);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete(
  "/:id",
  validate(notificationValidator.deleteNotificationValidation),
  notificationController.deleteNotification
);

/**
 * @route   POST /api/notifications/send
 * @desc    Send notification (admin/system use)
 * @access  Private (Admin)
 */
router.post(
  "/send",
  authorize(["admin"]),
  notificationValidator.createNotificationValidation,
  validate,
  notificationController.sendNotification
);

/**
 * @route   POST /api/notifications/send-bulk
 * @desc    Send bulk notification
 * @access  Private (Admin)
 */
router.post(
  "/send-bulk",
  authorize(["admin"]),
  notificationValidator.sendBulkNotificationValidation,
  validate,
  notificationController.sendBulkNotification
);

module.exports = router;
