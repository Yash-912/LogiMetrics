/**
 * Stripe Configuration
 * Initializes Stripe SDK with API keys and configuration
 */

const stripe = require('stripe');
const logger = require('../utils/logger.util');

// Initialize Stripe with secret key
const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  maxNetworkRetries: 2,
  httpClient: stripe.createNodeHttpClient(),
});

// Stripe Configuration Object
const stripeConfig = {
  // API Keys
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  // Default Currency
  defaultCurrency: process.env.STRIPE_CURRENCY || 'inr',

  // Payment Method Types
  supportedPaymentMethods: [
    'card',
    'ideal',
    'sepa_debit',
    'ach_debit',
    'afterpay_clearpay',
  ],

  // Webhook Configuration
  webhookEndpoint: '/api/v1/payments/webhook',

  // Payment Intent Configuration
  paymentIntentConfig: {
    statementDescriptor: 'LOGIMETRICS',
    captureMethod: 'automatic', // or 'manual' for authorize only
    confirmationMethod: 'automatic',
    offSession: false,
  },

  // Customer Configuration
  customerMetadataFields: ['companyId', 'role', 'department'],

  // Refund Configuration
  refundConfig: {
    maxRefundWindow: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
  },

  // Rate Limits (requests per minute)
  rateLimits: {
    paymentIntent: 30,
    refund: 20,
    webhook: 100,
  },

  // Idempotency Key Configuration
  idempotencyKey: {
    ttl: 24 * 60 * 60, // 24 hours
  },
};

// Validate required environment variables
const validateStripeConfig = () => {
  const requiredKeys = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'STRIPE_WEBHOOK_SECRET',
  ];

  const missingKeys = requiredKeys.filter((key) => !process.env[key]);

  if (missingKeys.length > 0) {
    logger.error(
      `Missing Stripe configuration: ${missingKeys.join(', ')}`,
      'STRIPE_CONFIG'
    );
    throw new Error(
      `Missing required Stripe environment variables: ${missingKeys.join(', ')}`
    );
  }

  logger.info('Stripe configuration validated successfully', 'STRIPE_CONFIG');
};

// Export Stripe client and config
module.exports = {
  stripe: stripeClient,
  stripeConfig,
  validateStripeConfig,
};
