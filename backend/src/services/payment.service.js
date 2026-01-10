/**
 * Payment Service
 * Handles payment gateway integration and transaction processing
 */

const { Op, Sequelize } = require('sequelize');
const { Transaction, Invoice, PaymentMethod, Refund, Company, User } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const {
    createRazorpayOrder,
    verifyRazorpaySignature,
    getRazorpayPayment,
    createStripePaymentIntent,
    getStripePaymentIntent,
    createStripeRefund
} = require('../config/payment');
const { sendEmail, emailTemplates } = require('../config/email');
const logger = require('../utils/logger.util');

/**
 * Get all transactions with pagination and filters
 */
async function getTransactions({ page = 1, limit = 10, companyId, status, paymentGateway, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (companyId) where.companyId = companyId;
    if (status) where.status = status;
    if (paymentGateway) where.paymentGateway = paymentGateway;

    if (startDate && endDate) {
        where.createdAt = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }

    const { count, rows } = await Transaction.findAndCountAll({
        where,
        include: [
            { model: Invoice, as: 'invoice' },
            { model: User, as: 'customer', attributes: ['id', 'firstName', 'lastName', 'email'] }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit,
        offset
    });

    return {
        transactions: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }
    };
}

/**
 * Get transaction by ID
 */
async function getTransactionById(transactionId) {
    const transaction = await Transaction.findByPk(transactionId, {
        include: [
            { model: Invoice, as: 'invoice' },
            { model: Company, as: 'company' },
            { model: User, as: 'customer' }
        ]
    });

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    return transaction;
}

/**
 * Process payment
 */
async function processPayment(paymentData, processedBy) {
    const {
        companyId, customerId, invoiceId, shipmentId,
        amount, currency, paymentGateway, paymentMethodId,
        metadata, successUrl, cancelUrl
    } = paymentData;

    let gatewayResponse;
    let orderId;
    let clientSecret;

    // Create transaction record
    const transaction = await Transaction.create({
        companyId,
        customerId,
        invoiceId,
        shipmentId,
        amount,
        currency: currency || 'INR',
        paymentGateway,
        status: 'pending',
        metadata,
        createdBy: processedBy
    });

    try {
        if (paymentGateway === 'razorpay') {
            // Create Razorpay order
            gatewayResponse = await createRazorpayOrder(amount, currency, transaction.id);
            orderId = gatewayResponse.id;

            await transaction.update({
                gatewayOrderId: orderId,
                gatewayResponse: gatewayResponse
            });

            return {
                transaction,
                orderId,
                amount: gatewayResponse.amount,
                currency: gatewayResponse.currency,
                key: process.env.RAZORPAY_KEY_ID
            };

        } else if (paymentGateway === 'stripe') {
            // Create Stripe payment intent
            gatewayResponse = await createStripePaymentIntent(amount, currency, {
                transactionId: transaction.id,
                ...metadata
            });
            clientSecret = gatewayResponse.client_secret;

            await transaction.update({
                gatewayPaymentId: gatewayResponse.id,
                gatewayResponse: gatewayResponse
            });

            return {
                transaction,
                clientSecret,
                paymentIntentId: gatewayResponse.id
            };
        }

        throw new Error('Unsupported payment gateway');

    } catch (error) {
        await transaction.update({
            status: 'failed',
            errorMessage: error.message
        });

        throw error;
    }
}

/**
 * Verify payment (for Razorpay)
 */
async function verifyPayment({ orderId, paymentId, signature, transactionId }) {
    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    // Verify signature
    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);

    if (!isValid) {
        await transaction.update({
            status: 'failed',
            errorMessage: 'Invalid payment signature'
        });
        throw new Error('Invalid payment signature');
    }

    // Get payment details from Razorpay
    const paymentDetails = await getRazorpayPayment(paymentId);

    // Update transaction
    await transaction.update({
        status: 'completed',
        gatewayPaymentId: paymentId,
        gatewayResponse: paymentDetails,
        completedAt: new Date()
    });

    // Update invoice if linked
    if (transaction.invoiceId) {
        await Invoice.update(
            { status: 'paid', paidAt: new Date() },
            { where: { id: transaction.invoiceId } }
        );
    }

    // Send confirmation email
    await sendPaymentConfirmation(transaction);

    // Log the action
    await logPaymentAction(transaction.createdBy, 'verify', transaction.id, { paymentId });

    return transaction;
}

/**
 * Process refund
 */
