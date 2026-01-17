/**
 * Stripe Service
 * Handles all Stripe API interactions including payment intents, customers, payment methods, and refunds
 */

const { stripe, stripeConfig } = require("../config/stripe");
const { Transaction, Invoice, PaymentMethod, StripeWebhookLog } = require("../models/mongodb");
const { AppError } = require("../middleware/error.middleware");
const logger = require("../utils/logger.util");
const { v4: uuidv4 } = require("uuid");

class StripeService {
  /**
   * Create a Stripe customer
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Stripe customer object
   */
  static async createCustomer(userData) {
    try {
      const customer = await stripe.customers.create({
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        address: userData.address,
        metadata: {
          userId: userData.userId,
          companyId: userData.companyId,
          role: userData.role,
        },
      });

      logger.info(
        `Stripe customer created: ${customer.id}`,
        "STRIPE_SERVICE"
      );
      return customer;
    } catch (error) {
      logger.error(
        `Failed to create Stripe customer: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError("Failed to create Stripe customer", 400);
    }
  }

  /**
   * Update a Stripe customer
   * @param {string} customerId - Stripe customer ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated customer object
   */
  static async updateCustomer(customerId, updateData) {
    try {
      const customer = await stripe.customers.update(customerId, updateData);
      logger.info(
        `Stripe customer updated: ${customerId}`,
        "STRIPE_SERVICE"
      );
      return customer;
    } catch (error) {
      logger.error(
        `Failed to update Stripe customer: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError("Failed to update Stripe customer", 400);
    }
  }

  /**
   * Create a payment intent
   * @param {Object} paymentData - Payment data
   * @returns {Promise<Object>} Payment intent object
   */
  static async createPaymentIntent(paymentData) {
    try {
      const {
        amount,
        currency = "inr",
        customerId,
        paymentMethodId,
        description,
        metadata = {},
        offSession = false,
      } = paymentData;

      const paymentIntentParams = {
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency.toLowerCase(),
        customer: customerId,
        description,
        metadata: {
          ...metadata,
          createdAt: new Date().toISOString(),
        },
        off_session: offSession,
        capture_method: stripeConfig.paymentIntentConfig.captureMethod,
        confirmation_method: stripeConfig.paymentIntentConfig.confirmationMethod,
        statement_descriptor: stripeConfig.paymentIntentConfig.statementDescriptor,
      };

      // If payment method is provided, set as default for payment
      if (paymentMethodId) {
        paymentIntentParams.payment_method = paymentMethodId;
        paymentIntentParams.confirm = false; // Don't auto-confirm, let client confirm
      }

      const paymentIntent = await stripe.paymentIntents.create(
        paymentIntentParams
      );

      logger.info(
        `Payment intent created: ${paymentIntent.id}`,
        "STRIPE_SERVICE"
      );
      return paymentIntent;
    } catch (error) {
      logger.error(
        `Failed to create payment intent: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError(
        `Failed to create payment intent: ${error.message}`,
        400
      );
    }
  }

  /**
   * Confirm a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @param {Object} confirmData - Confirmation data
   * @returns {Promise<Object>} Confirmed payment intent
   */
  static async confirmPaymentIntent(paymentIntentId, confirmData = {}) {
    try {
      const paymentIntent = await stripe.paymentIntents.confirm(
        paymentIntentId,
        confirmData
      );

      logger.info(
        `Payment intent confirmed: ${paymentIntentId}`,
        "STRIPE_SERVICE"
      );
      return paymentIntent;
    } catch (error) {
      logger.error(
        `Failed to confirm payment intent: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError(
        `Payment confirmation failed: ${error.message}`,
        400
      );
    }
  }

  /**
   * Retrieve a payment intent
   * @param {string} paymentIntentId - Payment intent ID
   * @returns {Promise<Object>} Payment intent object
   */
  static async retrievePaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        paymentIntentId
      );
      return paymentIntent;
    } catch (error) {
      logger.error(
        `Failed to retrieve payment intent: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError("Failed to retrieve payment intent", 404);
    }
  }

  /**
   * Create a payment method
   * @param {Object} methodData - Payment method data
   * @returns {Promise<Object>} Payment method object
   */
  static async createPaymentMethod(methodData) {
    try {
      const paymentMethod = await stripe.paymentMethods.create({
        type: methodData.type, // 'card', 'ideal', etc.
        [methodData.type]: methodData[methodData.type],
        billing_details: {
          name: methodData.billingDetails?.name,
          email: methodData.billingDetails?.email,
          phone: methodData.billingDetails?.phone,
          address: {
            line1: methodData.billingDetails?.address?.line1,
            line2: methodData.billingDetails?.address?.line2,
            city: methodData.billingDetails?.address?.city,
            state: methodData.billingDetails?.address?.state,
            postal_code: methodData.billingDetails?.address?.postalCode,
            country: methodData.billingDetails?.address?.country,
          },
        },
      });

      logger.info(
        `Payment method created: ${paymentMethod.id}`,
        "STRIPE_SERVICE"
      );
      return paymentMethod;
    } catch (error) {
      logger.error(
        `Failed to create payment method: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError(
        `Failed to save payment method: ${error.message}`,
        400
      );
    }
  }

