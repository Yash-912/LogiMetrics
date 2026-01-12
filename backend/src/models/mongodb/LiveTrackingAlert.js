/**
 * LiveTrackingAlert Model
 * Logs all accident zone alerts for vehicles
 */

const mongoose = require("mongoose");

const liveTrackingAlertSchema = new mongoose.Schema(
  {
    vehicleId: {
      type: String,
      required: true,
      index: true,
    },
    driverId: {
      type: String,
      required: true,
      index: true,
    },
    shipmentId: {
      type: String,
      index: true,
    },
    accidentZoneId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AccidentZone",
      required: true,
    },
    distance: {
      type: Number,
      required: true,
      comment: "Distance from zone in meters",
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      index: true,
    },
    accidentCount: {
      type: Number,
      required: true,
      comment: "Number of accidents in the zone",
    },
    zoneLocation: {
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
    vehicleLocation: {
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
    status: {
      type: String,
      enum: ["active", "acknowledged", "resolved"],
      default: "active",
      index: true,
    },
    acknowledgedAt: {
      type: Date,
    },
    acknowledgedBy: {
      type: String,
      comment: "Driver or admin who acknowledged the alert",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    collection: "live_tracking_alerts",
  }
);

// Indexes for common queries
liveTrackingAlertSchema.index({ vehicleId: 1, createdAt: -1 });
liveTrackingAlertSchema.index({ driverId: 1, createdAt: -1 });
liveTrackingAlertSchema.index({ shipmentId: 1, createdAt: -1 });
liveTrackingAlertSchema.index({ severity: 1, createdAt: -1 });
liveTrackingAlertSchema.index({ status: 1, createdAt: -1 });
liveTrackingAlertSchema.index({ zoneLocation: "2dsphere" });

// TTL index to automatically delete old records (keep 90 days)
liveTrackingAlertSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

module.exports = mongoose.model("LiveTrackingAlert", liveTrackingAlertSchema);
