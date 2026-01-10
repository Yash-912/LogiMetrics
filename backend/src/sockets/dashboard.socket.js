/**
 * Dashboard Socket Handler
 * Live dashboard metrics updates
 */

const { Shipment, Vehicle, Driver } = require('../models/postgres');
const { Op, Sequelize } = require('sequelize');
const { redisClient } = require('../config/redis');
const logger = require('../utils/logger.util');

const METRICS_CACHE_KEY = 'dashboard:metrics:';
const METRICS_CACHE_TTL = 30; // 30 seconds

/**
 * Initialize dashboard socket handlers for a connection
 */
function initialize(io, socket) {
    // Subscribe to dashboard updates
    socket.on('dashboard:subscribe', () => {
        if (socket.user?.companyId) {
            socket.join(`dashboard:${socket.user.companyId}`);
            logger.debug(`Socket ${socket.id} subscribed to dashboard`);

            // Send initial metrics
            sendDashboardMetrics(socket, socket.user.companyId);
        }
    });

    // Unsubscribe from dashboard updates
    socket.on('dashboard:unsubscribe', () => {
        if (socket.user?.companyId) {
            socket.leave(`dashboard:${socket.user.companyId}`);
            logger.debug(`Socket ${socket.id} unsubscribed from dashboard`);
        }
    });

    // Request specific metrics
    socket.on('dashboard:metrics:get', async (metricType) => {
        if (!socket.user?.companyId) {
            socket.emit('dashboard:error', { message: 'Authentication required' });
            return;
        }

        try {
            const metrics = await getMetricsByType(socket.user.companyId, metricType);
            socket.emit(`dashboard:metrics:${metricType}`, metrics);
        } catch (error) {
            logger.error('Get metrics error:', error);
            socket.emit('dashboard:error', { message: 'Failed to get metrics' });
        }
    });

    // Request real-time fleet status
    socket.on('dashboard:fleet:status', async () => {
        if (!socket.user?.companyId) return;

        try {
            const fleetStatus = await getFleetStatus(socket.user.companyId);
            socket.emit('dashboard:fleet:status', fleetStatus);
        } catch (error) {
            logger.error('Get fleet status error:', error);
        }
    });

    // Request shipment summary
    socket.on('dashboard:shipments:summary', async () => {
        if (!socket.user?.companyId) return;

        try {
            const summary = await getShipmentSummary(socket.user.companyId);
            socket.emit('dashboard:shipments:summary', summary);
        } catch (error) {
            logger.error('Get shipment summary error:', error);
        }
    });

    // Subscribe to alerts
    socket.on('dashboard:alerts:subscribe', () => {
        if (socket.user?.companyId) {
            socket.join(`alerts:${socket.user.companyId}`);
        }
    });
}

/**
 * Initialize namespace for dashboard
 */
function initializeNamespace(namespace) {
    namespace.use((socket, next) => {
        if (!socket.user) {
            return next(new Error('Authentication required'));
        }
        next();
    });

    namespace.on('connection', (socket) => {
        logger.info(`Dashboard namespace connection: ${socket.id}`);

        if (socket.user?.companyId) {
            socket.join(`company:${socket.user.companyId}`);
        }
    });
}

// Metric calculation functions

async function sendDashboardMetrics(socket, companyId) {
    try {
        const cacheKey = `${METRICS_CACHE_KEY}${companyId}`;
        let metrics = await redisClient.get(cacheKey);

        if (metrics) {
            socket.emit('dashboard:metrics', JSON.parse(metrics));
            return;
        }

        metrics = await calculateDashboardMetrics(companyId);
        await redisClient.setex(cacheKey, METRICS_CACHE_TTL, JSON.stringify(metrics));
        socket.emit('dashboard:metrics', metrics);
    } catch (error) {
        logger.error('Send dashboard metrics error:', error);
    }
}

