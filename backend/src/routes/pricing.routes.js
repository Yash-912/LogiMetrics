const express = require('express');
const router = express.Router();
const pricingController = require('../controllers/pricing.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');
const { body, param, query } = require('express-validator');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/pricing/rules
 * @desc    Get all pricing rules
 * @access  Private
 */
router.get(
    '/rules',
    [
        query('companyId').optional().isUUID().withMessage('Invalid company ID'),
        query('vehicleType').optional().isString().withMessage('Invalid vehicle type'),
        query('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    validate,
    pricingController.getPricingRules
);

/**
 * @route   GET /api/pricing/rules/:id
 * @desc    Get pricing rule by ID
 * @access  Private
 */
router.get(
    '/rules/:id',
    [
        param('id').isUUID().withMessage('Invalid pricing rule ID')
    ],
    validate,
    pricingController.getPricingRuleById
);

/**
 * @route   POST /api/pricing/rules
 * @desc    Create pricing rule
 * @access  Private (Admin, Manager)
 */
router.post(
    '/rules',
    authorize(['admin', 'manager']),
    [
        body('companyId').notEmpty().isUUID().withMessage('Invalid company ID'),
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('ruleType').isIn(['base', 'distance', 'weight', 'volume', 'time', 'zone', 'custom']).withMessage('Invalid rule type'),
        body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be positive'),
        body('pricePerUnit').optional().isFloat({ min: 0 }).withMessage('Price per unit must be positive'),
        body('minCharge').optional().isFloat({ min: 0 }).withMessage('Min charge must be positive'),
        body('maxCharge').optional().isFloat({ min: 0 }).withMessage('Max charge must be positive'),
        body('vehicleTypes').optional().isArray().withMessage('Vehicle types must be an array'),
        body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
    ],
    validate,
    pricingController.createPricingRule
);

/**
 * @route   PUT /api/pricing/rules/:id
 * @desc    Update pricing rule
 * @access  Private (Admin, Manager)
 */
router.put(
    '/rules/:id',
    authorize(['admin', 'manager']),
    [
        param('id').isUUID().withMessage('Invalid pricing rule ID'),
        body('name').optional().trim().isLength({ max: 200 }).withMessage('Name too long'),
        body('basePrice').optional().isFloat({ min: 0 }).withMessage('Base price must be positive'),
        body('pricePerUnit').optional().isFloat({ min: 0 }).withMessage('Price per unit must be positive'),
        body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
    ],
    validate,
    pricingController.updatePricingRule
);

/**
 * @route   DELETE /api/pricing/rules/:id
 * @desc    Delete pricing rule
 * @access  Private (Admin)
 */
router.delete(
    '/rules/:id',
    authorize(['admin']),
    [
        param('id').isUUID().withMessage('Invalid pricing rule ID')
    ],
    validate,
    pricingController.deletePricingRule
);

/**
 * @route   GET /api/pricing/zones
 * @desc    Get pricing zones
 * @access  Private
 */
router.get(
    '/zones',
    [
        query('companyId').optional().isUUID().withMessage('Invalid company ID')
    ],
    validate,
    pricingController.getPricingZones
);

/**
 * @route   POST /api/pricing/zones
 * @desc    Create pricing zone
 * @access  Private (Admin, Manager)
 */
router.post(
    '/zones',
    authorize(['admin', 'manager']),
    [
        body('companyId').notEmpty().isUUID().withMessage('Invalid company ID'),
        body('name').trim().notEmpty().withMessage('Name is required'),
        body('zoneType').isIn(['city', 'state', 'region', 'country', 'custom']).withMessage('Invalid zone type'),
        body('boundaries').optional().isObject().withMessage('Boundaries must be an object'),
        body('priceMultiplier').optional().isFloat({ min: 0 }).withMessage('Price multiplier must be positive')
    ],
    validate,
    pricingController.createPricingZone
);

/**
 * @route   POST /api/pricing/calculate
 * @desc    Calculate price quote
 * @access  Private
 */
router.post(
    '/calculate',
    [
        body('companyId').optional().isUUID().withMessage('Invalid company ID'),
        body('origin').notEmpty().isObject().withMessage('Origin is required'),
        body('origin.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid origin latitude'),
        body('origin.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid origin longitude'),
        body('destination').notEmpty().isObject().withMessage('Destination is required'),
        body('destination.latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid destination latitude'),
        body('destination.longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid destination longitude'),
        body('weight').optional().isFloat({ min: 0 }).withMessage('Weight must be positive'),
        body('volume').optional().isFloat({ min: 0 }).withMessage('Volume must be positive'),
        body('vehicleType').optional().isString().withMessage('Invalid vehicle type'),
        body('serviceType').optional().isIn(['standard', 'express', 'same_day', 'overnight']).withMessage('Invalid service type')
    ],
    validate,
    pricingController.calculateQuote
);

/**
 * @route   GET /api/pricing/quotes
 * @desc    Get quotes
 * @access  Private
 */
router.get(
    '/quotes',
    [
        query('companyId').optional().isUUID().withMessage('Invalid company ID'),
        query('status').optional().isIn(['pending', 'accepted', 'rejected', 'expired']).withMessage('Invalid status'),
        query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive'),
        query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    ],
    validate,
    pricingController.getQuotes
);

/**
 * @route   POST /api/pricing/quotes
 * @desc    Save quote
 * @access  Private
 */
router.post(
    '/quotes',
    [
        body('companyId').notEmpty().isUUID().withMessage('Invalid company ID'),
        body('customerId').optional().isUUID().withMessage('Invalid customer ID'),
        body('quoteData').notEmpty().isObject().withMessage('Quote data is required'),
        body('validUntil').optional().isISO8601().withMessage('Invalid valid until date')
    ],
    validate,
    pricingController.saveQuote
);

/**
 * @route   POST /api/pricing/quotes/:id/convert
 * @desc    Convert quote to shipment
 * @access  Private
 */
router.post(
    '/quotes/:id/convert',
    [
        param('id').isUUID().withMessage('Invalid quote ID')
    ],
    validate,
    pricingController.convertQuoteToShipment
);

/**
 * @route   GET /api/pricing/fuel-surcharge
 * @desc    Get fuel surcharge rates
 * @access  Private
 */
router.get(
    '/fuel-surcharge',
    pricingController.getFuelSurcharge
);

module.exports = router;
