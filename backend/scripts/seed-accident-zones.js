/**
 * Seed Accident Zones
 * Creates sample accident-prone zones in Pune area for testing
 * Usage: node scripts/seed-accident-zones.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const AccidentZone = require("../src/models/mongodb/AccidentZone");

// Sample accident zones in Pune area with realistic data
const ACCIDENT_ZONES = [
  {
    location: {
      type: "Point",
      coordinates: [73.8589, 18.5204], // Downtown Pune - Lal Mahal area
    },
    severity: "high",
    accidentCount: 23,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.8715, 18.532], // JM Road intersection
    },
    severity: "high",
    accidentCount: 19,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.8935, 18.5458], // Pune Railway Station area
    },
    severity: "medium",
    accidentCount: 14,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.9156, 18.5645], // Shaniwar Wada approaches
    },
    severity: "medium",
    accidentCount: 12,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.8298, 18.5525], // West Pune - Rasta Peth
    },
    severity: "high",
    accidentCount: 21,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.9012, 18.6045], // Katraj-Dhankawadi road
    },
    severity: "high",
    accidentCount: 25,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.8456, 18.4856], // South Pune - Baner area
    },
    severity: "low",
    accidentCount: 7,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.9345, 18.5798], // Pune-Ahmednagar highway junction
    },
    severity: "high",
    accidentCount: 28,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.8045, 18.5678], // Bibwewadi area
    },
    severity: "medium",
    accidentCount: 11,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.9567, 18.5945], // Airport road - Yerawada
    },
    severity: "medium",
    accidentCount: 15,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.789, 18.52], // West side - Aundh area
    },
    severity: "low",
    accidentCount: 5,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.8567, 18.4567], // Koregaon area
    },
    severity: "medium",
    accidentCount: 13,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.9234, 18.6123], // Khadki area
    },
    severity: "low",
    accidentCount: 6,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.8123, 18.6234], // North Pune - Pimpri
    },
    severity: "high",
    accidentCount: 20,
    lastUpdated: new Date(),
  },
  {
    location: {
      type: "Point",
      coordinates: [73.9045, 18.4234], // Hadapsar area
    },
    severity: "medium",
    accidentCount: 10,
    lastUpdated: new Date(),
  },
];

async function seedAccidentZones() {
  try {
    const mongoUrl =
      process.env.MONGODB_URI || "mongodb://localhost:27017/logimetrics_db";

    console.log(`🔗 Connecting to MongoDB: ${mongoUrl}`);
    await mongoose.connect(mongoUrl);
    console.log("✅ MongoDB connected");

    // Clear existing zones
    console.log("🗑️  Clearing existing accident zones...");
    const deleteResult = await AccidentZone.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} existing zones`);

    // Insert new zones
    console.log(`📍 Inserting ${ACCIDENT_ZONES.length} accident zones...`);
    const result = await AccidentZone.insertMany(ACCIDENT_ZONES);
    console.log(`✅ Successfully seeded ${result.length} accident zones`);

    // Display summary
    console.log("\n📊 Accident Zone Summary:");
    console.log("================================");

    const highSeverity = ACCIDENT_ZONES.filter((z) => z.severity === "high");
    const mediumSeverity = ACCIDENT_ZONES.filter(
      (z) => z.severity === "medium"
    );
    const lowSeverity = ACCIDENT_ZONES.filter((z) => z.severity === "low");

    console.log(`High Severity Zones:   ${highSeverity.length}`);
    console.log(`Medium Severity Zones: ${mediumSeverity.length}`);
    console.log(`Low Severity Zones:    ${lowSeverity.length}`);
    console.log(
      `\nTotal Accidents:       ${ACCIDENT_ZONES.reduce(
        (sum, z) => sum + z.accidentCount,
        0
      )}`
    );
    console.log("================================\n");

    // Display each zone
    console.log("📍 Seeded Zones:");
    result.forEach((zone, idx) => {
      const [lng, lat] = zone.location.coordinates;
      console.log(
        `${idx + 1}. [${zone.severity.toUpperCase()}] ${lat.toFixed(
          4
        )}, ${lng.toFixed(4)} - ${zone.accidentCount} accidents`
      );
    });

    console.log("\n✅ Seeding completed successfully!");
    console.log(
      "   Use these zones in the tracking simulator to test accident alerts."
    );

    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
  } catch (error) {
    console.error("❌ Error seeding accident zones:", error.message);
    process.exit(1);
  }
}

// Run seed
seedAccidentZones();
