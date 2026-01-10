/**
 * Tracking Socket Handler
 * Real-time GPS updates and location broadcasting
 */

const { redisClient } = require('../config/redis');
const { LiveTracking } = require('../models/mongodb');
const logger = require('../utils/logger.util');

const LOCATION_CACHE_PREFIX = 'location:';
const LOCATION_CACHE_TTL = 60;

/**
 * Initialize tracking socket handlers for a connection
 */
function initialize(io, socket) {
    // Driver sends location update
    socket.on('tracking:location:update', async (data) => {
        try {
            if (!validateLocationData(data)) {
                socket.emit('tracking:error', { message: 'Invalid location data' });
                return;
            }

            const locationData = {
                vehicleId: data.vehicleId,
                shipmentId: data.shipmentId,
                driverId: socket.user?.id,
                latitude: data.latitude,
                longitude: data.longitude,
                speed: data.speed || 0,
                heading: data.heading || 0,
                accuracy: data.accuracy || 0,
                altitude: data.altitude || 0,
                timestamp: new Date()
            };

            // Store in Redis for quick access
            const cacheKey = `${LOCATION_CACHE_PREFIX}${data.vehicleId}`;
            await redisClient.setex(cacheKey, LOCATION_CACHE_TTL, JSON.stringify(locationData));

            // Store in MongoDB for history
            await LiveTracking.create(locationData);

            // Broadcast to vehicle room
            io.to(`vehicle:${data.vehicleId}`).emit('tracking:location', locationData);

            // Broadcast to shipment room if applicable
            if (data.shipmentId) {
                io.to(`shipment:${data.shipmentId}`).emit('tracking:location', locationData);
                io.to(`tracking:${data.shipmentId}`).emit('tracking:location', locationData);
            }

            // Broadcast to company dashboard
            if (socket.user?.companyId) {
                io.to(`company:${socket.user.companyId}`).emit('fleet:location', locationData);
            }

            logger.debug(`Location update: vehicle ${data.vehicleId}`);
        } catch (error) {
            logger.error('Tracking location update error:', error);
            socket.emit('tracking:error', { message: 'Failed to process location update' });
        }
    });

    // Subscribe to vehicle tracking
    socket.on('tracking:subscribe:vehicle', (vehicleId) => {
        socket.join(`vehicle:${vehicleId}`);
        logger.debug(`Socket ${socket.id} subscribed to vehicle ${vehicleId}`);

        // Send current location if available
        sendCurrentLocation(socket, vehicleId);
    });

    // Unsubscribe from vehicle tracking
    socket.on('tracking:unsubscribe:vehicle', (vehicleId) => {
        socket.leave(`vehicle:${vehicleId}`);
        logger.debug(`Socket ${socket.id} unsubscribed from vehicle ${vehicleId}`);
    });

    // Subscribe to shipment tracking (public)
    socket.on('tracking:subscribe:shipment', (shipmentId) => {
        socket.join(`tracking:${shipmentId}`);
        socket.join(`shipment:${shipmentId}`);
        logger.debug(`Socket ${socket.id} subscribed to shipment ${shipmentId}`);
    });

    // Unsubscribe from shipment tracking
    socket.on('tracking:unsubscribe:shipment', (shipmentId) => {
        socket.leave(`tracking:${shipmentId}`);
        socket.leave(`shipment:${shipmentId}`);
        logger.debug(`Socket ${socket.id} unsubscribed from shipment ${shipmentId}`);
    });

    // Subscribe to fleet tracking (all company vehicles)
    socket.on('tracking:subscribe:fleet', () => {
        if (socket.user?.companyId) {
            socket.join(`fleet:${socket.user.companyId}`);
            logger.debug(`Socket ${socket.id} subscribed to fleet tracking`);
        }
    });

    // Request current location
    socket.on('tracking:get:location', async (data) => {
        try {
            const { vehicleId, shipmentId } = data;

            if (vehicleId) {
                await sendCurrentLocation(socket, vehicleId);
            } else if (shipmentId) {
                await sendShipmentLocation(socket, shipmentId);
            }
        } catch (error) {
            socket.emit('tracking:error', { message: 'Failed to get location' });
        }
    });

    // Telemetry update from driver app
    socket.on('tracking:telemetry', async (data) => {
        try {
            if (!socket.user) {
                socket.emit('tracking:error', { message: 'Authentication required' });
                return;
            }

            const telemetryData = {
                vehicleId: data.vehicleId,
                engineStatus: data.engineStatus,
                fuelLevel: data.fuelLevel,
                odometer: data.odometer,
                speed: data.speed,
                batteryVoltage: data.batteryVoltage,
                timestamp: new Date()
            };

            // Broadcast to company dashboard
            if (socket.user.companyId) {
                io.to(`company:${socket.user.companyId}`).emit('vehicle:telemetry', telemetryData);
            }

            // Check for alerts
            checkTelemetryAlerts(io, socket.user.companyId, telemetryData);
        } catch (error) {
            logger.error('Telemetry update error:', error);
        }
    });

    // Geofence event
    socket.on('tracking:geofence:event', (data) => {
        if (socket.user?.companyId) {
            io.to(`company:${socket.user.companyId}`).emit('geofence:alert', {
                vehicleId: data.vehicleId,
                geofenceId: data.geofenceId,
                geofenceName: data.geofenceName,
                eventType: data.eventType, // 'entry' or 'exit'
                timestamp: new Date()
            });
        }
    });
}

