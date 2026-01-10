/**
 * VehicleTelemetry Model
 * MongoDB collection for vehicle sensor data
 */

const mongoose = require('mongoose');

const vehicleTelemetrySchema = new mongoose.Schema({
  vehicleId: {
    type: String,
    required: true,
    index: true
  },
  driverId: {
    type: String,
    index: true
  },
  telemetryType: {
    type: String,
    required: true,
    enum: [
      'fuel_level',
      'speed',
      'rpm',
      'engine_temperature',
      'tire_pressure',
      'odometer',
      'battery_voltage',
      'temperature', // For refrigerated trucks
      'door_status',
      'ignition',
      'harsh_braking',
      'harsh_acceleration',
      'idle_time',
      'diagnostic_code'
    ]
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  unit: {
    type: String,
    default: ''
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    }
  },
  isAlert: {
    type: Boolean,
    default: false
  },
  alertType: {
    type: String,
    enum: ['warning', 'critical', null],
    default: null
  },
  alertMessage: {
    type: String,
    default: ''
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
  collection: 'vehicle_telemetry'
});

// Indexes
vehicleTelemetrySchema.index({ vehicleId: 1, telemetryType: 1, timestamp: -1 });
vehicleTelemetrySchema.index({ isAlert: 1, timestamp: -1 });

// TTL index - keep telemetry data for 90 days
vehicleTelemetrySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

// Static methods
vehicleTelemetrySchema.statics.getLatestTelemetry = async function(vehicleId, telemetryType) {
  const query = { vehicleId };
  if (telemetryType) query.telemetryType = telemetryType;
  return this.findOne(query).sort({ timestamp: -1 });
};

vehicleTelemetrySchema.statics.getTelemetryHistory = async function(vehicleId, telemetryType, startTime, endTime) {
  return this.find({
    vehicleId,
    telemetryType,
    timestamp: { $gte: startTime, $lte: endTime }
  }).sort({ timestamp: 1 });
};

vehicleTelemetrySchema.statics.getAlerts = async function(vehicleId, limit = 50) {
  const query = { isAlert: true };
  if (vehicleId) query.vehicleId = vehicleId;
  return this.find(query).sort({ timestamp: -1 }).limit(limit);
};

vehicleTelemetrySchema.statics.getFuelHistory = async function(vehicleId, days = 7) {
  const startTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.aggregate([
    {
      $match: {
        vehicleId,
        telemetryType: 'fuel_level',
        timestamp: { $gte: startTime }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$timestamp' }
        },
        avgFuel: { $avg: '$value' },
        minFuel: { $min: '$value' },
        maxFuel: { $max: '$value' }
      }
    },
    { $sort: { _id: 1 } }
  ]);
};

const VehicleTelemetry = mongoose.model('VehicleTelemetry', vehicleTelemetrySchema);

module.exports = VehicleTelemetry;
