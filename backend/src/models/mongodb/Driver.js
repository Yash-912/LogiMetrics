const mongoose = require("mongoose");

const driverSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    firstname: {
      type: String,
      required: true,
    },
    lastname: {
      type: String,
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      // required: true, // Made optional for initial registration
    },
    licenseNumber: {
      type: String,
      unique: true,
      sparse: true, // Allow null/undefined to be unique
      // required: true, // Made optional
    },
    licenseExpiry: Date,
    licenseType: {
      type: String,
      enum: ["LMV", "HMV", "HPMV"],
    },
    status: {
      type: String,
      enum: ["available", "on_duty", "on_break", "off_duty"],
      default: "available",
    },
    currentVehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    phone: String,
    email: String,
    dateOfBirth: Date,
    address: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    documents: [
      {
        type: String,
        name: String,
        url: String,
        expiryDate: Date,
      },
    ],
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    totalShipments: {
      type: Number,
      default: 0,
    },
    totalDistance: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 5,
      min: 1,
      max: 5,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "drivers",
  }
);

module.exports = mongoose.model("Driver", driverSchema);