async function processRefund(refundData, processedBy) {
    const { transactionId, amount, reason } = refundData;

    const transaction = await Transaction.findByPk(transactionId);

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    if (transaction.status !== 'completed') {
        throw new Error('Cannot refund a non-completed transaction');
    }

    // Calculate refund amount
    const refundAmount = amount || transaction.amount;

    // Check if already refunded
    const existingRefunds = await Refund.sum('amount', {
        where: { transactionId }
    });

    if ((existingRefunds || 0) + refundAmount > transaction.amount) {
        throw new Error('Refund amount exceeds original transaction amount');
    }

    // Create refund record
    const refund = await Refund.create({
        transactionId,
        amount: refundAmount,
        reason,
        status: 'pending',
        createdBy: processedBy
    });

    try {
        let gatewayRefund;

        if (transaction.paymentGateway === 'stripe') {
            gatewayRefund = await createStripeRefund(
                transaction.gatewayPaymentId,
                refundAmount
            );
        } else if (transaction.paymentGateway === 'razorpay') {
            // Razorpay refund logic
            gatewayRefund = await processRazorpayRefund(
                transaction.gatewayPaymentId,
                refundAmount
            );
        }

        // Update refund record
        await refund.update({
            status: 'completed',
            gatewayRefundId: gatewayRefund?.id,
            gatewayResponse: gatewayRefund,
            completedAt: new Date()
        });

        // Update transaction status if fully refunded
        const totalRefunded = (existingRefunds || 0) + refundAmount;
        if (totalRefunded >= transaction.amount) {
            await transaction.update({ status: 'refunded' });
        } else {
            await transaction.update({ status: 'partially_refunded' });
        }

        // Log the action
        await logPaymentAction(processedBy, 'refund', transactionId, { amount: refundAmount, reason });

        return refund;

    } catch (error) {
        await refund.update({
            status: 'failed',
            errorMessage: error.message
        });

        throw error;
    }
}

/**
 * Add payment method
 */
async function addPaymentMethod(userId, methodData) {
    const {
        type, cardNumber, expiryMonth, expiryYear, cvv,
        cardholderName, isDefault
    } = methodData;

    // Mask card number
    const maskedNumber = `****${cardNumber.slice(-4)}`;
    const cardBrand = detectCardBrand(cardNumber);

    // If setting as default, unset other defaults
    if (isDefault) {
        await PaymentMethod.update(
            { isDefault: false },
            { where: { userId } }
        );
    }

    const paymentMethod = await PaymentMethod.create({
        userId,
        type,
        cardBrand,
        lastFourDigits: cardNumber.slice(-4),
        maskedNumber,
        expiryMonth,
        expiryYear,
        cardholderName,
        isDefault: isDefault || false
    });

    return paymentMethod;
}

/**
 * Get payment methods for a user
 */
async function getPaymentMethods(userId) {
    const methods = await PaymentMethod.findAll({
        where: { userId, isActive: true },
        order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });

    return methods;
}

/**
 * Delete payment method
 */
async function deletePaymentMethod(userId, methodId) {
    const method = await PaymentMethod.findOne({
        where: { id: methodId, userId }
    });

    if (!method) {
        throw new Error('Payment method not found');
    }

    await method.update({ isActive: false });

    return { message: 'Payment method deleted successfully' };
}

/**
 * Set default payment method
 */
async function setDefaultPaymentMethod(userId, methodId) {
    const method = await PaymentMethod.findOne({
        where: { id: methodId, userId, isActive: true }
    });

    if (!method) {
        throw new Error('Payment method not found');
    }

    // Unset other defaults
    await PaymentMethod.update(
        { isDefault: false },
        { where: { userId } }
    );

    // Set this as default
    await method.update({ isDefault: true });

    return method;
}

/**
 * Get payment summary/stats
 */
async function getPaymentSummary(companyId, { startDate, endDate }) {
    const where = { companyId };

    if (startDate && endDate) {
        where.createdAt = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }

    const [totalRevenue, transactionsByStatus, transactionsByGateway] = await Promise.all([
        Transaction.sum('amount', {
            where: { ...where, status: 'completed' }
        }),

        Transaction.findAll({
            where,
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
            ],
            group: ['status']
        }),

        Transaction.findAll({
            where: { ...where, status: 'completed' },
            attributes: [
                'paymentGateway',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
                [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
            ],
            group: ['paymentGateway']
        })
    ]);

    // Get refunds
    const totalRefunds = await Refund.sum('amount', {
        where: { status: 'completed' },
        include: [{
            model: Transaction,
            as: 'transaction',
            where: { companyId }
        }]
    });

    return {
        totalRevenue: totalRevenue || 0,
        totalRefunds: totalRefunds || 0,
        netRevenue: (totalRevenue || 0) - (totalRefunds || 0),
        byStatus: transactionsByStatus.reduce((acc, t) => {
            acc[t.status] = {
                count: parseInt(t.dataValues.count),
                total: parseFloat(t.dataValues.total) || 0
            };
            return acc;
        }, {}),
        byGateway: transactionsByGateway.reduce((acc, t) => {
            acc[t.paymentGateway] = {
                count: parseInt(t.dataValues.count),
                total: parseFloat(t.dataValues.total) || 0
            };
            return acc;
        }, {})
    };
}

