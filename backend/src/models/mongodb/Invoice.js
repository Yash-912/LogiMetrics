const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    customerAddress: String,
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        tax: Number,
        total: Number,
      },
    ],
    subtotal: Number,
    taxAmount: Number,
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled", "partially_paid"],
      default: "draft",
      index: true,
    },
    dueDate: Date,
    paidDate: Date,
    paymentMethod: String,
    notes: String,

    // Stripe-specific fields
    stripeInvoiceId: {
      type: String,
      index: true,
      sparse: true,
    },
    stripePaymentIntentId: {
      type: String,
      sparse: true,
    },
    stripePaymentStatus: String,

    // Payment tracking
    amountPaid: {
      type: Number,
      default: 0,
    },
    paymentDueAmount: {
      type: Number,
    },
    paymentAttempts: [
      {
        transactionId: mongoose.Schema.Types.ObjectId,
        amount: Number,
        status: String,
        createdAt: Date,
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "invoices",
  }
);

invoiceSchema.pre("save", async function (next) {
  if (this.isNew) {
    if (!this.invoiceNumber) {
      const count = await this.constructor.countDocuments({
        companyId: this.companyId,
      });
      this.invoiceNumber = `INV-${this.companyId}-${Date.now()}-${count + 1}`;
    }
  }
  next();
});

// Calculate remaining amount due
invoiceSchema.virtual("remainingAmount").get(function () {
  return this.totalAmount - (this.amountPaid || 0);
});

invoiceSchema.index({ companyId: 1, createdAt: -1 });
invoiceSchema.index({ customerId: 1, status: 1 });
invoiceSchema.index({ status: 1, dueDate: 1 });

module.exports = mongoose.model("Invoice", invoiceSchema);
