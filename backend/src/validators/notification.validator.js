const { body, param, query } = require('express-validator');

/**
 * Validation rules for getting notifications for a user
 */
const getNotificationsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('type')
    .optional()
    .isIn([
      'shipment_update',
      'payment_received',
      'invoice_generated',
      'driver_assigned',
      'vehicle_maintenance',
      'route_optimized',
      'delivery_completed',
      'system_alert',
      'user_mention',
      'other'
    ])
    .withMessage('Invalid notification type'),
  
  query('read')
    .optional()
    .isBoolean()
    .withMessage('Read filter must be a boolean value'),
  
  query('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'priority'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for creating a notification
 */
const createNotificationValidation = [
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID'),
  
  body('type')
    .notEmpty()
    .withMessage('Notification type is required')
    .isIn([
      'shipment_update',
      'payment_received',
      'invoice_generated',
      'driver_assigned',
      'vehicle_maintenance',
      'route_optimized',
      'delivery_completed',
      'system_alert',
      'user_mention',
      'other'
    ])
    .withMessage('Invalid notification type'),
  
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message must not exceed 1000 characters'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  
  body('actionUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Action URL must be a valid URL'),
  
  body('actionText')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Action text must not exceed 50 characters'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiration date format')
];

/**
 * Validation rules for marking a notification as read
 */
const markAsReadValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid notification ID')
];

/**
 * Validation rules for marking multiple notifications as read
 */
const markMultipleAsReadValidation = [
  body('notificationIds')
    .isArray({ min: 1 })
    .withMessage('Notification IDs must be a non-empty array'),
  
  body('notificationIds.*')
    .isUUID()
    .withMessage('Each notification ID must be a valid UUID')
];

/**
 * Validation rules for marking all notifications as read
 */
const markAllAsReadValidation = [
  body('type')
    .optional()
    .isIn([
      'shipment_update',
      'payment_received',
      'invoice_generated',
      'driver_assigned',
      'vehicle_maintenance',
      'route_optimized',
      'delivery_completed',
      'system_alert',
      'user_mention',
      'other'
    ])
    .withMessage('Invalid notification type')
];

/**
 * Validation rules for deleting a notification
 */
const deleteNotificationValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid notification ID')
];

/**
 * Validation rules for deleting multiple notifications
 */
const deleteMultipleValidation = [
  body('notificationIds')
    .isArray({ min: 1 })
    .withMessage('Notification IDs must be a non-empty array'),
  
  body('notificationIds.*')
    .isUUID()
    .withMessage('Each notification ID must be a valid UUID')
];

/**
 * Validation rules for getting notification preferences
 */
const getPreferencesValidation = [
  // No specific validation needed - uses authenticated user
];

/**
 * Validation rules for updating notification preferences
 */
const updatePreferencesValidation = [
  body('preferences')
    .notEmpty()
    .withMessage('Preferences object is required')
    .isObject()
    .withMessage('Preferences must be an object'),
  
  body('preferences.email')
    .optional()
    .isObject()
    .withMessage('Email preferences must be an object'),
  
  body('preferences.email.enabled')
    .optional()
    .isBoolean()
    .withMessage('Email enabled must be a boolean value'),
  
  body('preferences.email.types')
    .optional()
    .isArray()
    .withMessage('Email types must be an array'),
  
  body('preferences.sms')
    .optional()
    .isObject()
    .withMessage('SMS preferences must be an object'),
  
  body('preferences.sms.enabled')
    .optional()
    .isBoolean()
    .withMessage('SMS enabled must be a boolean value'),
  
  body('preferences.sms.types')
    .optional()
    .isArray()
    .withMessage('SMS types must be an array'),
  
  body('preferences.push')
    .optional()
    .isObject()
    .withMessage('Push preferences must be an object'),
  
  body('preferences.push.enabled')
    .optional()
    .isBoolean()
    .withMessage('Push enabled must be a boolean value'),
  
  body('preferences.push.types')
    .optional()
    .isArray()
    .withMessage('Push types must be an array'),
  
  body('preferences.inApp')
    .optional()
    .isObject()
    .withMessage('In-app preferences must be an object'),
  
  body('preferences.inApp.enabled')
    .optional()
    .isBoolean()
    .withMessage('In-app enabled must be a boolean value'),
  
  body('preferences.inApp.types')
    .optional()
    .isArray()
    .withMessage('In-app types must be an array'),
  
  body('preferences.doNotDisturb')
    .optional()
    .isObject()
    .withMessage('Do not disturb settings must be an object'),
  
  body('preferences.doNotDisturb.enabled')
    .optional()
    .isBoolean()
    .withMessage('Do not disturb enabled must be a boolean value'),
  
  body('preferences.doNotDisturb.startTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('preferences.doNotDisturb.endTime')
    .optional()
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be in HH:MM format')
];

/**
 * Validation rules for subscribing to push notifications
 */
const subscribePushValidation = [
  body('subscription')
    .notEmpty()
    .withMessage('Subscription object is required')
    .isObject()
    .withMessage('Subscription must be an object'),
  
  body('subscription.endpoint')
    .trim()
    .notEmpty()
    .withMessage('Endpoint is required')
    .isURL()
    .withMessage('Endpoint must be a valid URL'),
  
  body('subscription.keys')
    .notEmpty()
    .withMessage('Keys object is required')
    .isObject()
    .withMessage('Keys must be an object'),
  
  body('subscription.keys.p256dh')
    .trim()
    .notEmpty()
    .withMessage('p256dh key is required'),
  
  body('subscription.keys.auth')
    .trim()
    .notEmpty()
    .withMessage('auth key is required'),
  
  body('deviceType')
    .optional()
    .isIn(['web', 'android', 'ios'])
    .withMessage('Invalid device type')
];

/**
 * Validation rules for unsubscribing from push notifications
 */
const unsubscribePushValidation = [
  body('endpoint')
    .trim()
    .notEmpty()
    .withMessage('Endpoint is required')
    .isURL()
    .withMessage('Endpoint must be a valid URL')
];

/**
 * Validation rules for getting notification count
 */
const getCountValidation = [
  query('unreadOnly')
    .optional()
    .isBoolean()
    .withMessage('Unread only must be a boolean value')
];

/**
 * Validation rules for sending bulk notifications
 */
const sendBulkNotificationValidation = [
  body('userIds')
    .isArray({ min: 1 })
    .withMessage('User IDs must be a non-empty array'),
  
  body('userIds.*')
    .isUUID()
    .withMessage('Each user ID must be a valid UUID'),
  
  body('type')
    .notEmpty()
    .withMessage('Notification type is required')
    .isIn([
      'shipment_update',
      'payment_received',
      'invoice_generated',
      'driver_assigned',
      'vehicle_maintenance',
      'route_optimized',
      'delivery_completed',
      'system_alert',
      'user_mention',
      'other'
    ])
    .withMessage('Invalid notification type'),
  
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 1000 })
    .withMessage('Message must not exceed 1000 characters'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority')
];

module.exports = {
  getNotificationsValidation,
  createNotificationValidation,
  markAsReadValidation,
  markMultipleAsReadValidation,
  markAllAsReadValidation,
  deleteNotificationValidation,
  deleteMultipleValidation,
  getPreferencesValidation,
  updatePreferencesValidation,
  subscribePushValidation,
  unsubscribePushValidation,
  getCountValidation,
  sendBulkNotificationValidation
};
