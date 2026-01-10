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
    },
    shipmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shipment",
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
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
      enum: ["draft", "sent", "viewed", "paid", "overdue", "cancelled"],
      default: "draft",
      index: true,
    },
    dueDate: Date,
    paidDate: Date,
    paymentMethod: String,
    notes: String,
    isDeleted: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model("Invoice", invoiceSchema);