/**
 * Handle webhook from payment gateway
 */
async function handleWebhook(gateway, payload, signature) {
    if (gateway === 'razorpay') {
        return handleRazorpayWebhook(payload);
    } else if (gateway === 'stripe') {
        return handleStripeWebhook(payload, signature);
    }

    throw new Error('Unknown payment gateway');
}

async function handleRazorpayWebhook(payload) {
    const { event, payload: eventPayload } = payload;

    switch (event) {
        case 'payment.captured':
            // Handle successful payment
            logger.info('Razorpay payment captured:', eventPayload);
            break;
        case 'payment.failed':
            // Handle failed payment
            logger.warn('Razorpay payment failed:', eventPayload);
            break;
        case 'refund.created':
            // Handle refund
            logger.info('Razorpay refund created:', eventPayload);
            break;
        default:
            logger.info(`Unhandled Razorpay event: ${event}`);
    }

    return { received: true };
}

async function handleStripeWebhook(payload, signature) {
    // Stripe webhook handling
    const event = payload;

    switch (event.type) {
        case 'payment_intent.succeeded':
            await handlePaymentSuccess(event.data.object);
            break;
        case 'payment_intent.payment_failed':
            await handlePaymentFailure(event.data.object);
            break;
        default:
            logger.info(`Unhandled Stripe event: ${event.type}`);
    }

    return { received: true };
}

async function handlePaymentSuccess(paymentIntent) {
    const { id: paymentId, metadata } = paymentIntent;

    if (metadata?.transactionId) {
        const transaction = await Transaction.findByPk(metadata.transactionId);
        if (transaction) {
            await transaction.update({
                status: 'completed',
                completedAt: new Date()
            });

            // Update invoice if linked
            if (transaction.invoiceId) {
                await Invoice.update(
                    { status: 'paid', paidAt: new Date() },
                    { where: { id: transaction.invoiceId } }
                );
            }

            // Send confirmation
            await sendPaymentConfirmation(transaction);
        }
    }
}

async function handlePaymentFailure(paymentIntent) {
    const { id: paymentId, metadata, last_payment_error } = paymentIntent;

    if (metadata?.transactionId) {
        const transaction = await Transaction.findByPk(metadata.transactionId);
        if (transaction) {
            await transaction.update({
                status: 'failed',
                errorMessage: last_payment_error?.message
            });
        }
    }
}

// Helper functions

async function sendPaymentConfirmation(transaction) {
    try {
        const customer = await User.findByPk(transaction.customerId);
        if (customer) {
            const template = emailTemplates.paymentReceived({
                transactionId: transaction.id,
                amount: transaction.amount,
                date: transaction.completedAt
            });

            await sendEmail({
                to: customer.email,
                subject: template.subject,
                html: template.html
            });
        }
    } catch (error) {
        logger.error('Failed to send payment confirmation:', error);
    }
}

function detectCardBrand(cardNumber) {
    const patterns = {
        visa: /^4/,
        mastercard: /^5[1-5]/,
        amex: /^3[47]/,
        discover: /^6(?:011|5)/,
        rupay: /^6(?:0|5|8)/
    };

    for (const [brand, pattern] of Object.entries(patterns)) {
        if (pattern.test(cardNumber)) {
            return brand;
        }
    }

    return 'unknown';
}

async function processRazorpayRefund(paymentId, amount) {
    // Razorpay refund implementation
    const razorpay = require('../config/payment').razorpay;
    return razorpay.payments.refund(paymentId, { amount: amount * 100 });
}

async function logPaymentAction(actorId, action, transactionId, metadata) {
    try {
        await AuditLog.create({
            userId: actorId,
            action: `payment:${action}`,
            resource: 'payment',
            resourceId: transactionId,
            metadata,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Failed to log payment action:', error);
    }
}

module.exports = {
    getTransactions,
    getTransactionById,
    processPayment,
    verifyPayment,
    processRefund,
    addPaymentMethod,
    getPaymentMethods,
    deletePaymentMethod,
    setDefaultPaymentMethod,
    getPaymentSummary,
    handleWebhook
};
