/**
 * Shipment Socket Handler
 * Real-time shipment status change events
 */

const { Shipment } = require('../models/postgres');
const { ShipmentEvent } = require('../models/mongodb');
const logger = require('../utils/logger.util');

/**
 * Initialize shipment socket handlers for a connection
 */
function initialize(io, socket) {
    // Subscribe to shipment updates
    socket.on('shipment:subscribe', (shipmentId) => {
        socket.join(`shipment:${shipmentId}`);
        logger.debug(`Socket ${socket.id} subscribed to shipment ${shipmentId}`);
    });

    // Unsubscribe from shipment updates
    socket.on('shipment:unsubscribe', (shipmentId) => {
        socket.leave(`shipment:${shipmentId}`);
        logger.debug(`Socket ${socket.id} unsubscribed from shipment ${shipmentId}`);
    });

    // Subscribe to all company shipments
    socket.on('shipment:subscribe:company', () => {
        if (socket.user?.companyId) {
            socket.join(`shipments:company:${socket.user.companyId}`);
            logger.debug(`Socket ${socket.id} subscribed to company shipments`);
        }
    });

    // Subscribe to driver's assigned shipments
    socket.on('shipment:subscribe:driver', () => {
        if (socket.user) {
            socket.join(`shipments:driver:${socket.user.id}`);
            logger.debug(`Socket ${socket.id} subscribed to driver shipments`);
        }
    });

    // Get shipment status
    socket.on('shipment:get:status', async (shipmentId) => {
        try {
            const shipment = await Shipment.findByPk(shipmentId, {
                attributes: ['id', 'trackingId', 'status', 'estimatedDeliveryDate', 'actualDeliveryDate']
            });

            if (shipment) {
                socket.emit('shipment:status', {
                    shipmentId: shipment.id,
                    trackingId: shipment.trackingId,
                    status: shipment.status,
                    estimatedDelivery: shipment.estimatedDeliveryDate,
                    actualDelivery: shipment.actualDeliveryDate
                });
            } else {
                socket.emit('shipment:error', { message: 'Shipment not found' });
            }
        } catch (error) {
            logger.error('Get shipment status error:', error);
            socket.emit('shipment:error', { message: 'Failed to get shipment status' });
        }
    });

    // Get shipment events/timeline
    socket.on('shipment:get:events', async (shipmentId) => {
        try {
            const events = await ShipmentEvent.find({ shipmentId })
                .sort({ timestamp: -1 })
                .limit(20);

            socket.emit('shipment:events', { shipmentId, events });
        } catch (error) {
            logger.error('Get shipment events error:', error);
            socket.emit('shipment:error', { message: 'Failed to get shipment events' });
        }
    });

    // Driver updates shipment status
    socket.on('shipment:update:status', async (data) => {
        try {
            if (!socket.user) {
                socket.emit('shipment:error', { message: 'Authentication required' });
                return;
            }

            const { shipmentId, status, notes, location } = data;

            // Validate status transition would happen here
            // For now, just broadcast the update

            const updateData = {
                shipmentId,
                status,
                notes,
                location,
                updatedBy: socket.user.id,
                timestamp: new Date()
            };

            // Broadcast to shipment subscribers
            io.to(`shipment:${shipmentId}`).emit('shipment:status:updated', updateData);

            // Broadcast to company
            if (socket.user.companyId) {
                io.to(`shipments:company:${socket.user.companyId}`).emit('shipment:status:updated', updateData);
            }

            socket.emit('shipment:update:success', { shipmentId, status });
        } catch (error) {
            logger.error('Update shipment status error:', error);
            socket.emit('shipment:error', { message: 'Failed to update status' });
        }
    });

    // Driver sends proof of delivery
    socket.on('shipment:pod:submit', (data) => {
        try {
            if (!socket.user) {
                socket.emit('shipment:error', { message: 'Authentication required' });
                return;
            }

            const { shipmentId, recipientName, signature, photo, notes } = data;

            // Broadcast POD submission
            io.to(`shipment:${shipmentId}`).emit('shipment:pod:received', {
                shipmentId,
                recipientName,
                hasSignature: !!signature,
                hasPhoto: !!photo,
                notes,
                timestamp: new Date()
            });

            if (socket.user.companyId) {
                io.to(`shipments:company:${socket.user.companyId}`).emit('shipment:pod:received', {
                    shipmentId,
                    driverId: socket.user.id
                });
            }

            socket.emit('shipment:pod:success', { shipmentId });
        } catch (error) {
            logger.error('POD submission error:', error);
            socket.emit('shipment:error', { message: 'Failed to submit POD' });
        }
    });

    // Request delivery attempt
    socket.on('shipment:delivery:attempt', (data) => {
        try {
            const { shipmentId, attemptType, notes, location } = data;

            io.to(`shipment:${shipmentId}`).emit('shipment:delivery:attempted', {
                shipmentId,
                attemptType, // 'success', 'failed', 'rescheduled'
                notes,
                location,
                timestamp: new Date()
            });
        } catch (error) {
            logger.error('Delivery attempt error:', error);
        }
    });
}

// Emit functions for external use

/**
 * Emit shipment status change
 */
function emitStatusChange(io, shipmentId, status, data = {}) {
    io.to(`shipment:${shipmentId}`).emit('shipment:status:changed', {
        shipmentId,
        status,
        ...data,
        timestamp: new Date()
    });
}

/**
 * Emit shipment created event
 */
function emitShipmentCreated(io, companyId, shipment) {
    io.to(`shipments:company:${companyId}`).emit('shipment:created', {
        shipmentId: shipment.id,
        trackingId: shipment.trackingId,
        status: shipment.status,
        origin: shipment.originAddress,
        destination: shipment.destinationAddress,
        timestamp: new Date()
    });
}

/**
 * Emit shipment assigned to driver
 */
function emitShipmentAssigned(io, driverId, shipment) {
    io.to(`shipments:driver:${driverId}`).emit('shipment:assigned', {
        shipmentId: shipment.id,
        trackingId: shipment.trackingId,
        origin: shipment.originAddress,
        destination: shipment.destinationAddress,
        scheduledPickup: shipment.scheduledPickupDate,
        timestamp: new Date()
    });
}

/**
 * Emit ETA update
 */
function emitETAUpdate(io, shipmentId, eta) {
    io.to(`shipment:${shipmentId}`).emit('shipment:eta:updated', {
        shipmentId,
        eta,
        timestamp: new Date()
    });
}

/**
 * Emit delivery completed
 */
function emitDeliveryCompleted(io, shipmentId, data) {
    io.to(`shipment:${shipmentId}`).emit('shipment:delivered', {
        shipmentId,
        deliveredAt: new Date(),
        ...data
    });
}

/**
 * Emit shipment delayed
 */
function emitShipmentDelayed(io, shipmentId, reason, newETA) {
    io.to(`shipment:${shipmentId}`).emit('shipment:delayed', {
        shipmentId,
        reason,
        newETA,
        timestamp: new Date()
    });
}

module.exports = {
    initialize,
    emitStatusChange,
    emitShipmentCreated,
    emitShipmentAssigned,
    emitETAUpdate,
    emitDeliveryCompleted,
    emitShipmentDelayed
};
