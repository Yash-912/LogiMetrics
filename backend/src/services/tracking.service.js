/**
 * Tracking Service
 * Handles GPS processing, geofencing, and location history management
 */

const { Op } = require('sequelize');
const { Shipment, Vehicle, Driver, Route, Geofence } = require('../models/postgres');
const { LiveTracking, VehicleTelemetry, ShipmentEvent, AuditLog } = require('../models/mongodb');
const { redisClient } = require('../config/redis');
const { emitToRoom, emitToUser } = require('../config/socket');
const { calculateETA, isPointInGeofence } = require('../config/maps');
const logger = require('../utils/logger.util');

const LOCATION_CACHE_PREFIX = 'location:';
const LOCATION_CACHE_TTL = 60; // 1 minute

/**
 * Update vehicle location
 */
async function updateLocation(locationData, updatedBy) {
    const {
        vehicleId, shipmentId, latitude, longitude,
        speed, heading, accuracy, altitude, timestamp
    } = locationData;

    // Validate vehicle exists
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    const locationRecord = {
        vehicleId,
        shipmentId,
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0,
        accuracy: accuracy || 0,
        altitude: altitude || 0,
        timestamp: timestamp || new Date(),
        driverId: vehicle.currentDriverId
    };

    // Save to MongoDB for history
    await LiveTracking.create(locationRecord);

    // Update Redis cache for real-time access
    const cacheKey = `${LOCATION_CACHE_PREFIX}${vehicleId}`;
    await redisClient.setex(cacheKey, LOCATION_CACHE_TTL, JSON.stringify({
        ...locationRecord,
        updatedAt: new Date().toISOString()
    }));

    // Check geofences
    await checkGeofences(vehicleId, shipmentId, latitude, longitude);

    // Emit real-time update
    emitToRoom(`vehicle:${vehicleId}`, 'location:update', locationRecord);

    if (shipmentId) {
        emitToRoom(`shipment:${shipmentId}`, 'location:update', locationRecord);
    }

    return locationRecord;
}

/**
 * Get current vehicle location
 */
async function getVehicleLocation(vehicleId) {
    // Try cache first
    const cacheKey = `${LOCATION_CACHE_PREFIX}${vehicleId}`;
    const cached = await redisClient.get(cacheKey);

    if (cached) {
        return JSON.parse(cached);
    }

    // Fallback to database
    const location = await LiveTracking.findOne({ vehicleId })
        .sort({ timestamp: -1 });

    if (!location) {
        throw new Error('No location data found for this vehicle');
    }

    return location;
}

/**
 * Get current shipment location
 */
async function getShipmentLocation(shipmentId) {
    const shipment = await Shipment.findByPk(shipmentId, {
        include: [{ model: Vehicle, as: 'vehicle' }]
    });

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    if (!shipment.vehicleId) {
        throw new Error('Shipment not assigned to a vehicle');
    }

    return getVehicleLocation(shipment.vehicleId);
}

/**
 * Get vehicle location history
 */
async function getVehicleLocationHistory(vehicleId, { startDate, endDate, limit = 100 }) {
    const query = { vehicleId };

    if (startDate && endDate) {
        query.timestamp = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const history = await LiveTracking.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);

    return history;
}

/**
 * Get shipment location history
 */
