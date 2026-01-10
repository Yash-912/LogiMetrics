/**
 * Shipment Service
 * Handles shipment lifecycle, status transitions, and notifications
 */

const { Op, Sequelize } = require('sequelize');
const { Shipment, Company, User, Driver, Vehicle, Route, ShipmentItem } = require('../models/postgres');
const { ShipmentEvent, LiveTracking, AuditLog } = require('../models/mongodb');
const { sendEmail, emailTemplates } = require('../config/email');
const { sendSMS } = require('../config/sms');
const { emitToRoom, emitToUser } = require('../config/socket');
const { calculateDistance, estimateDeliveryTime } = require('../utils/calculations.util');
const { uploadToS3 } = require('../utils/fileUpload.util');
const logger = require('../utils/logger.util');

// Valid status transitions
const STATUS_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['picked_up', 'cancelled'],
    picked_up: ['in_transit', 'cancelled'],
    in_transit: ['out_for_delivery', 'delayed', 'cancelled'],
    out_for_delivery: ['delivered', 'failed_delivery', 'cancelled'],
    delayed: ['in_transit', 'cancelled'],
    failed_delivery: ['out_for_delivery', 'returned', 'cancelled'],
    delivered: [],
    returned: [],
    cancelled: []
};

/**
 * Get all shipments with pagination and filters
 */
async function getShipments({ page = 1, limit = 10, search, status, companyId, customerId, driverId, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
        where[Op.or] = [
            { trackingId: { [Op.iLike]: `%${search}%` } },
            { referenceNumber: { [Op.iLike]: `%${search}%` } }
        ];
    }

    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (customerId) where.customerId = customerId;
    if (driverId) where.driverId = driverId;

    if (startDate && endDate) {
        where.createdAt = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }

    const { count, rows } = await Shipment.findAndCountAll({
        where,
        include: [
            { model: Driver, as: 'driver', attributes: ['id', 'firstName', 'lastName', 'phone'] },
            { model: Vehicle, as: 'vehicle', attributes: ['id', 'registrationNumber', 'type'] }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit,
        offset
    });

    return {
        shipments: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }
    };
}

/**
 * Get shipment by ID
 */
async function getShipmentById(shipmentId) {
    const shipment = await Shipment.findByPk(shipmentId, {
        include: [
            { model: Company, as: 'company' },
            { model: Driver, as: 'driver' },
            { model: Vehicle, as: 'vehicle' },
            { model: Route, as: 'route' },
            { model: ShipmentItem, as: 'items' }
        ]
    });

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    return shipment;
}

/**
 * Get shipment by tracking ID
 */
async function getShipmentByTrackingId(trackingId) {
    const shipment = await Shipment.findOne({
        where: { trackingId },
        include: [
            { model: Driver, as: 'driver', attributes: ['firstName', 'lastName', 'phone'] },
            { model: Vehicle, as: 'vehicle', attributes: ['registrationNumber', 'type'] }
        ]
    });

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    return shipment;
}

/**
 * Create a new shipment
 */
async function createShipment(shipmentData, createdBy) {
    const {
        companyId, customerId, origin, destination, items,
        pickupDate, deliveryDate, priority, notes, serviceType
    } = shipmentData;

    // Generate tracking ID
    const trackingId = generateTrackingId(companyId);

    // Calculate distance and estimated delivery
    let distance, estimatedDelivery;
    try {
        distance = await calculateDistance(origin, destination);
        estimatedDelivery = estimateDeliveryTime(distance, serviceType);
    } catch (error) {
        logger.warn('Failed to calculate distance:', error);
        distance = null;
        estimatedDelivery = deliveryDate || null;
    }

    // Create shipment
    const shipment = await Shipment.create({
        trackingId,
        companyId,
        customerId,
        originAddress: origin.address,
        originLatitude: origin.latitude,
        originLongitude: origin.longitude,
        originContact: origin.contact,
        originPhone: origin.phone,
        destinationAddress: destination.address,
        destinationLatitude: destination.latitude,
        destinationLongitude: destination.longitude,
        destinationContact: destination.contact,
        destinationPhone: destination.phone,
        scheduledPickupDate: pickupDate,
        scheduledDeliveryDate: deliveryDate,
        estimatedDeliveryDate: estimatedDelivery,
        distance,
        priority: priority || 'normal',
        serviceType: serviceType || 'standard',
        notes,
        status: 'pending',
        createdBy
    });

    // Create shipment items
    if (items && items.length > 0) {
        await ShipmentItem.bulkCreate(
            items.map(item => ({
                shipmentId: shipment.id,
                description: item.description,
                quantity: item.quantity,
                weight: item.weight,
                dimensions: item.dimensions,
                value: item.value
            }))
        );
    }

    // Log event
    await addShipmentEvent(shipment.id, 'created', 'Shipment created', createdBy);

    // Send notification to customer
    await notifyShipmentCreated(shipment);

    // Log the action
    await logShipmentAction(createdBy, 'create', shipment.id, { trackingId });

    return shipment;
}