  /**
   * Attach payment method to customer
   * @param {string} paymentMethodId - Payment method ID
   * @param {string} customerId - Stripe customer ID
   * @returns {Promise<Object>} Payment method object
   */
  static async attachPaymentMethod(paymentMethodId, customerId) {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(
        paymentMethodId,
        {
          customer: customerId,
        }
      );

      logger.info(
        `Payment method attached: ${paymentMethodId} to ${customerId}`,
        "STRIPE_SERVICE"
      );
      return paymentMethod;
    } catch (error) {
      logger.error(
        `Failed to attach payment method: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError("Failed to attach payment method", 400);
    }
  }

  /**
   * Detach payment method from customer
   * @param {string} paymentMethodId - Payment method ID
   * @returns {Promise<Object>} Detached payment method
   */
  static async detachPaymentMethod(paymentMethodId) {
    try {
      const paymentMethod = await stripe.paymentMethods.detach(
        paymentMethodId
      );

      logger.info(
        `Payment method detached: ${paymentMethodId}`,
        "STRIPE_SERVICE"
      );
      return paymentMethod;
    } catch (error) {
      logger.error(
        `Failed to detach payment method: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError("Failed to detach payment method", 400);
    }
  }

  /**
   * List customer's payment methods
   * @param {string} customerId - Stripe customer ID
   * @param {string} type - Payment method type (optional)
   * @returns {Promise<Array>} List of payment methods
   */
  static async listPaymentMethods(customerId, type = "card") {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type,
      });

      return paymentMethods.data;
    } catch (error) {
      logger.error(
        `Failed to list payment methods: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError("Failed to list payment methods", 400);
    }
  }

  /**
   * Create a refund
   * @param {Object} refundData - Refund data
   * @returns {Promise<Object>} Refund object
   */
  static async createRefund(refundData) {
    try {
      const { chargeId, paymentIntentId, amount, reason, metadata = {} } =
        refundData;

      const refundParams = {
        reason,
        metadata,
      };

      // Either chargeId or paymentIntentId must be provided
      if (chargeId) {
        refundParams.charge = chargeId;
      } else if (paymentIntentId) {
        refundParams.payment_intent = paymentIntentId;
      } else {
        throw new AppError("Either chargeId or paymentIntentId is required", 400);
      }

      if (amount) {
        refundParams.amount = Math.round(amount * 100); // Convert to cents
      }

      const refund = await stripe.refunds.create(refundParams);

      logger.info(`Refund created: ${refund.id}`, "STRIPE_SERVICE");
      return refund;
    } catch (error) {
      logger.error(
        `Failed to create refund: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError(`Refund failed: ${error.message}`, 400);
    }
  }

  /**
   * Retrieve a refund
   * @param {string} refundId - Refund ID
   * @returns {Promise<Object>} Refund object
   */
  static async retrieveRefund(refundId) {
    try {
      const refund = await stripe.refunds.retrieve(refundId);
      return refund;
    } catch (error) {
      logger.error(
        `Failed to retrieve refund: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError("Failed to retrieve refund", 404);
    }
  }

  /**
   * Create a charge
   * @param {Object} chargeData - Charge data
   * @returns {Promise<Object>} Charge object
   */
  static async createCharge(chargeData) {
    try {
      const {
        amount,
        currency = "inr",
        source,
        customer,
        description,
        metadata = {},
      } = chargeData;

      const charge = await stripe.charges.create({
        amount: Math.round(amount * 100),
        currency: currency.toLowerCase(),
        source,
        customer,
        description,
        metadata,
        capture: true,
      });

      logger.info(`Charge created: ${charge.id}`, "STRIPE_SERVICE");
      return charge;
    } catch (error) {
      logger.error(`Failed to create charge: ${error.message}`, "STRIPE_SERVICE");
      throw new AppError(`Charge failed: ${error.message}`, 400);
    }
  }

  /**
   * Generate idempotency key
   * @param {string} transactionNumber - Transaction number
   * @returns {string} Idempotency key
   */
  static generateIdempotencyKey(transactionNumber) {
    return `${transactionNumber}-${Date.now()}`;
  }

  /**
   * Construct webhook event
   * @param {Buffer} body - Request body
   * @param {string} signature - Webhook signature
   * @returns {Object} Webhook event
   */
  static constructWebhookEvent(body, signature) {
    try {
      const event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeConfig.webhookSecret
      );

      logger.info(
        `Webhook event constructed: ${event.type}`,
        "STRIPE_SERVICE"
      );
      return event;
    } catch (error) {
      logger.error(
        `Webhook signature verification failed: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw new AppError("Webhook signature verification failed", 401);
    }
  }

  /**
   * Log webhook event
   * @param {Object} event - Stripe event
   * @param {Object} additionalData - Additional data
   * @returns {Promise<Object>} Logged webhook
   */
  static async logWebhookEvent(event, additionalData = {}) {
    try {
      const webhookLog = new StripeWebhookLog({
        stripeEventId: event.id,
        eventType: event.type,
        eventTimestamp: new Date(event.created * 1000),
        data: event.data,
        status: "received",
        signatureVerified: true,
        ...additionalData,
      });

      await webhookLog.save();
      logger.info(
        `Webhook logged: ${event.id}`,
        "STRIPE_SERVICE"
      );
      return webhookLog;
    } catch (error) {
      logger.error(
        `Failed to log webhook: ${error.message}`,
        "STRIPE_SERVICE"
      );
      // Don't throw - webhook logging failure shouldn't block processing
      return null;
    }
  }

  /**
   * Handle payment intent succeeded event
   * @param {Object} paymentIntent - Payment intent data
   * @returns {Promise<void>}
   */
  static async handlePaymentIntentSucceeded(paymentIntent) {
    try {
      // Find and update transaction
      const transaction = await Transaction.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        {
          status: "succeeded",
          stripeChargeId: paymentIntent.charges.data[0]?.id,
          stripeFeeAmount: paymentIntent.charges.data[0]?.balance_transaction?.fee || 0,
          "paymentMethodDetails.brand": paymentIntent.charges.data[0]?.payment_method_details?.card?.brand,
          "paymentMethodDetails.lastFourDigits": paymentIntent.charges.data[0]?.payment_method_details?.card?.last4,
        },
        { new: true }
      );

      if (transaction && transaction.invoiceId) {
        // Update invoice status
        await Invoice.findByIdAndUpdate(transaction.invoiceId, {
          status: "paid",
          paidDate: new Date(),
          amountPaid: transaction.amount,
        });
      }

      logger.info(
        `Payment intent succeeded: ${paymentIntent.id}`,
        "STRIPE_SERVICE"
      );
    } catch (error) {
      logger.error(
        `Failed to handle payment intent succeeded: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw error;
    }
  }

  /**
   * Handle payment intent failed event
   * @param {Object} paymentIntent - Payment intent data
   * @returns {Promise<void>}
   */
  static async handlePaymentIntentFailed(paymentIntent) {
    try {
      const transaction = await Transaction.findOneAndUpdate(
        { stripePaymentIntentId: paymentIntent.id },
        {
          status: "failed",
          errorMessage: paymentIntent.last_payment_error?.message,
          errorCode: paymentIntent.last_payment_error?.code,
          failureReason: paymentIntent.last_payment_error?.param,
        },
        { new: true }
      );

      logger.warn(
        `Payment intent failed: ${paymentIntent.id} - ${paymentIntent.last_payment_error?.message}`,
        "STRIPE_SERVICE"
      );
    } catch (error) {
      logger.error(
        `Failed to handle payment intent failed: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw error;
    }
  }

  /**
   * Handle charge refunded event
   * @param {Object} charge - Charge data
   * @returns {Promise<void>}
   */
  static async handleChargeRefunded(charge) {
    try {
      const transaction = await Transaction.findOneAndUpdate(
        { stripeChargeId: charge.id },
        {
          status: "refunded",
          refundAmount: charge.refunded > 0 ? charge.refunded / 100 : 0,
        },
        { new: true }
      );

      logger.info(
        `Charge refunded: ${charge.id}`,
        "STRIPE_SERVICE"
      );
    } catch (error) {
      logger.error(
        `Failed to handle charge refunded: ${error.message}`,
        "STRIPE_SERVICE"
      );
      throw error;
    }
  }
}

module.exports = StripeService;
