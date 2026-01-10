const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { payment: paymentValidator } = require('../validators');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { apiLimiter, strictLimiter } = require('../middleware/rateLimit.middleware');

// Apply authentication to all routes except webhook
router.use((req, res, next) => {
    if (req.path === '/webhook') {
        return next();
    }
    authenticate(req, res, next);
});

/**
 * @route   GET /api/payments/transactions
 * @desc    Get all transactions with pagination and filters
 * @access  Private
 */
router.get(
    '/transactions',
    paymentValidator.listPaymentsValidation,
    validate,
    paymentController.getTransactions
);

/**
 * @route   GET /api/payments/transactions/:id
 * @desc    Get transaction by ID
 * @access  Private
 */
router.get(
    '/transactions/:id',
    paymentValidator.getPaymentValidation,
    validate,
    paymentController.getTransactionById
);

/**
 * @route   POST /api/payments/process
 * @desc    Process a payment
 * @access  Private (Admin, Manager, Customer)
 */
router.post(
    '/process',
    strictLimiter,
    authorize(['admin', 'manager', 'customer']),
    paymentValidator.initiatePaymentValidation,
    validate,
    paymentController.processPayment
);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify a payment
 * @access  Private
 */
router.post(
    '/verify',
    paymentValidator.verifyPaymentValidation,
    validate,
    paymentController.processPayment
);

/**
 * @route   POST /api/payments/refund
 * @desc    Process a refund
 * @access  Private (Admin, Manager)
 */
router.post(
    '/refund',
    authorize(['admin', 'manager']),
    paymentValidator.refundValidation,
    validate,
    paymentController.processRefund
);

/**
 * @route   GET /api/payments/methods
 * @desc    Get payment methods
 * @access  Private
 */
router.get(
    '/methods',
    paymentController.getPaymentMethods
);

/**
 * @route   POST /api/payments/methods
 * @desc    Add payment method
 * @access  Private
 */
router.post(
    '/methods',
    strictLimiter,
    paymentController.addPaymentMethod
);

/**
 * @route   DELETE /api/payments/methods/:id
 * @desc    Delete payment method
 * @access  Private
 */
router.delete(
    '/methods/:id',
    paymentController.deletePaymentMethod
);

/**
 * @route   PATCH /api/payments/methods/:id/default
 * @desc    Set default payment method
 * @access  Private
 */
router.patch(
    '/methods/:id/default',
    paymentController.setDefaultPaymentMethod
);

/**
 * @route   GET /api/payments/summary
 * @desc    Get payment summary/stats
 * @access  Private (Admin, Manager)
 */
router.get(
    '/summary',
    authorize(['admin', 'manager']),
    paymentController.getPaymentSummary
);

/**
 * @route   POST /api/payments/webhook
 * @desc    Handle webhook from payment gateway
 * @access  Public (verified by signature)
 */
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    paymentController.handleWebhook
);

module.exports = router;
