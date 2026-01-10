const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    transactionNumber: {
      type: String,
      unique: true,
      required: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    amount: Number,
    currency: {
      type: String,
      default: "INR",
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank_transfer", "cash", "cheque", "upi"],
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "refunded"],
      default: "pending",
    },
    reference: String,
    paymentGateway: String,
    description: String,
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "transactions",
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);