/**
 * Initialize namespace for tracking
 */
function initializeNamespace(namespace) {
    namespace.on('connection', (socket) => {
        logger.info(`Tracking namespace connection: ${socket.id}`);

        socket.on('subscribe', (roomId) => {
            socket.join(roomId);
        });

        socket.on('unsubscribe', (roomId) => {
            socket.leave(roomId);
        });
    });
}

// Helper functions

function validateLocationData(data) {
    return (
        data &&
        data.vehicleId &&
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number' &&
        data.latitude >= -90 && data.latitude <= 90 &&
        data.longitude >= -180 && data.longitude <= 180
    );
}

async function sendCurrentLocation(socket, vehicleId) {
    try {
        const cacheKey = `${LOCATION_CACHE_PREFIX}${vehicleId}`;
        const cached = await redisClient.get(cacheKey);

        if (cached) {
            socket.emit('tracking:location', JSON.parse(cached));
            return;
        }

        // Fallback to database
        const location = await LiveTracking.findOne({ vehicleId })
            .sort({ timestamp: -1 });

        if (location) {
            socket.emit('tracking:location', location);
        } else {
            socket.emit('tracking:location:not_found', { vehicleId });
        }
    } catch (error) {
        logger.error('Send current location error:', error);
    }
}

async function sendShipmentLocation(socket, shipmentId) {
    try {
        const location = await LiveTracking.findOne({ shipmentId })
            .sort({ timestamp: -1 });

        if (location) {
            socket.emit('tracking:location', location);
        } else {
            socket.emit('tracking:location:not_found', { shipmentId });
        }
    } catch (error) {
        logger.error('Send shipment location error:', error);
    }
}

function checkTelemetryAlerts(io, companyId, telemetry) {
    const alerts = [];

    if (telemetry.fuelLevel !== null && telemetry.fuelLevel < 15) {
        alerts.push({ type: 'low_fuel', severity: 'warning', message: `Low fuel: ${telemetry.fuelLevel}%` });
    }

    if (telemetry.batteryVoltage !== null && telemetry.batteryVoltage < 11.5) {
        alerts.push({ type: 'low_battery', severity: 'warning', message: `Low battery: ${telemetry.batteryVoltage}V` });
    }

    for (const alert of alerts) {
        io.to(`company:${companyId}`).emit('vehicle:alert', {
            vehicleId: telemetry.vehicleId,
            ...alert,
            timestamp: new Date()
        });
    }
}

// Emit functions for external use
function emitLocationUpdate(io, data) {
    if (data.vehicleId) {
        io.to(`vehicle:${data.vehicleId}`).emit('tracking:location', data);
    }
    if (data.shipmentId) {
        io.to(`shipment:${data.shipmentId}`).emit('tracking:location', data);
    }
}

function emitGeofenceAlert(io, companyId, data) {
    io.to(`company:${companyId}`).emit('geofence:alert', data);
}

module.exports = {
    initialize,
    initializeNamespace,
    emitLocationUpdate,
    emitGeofenceAlert
};
