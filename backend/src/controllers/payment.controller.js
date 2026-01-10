const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const {
  Transaction,
  Invoice,
  Company,
  User,
  PaymentMethod,
  Refund,
} = require("../models/mongodb");
const { AuditLog } = require("../models/mongodb");
const {
  successResponse,
  errorResponse,
  paginated,
} = require("../utils/response.util");
const { AppError } = require("../middleware/error.middleware");
const { getPaymentGateway } = require("../config/payment");
const logger = require("../utils/logger.util");

/**
 * Get all transactions with pagination and filters
 * @route GET /api/payments/transactions
 */
const getTransactions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      companyId,
      startDate,
      endDate,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (companyId) where.companyId = companyId;
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }
    if (search) {
      where[Op.or] = [
        { transactionId: { [Op.iLike]: `%${search}%` } },
        { referenceNumber: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filter by user's company if not admin
    if (req.user.role !== "admin" && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    const { count, rows: transactions } = await Transaction.findAndCountAll({
      where,
      include: [
        { model: Company, as: "company", attributes: ["id", "name"] },
        {
          model: Invoice,
          as: "invoice",
          attributes: ["id", "invoiceNumber", "totalAmount"],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return paginated(res, "Transactions retrieved successfully", transactions, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get transaction by ID
 * @route GET /api/payments/transactions/:id
 */
const getTransactionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const transaction = await Transaction.findByPk(id, {
      include: [
        { model: Company, as: "company" },
        { model: Invoice, as: "invoice" },
        { model: PaymentMethod, as: "paymentMethod" },
        { model: Refund, as: "refunds" },
      ],
    });

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
 * Process a payment
 * @route POST /api/payments/process
 */
const processPayment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const {
      invoiceId,
      amount,
      currency,
      paymentMethodId,
      description,
      metadata,
    } = req.body;

    // Validate invoice
    const invoice = await Invoice.findByPk(invoiceId);
    if (!invoice) {
      throw new AppError("Invoice not found", 404);
    }

    if (invoice.status === "paid") {
      throw new AppError("Invoice is already paid", 400);
    }

    // Get payment method
    const paymentMethod = await PaymentMethod.findByPk(paymentMethodId);
    if (!paymentMethod) {
      throw new AppError("Payment method not found", 404);
    }

    // Generate transaction ID
    const transactionId = `TXN${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;

    // Process payment through gateway
    const paymentGateway = getPaymentGateway();

    let gatewayResponse;
    try {
      gatewayResponse = await paymentGateway.processPayment({
        amount,
        currency: currency || "USD",
        paymentMethod: paymentMethod.gatewayToken,
        description:
          description || `Payment for invoice ${invoice.invoiceNumber}`,
        metadata: {
          invoiceId,
          transactionId,
          ...metadata,
        },
      });
    } catch (gatewayErr) {
      // Log failed transaction
      await Transaction.create({
        transactionId,
        invoiceId,
        companyId: invoice.companyId,
        amount,
        currency: currency || "USD",
        type: "payment",
        status: "failed",
        paymentMethodId,
        failureReason: gatewayErr.message,
        processedAt: new Date(),
        createdBy: req.user.id,
      });

      throw new AppError(`Payment failed: ${gatewayErr.message}`, 400);
    }

    // Create successful transaction
    const transaction = await Transaction.create({
      transactionId,
      invoiceId,
      companyId: invoice.companyId,
      amount,
      currency: currency || "USD",
      type: "payment",
      status: "completed",
      paymentMethodId,
      gatewayTransactionId: gatewayResponse.transactionId,
      gatewayResponse: gatewayResponse,
      processedAt: new Date(),
      createdBy: req.user.id,
    });

    // Update invoice status
    const totalPaid = await Transaction.sum("amount", {
      where: { invoiceId, status: "completed", type: "payment" },
    });

    const totalRefunded =
      (await Transaction.sum("amount", {
        where: { invoiceId, status: "completed", type: "refund" },
      })) || 0;

    const netPaid = totalPaid - totalRefunded;

    if (netPaid >= invoice.totalAmount) {
      await invoice.update({ status: "paid", paidAt: new Date() });
    } else if (netPaid > 0) {
      await invoice.update({ status: "partial", amountPaid: netPaid });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "PAYMENT_PROCESSED",
      resource: "Transaction",
      resourceId: transaction.id,
      details: { amount, invoiceId, transactionId },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(
      `Payment processed: ${transactionId} for invoice ${invoice.invoiceNumber}`
    );

    return successResponse(res, "Payment processed successfully", 200, {
      transaction,
      invoiceStatus: invoice.status,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Process a refund
 * @route POST /api/payments/refund
 */
const processRefund = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { transactionId, amount, reason } = req.body;

    // Get original transaction
    const originalTransaction = await Transaction.findOne({
      where: { transactionId },
      include: [{ model: Invoice, as: "invoice" }],
    });

    if (!originalTransaction) {
      throw new AppError("Original transaction not found", 404);
    }

    if (originalTransaction.status !== "completed") {
      throw new AppError("Can only refund completed transactions", 400);
    }

    // Calculate available refund amount
    const previousRefunds =
      (await Refund.sum("amount", {
        where: {
          originalTransactionId: originalTransaction.id,
          status: "completed",
        },
      })) || 0;

    const availableForRefund = originalTransaction.amount - previousRefunds;

    if (amount > availableForRefund) {
      throw new AppError(
        `Maximum refundable amount is ${availableForRefund}`,
        400
      );
    }

    // Generate refund transaction ID
    const refundTransactionId = `REF${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 6)
      .toUpperCase()}`;

    // Process refund through gateway
    const paymentGateway = getPaymentGateway();

    let gatewayResponse;
    try {
      gatewayResponse = await paymentGateway.processRefund({
        originalTransactionId: originalTransaction.gatewayTransactionId,
        amount,
        reason,
      });
    } catch (gatewayErr) {
      throw new AppError(`Refund failed: ${gatewayErr.message}`, 400);
    }

    // Create refund record
    const refund = await Refund.create({
      refundId: refundTransactionId,
      originalTransactionId: originalTransaction.id,
      amount,
      reason,
      status: "completed",
      gatewayRefundId: gatewayResponse.refundId,
      processedAt: new Date(),
      processedBy: req.user.id,
    });

    // Create refund transaction
    const refundTransaction = await Transaction.create({
      transactionId: refundTransactionId,
      invoiceId: originalTransaction.invoiceId,
      companyId: originalTransaction.companyId,
      amount: -amount, // Negative for refund
      currency: originalTransaction.currency,
      type: "refund",
      status: "completed",
      gatewayTransactionId: gatewayResponse.refundId,
      gatewayResponse: gatewayResponse,
      processedAt: new Date(),
      createdBy: req.user.id,
    });

    // Update invoice if necessary
    if (originalTransaction.invoice) {
      const totalPaid =
        (await Transaction.sum("amount", {
          where: {
            invoiceId: originalTransaction.invoiceId,
            status: "completed",
            type: "payment",
          },
        })) || 0;

      const totalRefunded =
        (await Refund.sum("amount", {
          where: {
            originalTransactionId: originalTransaction.id,
            status: "completed",
          },
        })) || 0;

      const netPaid = totalPaid - totalRefunded;

      if (netPaid <= 0) {
        await originalTransaction.invoice.update({ status: "refunded" });
      } else if (netPaid < originalTransaction.invoice.totalAmount) {
        await originalTransaction.invoice.update({
          status: "partial",
          amountPaid: netPaid,
        });
      }
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "REFUND_PROCESSED",
      resource: "Refund",
      resourceId: refund.id,
      details: { amount, reason, originalTransactionId: transactionId },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Refund processed: ${refundTransactionId} for ${amount}`);

    return successResponse(res, "Refund processed successfully", 200, {
      refund,
      transaction: refundTransaction,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add payment method
 * @route POST /api/payments/methods
 */
const addPaymentMethod = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const {
      type,
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      cardholderName,
      billingAddress,
      bankName,
      accountNumber,
      routingNumber,
      setAsDefault,
    } = req.body;

    // Tokenize with payment gateway
    const paymentGateway = getPaymentGateway();

    let gatewayToken;
    try {
      if (type === "card") {
        gatewayToken = await paymentGateway.tokenizeCard({
          number: cardNumber,
          expiryMonth,
          expiryYear,
          cvv,
          name: cardholderName,
        });
      } else if (type === "bank_account") {
        gatewayToken = await paymentGateway.tokenizeBankAccount({
          bankName,
          accountNumber,
          routingNumber,
        });
      }
    } catch (gatewayErr) {
      throw new AppError(
        `Failed to add payment method: ${gatewayErr.message}`,
        400
      );
    }

    // If setting as default, unset other defaults
    if (setAsDefault) {
      await PaymentMethod.update(
        { isDefault: false },
        { where: { userId: req.user.id } }
      );
    }

    const paymentMethod = await PaymentMethod.create({
      userId: req.user.id,
      companyId: req.user.companyId,
      type,
      last4: type === "card" ? cardNumber.slice(-4) : accountNumber.slice(-4),
      brand: type === "card" ? detectCardBrand(cardNumber) : null,
      expiryMonth: type === "card" ? expiryMonth : null,
      expiryYear: type === "card" ? expiryYear : null,
      cardholderName: type === "card" ? cardholderName : null,
      bankName: type === "bank_account" ? bankName : null,
      billingAddress,
      gatewayToken: gatewayToken.token,
      gatewayCustomerId: gatewayToken.customerId,
      isDefault: setAsDefault || false,
      status: "active",
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "PAYMENT_METHOD_ADDED",
      resource: "PaymentMethod",
      resourceId: paymentMethod.id,
      details: { type, last4: paymentMethod.last4 },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Payment method added successfully", 201, {
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type,
        last4: paymentMethod.last4,
        brand: paymentMethod.brand,
        expiryMonth: paymentMethod.expiryMonth,
        expiryYear: paymentMethod.expiryYear,
        isDefault: paymentMethod.isDefault,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get payment methods
 * @route GET /api/payments/methods
 */
const getPaymentMethods = async (req, res, next) => {
  try {
    const paymentMethods = await PaymentMethod.findAll({
      where: { userId: req.user.id, status: "active" },
      attributes: [
        "id",
        "type",
        "last4",
        "brand",
        "expiryMonth",
        "expiryYear",
        "bankName",
        "isDefault",
        "createdAt",
      ],
      order: [
        ["isDefault", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    return successResponse(res, "Payment methods retrieved successfully", 200, {
      paymentMethods,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete payment method
 * @route DELETE /api/payments/methods/:id
 */
const deletePaymentMethod = async (req, res, next) => {
  try {
    const { id } = req.params;

    const paymentMethod = await PaymentMethod.findOne({
      where: { id, userId: req.user.id },
    });

    if (!paymentMethod) {
      throw new AppError("Payment method not found", 404);
    }

    // Remove from gateway
    const paymentGateway = getPaymentGateway();
    try {
      await paymentGateway.deletePaymentMethod(paymentMethod.gatewayToken);
    } catch (gatewayErr) {
      logger.warn(
        `Failed to delete payment method from gateway: ${gatewayErr.message}`
      );
    }

    await paymentMethod.update({ status: "deleted" });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "PAYMENT_METHOD_DELETED",
      resource: "PaymentMethod",
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Payment method deleted successfully", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Set default payment method
 * @route PATCH /api/payments/methods/:id/default
 */
const setDefaultPaymentMethod = async (req, res, next) => {
  try {
    const { id } = req.params;

    const paymentMethod = await PaymentMethod.findOne({
      where: { id, userId: req.user.id, status: "active" },
    });

    if (!paymentMethod) {
      throw new AppError("Payment method not found", 404);
    }

    // Unset other defaults
    await PaymentMethod.update(
      { isDefault: false },
      { where: { userId: req.user.id } }
    );

    await paymentMethod.update({ isDefault: true });

    return successResponse(res, "Default payment method updated", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Get payment summary/stats
 * @route GET /api/payments/summary
 */
const getPaymentSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    const where = { status: "completed" };
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }
    if (companyId) {
      where.companyId = companyId;
    } else if (req.user.role !== "admin" && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    // Get totals
    const totalPayments =
      (await Transaction.sum("amount", {
        where: { ...where, type: "payment" },
      })) || 0;

    const totalRefunds =
      (await Transaction.sum("amount", {
        where: { ...where, type: "refund" },
      })) || 0;

    const transactionCount = await Transaction.count({ where });

    // Get by status
    const byStatus = await Transaction.findAll({
      where: companyId ? { companyId } : {},
      attributes: [
        "status",
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        [sequelize.fn("SUM", sequelize.col("amount")), "total"],
      ],
      group: ["status"],
      raw: true,
    });

    return successResponse(res, "Payment summary retrieved", 200, {
      summary: {
        totalPayments,
        totalRefunds: Math.abs(totalRefunds),
        netRevenue: totalPayments - Math.abs(totalRefunds),
        transactionCount,
        byStatus,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Handle webhook from payment gateway
 * @route POST /api/payments/webhook
 */
const handleWebhook = async (req, res, next) => {
  try {
    const { event, data } = req.body;

    logger.info(`Payment webhook received: ${event}`);

    switch (event) {
      case "payment.succeeded":
        // Update transaction status if pending
        await Transaction.update(
          { status: "completed", processedAt: new Date() },
          {
            where: {
              gatewayTransactionId: data.transactionId,
              status: "pending",
            },
          }
        );
        break;

      case "payment.failed":
        await Transaction.update(
          { status: "failed", failureReason: data.error },
          {
            where: {
              gatewayTransactionId: data.transactionId,
              status: "pending",
            },
          }
        );
        break;

      case "refund.succeeded":
        await Refund.update(
          { status: "completed", processedAt: new Date() },
          { where: { gatewayRefundId: data.refundId, status: "pending" } }
        );
        break;

      case "dispute.created":
        // Handle dispute
        logger.warn(`Payment dispute created: ${data.transactionId}`);
        await AuditLog.create({
          action: "PAYMENT_DISPUTE_CREATED",
          resource: "Transaction",
          details: data,
        });
        break;

      default:
        logger.info(`Unhandled webhook event: ${event}`);
    }

    return successResponse(res, "Webhook processed", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Helper function to detect card brand
 */
const detectCardBrand = (cardNumber) => {
  const number = cardNumber.replace(/\s/g, "");

  if (/^4/.test(number)) return "visa";
  if (/^5[1-5]/.test(number)) return "mastercard";
  if (/^3[47]/.test(number)) return "amex";
  if (/^6(?:011|5)/.test(number)) return "discover";

  return "unknown";
};

module.exports = {
  getTransactions,
  getTransactionById,
  processPayment,
  processRefund,
  addPaymentMethod,
  getPaymentMethods,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  getPaymentSummary,
  handleWebhook,
};
