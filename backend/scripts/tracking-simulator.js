/**
 * Vehicle Tracking Simulator
 * Simulates real-time GPS updates from vehicles for testing
 * Usage: node tracking-simulator.js --vehicle=TRUCK001 --speed=60
 */

const { io } = require("socket.io-client");
const logger = require("../src/utils/logger.util");

class VehicleTrackingSimulator {
  constructor(options = {}) {
    this.vehicleId = options.vehicleId || "TEST-TRUCK-001";
    this.driverId = options.driverId || "driver-001";
    this.shipmentId = options.shipmentId || "shipment-001";
    this.serverUrl = options.serverUrl || "http://localhost:3000";
    this.updateInterval = options.updateInterval || 2000; // 2 seconds
    this.speed = options.speed || 60; // km/h
    this.startLat = options.startLat || 18.5204;
    this.startLng = options.startLng || 73.8567;
    this.socket = null;
    this.isRunning = false;
    this.currentLat = this.startLat;
    this.currentLng = this.startLng;
    this.heading = options.heading || 0;
    this.route = options.route || null;
    this.currentWaypoint = 0;
  }

  /**
   * Connect to the server
   */
  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = io(this.serverUrl, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      this.socket.on("connect", () => {
        console.log(`✓ Simulator connected for vehicle ${this.vehicleId}`);
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        console.error(`✗ Connection error:`, error.message);
        reject(error);
      });

      this.socket.on("alert:accident-zone", (alertData) => {
        this.handleAccidentAlert(alertData);
      });

      this.socket.on("disconnect", () => {
        console.log(`Simulator disconnected for vehicle ${this.vehicleId}`);
      });
    });
  }

  /**
   * Start simulating vehicle movement
   */
  start() {
    if (this.isRunning) {
      console.log("Simulator already running");
      return;
    }

    this.isRunning = true;
    console.log(`🚗 Starting tracking simulation for ${this.vehicleId}`);

    this.simulationInterval = setInterval(() => {
      this.updateLocation();
    }, this.updateInterval);
  }

  /**
   * Stop simulating vehicle movement
   */
  stop() {
    if (!this.isRunning) {
      console.log("Simulator not running");
      return;
    }

    this.isRunning = false;
    clearInterval(this.simulationInterval);
    console.log(`⛔ Stopped tracking simulation for ${this.vehicleId}`);
  }

  /**
   * Update location and send to server
   */
  updateLocation() {
    if (this.route && this.currentWaypoint < this.route.length) {
      // Follow predefined route
      const target = this.route[this.currentWaypoint];
      this.currentLat = target.lat;
      this.currentLng = target.lng;
      this.heading = target.heading || this.heading;
      this.currentWaypoint++;
    } else {
      // Random movement
      this.moveRandomly();
    }

    const locationData = {
      vehicleId: this.vehicleId,
      driverId: this.driverId,
      shipmentId: this.shipmentId,
      latitude: this.currentLat,
      longitude: this.currentLng,
      speed: this.speed,
      heading: this.heading,
      accuracy: Math.random() * 5 + 5, // 5-10 meters
      altitude: 150 + Math.random() * 50, // 150-200 meters
    };

    this.socket.emit("tracking:location:update", locationData);

    console.log(
      `📍 [${new Date().toLocaleTimeString()}] ${
        this.vehicleId
      }: ${this.currentLat.toFixed(4)}, ${this.currentLng.toFixed(4)} (Speed: ${
        this.speed
      } km/h, Heading: ${this.heading}°)`
    );
  }

  /**
   * Move randomly within bounds
   */
  moveRandomly() {
    // Random movement in Pune area
    const bounds = {
      minLat: 18.4,
      maxLat: 18.65,
      minLng: 73.7,
      maxLng: 73.95,
    };

    // Small random movement
    const latChange = (Math.random() - 0.5) * 0.01;
    const lngChange = (Math.random() - 0.5) * 0.01;

    this.currentLat += latChange;
    this.currentLng += lngChange;

    // Keep within bounds
    this.currentLat = Math.max(
      bounds.minLat,
      Math.min(bounds.maxLat, this.currentLat)
    );
    this.currentLng = Math.max(
      bounds.minLng,
      Math.min(bounds.maxLng, this.currentLng)
    );

    // Random heading
    this.heading = Math.random() * 360;
  }

  /**
   * Set a predefined route
   */
  setRoute(waypoints) {
    this.route = waypoints;
    this.currentWaypoint = 0;
    console.log(`Route set with ${waypoints.length} waypoints`);
  }

  /**
   * Handle accident zone alerts
   */
  handleAccidentAlert(alertData) {
    console.log("\n🚨🚨🚨 ACCIDENT ZONE ALERT! 🚨🚨🚨");
    console.log(`Vehicle: ${alertData.zones[0]?.message || "Unknown"}`);
    alertData.zones.forEach((zone) => {
      console.log(`  - Distance: ${zone.distance}m`);
      console.log(`  - Severity: ${zone.severity}`);
      console.log(`  - Accidents: ${zone.accidentCount}`);
      console.log(`  - Message: ${zone.message}`);
    });
    console.log("🚨🚨🚨\n");
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    this.stop();
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

// Predefined routes for testing
const PUNE_ROUTES = {
  downtown_to_airport: [
    { lat: 18.5204, lng: 73.8567, heading: 45 }, // Downtown
    { lat: 18.54, lng: 73.87, heading: 45 },
    { lat: 18.58, lng: 73.91, heading: 45 }, // Accident prone area
    { lat: 18.6, lng: 73.95, heading: 45 }, // Airport area
  ],
  airport_to_downtown: [
    { lat: 18.6, lng: 73.95, heading: 225 }, // Airport
    { lat: 18.58, lng: 73.91, heading: 225 },
    { lat: 18.54, lng: 73.87, heading: 225 },
    { lat: 18.5204, lng: 73.8567, heading: 225 }, // Downtown
  ],
  highway_route: [
    { lat: 18.45, lng: 73.8, heading: 90 },
    { lat: 18.45, lng: 73.85, heading: 90 },
    { lat: 18.45, lng: 73.9, heading: 90 },
    { lat: 18.45, lng: 73.95, heading: 90 },
  ],
};

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  args.forEach((arg) => {
    const [key, value] = arg.replace("--", "").split("=");
    options[key] = value || true;
  });

  const simulator = new VehicleTrackingSimulator({
    vehicleId: options.vehicle || "SIM-TRUCK-001",
    driverId: options.driver || "driver-simulator",
    shipmentId: options.shipment || "shipment-sim",
    speed: options.speed ? parseInt(options.speed) : 60,
    route: options.route ? PUNE_ROUTES[options.route] : null,
    startLat: options.lat ? parseFloat(options.lat) : 18.5204,
    startLng: options.lng ? parseFloat(options.lng) : 73.8567,
  });

  simulator.connect().then(() => {
    simulator.start();

    // Handle graceful shutdown
    process.on("SIGINT", () => {
      console.log("\nShutting down simulator...");
      simulator.disconnect();
      process.exit(0);
    });
  });
}

module.exports = VehicleTrackingSimulator;
