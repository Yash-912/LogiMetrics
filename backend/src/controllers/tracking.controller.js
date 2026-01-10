const { validationResult } = require("express-validator");
const { Shipment, Vehicle, Driver, Route } = require("../models/mongodb");
const {
  LiveTracking,
  VehicleTelemetry,
  ShipmentEvent,
  AuditLog,
} = require("../models/mongodb");
const {
  successResponse,
  errorResponse,
  paginated,
} = require("../utils/response.util");
const { AppError } = require("../middleware/error.middleware");
const { redisClient } = require("../config/redis");
const {
  calculateDistance,
  isWithinGeofence,
} = require("../utils/calculations.util");
const { emitToRoom, emitToUser } = require("../config/socket");
const logger = require("../utils/logger.util");

/**
 * Update vehicle location (from driver app or GPS device)
 * @route POST /api/tracking/location
 */
const updateLocation = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const {
      vehicleId,
      shipmentId,
      latitude,
      longitude,
      altitude,
      speed,
      heading,
      accuracy,
      timestamp,
    } = req.body;

    // Validate vehicle exists
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const locationData = {
      vehicleId,
      shipmentId,
      latitude,
      longitude,
      altitude,
      speed,
      heading,
      accuracy,
      timestamp: timestamp || new Date(),
      recordedAt: new Date(),
    };

    // Store in MongoDB for historical data
    await LiveTracking.create(locationData);

    // Update real-time cache in Redis
    const cacheKey = `vehicle:${vehicleId}:location`;
    await redisClient.set(cacheKey, JSON.stringify(locationData), "EX", 300); // 5 min expiry

    // If shipment is associated, update shipment location cache
    if (shipmentId) {
      await redisClient.set(
        `shipment:${shipmentId}:location`,
        JSON.stringify(locationData),
        "EX",
        300
      );

      // Emit real-time update via WebSocket
      emitToRoom(`shipment:${shipmentId}`, "location_update", locationData);
    }

    // Emit to vehicle tracking room
    emitToRoom(`vehicle:${vehicleId}`, "location_update", locationData);

    // Check geofences
    await checkGeofences(vehicleId, shipmentId, latitude, longitude);

    return successResponse(res, "Location updated successfully", 200, {
      location: locationData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current location of a vehicle
 * @route GET /api/tracking/vehicle/:vehicleId/location
 */
const getVehicleLocation = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    // Try to get from Redis cache first
    const cachedLocation = await redisClient.get(
      `vehicle:${vehicleId}:location`
    );

    if (cachedLocation) {
      return successResponse(res, "Vehicle location retrieved", 200, {
        location: JSON.parse(cachedLocation),
        source: "cache",
      });
    }

    // Fall back to MongoDB for last known location
    const lastLocation = await LiveTracking.findOne({ vehicleId }).sort({
      timestamp: -1,
    });

    if (!lastLocation) {
      throw new AppError("No location data available for this vehicle", 404);
    }

    return successResponse(res, "Vehicle location retrieved", 200, {
      location: lastLocation,
      source: "database",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current location of a shipment
 * @route GET /api/tracking/shipment/:shipmentId/location
 */
const getShipmentLocation = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;

    const shipment = await Shipment.findByPk(shipmentId);
    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    // Try to get from Redis cache first
    const cachedLocation = await redisClient.get(
      `shipment:${shipmentId}:location`
    );

    if (cachedLocation) {
      return successResponse(res, "Shipment location retrieved", 200, {
        location: JSON.parse(cachedLocation),
        source: "cache",
      });
    }

    // Fall back to MongoDB
    const lastLocation = await LiveTracking.findOne({ shipmentId }).sort({
      timestamp: -1,
    });

    if (!lastLocation) {
      throw new AppError("No location data available for this shipment", 404);
    }

    return successResponse(res, "Shipment location retrieved", 200, {
      location: lastLocation,
      source: "database",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get location history for a vehicle
 * @route GET /api/tracking/vehicle/:vehicleId/history
 */
const getVehicleLocationHistory = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { startDate, endDate, limit = 1000, page = 1 } = req.query;

    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const query = { vehicleId };
    if (startDate && endDate) {
      query.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const skip = (page - 1) * limit;

    const locations = await LiveTracking.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await LiveTracking.countDocuments(query);

    return paginated(res, "Vehicle location history retrieved", locations, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get location history for a shipment
 * @route GET /api/tracking/shipment/:shipmentId/history
 */
const getShipmentLocationHistory = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;
    const { limit = 500 } = req.query;

    const shipment = await Shipment.findByPk(shipmentId);
    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    const locations = await LiveTracking.find({ shipmentId })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    return successResponse(res, "Shipment location history retrieved", 200, {
      locations,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all active vehicles with their locations
 * @route GET /api/tracking/vehicles/active
 */
const getActiveVehicles = async (req, res, next) => {
  try {
    const { companyId } = req.query;

    // Get all vehicles that are in use
    const where = { status: "in_use" };
    if (companyId) where.companyId = companyId;
    if (req.user.role !== "admin" && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    const vehicles = await Vehicle.findAll({
      where,
      include: [
        {
          model: Driver,
          as: "currentDriver",
          attributes: ["id", "firstName", "lastName", "phone"],
        },
      ],
      attributes: ["id", "licensePlate", "type", "make", "model"],
    });

    // Get current locations for each vehicle from cache
    const vehiclesWithLocations = await Promise.all(
      vehicles.map(async (vehicle) => {
        const cachedLocation = await redisClient.get(
          `vehicle:${vehicle.id}:location`
        );
        return {
          ...vehicle.toJSON(),
          currentLocation: cachedLocation ? JSON.parse(cachedLocation) : null,
        };
      })
    );

    return successResponse(res, "Active vehicles retrieved", 200, {
      vehicles: vehiclesWithLocations,
      count: vehiclesWithLocations.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update vehicle telemetry data (engine data, fuel, etc.)
 * @route POST /api/tracking/telemetry
 */
const updateTelemetry = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const {
      vehicleId,
      engineRpm,
      engineTemperature,
      fuelLevel,
      fuelConsumption,
      odometer,
      batteryVoltage,
      tirePressure,
      oilPressure,
      diagnosticCodes,
      timestamp,
    } = req.body;

    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const telemetryData = {
      vehicleId,
      engineRpm,
      engineTemperature,
      fuelLevel,
      fuelConsumption,
      odometer,
      batteryVoltage,
      tirePressure,
      oilPressure,
      diagnosticCodes: diagnosticCodes || [],
      timestamp: timestamp || new Date(),
    };

    // Store in MongoDB
    await VehicleTelemetry.create(telemetryData);

    // Update vehicle odometer if provided
    if (odometer && odometer > vehicle.mileage) {
      await vehicle.update({ mileage: odometer });
    }

    // Cache latest telemetry
    await redisClient.set(
      `vehicle:${vehicleId}:telemetry`,
      JSON.stringify(telemetryData),
      "EX",
      300
    );

    // Check for alerts (low fuel, engine issues, etc.)
    await checkTelemetryAlerts(vehicleId, telemetryData);

    return successResponse(res, "Telemetry updated successfully", 200, {
      telemetry: telemetryData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get vehicle telemetry
 * @route GET /api/tracking/vehicle/:vehicleId/telemetry
 */
const getVehicleTelemetry = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    // Try cache first
    const cachedTelemetry = await redisClient.get(
      `vehicle:${vehicleId}:telemetry`
    );

    if (cachedTelemetry) {
      return successResponse(res, "Vehicle telemetry retrieved", 200, {
        telemetry: JSON.parse(cachedTelemetry),
        source: "cache",
      });
    }

    // Fall back to MongoDB
    const telemetry = await VehicleTelemetry.findOne({ vehicleId }).sort({
      timestamp: -1,
    });

    if (!telemetry) {
      throw new AppError("No telemetry data available", 404);
    }

    return successResponse(res, "Vehicle telemetry retrieved", 200, {
      telemetry,
      source: "database",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create geofence
 * @route POST /api/tracking/geofences
 */
const createGeofence = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const {
      name,
      type,
      centerLatitude,
      centerLongitude,
      radius,
      polygon,
      shipmentIds,
      vehicleIds,
      alertOnEntry,
      alertOnExit,
    } = req.body;

    const geofenceKey = `geofence:${Date.now()}`;
    const geofenceData = {
      id: geofenceKey,
      name,
      type, // 'circle' or 'polygon'
      centerLatitude,
      centerLongitude,
      radius,
      polygon,
      shipmentIds: shipmentIds || [],
      vehicleIds: vehicleIds || [],
      alertOnEntry: alertOnEntry !== false,
      alertOnExit: alertOnExit !== false,
      companyId: req.user.companyId,
      createdBy: req.user.id,
      createdAt: new Date(),
    };

    // Store geofence in Redis
    await redisClient.set(geofenceKey, JSON.stringify(geofenceData));

    // Add to company's geofence set
    await redisClient.sadd(
      `company:${req.user.companyId}:geofences`,
      geofenceKey
    );

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "GEOFENCE_CREATED",
      resource: "Geofence",
      resourceId: geofenceKey,
      details: { name },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Geofence created successfully", 201, {
      geofence: geofenceData,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all geofences
 * @route GET /api/tracking/geofences
 */
const getGeofences = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;

    const geofenceKeys = await redisClient.smembers(
      `company:${companyId}:geofences`
    );

    const geofences = await Promise.all(
      geofenceKeys.map(async (key) => {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
      })
    );

    return successResponse(res, "Geofences retrieved successfully", 200, {
      geofences: geofences.filter(Boolean),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete geofence
 * @route DELETE /api/tracking/geofences/:geofenceId
 */
const deleteGeofence = async (req, res, next) => {
  try {
    const { geofenceId } = req.params;

    const geofenceData = await redisClient.get(geofenceId);
    if (!geofenceData) {
      throw new AppError("Geofence not found", 404);
    }

    const geofence = JSON.parse(geofenceData);

    // Remove from company's geofence set
    await redisClient.srem(
      `company:${geofence.companyId}:geofences`,
      geofenceId
    );

    // Delete geofence
    await redisClient.del(geofenceId);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "GEOFENCE_DELETED",
      resource: "Geofence",
      resourceId: geofenceId,
      details: { name: geofence.name },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Geofence deleted successfully", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Get ETA for shipment
 * @route GET /api/tracking/shipment/:shipmentId/eta
 */
const getShipmentETA = async (req, res, next) => {
  try {
    const { shipmentId } = req.params;

    const shipment = await Shipment.findByPk(shipmentId, {
      include: [{ model: Vehicle, as: "vehicle" }],
    });

    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    if (!shipment.vehicleId) {
      throw new AppError("Shipment has no assigned vehicle", 400);
    }

    // Get current vehicle location
    const cachedLocation = await redisClient.get(
      `vehicle:${shipment.vehicleId}:location`
    );

    if (!cachedLocation) {
      throw new AppError("No current location data available", 404);
    }

    const currentLocation = JSON.parse(cachedLocation);

    // Calculate distance to destination
    const remainingDistance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      shipment.deliveryLatitude,
      shipment.deliveryLongitude
    );

    // Estimate time based on average speed or current speed
    const averageSpeed = currentLocation.speed > 0 ? currentLocation.speed : 50; // km/h default
    const estimatedMinutes = (remainingDistance / averageSpeed) * 60;
    const eta = new Date(Date.now() + estimatedMinutes * 60 * 1000);

    return successResponse(res, "Shipment ETA retrieved", 200, {
      shipmentId,
      currentLocation: {
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
      },
      destination: {
        latitude: shipment.deliveryLatitude,
        longitude: shipment.deliveryLongitude,
        address: shipment.deliveryAddress,
      },
      remainingDistance: Math.round(remainingDistance * 100) / 100, // km
      estimatedMinutes: Math.round(estimatedMinutes),
      eta,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Helper function to check geofences
 */
const checkGeofences = async (vehicleId, shipmentId, latitude, longitude) => {
  try {
    // Get vehicle's company geofences
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) return;

    const geofenceKeys = await redisClient.smembers(
      `company:${vehicle.companyId}:geofences`
    );

    for (const key of geofenceKeys) {
      const geofenceData = await redisClient.get(key);
      if (!geofenceData) continue;

      const geofence = JSON.parse(geofenceData);

      // Check if this geofence applies to this vehicle/shipment
      const applies =
        geofence.vehicleIds.includes(vehicleId) ||
        (shipmentId && geofence.shipmentIds.includes(shipmentId)) ||
        (geofence.vehicleIds.length === 0 && geofence.shipmentIds.length === 0);

      if (!applies) continue;

      // Check if within geofence
      const isInside = isWithinGeofence(latitude, longitude, geofence);

      // Get previous state
      const previousStateKey = `geofence:${geofence.id}:vehicle:${vehicleId}:state`;
      const previousState = await redisClient.get(previousStateKey);
      const wasInside = previousState === "inside";

      // Store current state
      await redisClient.set(
        previousStateKey,
        isInside ? "inside" : "outside",
        "EX",
        86400
      );

      // Trigger alerts on state change
      if (isInside && !wasInside && geofence.alertOnEntry) {
        await triggerGeofenceAlert(vehicleId, shipmentId, geofence, "entry");
      } else if (!isInside && wasInside && geofence.alertOnExit) {
        await triggerGeofenceAlert(vehicleId, shipmentId, geofence, "exit");
      }
    }
  } catch (err) {
    logger.error("Geofence check error:", err);
  }
};

/**
 * Helper function to trigger geofence alerts
 */
const triggerGeofenceAlert = async (
  vehicleId,
  shipmentId,
  geofence,
  eventType
) => {
  const alertData = {
    type: "geofence_alert",
    geofenceId: geofence.id,
    geofenceName: geofence.name,
    vehicleId,
    shipmentId,
    eventType, // 'entry' or 'exit'
    timestamp: new Date(),
  };

  // Emit real-time alert
  emitToRoom(`company:${geofence.companyId}`, "geofence_alert", alertData);

  // Create shipment event if applicable
  if (shipmentId) {
    await ShipmentEvent.create({
      shipmentId,
      eventType: `GEOFENCE_${eventType.toUpperCase()}`,
      description: `${eventType === "entry" ? "Entered" : "Exited"} geofence: ${
        geofence.name
      }`,
      isPublic: true,
    });
  }

  logger.info(
    `Geofence ${eventType} alert: Vehicle ${vehicleId} ${eventType} ${geofence.name}`
  );
};

/**
 * Helper function to check telemetry alerts
 */
const checkTelemetryAlerts = async (vehicleId, telemetry) => {
  const alerts = [];

  // Low fuel alert
  if (telemetry.fuelLevel !== undefined && telemetry.fuelLevel < 15) {
    alerts.push({ type: "low_fuel", level: telemetry.fuelLevel });
  }

  // High engine temperature
  if (
    telemetry.engineTemperature !== undefined &&
    telemetry.engineTemperature > 100
  ) {
    alerts.push({
      type: "high_engine_temp",
      temperature: telemetry.engineTemperature,
    });
  }

  // Low battery
  if (
    telemetry.batteryVoltage !== undefined &&
    telemetry.batteryVoltage < 11.5
  ) {
    alerts.push({ type: "low_battery", voltage: telemetry.batteryVoltage });
  }

  // Diagnostic codes
  if (telemetry.diagnosticCodes && telemetry.diagnosticCodes.length > 0) {
    alerts.push({ type: "diagnostic_codes", codes: telemetry.diagnosticCodes });
  }

  if (alerts.length > 0) {
    const vehicle = await Vehicle.findByPk(vehicleId);

    for (const alert of alerts) {
      emitToRoom(`company:${vehicle.companyId}`, "vehicle_alert", {
        vehicleId,
        licensePlate: vehicle.licensePlate,
        alert,
        timestamp: new Date(),
      });
    }
  }
};

module.exports = {
  updateLocation,
  getVehicleLocation,
  getShipmentLocation,
  getVehicleLocationHistory,
  getShipmentLocationHistory,
  getActiveVehicles,
  updateTelemetry,
  getVehicleTelemetry,
  createGeofence,
  getGeofences,
  deleteGeofence,
  getShipmentETA,
};
