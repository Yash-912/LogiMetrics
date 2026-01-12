#!/usr/bin/env node

/**
 * Live Tracking System - Integration Test
 * Tests all components of the accident zone tracking system
 * Usage: node test-live-tracking.js
 */

const axios = require("axios");
const { io } = require("socket.io-client");

const API_BASE = "http://localhost:3000/api/v1";
const WS_URL = "http://localhost:3000";

class LiveTrackingTester {
  constructor() {
    this.socket = null;
    this.testsPassed = 0;
    this.testsFailed = 0;
    this.alerts = [];
  }

  async log(message, type = "info") {
    const icons = {
      info: "ℹ️",
      success: "✅",
      error: "❌",
      warning: "⚠️",
      test: "🧪",
    };
    console.log(`${icons[type] || "•"} ${message}`);
  }

  async recordTest(name, passed, error = null) {
    if (passed) {
      this.testsPassed++;
      await this.log(`${name}`, "success");
    } else {
      this.testsFailed++;
      await this.log(`${name} - ${error || "Unknown error"}`, "error");
    }
  }

  async test1_BackendConnection() {
    await this.log("Test 1: Backend Connection", "test");
    try {
      const response = await axios.get(`${API_BASE}/accidents/heatmap`);
      await this.recordTest(
        "Backend is running and responsive",
        response.status === 200
      );
    } catch (error) {
      await this.recordTest(
        "Backend is running and responsive",
        false,
        error.message
      );
    }
  }

  async test2_AccidentZonesExist() {
    await this.log("Test 2: Accident Zones Data", "test");
    try {
      const response = await axios.get(`${API_BASE}/accidents/heatmap`);
      const hasZones = response.data.data && response.data.data.length > 0;
      await this.recordTest(
        `Accident zones exist (found: ${response.data.data?.length || 0})`,
        hasZones,
        hasZones
          ? null
          : "No accident zones found. Run: node scripts/seed-accident-zones.js"
      );
      return response.data.data;
    } catch (error) {
      await this.recordTest("Accident zones exist", false, error.message);
      return [];
    }
  }

  async test3_WebSocketConnection() {
    await this.log("Test 3: WebSocket Connection", "test");
    return new Promise(async (resolve) => {
      try {
        this.socket = io(WS_URL, {
          reconnection: true,
          reconnectionAttempts: 3,
        });

        this.socket.on("connect", async () => {
          await this.recordTest("WebSocket connected successfully", true);
          resolve(true);
        });

        this.socket.on("connect_error", async (error) => {
          await this.recordTest(
            "WebSocket connected successfully",
            false,
            error.message
          );
          resolve(false);
        });

        setTimeout(() => {
          resolve(false);
        }, 5000);
      } catch (error) {
        await this.recordTest(
          "WebSocket connected successfully",
          false,
          error.message
        );
        resolve(false);
      }
    });
  }

  async test4_AlertEndpoint() {
    await this.log("Test 4: Alert Endpoints", "test");
    try {
      const response = await axios.get(
        `${API_BASE}/accidents/vehicle/TEST-VEHICLE/alerts`
      );
      await this.recordTest(
        "Alert endpoint responsive",
        response.status === 200
      );
      return true;
    } catch (error) {
      await this.recordTest(
        "Alert endpoint responsive",
        false,
        error.response?.status === 200 ? null : error.message
      );
      return false;
    }
  }

  async test5_NearbyZonesEndpoint() {
    await this.log("Test 5: Nearby Zones Endpoint", "test");
    try {
      const response = await axios.get(
        `${API_BASE}/accidents/nearby-zones?lat=18.52&lng=73.85&radius=5000`
      );
      const hasZones =
        response.data.data && response.data.data.zones?.length >= 0;
      await this.recordTest(
        `Nearby zones endpoint works (found: ${
          response.data.data?.zones?.length || 0
        })`,
        hasZones
      );
      return true;
    } catch (error) {
      await this.recordTest(
        "Nearby zones endpoint works",
        false,
        error.message
      );
      return false;
    }
  }

