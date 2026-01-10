#!/usr/bin/env node

/**
 * MongoDB Seeding Script
 * Creates collections and seeds initial data
 */

require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb+srv://sagacitychess_db_user:pOU7R8EwhrsErudP@logimatrix.fwvtwz8.mongodb.net/logi_matrix?retryWrites=true&w=majority";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(60));
  log(title, "cyan");
  console.log("=".repeat(60));
}

async function seedMongoDB() {
  try {
    logSection("🍃 MongoDB Seeding");

    // Connect to MongoDB
    log("Connecting to MongoDB...", "blue");
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    });
    log("✅ Connected to MongoDB", "green");

    // Get the list of databases
    const adminDb = mongoose.connection.db.admin();
    const { databases } = await adminDb.listDatabases();
    log(
      `📊 Available databases: ${databases.map((d) => d.name).join(", ")}`,
      "cyan"
    );

    // Get current database
    const currentDb = mongoose.connection.db.getName();
    log(`📍 Using database: ${currentDb}`, "cyan");

    // Create collections with sample data
    logSection("📦 Creating Collections and Seeding Data");

    // 1. AuditLog collection
    log("Creating AuditLog collection...", "blue");
    try {
      const AuditLog = mongoose.model(
        "AuditLog",
        new mongoose.Schema({
          userId: String,
          userEmail: String,
          userRole: String,
          companyId: String,
          action: String,
          resource: String,
          resourceId: String,
          description: String,
          ipAddress: String,
          userAgent: String,
          success: Boolean,
          timestamp: { type: Date, default: Date.now, index: true },
        })
      );

      // Insert sample audit logs
      await AuditLog.insertMany([
        {
          userId: "user-1",
          userEmail: "admin@logimetrics.com",
          userRole: "super_admin",
          action: "login",
          resource: "User",
          resourceId: "user-1",
          description: "Admin logged in",
          success: true,
          timestamp: new Date(),
        },
        {
          userId: "user-1",
          userEmail: "admin@logimetrics.com",
          userRole: "super_admin",
          action: "create",
          resource: "Shipment",
          resourceId: "ship-001",
          description: "Created new shipment",
          success: true,
          timestamp: new Date(),
        },
      ]);
      log("✅ AuditLog collection created with sample data", "green");
    } catch (error) {
      log(`⚠️ AuditLog: ${error.message}`, "yellow");
    }

    // 2. LiveTracking collection
    log("Creating LiveTracking collection...", "blue");
    try {
      const LiveTracking = mongoose.model(
        "LiveTracking",
        new mongoose.Schema({
          shipmentId: String,
          vehicleId: String,
          driverId: String,
          latitude: Number,
          longitude: Number,
          speed: Number,
          heading: Number,
          altitude: Number,
          accuracy: Number,
          timestamp: { type: Date, default: Date.now, index: true },
        })
      );

      // Insert sample tracking data
      await LiveTracking.insertMany([
        {
          shipmentId: "ship-001",
          vehicleId: "veh-001",
          driverId: "driver-001",
          latitude: 28.6139,
          longitude: 77.209,
          speed: 45.5,
          heading: 180,
          accuracy: 10,
          timestamp: new Date(),
        },
      ]);
      log("✅ LiveTracking collection created with sample data", "green");
    } catch (error) {
      log(`⚠️ LiveTracking: ${error.message}`, "yellow");
    }

    // 3. ShipmentEvent collection
    log("Creating ShipmentEvent collection...", "blue");
    try {
      const ShipmentEvent = mongoose.model(
        "ShipmentEvent",
        new mongoose.Schema({
          shipmentId: String,
          eventType: String,
          location: {
            latitude: Number,
            longitude: Number,
            address: String,
          },
          details: mongoose.Schema.Types.Mixed,
          createdAt: { type: Date, default: Date.now, index: true },
        })
      );

      // Insert sample events
      await ShipmentEvent.insertMany([
        {
          shipmentId: "ship-001",
          eventType: "pickup",
          location: {
            latitude: 28.6139,
            longitude: 77.209,
            address: "Mumbai, India",
          },
          details: { status: "Picked Up" },
          createdAt: new Date(),
        },
        {
          shipmentId: "ship-001",
          eventType: "in_transit",
          location: {
            latitude: 28.5244,
            longitude: 77.1855,
            address: "Delhi, India",
          },
          details: { status: "In Transit" },
          createdAt: new Date(),
        },
      ]);
      log("✅ ShipmentEvent collection created with sample data", "green");
    } catch (error) {
      log(`⚠️ ShipmentEvent: ${error.message}`, "yellow");
    }

    // 4. VehicleTelemetry collection
    log("Creating VehicleTelemetry collection...", "blue");
    try {
      const VehicleTelemetry = mongoose.model(
        "VehicleTelemetry",
        new mongoose.Schema({
          vehicleId: String,
          driverId: String,
          engineStatus: String,
          temperature: Number,
          fuelLevel: Number,
          speedometer: Number,
          rpm: Number,
          odometer: Number,
          batteryVoltage: Number,
          diagnostics: mongoose.Schema.Types.Mixed,
          timestamp: { type: Date, default: Date.now, index: true },
        })
      );

      // Insert sample telemetry data
      await VehicleTelemetry.insertMany([
        {
          vehicleId: "veh-001",
          driverId: "driver-001",
          engineStatus: "running",
          temperature: 85,
          fuelLevel: 75,
          speedometer: 45,
          rpm: 2000,
          odometer: 50000,
          batteryVoltage: 13.5,
          diagnostics: { status: "normal" },
          timestamp: new Date(),
        },
      ]);
      log("✅ VehicleTelemetry collection created with sample data", "green");
    } catch (error) {
      log(`⚠️ VehicleTelemetry: ${error.message}`, "yellow");
    }

    logSection("✅ MongoDB Seeding Completed");
    log(
      "All collections have been created and seeded with sample data",
      "green"
    );

    // Show collection counts
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    log(`\n📊 Collections in database:`, "cyan");
    for (const col of collections) {
      const count = await mongoose.connection.db
        .collection(col.name)
        .countDocuments();
      log(`   • ${col.name}: ${count} documents`);
    }

    await mongoose.disconnect();
    log("\n✅ Disconnected from MongoDB", "green");
  } catch (error) {
    log(`❌ MongoDB Seeding Error: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  }
}

seedMongoDB();
