/**
 * Vehicle Service
 * Handles vehicle management and maintenance scheduling
 */

const { Op, Sequelize } = require('sequelize');
const { Vehicle, Driver, Company, MaintenanceRecord, FuelLog } = require('../models/postgres');
const { VehicleTelemetry, AuditLog } = require('../models/mongodb');
const { sendEmail, emailTemplates } = require('../config/email');
const { uploadToS3, deleteFromS3 } = require('../utils/fileUpload.util');
const logger = require('../utils/logger.util');

/**
 * Get all vehicles with pagination and filters
 */
async function getVehicles({ page = 1, limit = 10, search, status, type, companyId, sortBy = 'createdAt', sortOrder = 'desc' }) {
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
        where[Op.or] = [
            { registrationNumber: { [Op.iLike]: `%${search}%` } },
            { make: { [Op.iLike]: `%${search}%` } },
            { model: { [Op.iLike]: `%${search}%` } }
        ];
    }

    if (status) where.status = status;
    if (type) where.type = type;
    if (companyId) where.companyId = companyId;

    const { count, rows } = await Vehicle.findAndCountAll({
        where,
        include: [
            { model: Driver, as: 'currentDriver', attributes: ['id', 'firstName', 'lastName'] }
        ],
        order: [[sortBy, sortOrder.toUpperCase()]],
        limit,
        offset
    });

    return {
        vehicles: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }
    };
}

/**
 * Get vehicle by ID
 */
async function getVehicleById(vehicleId) {
    const vehicle = await Vehicle.findByPk(vehicleId, {
        include: [
            { model: Company, as: 'company' },
            { model: Driver, as: 'currentDriver' }
        ]
    });

    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    return vehicle;
}

/**
 * Create a new vehicle
 */
async function createVehicle(vehicleData, createdBy) {
    const {
        companyId, registrationNumber, type, make, model, year,
        color, vin, fuelType, fuelCapacity, loadCapacity,
        insuranceNumber, insuranceExpiry, registrationExpiry
    } = vehicleData;

    // Check if registration number already exists
    const existing = await Vehicle.findOne({ where: { registrationNumber } });
    if (existing) {
        throw new Error('Vehicle with this registration number already exists');
    }

    const vehicle = await Vehicle.create({
        companyId,
        registrationNumber,
        type,
        make,
        model,
        year,
        color,
        vin,
        fuelType,
        fuelCapacity,
        loadCapacity,
        insuranceNumber,
        insuranceExpiry,
        registrationExpiry,
        status: 'active',
        createdBy
    });

    // Log the action
    await logVehicleAction(createdBy, 'create', vehicle.id, { registrationNumber });

    return vehicle;
}

/**
 * Update vehicle
 */
async function updateVehicle(vehicleId, updateData, updatedBy) {
    const vehicle = await Vehicle.findByPk(vehicleId);

    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    await vehicle.update(updateData);

    // Log the action
    await logVehicleAction(updatedBy, 'update', vehicleId, { fields: Object.keys(updateData) });

    return vehicle;
}

/**
 * Delete vehicle (soft delete)
 */
async function deleteVehicle(vehicleId, deletedBy) {
    const vehicle = await Vehicle.findByPk(vehicleId);

    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    // Check if vehicle has active assignments
    if (vehicle.currentDriverId) {
        throw new Error('Cannot delete vehicle with active driver assignment');
    }

    await vehicle.update({
        status: 'deleted',
        deletedAt: new Date()
    });

    // Log the action
    await logVehicleAction(deletedBy, 'delete', vehicleId, {});

    return { message: 'Vehicle deleted successfully' };
}

/**
 * Update vehicle status
 */
async function updateVehicleStatus(vehicleId, status, notes, updatedBy) {
    const vehicle = await Vehicle.findByPk(vehicleId);

    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    const validStatuses = ['active', 'inactive', 'maintenance', 'out_of_service'];
    if (!validStatuses.includes(status)) {
        throw new Error('Invalid status');
    }

    await vehicle.update({
        status,
        statusNotes: notes,
        statusUpdatedAt: new Date()
    });

    // Log the action
    await logVehicleAction(updatedBy, 'status_change', vehicleId, { status, notes });

    return vehicle;
}

/**
 * Assign driver to vehicle
 */
async function assignDriver(vehicleId, driverId, assignedBy) {
    const vehicle = await Vehicle.findByPk(vehicleId);
    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
        throw new Error('Driver not found');
    }

    if (driver.status !== 'active') {
        throw new Error('Driver is not active');
    }

    // Check if driver is already assigned to another vehicle
    const existingAssignment = await Vehicle.findOne({
        where: { currentDriverId: driverId, id: { [Op.ne]: vehicleId } }
    });

    if (existingAssignment) {
        throw new Error('Driver is already assigned to another vehicle');
    }

    await vehicle.update({ currentDriverId: driverId });

    // Update driver's assigned vehicle
    await driver.update({ currentVehicleId: vehicleId });

    // Log the action
    await logVehicleAction(assignedBy, 'assign_driver', vehicleId, { driverId });

    return vehicle;
}

/**
 * Unassign driver from vehicle
 */
async function unassignDriver(vehicleId, unassignedBy) {
    const vehicle = await Vehicle.findByPk(vehicleId);

    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    const driverId = vehicle.currentDriverId;

    if (driverId) {
        const driver = await Driver.findByPk(driverId);
        if (driver) {
            await driver.update({ currentVehicleId: null });
        }
    }

    await vehicle.update({ currentDriverId: null });

    // Log the action
    await logVehicleAction(unassignedBy, 'unassign_driver', vehicleId, { driverId });

    return vehicle;
}

