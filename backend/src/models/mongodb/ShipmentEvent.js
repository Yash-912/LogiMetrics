/**
 * ShipmentEvent Model
 * MongoDB collection for shipment event timeline
 */

const mongoose = require("mongoose");

const shipmentEventSchema = new mongoose.Schema(
  {
    shipmentId: {
      type: String,
      required: true,
      index: true,
    },
    trackingId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
      enum: [
        "created",
        "confirmed",
        "pickup_scheduled",
        "pickup_attempted",
        "picked_up",
        "in_transit",
        "arrived_hub",
        "departed_hub",
        "out_for_delivery",
        "delivery_attempted",
        "delivered",
        "failed_delivery",
        "returned",
        "cancelled",
        "rescheduled",
        "status_update",
        "location_update",
        "exception",
        "note_added",
      ],
    },
    status: {
      type: String,
      required: true,
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
      address: {
        type: String,
        default: "",
      },
      city: String,
      state: String,
    },
    description: {
      type: String,
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    performedBy: {
      userId: String,
      name: String,
      role: String,
    },
    attachments: [
      {
        type: {
          type: String,
          enum: ["image", "document", "signature"],
        },
        url: String,
        name: String,
      },
    ],
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isPublic: {
      type: Boolean,
      default: true,
      comment: "Whether this event is visible to customers",
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "shipment_events",
  }
);

// Indexes
shipmentEventSchema.index({ shipmentId: 1, timestamp: -1 });
shipmentEventSchema.index({ trackingId: 1, timestamp: -1 });
shipmentEventSchema.index({ eventType: 1, timestamp: -1 });

// Static methods
shipmentEventSchema.statics.getTimeline = async function (shipmentId) {
  return this.find({ shipmentId }).sort({ timestamp: 1 });
};

shipmentEventSchema.statics.getPublicTimeline = async function (trackingId) {
  return this.find({ trackingId, isPublic: true })
    .sort({ timestamp: 1 })
    .select("-performedBy.userId -metadata");
};

shipmentEventSchema.statics.getLatestEvent = async function (shipmentId) {
  return this.findOne({ shipmentId }).sort({ timestamp: -1 });
};

shipmentEventSchema.statics.addEvent = async function (eventData) {
  const event = new this(eventData);
  return event.save();
};

const ShipmentEvent = mongoose.model("ShipmentEvent", shipmentEventSchema);

module.exports = ShipmentEvent;