async function calculateDashboardMetrics(companyId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [shipmentStats, vehicleStats, driverStats] = await Promise.all([
        // Shipment statistics
        Shipment.findAll({
            where: { companyId },
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['status']
        }),

        // Vehicle statistics
        Vehicle.findAll({
            where: { companyId, status: { [Op.ne]: 'deleted' } },
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['status']
        }),

        // Driver statistics
        Driver.findAll({
            where: { companyId, status: { [Op.ne]: 'deleted' } },
            attributes: [
                'status',
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
            ],
            group: ['status']
        })
    ]);

    // Today's shipments
    const todayShipments = await Shipment.count({
        where: {
            companyId,
            createdAt: { [Op.gte]: today }
        }
    });

    // Today's deliveries
    const todayDeliveries = await Shipment.count({
        where: {
            companyId,
            status: 'delivered',
            actualDeliveryDate: { [Op.gte]: today }
        }
    });

    return {
        shipments: {
            total: shipmentStats.reduce((sum, s) => sum + parseInt(s.dataValues.count), 0),
            byStatus: shipmentStats.reduce((acc, s) => {
                acc[s.status] = parseInt(s.dataValues.count);
                return acc;
            }, {}),
            today: todayShipments,
            todayDelivered: todayDeliveries
        },
        vehicles: {
            total: vehicleStats.reduce((sum, v) => sum + parseInt(v.dataValues.count), 0),
            byStatus: vehicleStats.reduce((acc, v) => {
                acc[v.status] = parseInt(v.dataValues.count);
                return acc;
            }, {})
        },
        drivers: {
            total: driverStats.reduce((sum, d) => sum + parseInt(d.dataValues.count), 0),
            byStatus: driverStats.reduce((acc, d) => {
                acc[d.status] = parseInt(d.dataValues.count);
                return acc;
            }, {})
        },
        updatedAt: new Date()
    };
}

async function getFleetStatus(companyId) {
    const vehicles = await Vehicle.findAll({
        where: { companyId, status: 'active' },
        include: [
            { model: Driver, as: 'currentDriver', attributes: ['id', 'firstName', 'lastName'] }
        ],
        attributes: ['id', 'registrationNumber', 'type', 'currentOdometer', 'currentFuelLevel']
    });

    return {
        vehicles: vehicles.map(v => ({
            id: v.id,
            registrationNumber: v.registrationNumber,
            type: v.type,
            driver: v.currentDriver ? `${v.currentDriver.firstName} ${v.currentDriver.lastName}` : null,
            odometer: v.currentOdometer,
            fuelLevel: v.currentFuelLevel
        })),
        total: vehicles.length,
        updatedAt: new Date()
    };
}

async function getShipmentSummary(companyId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, inTransit, outForDelivery, delivered, delayed] = await Promise.all([
        Shipment.count({ where: { companyId, status: 'pending' } }),
        Shipment.count({ where: { companyId, status: 'in_transit' } }),
        Shipment.count({ where: { companyId, status: 'out_for_delivery' } }),
        Shipment.count({ where: { companyId, status: 'delivered', actualDeliveryDate: { [Op.gte]: today } } }),
        Shipment.count({ where: { companyId, status: 'delayed' } })
    ]);

    return {
        pending,
        inTransit,
        outForDelivery,
        deliveredToday: delivered,
        delayed,
        updatedAt: new Date()
    };
}

async function getMetricsByType(companyId, type) {
    switch (type) {
        case 'shipments':
            return getShipmentSummary(companyId);
        case 'fleet':
            return getFleetStatus(companyId);
        case 'all':
            return calculateDashboardMetrics(companyId);
        default:
            throw new Error('Unknown metric type');
    }
}

// Emit functions for external use

/**
 * Broadcast updated metrics to dashboard
 */
function broadcastMetrics(io, companyId, metrics) {
    io.to(`dashboard:${companyId}`).emit('dashboard:metrics:update', metrics);
}

/**
 * Send real-time shipment count update
 */
function emitShipmentCountUpdate(io, companyId, status, count) {
    io.to(`dashboard:${companyId}`).emit('dashboard:shipment:count', {
        status,
        count,
        timestamp: new Date()
    });
}

/**
 * Send vehicle status update
 */
function emitVehicleStatusUpdate(io, companyId, vehicleId, status) {
    io.to(`dashboard:${companyId}`).emit('dashboard:vehicle:status', {
        vehicleId,
        status,
        timestamp: new Date()
    });
}

/**
 * Send alert to dashboard
 */
function emitAlert(io, companyId, alert) {
    io.to(`dashboard:${companyId}`).emit('dashboard:alert', {
        ...alert,
        timestamp: new Date()
    });
    io.to(`alerts:${companyId}`).emit('alert:new', alert);
}

/**
 * Send KPI update
 */
function emitKPIUpdate(io, companyId, kpi, value) {
    io.to(`dashboard:${companyId}`).emit('dashboard:kpi:update', {
        kpi,
        value,
        timestamp: new Date()
    });
}

/**
 * Invalidate cached metrics
 */
async function invalidateMetricsCache(companyId) {
    const cacheKey = `${METRICS_CACHE_KEY}${companyId}`;
    await redisClient.del(cacheKey);
}

module.exports = {
    initialize,
    initializeNamespace,
    broadcastMetrics,
    emitShipmentCountUpdate,
    emitVehicleStatusUpdate,
    emitAlert,
    emitKPIUpdate,
    invalidateMetricsCache,
    calculateDashboardMetrics
};
