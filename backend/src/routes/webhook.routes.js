const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');
const { body, param, query } = require('express-validator');

// External webhook endpoints (no authentication - verified by signature)
/**
 * @route   POST /api/webhooks/stripe
 * @desc    Handle incoming webhook from Stripe
 * @access  Public (verified by signature)
 */
router.post(
    '/stripe',
    express.raw({ type: 'application/json' }),
    webhookController.handleStripeWebhook
);

/**
 * @route   POST /api/webhooks/twilio
 * @desc    Handle incoming webhook from Twilio
 * @access  Public (verified by signature)
 */
router.post(
    '/twilio',
    webhookController.handleTwilioWebhook
);

// Apply authentication to managed webhook endpoints
router.use(authenticate);

/**
 * @route   GET /api/webhooks/endpoints
 * @desc    Get webhook endpoints
 * @access  Private (Admin, Manager)
 */
router.get(
    '/endpoints',
    authorize(['admin', 'manager']),
    [
        query('companyId').optional().isUUID().withMessage('Invalid company ID'),
        query('isActive').optional().isBoolean().withMessage('isActive must be boolean')
    ],
    validate,
    webhookController.getWebhookEndpoints
);

/**
 * @route   GET /api/webhooks/endpoints/:id
 * @desc    Get webhook endpoint by ID
 * @access  Private (Admin, Manager)
 */
router.get(
    '/endpoints/:id',
    authorize(['admin', 'manager']),
    [
        param('id').isUUID().withMessage('Invalid endpoint ID')
    ],
    validate,
    webhookController.getWebhookEndpointById
);

/**
 * @route   POST /api/webhooks/endpoints
 * @desc    Create webhook endpoint
 * @access  Private (Admin, Manager)
 */
router.post(
    '/endpoints',
    authorize(['admin', 'manager']),
    [
        body('companyId').notEmpty().isUUID().withMessage('Invalid company ID'),
        body('url').trim().notEmpty().isURL().withMessage('Valid URL is required'),
        body('events').isArray({ min: 1 }).withMessage('At least one event is required'),
        body('events.*').isString().withMessage('Each event must be a string'),
        body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
        body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
        body('headers').optional().isObject().withMessage('Headers must be an object')
    ],
    validate,
    webhookController.createWebhookEndpoint
);

/**
 * @route   PUT /api/webhooks/endpoints/:id
 * @desc    Update webhook endpoint
 * @access  Private (Admin, Manager)
 */
router.put(
    '/endpoints/:id',
    authorize(['admin', 'manager']),
    [
        param('id').isUUID().withMessage('Invalid endpoint ID'),
        body('url').optional().trim().isURL().withMessage('Valid URL is required'),
        body('events').optional().isArray({ min: 1 }).withMessage('At least one event is required'),
        body('description').optional().trim().isLength({ max: 500 }).withMessage('Description too long'),
        body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
    ],
    validate,
    webhookController.updateWebhookEndpoint
);

/**
 * @route   DELETE /api/webhooks/endpoints/:id
 * @desc    Delete webhook endpoint
 * @access  Private (Admin)
 */
router.delete(
    '/endpoints/:id',
    authorize(['admin']),
    [
        param('id').isUUID().withMessage('Invalid endpoint ID')
    ],
    validate,
    webhookController.deleteWebhookEndpoint
);

/**
 * @route   POST /api/webhooks/endpoints/:id/rotate-secret
 * @desc    Rotate webhook signing secret
 * @access  Private (Admin)
 */
router.post(
    '/endpoints/:id/rotate-secret',
    authorize(['admin']),
    [
        param('id').isUUID().withMessage('Invalid endpoint ID')
    ],
    validate,
    webhookController.rotateSigningSecret
);

/**
 * @route   POST /api/webhooks/endpoints/:id/test
 * @desc    Test webhook endpoint
 * @access  Private (Admin, Manager)
 */
router.post(
    '/endpoints/:id/test',
    authorize(['admin', 'manager']),
    [
        param('id').isUUID().withMessage('Invalid endpoint ID')
    ],
    validate,
    webhookController.testWebhookEndpoint
);

/**
 * @route   GET /api/webhooks/deliveries
 * @desc    Get webhook delivery history
 * @access  Private (Admin, Manager)
 */
router.get(
    '/deliveries',
    authorize(['admin', 'manager']),
    [
        query('endpointId').optional().isUUID().withMessage('Invalid endpoint ID'),
        query('status').optional().isIn(['pending', 'success', 'failed']).withMessage('Invalid status'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
        query('startDate').optional().isISO8601().withMessage('Invalid start date'),
        query('endDate').optional().isISO8601().withMessage('Invalid end date')
    ],
    validate,
    webhookController.getWebhookDeliveries
);

/**
 * @route   POST /api/webhooks/deliveries/:id/retry
 * @desc    Retry webhook delivery
 * @access  Private (Admin, Manager)
 */
router.post(
    '/deliveries/:id/retry',
    authorize(['admin', 'manager']),
    [
        param('id').isUUID().withMessage('Invalid delivery ID')
    ],
    validate,
    webhookController.retryWebhookDelivery
);

/**
 * @route   GET /api/webhooks/events
 * @desc    Get available webhook events
 * @access  Private
 */
router.get(
    '/events',
    webhookController.getAvailableEvents
);

module.exports = router;
