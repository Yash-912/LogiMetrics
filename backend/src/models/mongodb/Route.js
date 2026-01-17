const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: String,
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    sourceLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
      required: true,
    },
    stops: [
      {
        locationId: mongoose.Schema.Types.ObjectId,
        sequenceNumber: Number,
        estimatedTime: Number,
      },
    ],
    distance: Number,
    estimatedTime: Number,
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    frequency: {
      type: String,
      enum: ["daily", "weekly", "monthly", "custom"],
    },
    costPerKm: Number,
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "routes",
  }
);

module.exports = mongoose.model("Route", routeSchema);
