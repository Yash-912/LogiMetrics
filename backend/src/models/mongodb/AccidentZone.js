// models/AccidentZone.model.js
const mongoose = require('mongoose');

const accidentZoneSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true
  },
  accidentCount: {
    type: Number,
    required: true,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: false
});

// Create a 2dsphere index for geospatial queries
accidentZoneSchema.index({ location: '2dsphere' });

// Export the model
module.exports = mongoose.model('AccidentZone', accidentZoneSchema);