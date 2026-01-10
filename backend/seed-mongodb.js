/**
 * MongoDB Seeding Script
 * Populates MongoDB collections with sample data
 */

require("dotenv").config();
const mongoose = require("mongoose");

// Import MongoDB models
const AuditLog = require("./src/models/mongodb/AuditLog");
const LiveTracking = require("./src/models/mongodb/LiveTracking");
const ShipmentEvent = require("./src/models/mongodb/ShipmentEvent");
const VehicleTelemetry = require("./src/models/mongodb/VehicleTelemetry");

const mongoUri = process.env.MONGODB_URI;

async function seedMongoDB() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    console.log("\n📝 Creating sample data...");

    // 1. Seed Audit Logs
    console.log("\n1️⃣ Seeding Audit Logs...");
    const auditLogs = [];
    const actions = [
      "login",
      "create",
      "update",
      "delete",
      "export",
      "approve",
    ];
    const resources = ["shipment", "vehicle", "driver", "user", "invoice"];
    const emails = [
      "admin@logimetrics.com",
      "admin@demo.logimetrics.com",
      "manager@demo.logimetrics.com",
    ];

    for (let i = 0; i < 20; i++) {
      auditLogs.push({
        userId: `user-${i}`,
        userEmail: emails[i % emails.length],
        userRole: i % 2 === 0 ? "admin" : "manager",
        companyId: `company-${i % 2}`,
        action: actions[i % actions.length],
        resource: resources[i % resources.length],
        resourceId: `resource-${i}`,
        description: `User performed ${actions[i % actions.length]} on ${
          resources[i % resources.length]
        }`,
        success: true,
        requestMethod: ["GET", "POST", "PUT", "DELETE"][i % 4],
        statusCode: 200,
        responseTime: Math.floor(Math.random() * 500) + 50,
        timestamp: new Date(Date.now() - Math.random() * 86400000 * 7),
        ipAddress: `192.168.1.${100 + i}`,
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      });
    }

    await AuditLog.insertMany(auditLogs);
    console.log(`   ✅ Created ${auditLogs.length} audit logs`);

    // 2. Seed Shipment Events
    console.log("\n2️⃣ Seeding Shipment Events...");
    const eventTypes = [
      "created",
      "confirmed",
      "picked_up",
      "in_transit",
      "out_for_delivery",
      "delivered",
    ];
    const shipmentEvents = [];

    for (let i = 0; i < 3; i++) {
      const trackingId = `TRACK-${Date.now()}-${i}`;

      for (let j = 0; j < eventTypes.length; j++) {
        shipmentEvents.push({
          shipmentId: `shipment-${i}`,
          trackingId: trackingId,
          eventType: eventTypes[j],
          status: eventTypes[j],
          location: {
            type: "Point",
            coordinates: [
              77.2 + Math.random() * 0.5,
              28.5 + Math.random() * 0.5,
            ],
            address: `Location ${j}, New Delhi`,
            city: "New Delhi",
            state: "Delhi",
          },
          description: `Shipment ${eventTypes[j].replace("_", " ")}`,
          performedBy: {
            userId: `driver-${i}`,
            name: `Driver ${i + 1}`,
            role: "driver",
          },
          metadata: {
            temperature: 22 + Math.random() * 5,
            humidity: 40 + Math.random() * 20,
          },
          isPublic: true,
          timestamp: new Date(Date.now() - (eventTypes.length - j) * 3600000),
        });
      }
    }

    await ShipmentEvent.insertMany(shipmentEvents);
    console.log(`   ✅ Created ${shipmentEvents.length} shipment events`);

    // 3. Seed Live Tracking Data
    console.log("\n3️⃣ Seeding Live Tracking...");
    const liveTracking = [];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 5; j++) {
        liveTracking.push({
          vehicleId: `vehicle-${i}`,
          driverId: `driver-${i}`,
          shipmentId: `shipment-${i}`,
          coordinates: {
            type: "Point",
            coordinates: [77.2 + Math.random() * 1, 28.5 + Math.random() * 1],
          },
          speed: Math.floor(Math.random() * 80) + 20,
          heading: Math.floor(Math.random() * 360),
          accuracy: Math.floor(Math.random() * 10) + 5,
          address: `Route Location ${j}, Delhi`,
          batteryLevel: Math.floor(Math.random() * 100),
          isMoving: Math.random() > 0.3,
          ignitionStatus: "on",
          metadata: {
            deviceId: `GPS_vehicle-${i}`,
            signalStrength: Math.floor(Math.random() * 4) + 1,
          },
          timestamp: new Date(Date.now() - (5 - j) * 600000),
        });
      }
    }

    await LiveTracking.insertMany(liveTracking);
    console.log(`   ✅ Created ${liveTracking.length} live tracking records`);

    // 4. Seed Vehicle Telemetry
    console.log("\n4️⃣ Seeding Vehicle Telemetry...");
    const telemetryTypes = [
      "fuel_level",
      "speed",
      "rpm",
      "engine_temperature",
      "tire_pressure",
      "battery_voltage",
      "idle_time",
    ];
    const vehicleTelemetry = [];

    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < telemetryTypes.length; j++) {
        const type = telemetryTypes[j];
        let value, unit;

        switch (type) {
          case "fuel_level":
            value = Math.floor(Math.random() * 100);
            unit = "%";
            break;
          case "speed":
            value = Math.floor(Math.random() * 120);
            unit = "km/h";
            break;
          case "rpm":
            value = Math.floor(Math.random() * 4000) + 1000;
            unit = "RPM";
            break;
          case "engine_temperature":
            value = 70 + Math.random() * 30;
            unit = "°C";
            break;
          case "tire_pressure":
            value = 28 + Math.random() * 4;
            unit = "PSI";
            break;
          case "battery_voltage":
            value = 12 + Math.random() * 2;
            unit = "V";
            break;
          case "idle_time":
            value = Math.floor(Math.random() * 60);
            unit = "minutes";
            break;
        }

        vehicleTelemetry.push({
          vehicleId: `vehicle-${i}`,
          driverId: `driver-${i}`,
          telemetryType: type,
          value: value,
          unit: unit,
          location: {
            type: "Point",
            coordinates: [77.2 + Math.random() * 1, 28.5 + Math.random() * 1],
          },
          isAlert: value > 80 && type === "engine_temperature",
          alertType:
            value > 80 && type === "engine_temperature" ? "warning" : null,
          alertMessage:
            value > 80 && type === "engine_temperature"
              ? "Engine temperature is high"
              : "",
          metadata: {
            sensorId: `SENSOR_${type}_vehicle-${i}`,
            accuracy: 0.95,
          },
          timestamp: new Date(Date.now() - Math.random() * 3600000),
        });
      }
    }

    await VehicleTelemetry.insertMany(vehicleTelemetry);
    console.log(`   ✅ Created ${vehicleTelemetry.length} telemetry records`);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("✅ MongoDB Seeding Complete!");
    console.log("=".repeat(60));
    console.log(`
📊 Data Summary:
   • Audit Logs: ${auditLogs.length} records
   • Shipment Events: ${shipmentEvents.length} records
   • Live Tracking: ${liveTracking.length} records
   • Vehicle Telemetry: ${vehicleTelemetry.length} records
   • Total: ${
     auditLogs.length +
     shipmentEvents.length +
     liveTracking.length +
     vehicleTelemetry.length
   } records

🔗 Collections Ready:
   ✓ audit_logs
   ✓ shipment_events
   ✓ live_tracking
   ✓ vehicle_telemetry

📈 TTL Indexes:
   ✓ live_tracking (30 days)
   ✓ vehicle_telemetry (90 days)
    `);

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding Error:", error.message);
    process.exit(1);
  }
}

seedMongoDB();
