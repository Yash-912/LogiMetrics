/**
 * Payment Gateway Configuration
 * Razorpay and Stripe integration
 */

const Razorpay = require('razorpay');
const Stripe = require('stripe');
const logger = require('../utils/logger.util');

// Initialize Razorpay (conditional - only if credentials are provided)
let razorpay = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  logger.info('Razorpay initialized successfully');
} else {
  logger.warn('Razorpay credentials not found - payment features will be disabled');
}

// Initialize Stripe (conditional - only if credentials are provided)
let stripe = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  logger.info('Stripe initialized successfully');
} else {
  logger.warn('Stripe credentials not found - payment features will be disabled');
}

/**
 * Create Razorpay order
 */
async function createRazorpayOrder(amount, currency = 'INR', receipt = null) {
  try {
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `order_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    logger.info(`Razorpay order created: ${order.id}`);
    return order;
  } catch (error) {
    logger.error('Razorpay order creation error:', error);
    throw error;
  }
}

/**
 * Verify Razorpay payment signature
 */
function verifyRazorpaySignature(orderId, paymentId, signature) {
  const crypto = require('crypto');
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return generatedSignature === signature;
}

/**
 * Get Razorpay payment details
 */
async function getRazorpayPayment(paymentId) {
  try {
    return await razorpay.payments.fetch(paymentId);
  } catch (error) {
    logger.error('Razorpay fetch payment error:', error);
    throw error;
  }
}

/**
 * Create Stripe payment intent
 */
async function createStripePaymentIntent(amount, currency = 'usd', metadata = {}) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true
      }
    });

    logger.info(`Stripe payment intent created: ${paymentIntent.id}`);
    return paymentIntent;
  } catch (error) {
    logger.error('Stripe payment intent creation error:', error);
    throw error;
  }
}

/**
 * Retrieve Stripe payment intent
 */
async function getStripePaymentIntent(paymentIntentId) {
  try {
    return await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (error) {
    logger.error('Stripe fetch payment intent error:', error);
    throw error;
  }
}

/**
 * Process Stripe refund
 */
async function createStripeRefund(paymentIntentId, amount = null) {
  try {
    const refundParams = {
      payment_intent: paymentIntentId
    };

    if (amount) {
      refundParams.amount = Math.round(amount * 100);
    }

    const refund = await stripe.refunds.create(refundParams);
    logger.info(`Stripe refund created: ${refund.id}`);
    return refund;
  } catch (error) {
    logger.error('Stripe refund error:', error);
    throw error;
  }
}

/**
 * Construct Stripe webhook event
 */
function constructStripeWebhookEvent(payload, signature) {
  try {
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    logger.error('Stripe webhook verification error:', error);
    throw error;
  }
}

module.exports = {
  razorpay,
  stripe,
  createRazorpayOrder,
  verifyRazorpaySignature,
  getRazorpayPayment,
  createStripePaymentIntent,
  getStripePaymentIntent,
  createStripeRefund,
  constructStripeWebhookEvent
};