/**
 * Get maintenance records for a vehicle
 */
async function getMaintenanceRecords(vehicleId, { page = 1, limit = 10 }) {
    const offset = (page - 1) * limit;

    const { count, rows } = await MaintenanceRecord.findAndCountAll({
        where: { vehicleId },
        order: [['scheduledDate', 'DESC']],
        limit,
        offset
    });

    return {
        records: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }
    };
}

/**
 * Add maintenance record
 */
async function addMaintenanceRecord(vehicleId, recordData, createdBy) {
    const vehicle = await Vehicle.findByPk(vehicleId);

    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    const record = await MaintenanceRecord.create({
        vehicleId,
        ...recordData,
        createdBy
    });

    // Update next maintenance date on vehicle
    if (recordData.nextMaintenanceDate) {
        await vehicle.update({ nextMaintenanceDate: recordData.nextMaintenanceDate });
    }

    // Log the action
    await logVehicleAction(createdBy, 'add_maintenance', vehicleId, { maintenanceId: record.id });

    return record;
}

/**
 * Update maintenance record
 */
async function updateMaintenanceRecord(vehicleId, recordId, updateData, updatedBy) {
    const record = await MaintenanceRecord.findOne({
        where: { id: recordId, vehicleId }
    });

    if (!record) {
        throw new Error('Maintenance record not found');
    }

    await record.update(updateData);

    // Log the action
    await logVehicleAction(updatedBy, 'update_maintenance', vehicleId, { maintenanceId: recordId });

    return record;
}

/**
 * Get fuel logs for a vehicle
 */
async function getFuelLogs(vehicleId, { page = 1, limit = 20, startDate, endDate }) {
    const offset = (page - 1) * limit;
    const where = { vehicleId };

    if (startDate && endDate) {
        where.date = {
            [Op.between]: [new Date(startDate), new Date(endDate)]
        };
    }

    const { count, rows } = await FuelLog.findAndCountAll({
        where,
        order: [['date', 'DESC']],
        limit,
        offset
    });

    return {
        logs: rows,
        pagination: {
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        }
    };
}

/**
 * Add fuel log
 */
async function addFuelLog(vehicleId, logData, createdBy) {
    const vehicle = await Vehicle.findByPk(vehicleId);

    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    const log = await FuelLog.create({
        vehicleId,
        ...logData,
        createdBy
    });

    // Update vehicle's current odometer
    if (logData.odometer) {
        await vehicle.update({ currentOdometer: logData.odometer });
    }

    // Log the action
    await logVehicleAction(createdBy, 'add_fuel_log', vehicleId, { fuelLogId: log.id });

    return log;
}

/**
 * Get vehicle telemetry
 */
async function getTelemetry(vehicleId, { startDate, endDate, limit = 100 }) {
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
 * Get vehicles needing maintenance
 */
async function getVehiclesNeedingMaintenance(companyId, daysAhead = 7) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const vehicles = await Vehicle.findAll({
        where: {
            companyId,
            status: { [Op.ne]: 'deleted' },
            [Op.or]: [
                { nextMaintenanceDate: { [Op.lte]: futureDate } },
                { insuranceExpiry: { [Op.lte]: futureDate } },
                { registrationExpiry: { [Op.lte]: futureDate } }
            ]
        }
    });

    return vehicles;
}

/**
 * Get vehicle statistics
 */
async function getVehicleStats(companyId) {
    const where = { companyId, status: { [Op.ne]: 'deleted' } };

    const [total, byStatus, byType] = await Promise.all([
        Vehicle.count({ where }),
        Vehicle.findAll({
            where,
            attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
            group: ['status']
        }),
        Vehicle.findAll({
            where,
            attributes: ['type', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']],
            group: ['type']
        })
    ]);

    return {
        total,
        byStatus: byStatus.reduce((acc, s) => {
            acc[s.status] = parseInt(s.dataValues.count);
            return acc;
        }, {}),
        byType: byType.reduce((acc, t) => {
            acc[t.type] = parseInt(t.dataValues.count);
            return acc;
        }, {})
    };
}

/**
 * Upload vehicle documents
 */
async function uploadDocuments(vehicleId, files, uploadedBy) {
    const vehicle = await Vehicle.findByPk(vehicleId);

    if (!vehicle) {
        throw new Error('Vehicle not found');
    }

    const uploadedDocs = [];

    for (const file of files) {
        const url = await uploadToS3(file, `vehicles/${vehicleId}/documents`);
        uploadedDocs.push({
            name: file.originalname,
            url,
            uploadedAt: new Date(),
            uploadedBy
        });
    }

    const existingDocs = vehicle.documents || [];
    await vehicle.update({
        documents: [...existingDocs, ...uploadedDocs]
    });

    return uploadedDocs;
}

// Helper functions

async function logVehicleAction(actorId, action, vehicleId, metadata) {
    try {
        await AuditLog.create({
            userId: actorId,
            action: `vehicle:${action}`,
            resource: 'vehicle',
            resourceId: vehicleId,
            metadata,
            timestamp: new Date()
        });
    } catch (error) {
        logger.error('Failed to log vehicle action:', error);
    }
}

module.exports = {
    getVehicles,
    getVehicleById,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    updateVehicleStatus,
    assignDriver,
    unassignDriver,
    getMaintenanceRecords,
    addMaintenanceRecord,
    updateMaintenanceRecord,
    getFuelLogs,
    addFuelLog,
    getTelemetry,
    getVehiclesNeedingMaintenance,
    getVehicleStats,
    uploadDocuments
};
