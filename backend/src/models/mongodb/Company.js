const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    registrationNumber: {
      type: String,
      unique: true,
    },
    taxId: String,
    email: {
      type: String,
      lowercase: true,
    },
    phone: String,
    website: String,
    industry: String,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    logo: String,
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    currency: {
      type: String,
      default: "USD",
    },
    timezone: {
      type: String,
      default: "UTC",
    },
    settings: {
      maxShipmentsPerDay: Number,
      autoInvoiceEnabled: Boolean,
      notificationEmail: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "companies",
  }
);

module.exports = mongoose.model("Company", companySchema);
