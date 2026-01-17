/**
 * Payment Gateway Configuration (DEPRECATED)
 * Payment features have been removed from this project.
 * Use MongoDB and PostgreSQL for transaction tracking only.
 */

const logger = require("../utils/logger.util");

logger.warn("Payment gateway features (Razorpay/Stripe) are not available");

// Stub exports for backwards compatibility
module.exports = {
  razorpay: null,
  stripe: null,
  createRazorpayOrder: () => {
    throw new Error("Payment features disabled");
  },
  verifyRazorpaySignature: () => false,
  getRazorpayPayment: () => {
    throw new Error("Payment features disabled");
  },
  createStripePaymentIntent: () => {
    throw new Error("Payment features disabled");
  },
  getStripePaymentIntent: () => {
    throw new Error("Payment features disabled");
  },
  createStripeRefund: () => {
    throw new Error("Payment features disabled");
  },
  constructStripeWebhookEvent: () => {
    throw new Error("Payment features disabled");
  },
};