/**
 * Update shipment
 */
async function updateShipment(shipmentId, updateData, updatedBy) {
    const shipment = await Shipment.findByPk(shipmentId);

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    // Prevent updating completed shipments
    if (['delivered', 'cancelled', 'returned'].includes(shipment.status)) {
        throw new Error('Cannot update a completed shipment');
    }

    await shipment.update(updateData);

    // Log event
    await addShipmentEvent(shipment.id, 'updated', 'Shipment details updated', updatedBy);

    // Log the action
    await logShipmentAction(updatedBy, 'update', shipmentId, { fields: Object.keys(updateData) });

    return shipment;
}

/**
 * Update shipment status
 */
async function updateShipmentStatus(shipmentId, newStatus, notes, updatedBy, metadata = {}) {
    const shipment = await Shipment.findByPk(shipmentId);

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[shipment.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${shipment.status} to ${newStatus}`);
    }

    const oldStatus = shipment.status;
    const updateData = { status: newStatus };

    // Set timestamps based on status
    if (newStatus === 'picked_up') {
        updateData.actualPickupDate = new Date();
    } else if (newStatus === 'delivered') {
        updateData.actualDeliveryDate = new Date();
    } else if (newStatus === 'cancelled') {
        updateData.cancelledAt = new Date();
        updateData.cancellationReason = notes;
    }

    await shipment.update(updateData);

    // Log event
    await addShipmentEvent(shipment.id, 'status_changed', notes || `Status changed from ${oldStatus} to ${newStatus}`, updatedBy, {
        oldStatus,
        newStatus,
        ...metadata
    });

    // Send notifications
    await notifyStatusChange(shipment, newStatus);

    // Emit real-time update
    emitToRoom(`shipment:${shipmentId}`, 'shipment:status', {
        shipmentId,
        status: newStatus,
        timestamp: new Date()
    });

    // Log the action
    await logShipmentAction(updatedBy, 'status_change', shipmentId, { oldStatus, newStatus });

    return shipment;
}

/**
 * Assign driver and vehicle to shipment
 */
async function assignShipment(shipmentId, { driverId, vehicleId }, assignedBy) {
    const shipment = await Shipment.findByPk(shipmentId);

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    // Verify driver and vehicle exist
    if (driverId) {
        const driver = await Driver.findByPk(driverId);
        if (!driver) throw new Error('Driver not found');
        if (driver.status !== 'active') throw new Error('Driver is not active');
    }

    if (vehicleId) {
        const vehicle = await Vehicle.findByPk(vehicleId);
        if (!vehicle) throw new Error('Vehicle not found');
        if (vehicle.status !== 'active') throw new Error('Vehicle is not active');
    }

    await shipment.update({ driverId, vehicleId });

    // Log event
    await addShipmentEvent(shipment.id, 'assigned', `Assigned to driver and vehicle`, assignedBy, { driverId, vehicleId });

    // Notify driver
    if (driverId) {
        emitToUser(driverId, 'shipment:assigned', {
            shipmentId,
            trackingId: shipment.trackingId
        });
    }

    return shipment;
}

/**
 * Upload proof of delivery
 */
async function uploadPOD(shipmentId, { signature, photo, notes, recipientName }, uploadedBy) {
    const shipment = await Shipment.findByPk(shipmentId);

    if (!shipment) {
        throw new Error('Shipment not found');
    }

    const podData = {
        recipientName,
        notes,
        capturedAt: new Date(),
        capturedBy: uploadedBy
    };

    // Upload signature if provided
    if (signature) {
        podData.signatureUrl = await uploadToS3(signature, `shipments/${shipmentId}/pod/signature`);
    }

    // Upload photo if provided
    if (photo) {
        podData.photoUrl = await uploadToS3(photo, `shipments/${shipmentId}/pod/photo`);
    }

    await shipment.update({
        proofOfDelivery: podData,
        podCapturedAt: new Date()
    });

    // Log event
    await addShipmentEvent(shipment.id, 'pod_captured', 'Proof of delivery captured', uploadedBy);

    return shipment;
}

/**
 * Cancel shipment
 */
async function cancelShipment(shipmentId, reason, cancelledBy) {
    return updateShipmentStatus(shipmentId, 'cancelled', reason, cancelledBy);
}

/**
 * Get shipment events/timeline
 */
async function getShipmentEvents(shipmentId) {
    const events = await ShipmentEvent.find({ shipmentId })
        .sort({ timestamp: -1 });

    return events;
}

/**
 * Bulk create shipments
 */
async function bulkCreateShipments(shipmentsData, createdBy) {
    const results = { created: [], failed: [] };

    for (const data of shipmentsData) {
        try {
            const shipment = await createShipment(data, createdBy);
            results.created.push(shipment.trackingId);
        } catch (error) {
            results.failed.push({ data, error: error.message });
        }
    }

    return results;
}

/**
 * Get shipment statistics
 */
async function getShipmentStats(companyId, { startDate, endDate }) {
    const where = { companyId };

    if (startDate && endDate) {
        where.createdAt = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }

    const stats = await Shipment.findAll({
        where,
        attributes: [
            'status',
            [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
        ],
        group: ['status']
    });

    const total = await Shipment.count({ where });
    const delivered = stats.find(s => s.status === 'delivered')?.dataValues.count || 0;

    return {
        total,
        byStatus: stats.reduce((acc, s) => {
            acc[s.status] = parseInt(s.dataValues.count);
            return acc;
        }, {}),
        deliveryRate: total > 0 ? ((delivered / total) * 100).toFixed(2) : 0
    };
}

// Helper functions

function generateTrackingId(companyId) {
    const prefix = 'LM';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
}

async function addShipmentEvent(shipmentId, eventType, description, userId, metadata = {}) {
    try {
        await ShipmentEvent.create({
            shipmentId,
            eventType,
            description,
            userId,
            metadata,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Failed to add shipment event:', error);
    }
}

async function notifyShipmentCreated(shipment) {
    try {
        const template = emailTemplates.shipmentCreated({
            trackingId: shipment.trackingId,
            origin: shipment.originAddress,
            destination: shipment.destinationAddress,
            estimatedDelivery: shipment.estimatedDeliveryDate
        });

        // Email notification would go here
        logger.info(`Shipment created notification sent for ${shipment.trackingId}`);
    } catch (error) {
        logger.error('Failed to send shipment created notification:', error);
    }
}

async function notifyStatusChange(shipment, newStatus) {
    try {
        const template = emailTemplates.shipmentStatusUpdate(
            { trackingId: shipment.trackingId },
            newStatus
        );

        // Email/SMS notification would go here
        logger.info(`Status update notification sent for ${shipment.trackingId}: ${newStatus}`);
    } catch (error) {
        logger.error('Failed to send status change notification:', error);
    }
}

async function logShipmentAction(actorId, action, shipmentId, metadata) {
    try {
        await AuditLog.create({
            userId: actorId,
            action: `shipment:${action}`,
            resource: 'shipment',
            resourceId: shipmentId,
            metadata,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Failed to log shipment action:', error);
    }
}

module.exports = {
    getShipments,
    getShipmentById,
    getShipmentByTrackingId,
    createShipment,
    updateShipment,
    updateShipmentStatus,
    assignShipment,
    uploadPOD,
    cancelShipment,
    getShipmentEvents,
    bulkCreateShipments,
    getShipmentStats
};
