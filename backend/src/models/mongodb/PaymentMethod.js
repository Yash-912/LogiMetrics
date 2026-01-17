const mongoose = require("mongoose");

const paymentMethodSchema = new mongoose.Schema(
  {
    stripePaymentMethodId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      index: true,
    },
    stripeCustomerId: {
      type: String,
      required: true,
    },

    // Payment method type
    type: {
      type: String,
      enum: ["card", "sepa_debit", "ach_debit", "ideal", "afterpay_clearpay"],
      required: true,
    },

    // Card details (if type is card)
    card: {
      brand: String, // visa, mastercard, amex, etc.
      lastFourDigits: String,
      expiryMonth: Number,
      expiryYear: Number,
      country: String,
      fingerprint: String, // Unique card fingerprint
      funding: String, // credit, debit, prepaid, unknown
      holderName: String,
    },

    // Bank account details (if type is bank_account)
    bankAccount: {
      bankName: String,
      accountHolderName: String,
      lastFourDigits: String,
      routingNumber: String,
      country: String,
    },

    // Default payment method
    isDefault: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Payment method status
    status: {
      type: String,
      enum: ["active", "inactive", "expired", "deleted"],
      default: "active",
      index: true,
    },

    // Metadata
    nickname: String,
    description: String,
    metadata: {
      type: Map,
      of: String,
    },

    // Billing address
    billingAddress: {
      line1: String,
      line2: String,
      city: String,
      state: String,
      postalCode: String,
      country: String,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Tracking
    lastUsedAt: Date,
    expiresAt: Date,
  },
  {
    timestamps: true,
    collection: "payment_methods",
  }
);

// Indexes for better query performance
paymentMethodSchema.index({ userId: 1, isDefault: 1 });
paymentMethodSchema.index({ userId: 1, status: 1 });
paymentMethodSchema.index({ companyId: 1, status: 1 });
paymentMethodSchema.index({ stripeCustomerId: 1 });

// Pre-save middleware to ensure only one default payment method per user
paymentMethodSchema.pre("save", async function (next) {
  if (this.isDefault && !this.isDeleted) {
    // Unset default flag on other payment methods for this user
    await this.constructor.updateMany(
      {
        userId: this.userId,
        _id: { $ne: this._id },
        isDeleted: false,
      },
      { $set: { isDefault: false } }
    );
  }
  next();
});

module.exports = mongoose.model("PaymentMethod", paymentMethodSchema);
