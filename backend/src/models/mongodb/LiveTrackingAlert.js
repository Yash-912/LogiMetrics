const mongoose = require('mongoose');

const liveTrackingAlertSchema = new mongoose.Schema({
    vehicleId: {
        type: String,
        required: true,
        index: true
    },
    driverId: {
        type: String
    },
    shipmentId: {
        type: String
    },
    accidentZoneId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AccidentZone',
        required: true
    },
    distance: {
        type: Number, // Distance in meters at time of alert
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        required: true
    },
    accidentCount: {
        type: Number
    },
    zoneLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number]
    },
    vehicleLocation: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: [Number]
    },
    status: {
        type: String,
        enum: ['active', 'resolved', 'dismissed'],
        default: 'active'
    },
    resolvedAt: Date,
    dismissedAt: Date
}, {
    timestamps: true,
    collection: 'livetrackingalerts'
});

liveTrackingAlertSchema.index({ vehicleId: 1, createdAt: -1 });
liveTrackingAlertSchema.index({ status: 1 });

module.exports = mongoose.model('LiveTrackingAlert', liveTrackingAlertSchema);
