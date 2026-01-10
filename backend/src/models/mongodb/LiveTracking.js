/**
 * LiveTracking Model
 * MongoDB collection for real-time location tracking
 */

const mongoose = require('mongoose');

const liveTrackingSchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    index: true
  },
  driverId: {
    type: String,
    required: true,
    index: true
  },
  shipmentId: {
    type: String,
    index: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  speed: {
    type: Number,
    default: 0,
    comment: 'Speed in km/h'
  },
  heading: {
    type: Number,
    default: 0,
    comment: 'Direction in degrees (0-360)'
  },
  accuracy: {
    type: Number,
    default: 0,
    comment: 'GPS accuracy in meters'
  },
  altitude: {
    type: Number,
    default: null
  },
  address: {
    type: String,
    default: ''
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
    enum: ['on', 'off', 'unknown'],
    default: 'unknown'
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'live_tracking'
});

// Create geospatial index
liveTrackingSchema.index({ coordinates: '2dsphere' });

// Compound indexes for common queries
liveTrackingSchema.index({ vehicleId: 1, timestamp: -1 });
liveTrackingSchema.index({ shipmentId: 1, timestamp: -1 });

// TTL index to automatically delete old records (keep 30 days)
liveTrackingSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

// Static methods
liveTrackingSchema.statics.getLatestLocation = async function(vehicleId) {
  return this.findOne({ vehicleId }).sort({ timestamp: -1 });
};

liveTrackingSchema.statics.getLocationHistory = async function(vehicleId, startTime, endTime) {
  return this.find({
    vehicleId,
    timestamp: { $gte: startTime, $lte: endTime }
  }).sort({ timestamp: 1 });
};

liveTrackingSchema.statics.getNearbyVehicles = async function(longitude, latitude, maxDistance = 5000) {
  return this.aggregate([
    {
      $geoNear: {
        near: { type: 'Point', coordinates: [longitude, latitude] },
        distanceField: 'distance',
        maxDistance: maxDistance, // meters
        spherical: true
      }
    },
    {
      $sort: { timestamp: -1 }
    },
    {
      $group: {
        _id: '$vehicleId',
        doc: { $first: '$$ROOT' }
      }
    },
    {
      $replaceRoot: { newRoot: '$doc' }
    }
  ]);
};

const LiveTracking = mongoose.model('LiveTracking', liveTrackingSchema);

module.exports = LiveTracking;
