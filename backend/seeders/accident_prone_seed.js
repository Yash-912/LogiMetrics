import mongoose from "mongoose";
import AccidentZone from "../src/models/mongodb/AccidentZone.js";

await mongoose.connect(
  process.env.MONGODB_URI ||
    "mongodb+srv://sagacitychess_db_user:pOU7R8EwhrsErudP@logimatrix.fwvtwz8.mongodb.net/logi_matrix?retryWrites=true&w=majority"
);

await AccidentZone.deleteMany();

await AccidentZone.insertMany([
  {
    location: { type: "Point", coordinates: [73.8567, 18.5204] }, // Shivaji Nagar
    severity: "high",
    accidentCount: 18,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.8777, 18.531] }, // Yerwada
    severity: "medium",
    accidentCount: 9,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.8975, 18.561] }, // Viman Nagar
    severity: "high",
    accidentCount: 14,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.841, 18.509] }, // Karve Nagar
    severity: "medium",
    accidentCount: 8,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.8295, 18.5207] }, // Bavdhan
    severity: "low",
    accidentCount: 4,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.807, 18.5074] }, // Kothrud
    severity: "medium",
    accidentCount: 7,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.8737, 18.4967] }, // Swargate
    severity: "high",
    accidentCount: 20,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.8632, 18.453] }, // Hadapsar
    severity: "high",
    accidentCount: 16,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.8896, 18.4629] }, // Magarpatta
    severity: "medium",
    accidentCount: 10,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.78, 18.6298] }, // Hinjewadi Phase 1
    severity: "high",
    accidentCount: 22,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.7745, 18.5958] }, // Wakad
    severity: "medium",
    accidentCount: 11,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.8537, 18.5793] }, // Khadki
    severity: "medium",
    accidentCount: 9,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.902, 18.5679] }, // Vishrantwadi
    severity: "low",
    accidentCount: 5,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.834, 18.4943] }, // Warje Malwadi
    severity: "medium",
    accidentCount: 7,
    lastUpdated: new Date(),
  },
  {
    location: { type: "Point", coordinates: [73.876, 18.4875] }, // Camp Area
    severity: "high",
    accidentCount: 19,
    lastUpdated: new Date(),
  },
]);

console.log("✅ Accident-prone areas seeded successfully");
process.exit();
