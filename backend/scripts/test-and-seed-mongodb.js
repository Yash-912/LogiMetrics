#!/usr/bin/env node

/**
 * MongoDB Connection Test & Data Population
 * Tests MongoDB connection and provides debugging info
 */

require("dotenv").config();
const mongoose = require("mongoose");

const mongoUri =
  process.env.MONGODB_URI || "mongodb://localhost:27017/logi_matrix";

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

async function testAndPopulateDB() {
  try {
    logSection("🔌 MongoDB Connection Test");
    log(
      `Connection URI: ${mongoUri.replace(/\/\/.*:.*@/, "//***:***@")}`,
      "yellow"
    );
    log("Attempting connection...", "blue");

    // Try to connect with timeout
    await Promise.race([
      mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        socketTimeoutMS: 15000,
        retryWrites: false,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Connection timeout after 15s")),
          15000
        )
      ),
    ]);

    log("✅ Successfully connected to MongoDB!", "green");

    // Get database info
    const adminDb = mongoose.connection.db.admin();
    const serverStatus = await adminDb.serverStatus();
    log(`\n📊 MongoDB Server Info:`, "cyan");
    log(`   • Version: ${serverStatus.version || "Unknown"}`, "cyan");
    log(
      `   • Uptime: ${Math.floor((serverStatus.uptime || 0) / 60)} minutes`,
      "cyan"
    );
    log(
      `   • Current Connections: ${serverStatus.connections?.current || "N/A"}`,
      "cyan"
    );

    // List databases
    logSection("📁 Available Databases");
    const { databases } = await adminDb.listDatabases();
    for (const db of databases) {
      log(`   • ${db.name}`, "cyan");
    }

    const currentDb = mongoose.connection.db.getName();
    log(`\n✅ Connected to database: ${currentDb}`, "green");

    // List existing collections
    logSection("📦 Existing Collections");
    const collections = await mongoose.connection.db
      .listCollections()
      .toArray();
    if (collections.length === 0) {
      log("No collections found. Will create during seeding.", "yellow");
    } else {
      for (const col of collections) {
        const count = await mongoose.connection.db
          .collection(col.name)
          .countDocuments();
        log(`   • ${col.name}: ${count} documents`, "cyan");
      }
    }

    // Now seed the data
    logSection("🌱 Seeding Sample Data");

    // Define schemas in-memory without conflicts
    const auditLogSchema = new mongoose.Schema(
      {
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
      },
      { collection: "audit_logs" }
    );

    const liveTrackingSchema = new mongoose.Schema(
      {
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
      },
      { collection: "live_tracking" }
    );

    const shipmentEventSchema = new mongoose.Schema(
      {
        shipmentId: String,
        eventType: String,
        location: {
          latitude: Number,
          longitude: Number,
          address: String,
        },
        details: mongoose.Schema.Types.Mixed,
        createdAt: { type: Date, default: Date.now, index: true },
      },
      { collection: "shipment_events" }
    );

    const vehicleTelemetrySchema = new mongoose.Schema(
      {
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
      },
      { collection: "vehicle_telemetry" }
    );

    const AuditLog = mongoose.model("AuditLog", auditLogSchema);
    const LiveTracking = mongoose.model("LiveTracking", liveTrackingSchema);
    const ShipmentEvent = mongoose.model("ShipmentEvent", shipmentEventSchema);
    const VehicleTelemetry = mongoose.model(
      "VehicleTelemetry",
      vehicleTelemetrySchema
    );

    // Drop old data for fresh seed
    try {
      await AuditLog.deleteMany({});
      await LiveTracking.deleteMany({});
      await ShipmentEvent.deleteMany({});
      await VehicleTelemetry.deleteMany({});
      log("Cleared existing collections", "yellow");
    } catch (e) {
      log(`Note: ${e.message}`, "yellow");
    }

    // 1. Seed AuditLog
    log("Seeding AuditLog collection...", "blue");
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
        description: "Created new shipment from Mumbai to Delhi",
        success: true,
        timestamp: new Date(),
      },
      {
        userId: "user-2",
        userEmail: "manager@logimetrics.com",
        userRole: "manager",
        action: "update",
        resource: "Shipment",
        resourceId: "ship-001",
        description: "Updated shipment status to In Transit",
        success: true,
        timestamp: new Date(),
      },
    ]);
    log("✅ AuditLog seeded", "green");

    // 2. Seed LiveTracking
    log("Seeding LiveTracking collection...", "blue");
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
      {
        shipmentId: "ship-002",
        vehicleId: "veh-002",
        driverId: "driver-002",
        latitude: 19.076,
        longitude: 72.8777,
        speed: 52.3,
        heading: 270,
        accuracy: 8,
        timestamp: new Date(),
      },
    ]);
    log("✅ LiveTracking seeded", "green");

    // 3. Seed ShipmentEvent
    log("Seeding ShipmentEvent collection...", "blue");
    await ShipmentEvent.insertMany([
      {
        shipmentId: "ship-001",
        eventType: "pickup",
        location: {
          latitude: 28.6139,
          longitude: 77.209,
          address: "Mumbai, Maharashtra, India",
        },
        details: {
          status: "Picked Up",
          notes: "Package picked from warehouse",
        },
        createdAt: new Date(Date.now() - 3600000),
      },
      {
        shipmentId: "ship-001",
        eventType: "in_transit",
        location: {
          latitude: 28.5244,
          longitude: 77.1855,
          address: "Delhi, Delhi, India",
        },
        details: { status: "In Transit", notes: "Vehicle on route" },
        createdAt: new Date(),
      },
    ]);
    log("✅ ShipmentEvent seeded", "green");

    // 4. Seed VehicleTelemetry
    log("Seeding VehicleTelemetry collection...", "blue");
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
        diagnostics: { status: "normal", warnings: [] },
        timestamp: new Date(),
      },
      {
        vehicleId: "veh-002",
        driverId: "driver-002",
        engineStatus: "running",
        temperature: 82,
        fuelLevel: 60,
        speedometer: 52,
        rpm: 2200,
        odometer: 45000,
        batteryVoltage: 13.4,
        diagnostics: { status: "normal", warnings: [] },
        timestamp: new Date(),
      },
    ]);
    log("✅ VehicleTelemetry seeded", "green");

    logSection("✅ Database Seeding Complete");
    log("Sample data has been successfully seeded!", "green");

    // Verify data
    logSection("📊 Verification");
    const auditCount = await AuditLog.countDocuments();
    const trackingCount = await LiveTracking.countDocuments();
    const eventCount = await ShipmentEvent.countDocuments();
    const telemetryCount = await VehicleTelemetry.countDocuments();

    log(`   • AuditLog: ${auditCount} documents`, "cyan");
    log(`   • LiveTracking: ${trackingCount} documents`, "cyan");
    log(`   • ShipmentEvent: ${eventCount} documents`, "cyan");
    log(`   • VehicleTelemetry: ${telemetryCount} documents`, "cyan");

    logSection("✨ Ready to use!");
    log("Your MongoDB database is set up and ready.", "green");
    log("Run: npm run dev", "cyan");

    await mongoose.disconnect();
    log("\nDisconnected from MongoDB", "yellow");
  } catch (error) {
    logSection("❌ Error Occurred");
    log(`Error: ${error.message}`, "red");
    console.error("\nFull Error:", error);

    logSection("🔧 Troubleshooting");
    if (
      error.message.includes("querySrv") ||
      error.message.includes("EREFUSED")
    ) {
      log("DNS/Network Error - MongoDB Atlas not reachable", "yellow");
      log("\nSolutions:", "blue");
      log("1. Check your internet connection", "cyan");
      log("2. Verify IP is whitelisted in MongoDB Atlas", "cyan");
      log("3. Use local MongoDB instead:", "cyan");
      log(
        "   - Update MONGODB_URI=mongodb://localhost:27017/logi_matrix",
        "cyan"
      );
      log("   - Install MongoDB locally or use Docker", "cyan");
      log("\n   Docker command:", "cyan");
      log(
        `   docker run -d --name mongodb -p 27017:27017 mongo:latest`,
        "cyan"
      );
    } else if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("connect ECONNREFUSED")
    ) {
      log("Connection Refused - MongoDB not running locally", "yellow");
      log("\nSolutions:", "blue");
      log("1. Start MongoDB service:", "cyan");
      log("   - Windows: mongod (if installed)", "cyan");
      log("   - Mac: brew services start mongodb-community", "cyan");
      log("   - Linux: sudo systemctl start mongod", "cyan");
      log("2. Or use MongoDB Atlas:", "cyan");
      log("   - Update MONGODB_URI with your Atlas connection string", "cyan");
      log("   - Make sure IP is whitelisted", "cyan");
      log("3. Or run MongoDB in Docker:", "cyan");
      log(
        "   docker run -d --name mongodb -p 27017:27017 mongo:latest",
        "cyan"
      );
    } else if (error.message.includes("timeout")) {
      log("Connection Timeout - MongoDB unreachable", "yellow");
      log("\nSolutions:", "blue");
      log("1. Check MongoDB is running", "cyan");
      log("2. Check network connectivity", "cyan");
      log("3. Increase timeout in connection string", "cyan");
    }

    process.exit(1);
  }
}

testAndPopulateDB();
