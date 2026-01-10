const { validationResult } = require("express-validator");
const {
  Transaction,
  Invoice,
  Company,
  User,
  PaymentMethod,
  StripeWebhookLog,
} = require("../models/mongodb");
const { AuditLog } = require("../models/mongodb");
const {
  successResponse,
  errorResponse,
  paginated,
} = require("../utils/response.util");
const { AppError } = require("../middleware/error.middleware");
const StripeService = require("../services/stripeService");
const { stripe, stripeConfig } = require("../config/stripe");
const logger = require("../utils/logger.util");
const { v4: uuidv4 } = require("uuid");

// Demo Mode Helper
const DEMO_MODE = process.env.DEMO_MODE === "true";
const generateDemoId = (prefix) => `${prefix}_demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const generateDemoSecret = (prefix) => `${prefix}_secret_demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * Create a payment intent
 * @route POST /api/v1/payments/create-intent
 */
const createPaymentIntent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const {
      invoiceId,
      amount,
      currency = "inr",
      stripeCustomerId,
      paymentMethodId,
      description,
      metadata = {},
    } = req.body;

    // DEMO MODE - Return mock payment intent
    if (DEMO_MODE) {
      const demoTransactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const demoAmount = amount || 10000;
      const demoPaymentIntentId = generateDemoId("pi");
      
      return successResponse(res, "Payment intent created successfully", 201, {
        paymentIntent: {
          id: demoPaymentIntentId,
          clientSecret: generateDemoSecret("pi"),
          status: "requires_payment_method",
          amount: demoAmount,
          currency: currency || "inr",
        },
        transaction: {
          id: `demo_txn_${Date.now()}`,
          transactionNumber: demoTransactionNumber,
          status: "pending",
        },
      });
    }

    // Validate invoice if provided
    let invoice = null;
    if (invoiceId) {
      invoice = await Invoice.findById(invoiceId);
      if (!invoice) {
        throw new AppError("Invoice not found", 404);
      }
      if (invoice.status === "paid") {
        throw new AppError("Invoice is already paid", 400);
      }
    }

    // Create payment intent
    const paymentIntent = await StripeService.createPaymentIntent({
      amount: amount || invoice?.totalAmount,
      currency,
      customerId: stripeCustomerId,
      paymentMethodId,
      description: description || (invoice ? `Payment for ${invoice.invoiceNumber}` : "Payment"),
      metadata: {
        invoiceId: invoiceId || null,
        userId: req.user.id,
        companyId: req.user.companyId,
        ...metadata,
      },
    });

    // Create transaction record
    const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const transaction = await Transaction.create({
      transactionNumber,
      invoiceId,
      companyId: req.user.companyId,
      userId: req.user.id,
      amount: amount || invoice?.totalAmount,
      currency,
      paymentMethod: "stripe",
      status: "pending",
      stripePaymentIntentId: paymentIntent.id,
      stripeCustomerId,
      description,
      idempotencyKey: StripeService.generateIdempotencyKey(transactionNumber),
    });

    logger.info(
      `Payment intent created: ${paymentIntent.id} for transaction ${transactionNumber}`,
      "PAYMENT_CONTROLLER"
    );

    return successResponse(res, "Payment intent created successfully", 201, {
      paymentIntent: {
        id: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
      },
      transaction: {
        id: transaction._id,
        transactionNumber: transaction.transactionNumber,
        status: transaction.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Confirm a payment intent
 * @route POST /api/v1/payments/confirm-intent
 */
const confirmPaymentIntent = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { paymentIntentId, paymentMethodId, returnUrl } = req.body;

    // DEMO MODE - Return mock confirmation
    if (DEMO_MODE) {
      return successResponse(res, "Payment intent confirmed", 200, {
        paymentIntent: {
          id: paymentIntentId || generateDemoId("pi"),
          status: "succeeded",
          amount: 10000,
          currency: "inr",
          charges: [
            {
              id: generateDemoId("ch"),
              status: "succeeded",
              amount: 10000,
              paid: true,
            },
          ],
        },
      });
    }

    // Retrieve payment intent
    const paymentIntent = await StripeService.retrievePaymentIntent(paymentIntentId);

    const confirmData = {};
    if (paymentMethodId) {
      confirmData.payment_method = paymentMethodId;
    }
    if (returnUrl) {
      confirmData.return_url = returnUrl;
    }

    // Confirm payment
    const confirmedIntent = await StripeService.confirmPaymentIntent(
      paymentIntentId,
      confirmData
    );

    logger.info(
      `Payment intent confirmed: ${paymentIntentId}`,
      "PAYMENT_CONTROLLER"
    );

    return successResponse(res, "Payment intent confirmed", 200, {
      paymentIntent: {
        id: confirmedIntent.id,
        status: confirmedIntent.status,
        amount: confirmedIntent.amount,
        currency: confirmedIntent.currency,
        charges: confirmedIntent.charges.data,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Save a payment method
 * @route POST /api/v1/payments/methods
 */
const savePaymentMethod = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { type, card, billingDetails, nickname } = req.body;

    // DEMO MODE: Return mock response
    if (DEMO_MODE) {
      return successResponse(res, "Payment method saved successfully", 201, {
        id: generateDemoId("pm"),
        stripePaymentMethodId: generateDemoId("pm"),
        type: type || "card",
        card: {
          brand: "visa",
          lastFourDigits: card?.number?.slice(-4) || "4242",
          expiryMonth: card?.exp_month || 12,
          expiryYear: card?.exp_year || 2025,
        },
        isDefault: true,
        status: "active",
        createdAt: new Date(),
      });
    }

    // Get or create Stripe customer
    let stripeCustomer = await stripe.customers.list({
      email: req.user.email,
      limit: 1,
    });

    let customerId;
    if (stripeCustomer.data.length > 0) {
      customerId = stripeCustomer.data[0].id;
    } else {
      const newCustomer = await StripeService.createCustomer({
        email: req.user.email,
        name: req.user.name,
        phone: req.user.phone,
        userId: req.user.id,
        companyId: req.user.companyId,
        role: req.user.role,
      });
      customerId = newCustomer.id;
    }

    // Create payment method
    const paymentMethod = await StripeService.createPaymentMethod({
      type,
      [type]: type === "card" ? card : null,
      billingDetails,
    });


    // Attach to customer
    await StripeService.attachPaymentMethod(paymentMethod.id, customerId);

    // Save to MongoDB
    const savedMethod = await PaymentMethod.create({
      stripePaymentMethodId: paymentMethod.id,
      userId: req.user.id,
      companyId: req.user.companyId,
      stripeCustomerId: customerId,
      type: paymentMethod.type,
      card: paymentMethod.card ? {
        brand: paymentMethod.card.brand,
        lastFourDigits: paymentMethod.card.last4,
        expiryMonth: paymentMethod.card.exp_month,
        expiryYear: paymentMethod.card.exp_year,
        country: paymentMethod.card.country,
        funding: paymentMethod.card.funding,
      } : null,
      nickname,
      billingAddress: billingDetails?.address,
      status: "active",
    });

    logger.info(
      `Payment method saved: ${paymentMethod.id}`,
      "PAYMENT_CONTROLLER"
    );

    return successResponse(res, "Payment method saved successfully", 201, {
      paymentMethod: {
        id: savedMethod._id,
        stripePaymentMethodId: savedMethod.stripePaymentMethodId,
        type: savedMethod.type,
        brand: savedMethod.card?.brand,
        lastFourDigits: savedMethod.card?.lastFourDigits,
        nickname: savedMethod.nickname,
        isDefault: savedMethod.isDefault,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List payment methods
 * @route GET /api/v1/payments/methods
 */
const listPaymentMethods = async (req, res, next) => {
  try {
    const { type } = req.query;

    // DEMO MODE - Return mock payment methods
    if (DEMO_MODE) {
      return successResponse(res, "Payment methods retrieved successfully", 200, {
        paymentMethods: [
          {
            id: generateDemoId("pm"),
            stripePaymentMethodId: generateDemoId("pm"),
            type: "card",
            brand: "visa",
            lastFourDigits: "4242",
            nickname: "My Demo Card",
            isDefault: true,
            expiryMonth: 12,
            expiryYear: 2025,
          },
          {
            id: generateDemoId("pm"),
            stripePaymentMethodId: generateDemoId("pm"),
            type: "card",
            brand: "mastercard",
            lastFourDigits: "5555",
            nickname: "Demo Mastercard",
            isDefault: false,
            expiryMonth: 6,
            expiryYear: 2026,
          },
        ],
        total: 2,
      });
    }

    const query = {
      userId: req.user.id,
      status: "active",
      isDeleted: false,
    };

    if (type) {
      query.type = type;
    }

    const methods = await PaymentMethod.find(query).sort({ isDefault: -1, createdAt: -1 });

    return successResponse(res, "Payment methods retrieved successfully", 200, {
      paymentMethods: methods.map((m) => ({
        id: m._id,
        stripePaymentMethodId: m.stripePaymentMethodId,
        type: m.type,
        brand: m.card?.brand,
        lastFourDigits: m.card?.lastFourDigits,
        nickname: m.nickname,
        isDefault: m.isDefault,
        expiryMonth: m.card?.expiryMonth,
        expiryYear: m.card?.expiryYear,
      })),
      total: methods.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a payment method
 * @route DELETE /api/v1/payments/methods/:methodId
 */
const deletePaymentMethod = async (req, res, next) => {
  try {
    const { methodId } = req.params;

    // DEMO MODE - Return mock success
    if (DEMO_MODE) {
      return successResponse(res, "Payment method deleted successfully", 200, {
        deleted: true,
        methodId,
      });
    }

    const paymentMethod = await PaymentMethod.findOne({
      _id: methodId,
      userId: req.user.id,
    });

    if (!paymentMethod) {
      throw new AppError("Payment method not found", 404);
    }

    // Detach from Stripe
    try {
      await StripeService.detachPaymentMethod(paymentMethod.stripePaymentMethodId);
    } catch (error) {
      logger.warn(
        `Failed to detach payment method from Stripe: ${error.message}`,
        "PAYMENT_CONTROLLER"
      );
    }

    // Soft delete
    paymentMethod.isDeleted = true;
    paymentMethod.status = "deleted";
    await paymentMethod.save();

    logger.info(
      `Payment method deleted: ${paymentMethod.stripePaymentMethodId}`,
      "PAYMENT_CONTROLLER"
    );

    return successResponse(res, "Payment method deleted successfully", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Set default payment method
 * @route PATCH /api/v1/payments/methods/:methodId/default
 */
const setDefaultPaymentMethod = async (req, res, next) => {
  try {
    const { methodId } = req.params;

    // DEMO MODE - Return mock success
    if (DEMO_MODE) {
      return successResponse(res, "Default payment method updated", 200, {
        paymentMethod: {
          id: methodId || generateDemoId("pm"),
          stripePaymentMethodId: generateDemoId("pm"),
          isDefault: true,
        },
      });
    }

    const paymentMethod = await PaymentMethod.findOne({
      _id: methodId,
      userId: req.user.id,
      status: "active",
    });

    if (!paymentMethod) {
      throw new AppError("Payment method not found", 404);
    }

    // Update default (pre-save middleware handles unsetting others)
    paymentMethod.isDefault = true;
    await paymentMethod.save();

    logger.info(
      `Default payment method set: ${paymentMethod.stripePaymentMethodId}`,
      "PAYMENT_CONTROLLER"
    );

    return successResponse(res, "Default payment method updated", 200, {
      paymentMethod: {
        id: paymentMethod._id,
        stripePaymentMethodId: paymentMethod.stripePaymentMethodId,
        isDefault: paymentMethod.isDefault,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Charge with saved payment method
 * @route POST /api/v1/payments/charge
 */
const chargeWithPaymentMethod = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const {
      invoiceId,
      amount,
      currency = "inr",
      stripeCustomerId,
      stripePaymentMethodId,
      description,
      metadata = {},
      offSession = false,
    } = req.body;

    // DEMO MODE - Return mock response
    if (DEMO_MODE) {
      const demoTransactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const demoAmount = amount || 10000; // Demo amount in cents
      
      return successResponse(res, "Payment processed successfully", 200, {
        id: generateDemoId("txn"),
        transactionNumber: demoTransactionNumber,
        invoiceId,
        amount: demoAmount,
        currency: currency || "inr",
        paymentMethod: "stripe",
        status: "succeeded",
        stripePaymentIntentId: generateDemoId("pi"),
        stripeChargeId: generateDemoId("ch"),
        stripeCustomerId: stripeCustomerId || generateDemoId("cus"),
        stripePaymentMethodId: stripePaymentMethodId || generateDemoId("pm"),
        description: description || "Demo payment",
        stripeFeeAmount: Math.round(demoAmount * 0.029 + 30) / 100, // Mock fee calculation
        paymentMethodDetails: {
          brand: "visa",
          lastFourDigits: "4242",
        },
        timestamp: new Date(),
        metadata: metadata || {},
      });
    }

    // Validate invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    if (invoice.status === "paid") {
      throw new AppError("Invoice is already paid", 400);
    }

    // Validate payment method exists
    const paymentMethod = await PaymentMethod.findOne({
      stripePaymentMethodId,
      userId: req.user.id,
      status: "active",
    });

    if (!paymentMethod) {
      throw new AppError("Payment method not found", 404);
    }

    // Create payment intent with automatic confirmation
    const chargeAmount = amount || invoice.totalAmount;
    const transactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const paymentIntent = await StripeService.createPaymentIntent({
      amount: chargeAmount,
      currency,
      customerId: stripeCustomerId,
      paymentMethodId: stripePaymentMethodId,
      description: description || `Payment for ${invoice.invoiceNumber}`,
      metadata: {
        invoiceId: invoiceId.toString(),
        userId: req.user.id.toString(),
        companyId: req.user.companyId.toString(),
        ...metadata,
      },
      offSession,
    });

    // Confirm the payment intent
    const confirmedIntent = await StripeService.confirmPaymentIntent(
      paymentIntent.id,
      { payment_method: stripePaymentMethodId }
    );

    // Create transaction record
    const transaction = await Transaction.create({
      transactionNumber,
      invoiceId,
      companyId: req.user.companyId,
      userId: req.user.id,
      amount: chargeAmount,
      currency,
      paymentMethod: "stripe",
      status: confirmedIntent.status === "succeeded" ? "succeeded" : "processing",
      stripePaymentIntentId: confirmedIntent.id,
      stripeCustomerId,
      stripePaymentMethodId,
      description,
      idempotencyKey: StripeService.generateIdempotencyKey(transactionNumber),
    });

    // If charge succeeded, update invoice
    if (confirmedIntent.status === "succeeded") {
      const charge = confirmedIntent.charges.data[0];
      transaction.stripeChargeId = charge.id;
      transaction.stripeFeeAmount = (charge.balance_transaction?.fee || 0) / 100;
      
      if (charge.payment_method_details?.card) {
        transaction.paymentMethodDetails = {
          brand: charge.payment_method_details.card.brand,
          lastFourDigits: charge.payment_method_details.card.last4,
        };
      }
      
      await transaction.save();

      // Update invoice
      invoice.amountPaid = (invoice.amountPaid || 0) + chargeAmount;
      if (invoice.amountPaid >= invoice.totalAmount) {
        invoice.status = "paid";
        invoice.paidDate = new Date();
      } else if (invoice.amountPaid > 0) {
        invoice.status = "partially_paid";
      }
      
      invoice.paymentAttempts.push({
        transactionId: transaction._id,
        amount: chargeAmount,
        status: "succeeded",
        createdAt: new Date(),
      });
      await invoice.save();

      // Update payment method usage
      paymentMethod.lastUsedAt = new Date();
      await paymentMethod.save();
    }

    logger.info(
      `Charge processed: ${transactionNumber} for invoice ${invoice.invoiceNumber}`,
      "PAYMENT_CONTROLLER"
    );

    return successResponse(res, "Charge processed successfully", 200, {
      transaction: {
        id: transaction._id,
        transactionNumber: transaction.transactionNumber,
        status: transaction.status,
        amount: transaction.amount,
      },
      invoiceStatus: invoice.status,
      stripePaymentIntentId: confirmedIntent.id,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Process a refund
 * @route POST /api/v1/payments/refund/:transactionId
 */
const processRefund = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { transactionId } = req.params;
    const { amount, reason, metadata = {} } = req.body;

    // DEMO MODE - Return mock refund response
    if (DEMO_MODE) {
      const refundAmount = amount || 10000;
      return successResponse(res, "Refund processed successfully", 200, {
        refund: {
          id: generateDemoId("re"),
          status: "succeeded",
          amount: refundAmount,
          reason: reason || "Requested by customer",
          timestamp: new Date(),
        },
        transaction: {
          id: transactionId || generateDemoId("txn"),
          status: "refunded",
          refundedAmount: refundAmount,
        },
      });
    }

    // Find original transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    if (transaction.status !== "succeeded") {
      throw new AppError("Can only refund succeeded transactions", 400);
    }

    // Calculate refundable amount
    const totalRefunded = (transaction.refunds || []).reduce((sum, r) => sum + r.amount, 0);
    const refundableAmount = transaction.amount - totalRefunded;

    const refundAmount = amount || refundableAmount;

    if (refundAmount > refundableAmount) {
      throw new AppError(
        `Maximum refundable amount is ${refundableAmount}`,
        400
      );
    }

    // Create refund in Stripe
    const refund = await StripeService.createRefund({
      paymentIntentId: transaction.stripePaymentIntentId,
      chargeId: transaction.stripeChargeId,
      amount: refundAmount,
      reason,
      metadata: {
        userId: req.user.id.toString(),
        companyId: req.user.companyId.toString(),
        ...metadata,
      },
    });

    // Update transaction
    transaction.refunds.push({
      refundId: refund.id,
      amount: refundAmount,
      status: refund.status,
      createdAt: new Date(),
    });

    if (totalRefunded + refundAmount >= transaction.amount) {
      transaction.status = "refunded";
    }

    await transaction.save();

    // Update invoice if applicable
    if (transaction.invoiceId) {
      const invoice = await Invoice.findById(transaction.invoiceId);
      if (invoice) {
        invoice.amountPaid = Math.max(0, (invoice.amountPaid || 0) - refundAmount);

        if (invoice.amountPaid <= 0) {
          invoice.status = "draft";
        } else if (invoice.amountPaid < invoice.totalAmount) {
          invoice.status = "partially_paid";
        }

        invoice.paymentAttempts.push({
          transactionId: transaction._id,
          amount: -refundAmount,
          status: refund.status,
          createdAt: new Date(),
        });

        await invoice.save();
      }
    }

    logger.info(
      `Refund processed: ${refund.id} for transaction ${transaction.transactionNumber}`,
      "PAYMENT_CONTROLLER"
    );

    return successResponse(res, "Refund processed successfully", 200, {
      refund: {
        id: refund.id,
        status: refund.status,
        amount: refundAmount,
        reason,
      },
      transaction: {
        id: transaction._id,
        status: transaction.status,
        amountRefunded: totalRefunded + refundAmount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all transactions
 * @route GET /api/v1/payments/transactions
 */
const getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      companyId,
      startDate,
      endDate,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // DEMO MODE - Return mock transactions
    if (DEMO_MODE) {
      return paginated(res, "Transactions retrieved successfully", [
        {
          _id: generateDemoId("txn"),
          transactionNumber: `TXN-${Date.now()}`,
          invoiceId: { invoiceNumber: "INV-001", totalAmount: 5000, status: "paid" },
          companyId: { name: "Demo Company" },
          amount: 5000,
          currency: "inr",
          paymentMethod: "stripe",
          status: "succeeded",
          stripePaymentIntentId: generateDemoId("pi"),
          stripeChargeId: generateDemoId("ch"),
          createdAt: new Date(),
        },
        {
          _id: generateDemoId("txn"),
          transactionNumber: `TXN-${Date.now() - 86400000}`,
          invoiceId: { invoiceNumber: "INV-002", totalAmount: 3000, status: "paid" },
          companyId: { name: "Demo Company" },
          amount: 3000,
          currency: "inr",
          paymentMethod: "stripe",
          status: "succeeded",
          stripePaymentIntentId: generateDemoId("pi"),
          stripeChargeId: generateDemoId("ch"),
          createdAt: new Date(Date.now() - 86400000),
        },
      ], {
        page: 1,
        limit: 10,
        total: 2,
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {
      isDeleted: false,
    };

    // Filter by user's company if not admin
    if (req.user.role !== "admin" && req.user.companyId) {
      query.companyId = req.user.companyId;
    } else if (companyId) {
      query.companyId = companyId;
    }

    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { transactionNumber: new RegExp(search, "i") },
        { stripePaymentIntentId: new RegExp(search, "i") },
      ];
    }

    const total = await Transaction.countDocuments(query);
    const transactions = await Transaction.find(query)
      .populate("invoiceId", "invoiceNumber totalAmount status")
      .populate("companyId", "name")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(limitNum);

    return paginated(res, "Transactions retrieved successfully", transactions, {
      page: pageNum,
      limit: limitNum,
      total,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get transaction by ID
 * @route GET /api/v1/payments/transactions/:transactionId
 */
const getTransactionById = async (req, res, next) => {
  try {
    const { transactionId } = req.params;

    // DEMO MODE - Return mock transaction
    if (DEMO_MODE) {
      return successResponse(res, "Transaction retrieved successfully", 200, {
        transaction: {
          _id: transactionId || generateDemoId("txn"),
          transactionNumber: `TXN-${Date.now()}`,
          invoiceId: {
            _id: generateDemoId("inv"),
            invoiceNumber: "INV-001",
            totalAmount: 5000,
            status: "paid",
          },
          companyId: {
            _id: generateDemoId("cmp"),
            name: "Demo Company",
          },
          userId: {
            _id: generateDemoId("usr"),
            email: "demo@example.com",
            name: "Demo User",
          },
          amount: 5000,
          currency: "inr",
          paymentMethod: "stripe",
          status: "succeeded",
          stripePaymentIntentId: generateDemoId("pi"),
          stripeChargeId: generateDemoId("ch"),
          stripeFeeAmount: 145.30,
          description: "Demo payment",
          createdAt: new Date(),
        },
      });
    }

    const transaction = await Transaction.findById(transactionId)
      .populate("invoiceId")
      .populate("companyId")
      .populate("userId");

    if (!transaction) {
      throw new AppError("Transaction not found", 404);
    }

    return successResponse(res, "Transaction retrieved successfully", 200, {
      transaction,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Pay an invoice with Stripe
 * @route POST /api/v1/payments/invoice/:invoiceId/pay
 */
const payInvoice = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { invoiceId } = req.params;
    const { stripePaymentMethodId, amount, metadata = {} } = req.body;

    // DEMO MODE - Return mock invoice payment
    if (DEMO_MODE) {
      const demoTransactionNumber = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const payAmount = amount || 5000;
      
      return successResponse(res, "Invoice paid successfully", 200, {
        invoice: {
          id: invoiceId || generateDemoId("inv"),
          invoiceNumber: "INV-001",
          status: "paid",
          amountPaid: payAmount,
          totalAmount: payAmount,
        },
        transaction: {
          id: generateDemoId("txn"),
          transactionNumber: demoTransactionNumber,
          amount: payAmount,
          status: "succeeded",
          stripePaymentIntentId: generateDemoId("pi"),
          timestamp: new Date(),
        },
      });
    }

    // Get invoice
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    if (invoice.status === "paid") {
      throw new AppError("Invoice is already paid", 400);
    }

    // Get Stripe customer
    const customer = await stripe.customers.list({
      email: req.user.email,
      limit: 1,
    });

    if (customer.data.length === 0) {
      throw new AppError("Stripe customer not found. Please add a payment method first.", 404);
    }

    // Use charge endpoint which calls chargeWithPaymentMethod internally
    return chargeWithPaymentMethod(req, res, next);
  } catch (err) {
    next(err);
  }
};

/**
 * Handle Stripe webhook
 * @route POST /api/v1/payments/webhook
 */
const handleStripeWebhook = async (req, res, next) => {
  try {
    // DEMO MODE - Return mock webhook response
    if (DEMO_MODE) {
      return successResponse(res, "Webhook processed", 200, { 
        received: true,
        mode: "DEMO",
        eventId: generateDemoId("evt"),
      });
    }

    // Get raw body for signature verification
    const sig = req.headers["stripe-signature"];
    
    let event;
    try {
      event = StripeService.constructWebhookEvent(req.rawBody, sig);
    } catch (err) {
      logger.error(`Webhook signature verification failed: ${err.message}`, "WEBHOOK");
      return errorResponse(res, "Invalid signature", 400);
    }

    // Log webhook
    await StripeService.logWebhookEvent(event, {
      status: "processing",
    });

    // Process event based on type
    switch (event.type) {
      case "payment_intent.succeeded":
        await StripeService.handlePaymentIntentSucceeded(event.data.object);
        break;

      case "payment_intent.payment_failed":
        await StripeService.handlePaymentIntentFailed(event.data.object);
        break;

      case "charge.refunded":
        await StripeService.handleChargeRefunded(event.data.object);
        break;

      case "customer.payment_method.attached":
        logger.info(`Payment method attached: ${event.data.object.id}`, "WEBHOOK");
        break;

      case "customer.payment_method.detached":
        logger.info(`Payment method detached: ${event.data.object.id}`, "WEBHOOK");
        break;

      default:
        logger.info(`Unhandled webhook event: ${event.type}`, "WEBHOOK");
    }

    // Update webhook log
    await StripeWebhookLog.updateOne(
      { stripeEventId: event.id },
      { status: "processed", processedAt: new Date() }
    );

    return successResponse(res, "Webhook processed", 200, { received: true });
  } catch (err) {
    logger.error(`Webhook processing failed: ${err.message}`, "WEBHOOK");
    return errorResponse(res, "Webhook processing failed", 500);
  }
};

module.exports = {
  createPaymentIntent,
  confirmPaymentIntent,
  savePaymentMethod,
  listPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  chargeWithPaymentMethod,
  processRefund,
  getTransactions,
  getTransactionById,
  payInvoice,
  handleStripeWebhook,
};
