const mongoose = require("mongoose");

const vehicleSchema = new mongoose.Schema(
  {
    licensePlate: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: ["bike", "car", "van", "truck", "bus"],
      required: true,
    },
    make: String,
    model: String,
    year: Number,
    color: String,
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    capacity: {
      weight: Number, // in kg
      volume: Number, // in cubic meters
    },
    status: {
      type: String,
      enum: ["active", "inactive", "maintenance", "retired"],
      default: "active",
    },
    currentDriverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    purchaseDate: Date,
    registrationExpiry: Date,
    insuranceExpiry: Date,
    lastServiceDate: Date,
    nextServiceDate: Date,
    odometer: {
      type: Number,
      default: 0,
    },
    fuelType: {
      type: String,
      enum: ["petrol", "diesel", "electric", "hybrid"],
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        default: [0, 0],
      },
    },
    documents: [
      {
        type: String,
        url: String,
        expiryDate: Date,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "vehicles",
  }
);

// Create geospatial index
vehicleSchema.index({ location: "2dsphere" });

module.exports = mongoose.model("Vehicle", vehicleSchema);