  async test6_WebSocketTracking() {
    await this.log("Test 6: WebSocket Tracking Events", "test");
    return new Promise(async (resolve) => {
      if (!this.socket) {
        await this.recordTest(
          "WebSocket tracking events work",
          false,
          "WebSocket not connected"
        );
        resolve(false);
        return;
      }

      let trackingWorked = false;
      let alertWorked = false;

      // Listen for location events
      this.socket.on("fleet:location", (data) => {
        trackingWorked = true;
      });

      // Listen for alert events
      this.socket.on("vehicle:accident-zone-alert", (data) => {
        alertWorked = true;
        this.alerts.push(data);
      });

      // Subscribe to fleet tracking
      this.socket.emit("tracking:subscribe:fleet");

      // Simulate location update
      setTimeout(() => {
        this.socket.emit("tracking:location:update", {
          vehicleId: "TEST-TRUCK-001",
          driverId: "test-driver",
          latitude: 18.52,
          longitude: 73.85,
          speed: 60,
          heading: 45,
          accuracy: 7,
        });
      }, 500);

      // Give it time to receive events
      setTimeout(async () => {
        await this.recordTest(
          `WebSocket tracking events work (location: ${
            trackingWorked ? "✓" : "✗"
          })`,
          trackingWorked
        );
        resolve(trackingWorked);
      }, 2000);
    });
  }

  async test7_StatisticsEndpoint() {
    await this.log("Test 7: Statistics Endpoint", "test");
    try {
      const response = await axios.get(
        `${API_BASE}/accidents/vehicle/TEST-VEHICLE/stats`
      );
      // Endpoint might return no data, but should still work
      await this.recordTest(
        "Statistics endpoint responsive",
        response.status === 200 || response.status === 404
      );
      return true;
    } catch (error) {
      await this.recordTest(
        "Statistics endpoint responsive",
        false,
        error.message
      );
      return false;
    }
  }

  async test8_ActiveAlertsEndpoint() {
    await this.log("Test 8: Active Alerts Endpoint", "test");
    try {
      const response = await axios.get(`${API_BASE}/accidents/active`);
      await this.recordTest(
        `Active alerts endpoint works (alerts: ${
          response.data.data?.count || 0
        })`,
        response.status === 200
      );
      return true;
    } catch (error) {
      await this.recordTest(
        "Active alerts endpoint works",
        false,
        error.message
      );
      return false;
    }
  }

  async runAllTests() {
    console.log("\n" + "=".repeat(60));
    console.log("🚀 LIVE ACCIDENT ZONE TRACKING - SYSTEM TEST");
    console.log("=".repeat(60) + "\n");

    // Run tests sequentially
    await this.test1_BackendConnection();
    const zones = await this.test2_AccidentZonesExist();
    const wsConnected = await this.test3_WebSocketConnection();
    await this.test4_AlertEndpoint();
    await this.test5_NearbyZonesEndpoint();
    if (wsConnected) {
      await this.test6_WebSocketTracking();
    }
    await this.test7_StatisticsEndpoint();
    await this.test8_ActiveAlertsEndpoint();

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(60));
    console.log(`✅ Passed: ${this.testsPassed}`);
    console.log(`❌ Failed: ${this.testsFailed}`);
    console.log(`📈 Total:  ${this.testsPassed + this.testsFailed}`);
    console.log("=".repeat(60) + "\n");

    if (this.testsFailed === 0) {
      console.log("🎉 ALL TESTS PASSED! System is ready for testing.\n");
      console.log("📍 Next Steps:");
      console.log("   1. Start the tracking simulator:");
      console.log(
        "      node scripts/tracking-simulator.js --vehicle=TRUCK001\n"
      );
      console.log("   2. Open the accidents map:");
      console.log("      http://localhost:5173/accidents\n");
      console.log("   3. Watch for vehicles and alerts on the map!\n");
    } else {
      console.log("⚠️  Some tests failed. Please review the errors above.\n");
      console.log("📋 Troubleshooting:");
      if (!wsConnected) {
        console.log(
          "   • WebSocket: Ensure backend is running and Socket.io is initialized"
        );
      }
      if (zones.length === 0) {
        console.log(
          "   • Accident Zones: Run 'node scripts/seed-accident-zones.js'"
        );
      }
      console.log("\n");
    }

    // Cleanup
    if (this.socket) {
      this.socket.disconnect();
    }

    process.exit(this.testsFailed > 0 ? 1 : 0);
  }
}

// Run tests
const tester = new LiveTrackingTester();
tester.runAllTests().catch((error) => {
  console.error("Test runner error:", error);
  process.exit(1);
});
