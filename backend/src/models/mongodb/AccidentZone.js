const mongoose = require("mongoose");

const accidentZoneSchema = new mongoose.Schema({
  location: {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  },
  severity: {
    type: String,
    enum: ["low", "medium", "high"],
    required: true,
  },
  accidentCount: {
    type: Number,
    required: true,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
});

// Geo index
accidentZoneSchema.index({ location: "2dsphere" });

const AccidentZone = mongoose.model(
  "AccidentZone",
  accidentZoneSchema,
  "accidentzones"
);

module.exports = AccidentZone;
