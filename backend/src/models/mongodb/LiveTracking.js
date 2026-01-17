const mongoose = require('mongoose');

const liveTrackingSchema = new mongoose.Schema({
  vehicleId: {
    type: String, // Keeping as String per user sample "vehicle-0"
    required: true,
    index: true
  },
  driverId: {
    type: String,
    // ref: 'Driver' // Optional: Uncomment if these match Driver _id
  },
  shipmentId: {
    type: String,
    // ref: 'Shipment'
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  speed: {
    type: Number,
    default: 0
  },
  heading: {
    type: Number,
    default: 0
  },
  accuracy: {
    type: Number,
    default: 0
  },
  altitude: {
    type: Number,
    default: null
  },
  address: {
    type: String
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  isMoving: {
    type: Boolean,
    default: false
  },
  ignitionStatus: {
    type: String,
    enum: ['on', 'off'],
    default: 'off'
  },
  metadata: {
    deviceId: String,
    signalStrength: Number
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Adds createdAt, updatedAt
  collection: 'live_tracking' // Explicit collection name
});

// 2dsphere index for geospatial queries
liveTrackingSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('LiveTracking', liveTrackingSchema);