async function getShipmentLocationHistory(shipmentId, { startDate, endDate }) {
    const query = { shipmentId };

    if (startDate && endDate) {
        query.timestamp = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const history = await LiveTracking.find(query)
        .sort({ timestamp: 1 });

    return history;
}

/**
 * Get all active vehicles with locations
 */
async function getActiveVehicles(companyId, bounds) {
    const vehicles = await Vehicle.findAll({
        where: {
            companyId,
            status: 'active',
            currentDriverId: { [Op.ne]: null }
        },
        include: [
            { model: Driver, as: 'currentDriver', attributes: ['id', 'firstName', 'lastName', 'phone'] }
        ],
        attributes: ['id', 'registrationNumber', 'type']
    });

    // Get live locations from cache
    const vehiclesWithLocations = await Promise.all(
        vehicles.map(async (vehicle) => {
            try {
                const location = await getVehicleLocation(vehicle.id);
                return {
                    ...vehicle.toJSON(),
                    location: {
                        latitude: location.latitude,
                        longitude: location.longitude,
                        speed: location.speed,
                        heading: location.heading,
                        updatedAt: location.timestamp
                    }
                };
            } catch (error) {
                return {
                    ...vehicle.toJSON(),
                    location: null
                };
            }
        })
    );

    // Filter by bounds if provided
    if (bounds) {
        const { north, south, east, west } = bounds;
        return vehiclesWithLocations.filter(v => {
            if (!v.location) return false;
            const { latitude, longitude } = v.location;
            return latitude <= north && latitude >= south &&
                longitude <= east && longitude >= west;
        });
    }

    return vehiclesWithLocations;
}

/**
 * Update vehicle telemetry
 */
async function updateTelemetry(telemetryData, updatedBy) {
    const {
        vehicleId, engineStatus, fuelLevel, odometer,
        engineTemperature, batteryVoltage, diagnosticCodes
    } = telemetryData;

    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    const telemetryRecord = {
        vehicleId,
        engineStatus,
        fuelLevel,
        odometer,
        engineTemperature,
        batteryVoltage,
        diagnosticCodes: diagnosticCodes || [],
        timestamp: new Date()
    };

    // Save to MongoDB
    await VehicleTelemetry.create(telemetryRecord);

    // Update vehicle record
    await vehicle.update({
        currentOdometer: odometer || vehicle.currentOdometer,
        currentFuelLevel: fuelLevel || vehicle.currentFuelLevel
    });

    // Check for alerts
    await checkTelemetryAlerts(vehicleId, telemetryRecord);

    // Emit real-time update
    emitToRoom(`vehicle:${vehicleId}`, 'telemetry:update', telemetryRecord);

    return telemetryRecord;
}

/**
 * Get vehicle telemetry
 */
async function getVehicleTelemetry(vehicleId, { startDate, endDate, limit = 100 }) {
    const query = { vehicleId };

    if (startDate && endDate) {
        query.timestamp = {
            $gte: new Date(startDate),
            $lte: new Date(endDate)
        };
    }

    const telemetry = await VehicleTelemetry.find(query)
        .sort({ timestamp: -1 })
        .limit(limit);

    return telemetry;
}

/**
 * Create geofence
 */
async function createGeofence(geofenceData, createdBy) {
    const {
        companyId, name, type, center, radius, coordinates,
        alertOnEntry, alertOnExit, description
    } = geofenceData;

    const geofence = await Geofence.create({
        companyId,
        name,
        description,
        type, // 'circle' or 'polygon'
        center: center ? { type: 'Point', coordinates: [center.longitude, center.latitude] } : null,
        radius,
        polygon: coordinates ? { type: 'Polygon', coordinates: [coordinates] } : null,
        alertOnEntry: alertOnEntry !== false,
        alertOnExit: alertOnExit !== false,
        isActive: true,
        createdBy
    });

    // Log the action
    await logTrackingAction(createdBy, 'create_geofence', geofence.id, { name });

    return geofence;
}

/**
 * Get geofences
 */
async function getGeofences(companyId, { isActive = true } = {}) {
    const where = { companyId };
    if (isActive !== null) {
        where.isActive = isActive;
    }

    const geofences = await Geofence.findAll({ where });

    return geofences;
}

/**
 * Delete geofence
 */
async function deleteGeofence(geofenceId, deletedBy) {
    const geofence = await Geofence.findByPk(geofenceId);

    if (!geofence) {
        throw new Error('Geofence not found');
    }

    await geofence.update({ isActive: false, deletedAt: new Date() });

    // Log the action
    await logTrackingAction(deletedBy, 'delete_geofence', geofenceId, {});

    return { message: 'Geofence deleted successfully' };
}

/**
 * Get shipment ETA
 */
async function getShipmentETA(shipmentId) {
    const shipment = await Shipment.findByPk(shipmentId, {
        include: [{ model: Vehicle, as: 'vehicle' }]
    });

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    if (!shipment.vehicleId) {
        throw new Error('Shipment not assigned to a vehicle');
    }

    // Get current vehicle location
    const location = await getVehicleLocation(shipment.vehicleId);

    // Calculate ETA to destination
    const eta = await calculateETA(
        { lat: location.latitude, lng: location.longitude },
        { lat: shipment.destinationLatitude, lng: shipment.destinationLongitude }
    );

    return {
        shipmentId,
        currentLocation: {
            latitude: location.latitude,
            longitude: location.longitude
        },
        destination: {
            latitude: shipment.destinationLatitude,
            longitude: shipment.destinationLongitude,
            address: shipment.destinationAddress
        },
        distance: eta.distance,
        duration: eta.duration,
        durationInTraffic: eta.durationInTraffic,
        estimatedArrival: eta.eta
    };
}

/**
 * Check geofences for a location
 */
async function checkGeofences(vehicleId, shipmentId, latitude, longitude) {
    try {
        // Get vehicle to find company
        const vehicle = await Vehicle.findByPk(vehicleId);
        if (!vehicle) return;

        // Get active geofences for the company
        const geofences = await Geofence.findAll({
            where: { companyId: vehicle.companyId, isActive: true }
        });

        for (const geofence of geofences) {
            let isInside = false;

            if (geofence.type === 'circle') {
                const center = {
                    lat: geofence.center.coordinates[1],
                    lng: geofence.center.coordinates[0]
                };
                isInside = isPointInGeofence({ lat: latitude, lng: longitude }, center, geofence.radius);
            }
            // TODO: Add polygon geofence check

            // Get previous state from cache
            const stateKey = `geofence:${geofence.id}:${vehicleId}`;
            const previousState = await redisClient.get(stateKey);
            const wasInside = previousState === 'inside';

            // Detect entry/exit
            if (isInside && !wasInside && geofence.alertOnEntry) {
                await triggerGeofenceAlert(vehicleId, shipmentId, geofence, 'entry');
            } else if (!isInside && wasInside && geofence.alertOnExit) {
                await triggerGeofenceAlert(vehicleId, shipmentId, geofence, 'exit');
            }

            // Update state
            await redisClient.setex(stateKey, 3600, isInside ? 'inside' : 'outside');
        }
    } catch (error) {
        logger.error('Geofence check failed:', error);
    }
}

/**
 * Trigger geofence alert
 */
async function triggerGeofenceAlert(vehicleId, shipmentId, geofence, eventType) {
    const alertData = {
        vehicleId,
        shipmentId,
        geofenceId: geofence.id,
        geofenceName: geofence.name,
        eventType,
        timestamp: new Date()
    };

    // Log event
    if (shipmentId) {
        await ShipmentEvent.create({
            shipmentId,
            eventType: `geofence_${eventType}`,
            description: `${eventType === 'entry' ? 'Entered' : 'Exited'} geofence: ${geofence.name}`,
            metadata: alertData,
            timestamp: new Date()
        });
    }

    // Emit real-time alert
    emitToRoom(`vehicle:${vehicleId}`, 'geofence:alert', alertData);

    logger.info(`Geofence ${eventType}: vehicle ${vehicleId}, geofence ${geofence.name}`);
}

/**
 * Check telemetry for alerts
 */
async function checkTelemetryAlerts(vehicleId, telemetry) {
    const alerts = [];

    // Low fuel alert
    if (telemetry.fuelLevel !== null && telemetry.fuelLevel < 15) {
        alerts.push({
            type: 'low_fuel',
            message: `Low fuel level: ${telemetry.fuelLevel}%`,
            severity: 'warning'
        });
    }

    // High engine temperature
    if (telemetry.engineTemperature !== null && telemetry.engineTemperature > 100) {
        alerts.push({
            type: 'high_temperature',
            message: `High engine temperature: ${telemetry.engineTemperature}°C`,
            severity: 'critical'
        });
    }

    // Low battery
    if (telemetry.batteryVoltage !== null && telemetry.batteryVoltage < 11.5) {
        alerts.push({
            type: 'low_battery',
            message: `Low battery voltage: ${telemetry.batteryVoltage}V`,
            severity: 'warning'
        });
    }

    // Diagnostic codes
    if (telemetry.diagnosticCodes && telemetry.diagnosticCodes.length > 0) {
        alerts.push({
            type: 'diagnostic_codes',
            message: `Diagnostic codes detected: ${telemetry.diagnosticCodes.join(', ')}`,
            severity: 'warning'
        });
    }

    // Emit alerts
    for (const alert of alerts) {
        emitToRoom(`vehicle:${vehicleId}`, 'telemetry:alert', {
            vehicleId,
            ...alert,
            timestamp: new Date()
        });
    }

    return alerts;
}

// Helper functions

async function logTrackingAction(actorId, action, resourceId, metadata) {
    try {
        await AuditLog.create({
            userId: actorId,
            action: `tracking:${action}`,
            resource: 'tracking',
            resourceId,
            metadata,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Failed to log tracking action:', error);
    }
}

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
    checkGeofences,
    triggerGeofenceAlert
};
