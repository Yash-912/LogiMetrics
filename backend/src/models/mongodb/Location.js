const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    address: String,
    city: {
      type: String,
      required: true,
    },
    state: String,
    zipCode: String,
    country: {
      type: String,
      default: "India",
    },
    coordinates: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
    },
    locationType: {
      type: String,
      enum: [
        "warehouse",
        "distribution_center",
        "pickup_point",
        "delivery_point",
        "hub",
      ],
    },
    contactPerson: String,
    phone: String,
    email: String,
    operatingHours: {
      open: String,
      close: String,
    },
    capacity: {
      maxShipments: Number,
      maxWeight: Number,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "locations",
  }
);

// Create geospatial index
locationSchema.index({ "coordinates.coordinates": "2dsphere" });

module.exports = mongoose.model("Location", locationSchema);
