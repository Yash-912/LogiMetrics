const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: "INR",
      uppercase: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "cash", "cheque", "upi", "stripe"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "succeeded", "failed", "refunded", "refund_pending"],
      default: "pending",
      index: true,
    },
    reference: String,
    paymentGateway: {
      type: String,
      enum: ["stripe", "razorpay", "other"],
    },
    description: String,

    // Stripe-specific fields
    stripePaymentIntentId: {
      type: String,
      sparse: true,
    },
    stripeChargeId: {
      type: String,
      sparse: true,
    },
    stripeCustomerId: {
      type: String,
      sparse: true,
    },
    stripePaymentMethodId: String,
    stripeFeeAmount: {
      type: Number,
      default: 0,
    },
    stripeMetadata: {
      type: Map,
      of: String,
    },

    // Payment details
    paymentMethodDetails: {
      brand: String, // visa, mastercard, amex, etc.
      lastFourDigits: String,
      expiryMonth: Number,
      expiryYear: Number,
      holderName: String,
      type: String, // card, bank_account, etc.
    },

    // Refund tracking
    refundAmount: {
      type: Number,
      default: 0,
    },
    refundReason: String,
    refunds: [
      {
        refundId: mongoose.Schema.Types.ObjectId,
        amount: Number,
        status: String,
        createdAt: Date,
      },
    ],

    // Error handling
    errorMessage: String,
    errorCode: String,
    failureReason: String,

    // Metadata
    ipAddress: String,
    userAgent: String,
    idempotencyKey: {
      type: String,
      index: true,
      sparse: true,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "transactions",
  }
);

// Index for faster queries
transactionSchema.index({ companyId: 1, createdAt: -1 });
transactionSchema.index({ userId: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ stripePaymentIntentId: 1 });

module.exports = mongoose.model("Transaction", transactionSchema);
