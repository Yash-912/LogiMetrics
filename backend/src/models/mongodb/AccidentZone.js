import mongoose from "mongoose";

const accidentZoneSchema = new mongoose.Schema({
  location: {
    type: { type: String, enum: ["Point"], required: true },
    coordinates: { type: [Number], required: true },
  },
  severity: String,
  accidentCount: Number,
  lastUpdated: Date,
});

export default mongoose.model("AccidentZone", accidentZoneSchema);
