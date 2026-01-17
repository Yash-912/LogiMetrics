const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const { payment: paymentValidator } = require('../validators');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { apiLimiter, strictLimiter } = require('../middleware/rateLimit.middleware');

// Webhook route - no authentication needed, signature verified
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    paymentController.handleStripeWebhook
);

// Apply authentication to all other routes
router.use(authenticate);

// ============================================
// PAYMENT INTENT ROUTES (Stripe)
// ============================================

/**
 * @route   POST /api/v1/payments/create-intent
 * @desc    Create a Stripe payment intent
 * @access  Private
 */
router.post(
    '/create-intent',
    strictLimiter,
    paymentValidator.createPaymentIntentValidation,
    validate,
    paymentController.createPaymentIntent
);

/**
 * @route   POST /api/v1/payments/confirm-intent
 * @desc    Confirm a Stripe payment intent
 * @access  Private
 */
router.post(
    '/confirm-intent',
    strictLimiter,
    paymentValidator.confirmPaymentIntentValidation,
    validate,
    paymentController.confirmPaymentIntent
);

// ============================================
// PAYMENT METHOD ROUTES (Stripe)
// ============================================

/**
 * @route   POST /api/v1/payments/methods
 * @desc    Save a new payment method
 * @access  Private
 */
router.post(
    '/methods',
    strictLimiter,
    paymentValidator.savePaymentMethodValidation,
    validate,
    paymentController.savePaymentMethod
);

/**
 * @route   GET /api/v1/payments/methods
 * @desc    List user's payment methods
 * @access  Private
 */
router.get(
    '/methods',
    paymentValidator.listPaymentMethodsValidation,
    validate,
    paymentController.listPaymentMethods
);

/**
 * @route   DELETE /api/v1/payments/methods/:methodId
 * @desc    Delete a payment method
 * @access  Private
 */
router.delete(
    '/methods/:methodId',
    paymentValidator.deletePaymentMethodValidation,
    validate,
    paymentController.deletePaymentMethod
);

/**
 * @route   PATCH /api/v1/payments/methods/:methodId/default
 * @desc    Set a payment method as default
 * @access  Private
 */
router.patch(
    '/methods/:methodId/default',
    paymentValidator.setDefaultPaymentMethodValidation,
    validate,
    paymentController.setDefaultPaymentMethod
);

// ============================================
// CHARGE ROUTES (Stripe)
// ============================================

/**
 * @route   POST /api/v1/payments/charge
 * @desc    Charge with a saved payment method
 * @access  Private
 */
router.post(
    '/charge',
    strictLimiter,
    paymentValidator.chargeWithPaymentMethodValidation,
    validate,
    paymentController.chargeWithPaymentMethod
);

// ============================================
// REFUND ROUTES (Stripe)
// ============================================

/**
 * @route   POST /api/v1/payments/refund/:transactionId
 * @desc    Process a refund
 * @access  Private (Admin, Manager)
 */
router.post(
    '/refund/:transactionId',
    authorize(['admin', 'manager']),
    paymentValidator.refundWithStripeValidation,
    validate,
    paymentController.processRefund
);

// ============================================
// TRANSACTION ROUTES
// ============================================

/**
 * @route   GET /api/v1/payments/transactions
 * @desc    List all transactions with pagination and filters
 * @access  Private
 */
router.get(
    '/transactions',
    paymentValidator.listPaymentsValidation,
    validate,
    paymentController.getTransactions
);

/**
 * @route   GET /api/v1/payments/transactions/:transactionId
 * @desc    Get a specific transaction by ID
 * @access  Private
 */
router.get(
    '/transactions/:transactionId',
    paymentValidator.getPaymentValidation,
    validate,
    paymentController.getTransactionById
);

// ============================================
// INVOICE PAYMENT ROUTES
// ============================================

/**
 * @route   POST /api/v1/payments/invoice/:invoiceId/pay
 * @desc    Pay a specific invoice
 * @access  Private
 */
router.post(
    '/invoice/:invoiceId/pay',
    strictLimiter,
    paymentValidator.payInvoiceWithStripeValidation,
    validate,
    paymentController.payInvoice
);

module.exports = router;
