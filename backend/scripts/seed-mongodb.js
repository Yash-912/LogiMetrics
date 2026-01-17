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
  "mongodb+srv://logimatrix:LogiMetrics123@logimatrix-shard-00-00.fwvtwz8.mongodb.net:27017/logi_matrix?retryWrites=true&w=majority";

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

    // Load models
    const {
      User,
      Company,
      Vehicle,
      Driver,
      Location,
      Route,
      Shipment,
      AuditLog,
    } = require("../src/models");

    // Create collections with sample data
    logSection("📦 Creating Collections and Seeding Data");

    // Clear existing data
    log("Clearing existing collections...", "blue");
    await Promise.all([
      User.deleteMany({}),
      Company.deleteMany({}),
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      Location.deleteMany({}),
      Route.deleteMany({}),
      Shipment.deleteMany({}),
    ]);
    log("✅ Existing data cleared", "green");

    // 1. Create Company
    log("Creating company...", "blue");
    const company = await Company.create({
      name: "LogiMetrics Demo Company",
      registrationNumber: "REG-12345",
      taxId: "TAX-98765",
      email: "info@logimetrics.com",
      phone: "+91-9876543210",
      address: "123 Logistics Street",
      city: "Mumbai",
      state: "Maharashtra",
      country: "India",
      status: "active",
      currency: "INR",
      timezone: "Asia/Kolkata",
    });
    log(`✅ Company created: ${company._id}`, "green");

    // 2. Create Users
    log("Creating users...", "blue");
    const adminUser = await User.create({
      email: "admin@logimetrics.com",
      password: "Admin@123456",
      firstName: "Admin",
      lastName: "User",
      phone: "+91-9876543210",
      role: "super_admin",
      companyId: company._id,
      status: "active",
      emailVerified: true,
    });
    log(`✅ Admin user created: ${adminUser._id}`, "green");

    const managerUser = await User.create({
      email: "manager@logimetrics.com",
      password: "Manager@123456",
      firstName: "John",
      lastName: "Manager",
      phone: "+91-9876543211",
      role: "manager",
      companyId: company._id,
      status: "active",
      emailVerified: true,
    });

    const dispatcherUser = await User.create({
      email: "dispatcher@logimetrics.com",
      password: "Dispatcher@123456",
      firstName: "Jane",
      lastName: "Dispatcher",
      phone: "+91-9876543212",
      role: "dispatcher",
      companyId: company._id,
      status: "active",
      emailVerified: true,
    });
    log(`✅ Manager and dispatcher users created`, "green");

    // 3. Create Locations
    log("Creating locations...", "blue");
    const locations = await Location.insertMany([
      {
        name: "Mumbai Warehouse",
        address: "123 Logistics Street",
        city: "Mumbai",
        state: "Maharashtra",
        country: "India",
        coordinates: {
          type: "Point",
          coordinates: [72.8479, 19.076],
        },
        locationType: "warehouse",
        companyId: company._id,
      },
      {
        name: "Bangalore Distribution Center",
        address: "456 Tech Park",
        city: "Bangalore",
        state: "Karnataka",
        country: "India",
        coordinates: {
          type: "Point",
          coordinates: [77.5946, 12.9716],
        },
        locationType: "distribution_center",
        companyId: company._id,
      },
      {
        name: "Chennai Hub",
        address: "789 Port Road",
        city: "Chennai",
        state: "Tamil Nadu",
        country: "India",
        coordinates: {
          type: "Point",
          coordinates: [80.2707, 13.0827],
        },
        locationType: "hub",
        companyId: company._id,
      },
    ]);
    log(`✅ Locations created: ${locations.length}`, "green");

    // 4. Create Vehicles
    log("Creating vehicles...", "blue");
    const vehicles = await Vehicle.insertMany([
      {
        licensePlate: "ABC123",
        type: "truck",
        make: "Tata",
        model: "Ace",
        year: 2022,
        color: "Red",
        companyId: company._id,
        capacity: { weight: 5000, volume: 20 },
        status: "active",
        purchaseDate: new Date("2022-01-15"),
        odometer: 50000,
        fuelType: "diesel",
        location: {
          type: "Point",
          coordinates: [72.8479, 19.076],
        },
      },
      {
        licensePlate: "XYZ789",
        type: "van",
        make: "Maruti",
        model: "Eeco",
        year: 2021,
        color: "White",
        companyId: company._id,
        capacity: { weight: 1500, volume: 10 },
        status: "active",
        purchaseDate: new Date("2021-06-20"),
        odometer: 80000,
        fuelType: "petrol",
        location: {
          type: "Point",
          coordinates: [77.5946, 12.9716],
        },
      },
      {
        licensePlate: "PQR456",
        type: "car",
        make: "Hyundai",
        model: "i20",
        year: 2022,
        color: "Black",
        companyId: company._id,
        capacity: { weight: 500, volume: 3 },
        status: "active",
        purchaseDate: new Date("2022-03-10"),
        odometer: 35000,
        fuelType: "petrol",
        location: {
          type: "Point",
          coordinates: [80.2707, 13.0827],
        },
      },
    ]);
    log(`✅ Vehicles created: ${vehicles.length}`, "green");

    // 5. Create Driver Users
    log("Creating driver users...", "blue");
    const driverUsers = await User.insertMany([
      {
        email: "driver1@logimetrics.com",
        password: "Driver@123456",
        firstName: "John",
        lastName: "Driver",
        phone: "+91-9876543220",
        role: "driver",
        companyId: company._id,
        status: "active",
        emailVerified: true,
      },
      {
        email: "driver2@logimetrics.com",
        password: "Driver@123456",
        firstName: "Jane",
        lastName: "Driver",
        phone: "+91-9876543221",
        role: "driver",
        companyId: company._id,
        status: "active",
        emailVerified: true,
      },
      {
        email: "driver3@logimetrics.com",
        password: "Driver@123456",
        firstName: "Bob",
        lastName: "Courier",
        phone: "+91-9876543222",
        role: "driver",
        companyId: company._id,
        status: "active",
        emailVerified: true,
      },
    ]);
    log(`✅ Driver users created: ${driverUsers.length}`, "green");

    // 6. Create Drivers
    log("Creating drivers...", "blue");
    const drivers = await Driver.insertMany([
      {
        userId: driverUsers[0]._id,
        companyId: company._id,
        licenseNumber: "DL-001",
        licenseType: "HMV",
        status: "available",
        currentVehicleId: vehicles[0]._id,
        phone: "+91-9876543220",
        totalShipments: 150,
        totalDistance: 25000,
        rating: 4.8,
      },
      {
        userId: driverUsers[1]._id,
        companyId: company._id,
        licenseNumber: "DL-002",
        licenseType: "LMV",
        status: "on_duty",
        currentVehicleId: vehicles[1]._id,
        phone: "+91-9876543221",
        totalShipments: 200,
        totalDistance: 35000,
        rating: 4.9,
      },
      {
        userId: driverUsers[2]._id,
        companyId: company._id,
        licenseNumber: "DL-003",
        licenseType: "LMV",
        status: "available",
        currentVehicleId: vehicles[2]._id,
        phone: "+91-9876543222",
        totalShipments: 100,
        totalDistance: 15000,
        rating: 4.7,
      },
    ]);
    log(`✅ Drivers created: ${drivers.length}`, "green");

    // 7. Create Routes
    log("Creating routes...", "blue");
    const routes = await Route.insertMany([
      {
        name: "Mumbai to Bangalore",
        companyId: company._id,
        sourceLocationId: locations[0]._id,
        destinationLocationId: locations[1]._id,
        distance: 550,
        estimatedTime: 480,
        status: "active",
        frequency: "daily",
        costPerKm: 25,
      },
      {
        name: "Bangalore to Chennai",
        companyId: company._id,
        sourceLocationId: locations[1]._id,
        destinationLocationId: locations[2]._id,
        distance: 350,
        estimatedTime: 300,
        status: "active",
        frequency: "weekly",
        costPerKm: 20,
      },
    ]);
    log(`✅ Routes created: ${routes.length}`, "green");

    // 8. Create Shipments
    log("Creating shipments...", "blue");
    const shipmentsData = [
      {
        status: "pending",
        companyId: company._id,
        sourceLocationId: locations[0]._id,
        destinationLocationId: locations[1]._id,
        sourceAddress: "Mumbai Warehouse",
        destinationAddress: "Bangalore Distribution Center",
        items: [{ name: "Electronics", quantity: 50, weight: 100 }],
        totalWeight: 100,
        totalValue: 50000,
        pickupTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        estimatedCost: 13750,
        recipientName: "Bangalore Office",
        recipientPhone: "+91-9876543300",
      },
      {
        status: "confirmed",
        companyId: company._id,
        sourceLocationId: locations[0]._id,
        destinationLocationId: locations[1]._id,
        sourceAddress: "Mumbai Warehouse",
        destinationAddress: "Bangalore Distribution Center",
        driverId: drivers[0]._id,
        vehicleId: vehicles[0]._id,
        items: [{ name: "Textiles", quantity: 100, weight: 200 }],
        totalWeight: 200,
        totalValue: 75000,
        pickupTime: new Date(),
        estimatedCost: 13750,
        recipientName: "Bangalore Customer",
        recipientPhone: "+91-9876543301",
      },
      {
        status: "in_transit",
        companyId: company._id,
        sourceLocationId: locations[0]._id,
        destinationLocationId: locations[1]._id,
        sourceAddress: "Mumbai Warehouse",
        destinationAddress: "Bangalore Distribution Center",
        driverId: drivers[1]._id,
        vehicleId: vehicles[1]._id,
        items: [{ name: "Machinery Parts", quantity: 30, weight: 150 }],
        totalWeight: 150,
        totalValue: 100000,
        pickupTime: new Date(Date.now() - 12 * 60 * 60 * 1000),
        estimatedCost: 13750,
        actualDistance: 250,
        recipientName: "Bangalore Factory",
        recipientPhone: "+91-9876543302",
      },
      {
        status: "delivered",
        companyId: company._id,
        sourceLocationId: locations[0]._id,
        destinationLocationId: locations[1]._id,
        sourceAddress: "Mumbai Warehouse",
        destinationAddress: "Bangalore Distribution Center",
        driverId: drivers[2]._id,
        vehicleId: vehicles[2]._id,
        items: [{ name: "Documents", quantity: 1000, weight: 50 }],
        totalWeight: 50,
        totalValue: 5000,
        pickupTime: new Date(Date.now() - 48 * 60 * 60 * 1000),
        actualDeliveryTime: new Date(Date.now() - 24 * 60 * 60 * 1000),
        estimatedCost: 13750,
        actualCost: 13500,
        actualDistance: 540,
        recipientName: "Bangalore Office 2",
        recipientPhone: "+91-9876543303",
      },
      {
        status: "cancelled",
        companyId: company._id,
        sourceLocationId: locations[1]._id,
        destinationLocationId: locations[2]._id,
        sourceAddress: "Bangalore Distribution Center",
        destinationAddress: "Chennai Hub",
        items: [{ name: "Fragile Items", quantity: 20, weight: 80 }],
        totalWeight: 80,
        totalValue: 40000,
        pickupTime: new Date(Date.now() - 72 * 60 * 60 * 1000),
        estimatedCost: 7000,
        recipientName: "Chennai Warehouse",
        recipientPhone: "+91-9876543304",
      },
    ];

    const shipments = [];
    for (const shipmentData of shipmentsData) {
      const shipment = await Shipment.create(shipmentData);
      shipments.push(shipment);
    }
    log(`✅ Shipments created: ${shipments.length}`, "green");

    logSection("✅ MongoDB Seeding Completed");
    log(
      `Created:
  - 1 Company
  - 7 Users (1 admin, 1 manager, 1 dispatcher, 3 drivers, + created)
  - 3 Vehicles
  - 3 Drivers
  - 3 Locations
  - 2 Routes
  - 5 Shipments

  🔐 Admin Credentials:
  Email: admin@logimetrics.com
  Password: Admin@123456`,
      "green"
    );

    await mongoose.disconnect();
    log("\n✅ Disconnected from MongoDB", "green");
  } catch (error) {
    log(`❌ MongoDB Seeding Error: ${error.message}`, "red");
    console.error(error);
    process.exit(1);
  }
}

seedMongoDB();
