const mongoose = require("mongoose");

const shipmentSchema = new mongoose.Schema(
  {
    shipmentNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "picked_up",
        "in_transit",
        "delivered",
        "cancelled",
        "returned",
      ],
      default: "pending",
      index: true,
    },
    sourceLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    destinationLocationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Location",
    },
    sourceAddress: String,
    destinationAddress: String,
    sourceCoordinates: {
      lat: Number,
      lng: Number,
    },
    destinationCoordinates: {
      lat: Number,
      lng: Number,
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Driver",
    },
    vehicleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vehicle",
    },
    items: [
      {
        name: String,
        quantity: Number,
        weight: Number,
        volume: Number,
        description: String,
      },
    ],
    totalWeight: Number,
    totalVolume: Number,
    totalValue: Number,
    specialHandling: [String],
    pickupTime: Date,
    deliveryTime: Date,
    actualDeliveryTime: Date,
    estimatedDistance: Number,
    actualDistance: Number,
    estimatedCost: Number,
    actualCost: Number,
    recipientName: String,
    recipientPhone: String,
    recipientEmail: String,
    deliveryNotes: String,
    signatureUrl: String,
    proof: [String],
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Invoice",
    },
    routeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
    },
    waypoints: [
      {
        locationId: mongoose.Schema.Types.ObjectId,
        address: String,
        coordinates: { lat: Number, lng: Number },
        arrivalTime: Date,
        departureTime: Date,
        notes: String,
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "shipments",
  }
);

shipmentSchema.pre("save", async function (next) {
  if (this.isNew) {
    // Generate unique shipment number if not provided
    if (!this.shipmentNumber) {
      const count = await this.constructor.countDocuments({
        companyId: this.companyId,
      });
      this.shipmentNumber = `SHP-${this.companyId}-${Date.now()}-${count + 1}`;
    }
  }
  next();
});

module.exports = mongoose.model("Shipment", shipmentSchema);
