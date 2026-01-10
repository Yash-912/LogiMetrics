const mongoose = require("mongoose");

const stripeWebhookLogSchema = new mongoose.Schema(
  {
    stripeEventId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      index: true,
    },
    eventTimestamp: {
      type: Date,
      required: true,
      index: true,
    },

    // Related IDs
    stripeCustomerId: {
      type: String,
      index: true,
      sparse: true,
    },
    stripePaymentIntentId: {
      type: String,
      index: true,
      sparse: true,
    },
    stripeChargeId: {
      type: String,
      index: true,
      sparse: true,
    },
    stripeInvoiceId: {
      type: String,
      index: true,
      sparse: true,
    },

    // Event data
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Processing status
    status: {
      type: String,
      enum: ["received", "processing", "processed", "failed"],
      default: "received",
      index: true,
    },

    // Processing details
    processedAt: Date,
    errorMessage: String,
    errorCode: String,
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },

    // Related document updates
    relatedDocuments: [
      {
        documentType: {
          type: String,
          enum: ["Transaction", "Invoice", "PaymentMethod"],
        },
        documentId: mongoose.Schema.Types.ObjectId,
        updateStatus: String,
      },
    ],

    // User info
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      sparse: true,
      index: true,
    },

    // Signature verification
    signatureVerified: {
      type: Boolean,
      default: false,
    },

    // Raw request info
    requestId: String,
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: true,
    collection: "stripe_webhook_logs",
  }
);

// Indexes for efficient querying
stripeWebhookLogSchema.index({ eventType: 1, createdAt: -1 });
stripeWebhookLogSchema.index({ status: 1, createdAt: -1 });
stripeWebhookLogSchema.index({ companyId: 1, createdAt: -1 });
stripeWebhookLogSchema.index({ userId: 1, createdAt: -1 });
stripeWebhookLogSchema.index({ status: 1, retryCount: 1 });

// TTL index - Keep webhook logs for 90 days
stripeWebhookLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

module.exports = mongoose.model("StripeWebhookLog", stripeWebhookLogSchema);
