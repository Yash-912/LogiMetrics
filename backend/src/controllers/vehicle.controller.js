const { validationResult } = require("express-validator");
const { Op } = require("sequelize");
const { Vehicle, Company, Driver } = require("../models/mongodb");
const { VehicleTelemetry, AuditLog } = require("../models/mongodb");
const {
  successResponse,
  errorResponse,
  paginated,
} = require("../utils/response.util");
const { AppError } = require("../middleware/error.middleware");
const { uploadToS3 } = require("../utils/fileUpload.util");
const logger = require("../utils/logger.util");

/**
 * Get all vehicles with pagination and filters
 * @route GET /api/vehicles
 */
const getVehicles = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      companyId,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (type) where.type = type;
    if (companyId) where.companyId = companyId;
    if (search) {
      where[Op.or] = [
        { licensePlate: { [Op.iLike]: `%${search}%` } },
        { make: { [Op.iLike]: `%${search}%` } },
        { model: { [Op.iLike]: `%${search}%` } },
        { vin: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Filter by user's company if not admin
    if (req.user.role !== "admin" && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    const { count, rows: vehicles } = await Vehicle.findAndCountAll({
      where,
      include: [
        { model: Company, as: "company", attributes: ["id", "name"] },
        {
          model: Driver,
          as: "currentDriver",
          attributes: ["id", "firstName", "lastName", "phone"],
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return paginated(res, "Vehicles retrieved successfully", vehicles, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get vehicle by ID
 * @route GET /api/vehicles/:id
 */
const getVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByPk(id, {
      include: [
        { model: Company, as: "company" },
        { model: Driver, as: "currentDriver" },
      ],
    });

    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    // Get recent telemetry data
    const telemetry = await VehicleTelemetry.findOne({ vehicleId: id }).sort({
      createdAt: -1,
    });

    return successResponse(res, "Vehicle retrieved successfully", 200, {
      vehicle,
      telemetry,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new vehicle
 * @route POST /api/vehicles
 */
const createVehicle = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const {
      licensePlate,
      vin,
      make,
      model,
      year,
      type,
      color,
      capacity,
      capacityUnit,
      fuelType,
      fuelCapacity,
      mileage,
      insuranceNumber,
      insuranceExpiry,
      registrationExpiry,
      features,
      specifications,
    } = req.body;

    // Check if vehicle with same license plate exists
    const existingPlate = await Vehicle.findOne({ where: { licensePlate } });
    if (existingPlate) {
      throw new AppError("Vehicle with this license plate already exists", 409);
    }

    // Check if vehicle with same VIN exists
    if (vin) {
      const existingVin = await Vehicle.findOne({ where: { vin } });
      if (existingVin) {
        throw new AppError("Vehicle with this VIN already exists", 409);
      }
    }

    const vehicle = await Vehicle.create({
      licensePlate,
      vin,
      make,
      model,
      year,
      type,
      color,
      capacity,
      capacityUnit: capacityUnit || "kg",
      fuelType: fuelType || "diesel",
      fuelCapacity,
      mileage: mileage || 0,
      insuranceNumber,
      insuranceExpiry,
      registrationExpiry,
      features: features || [],
      specifications: specifications || {},
      companyId: req.user.companyId,
      status: "available",
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "VEHICLE_CREATED",
      resource: "Vehicle",
      resourceId: vehicle.id,
      details: { licensePlate: vehicle.licensePlate },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(
      `Vehicle created: ${vehicle.licensePlate} by ${req.user.email}`
    );

    return successResponse(res, "Vehicle created successfully", 201, {
      vehicle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update vehicle
 * @route PUT /api/vehicles/:id
 */
const updateVehicle = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const updateData = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    // Check license plate uniqueness
    if (
      updateData.licensePlate &&
      updateData.licensePlate !== vehicle.licensePlate
    ) {
      const existingPlate = await Vehicle.findOne({
        where: { licensePlate: updateData.licensePlate },
      });
      if (existingPlate) {
        throw new AppError("License plate is already in use", 409);
      }
    }

    // Check VIN uniqueness
    if (updateData.vin && updateData.vin !== vehicle.vin) {
      const existingVin = await Vehicle.findOne({
        where: { vin: updateData.vin },
      });
      if (existingVin) {
        throw new AppError("VIN is already in use", 409);
      }
    }

    await vehicle.update(updateData);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "VEHICLE_UPDATED",
      resource: "Vehicle",
      resourceId: vehicle.id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(
      `Vehicle updated: ${vehicle.licensePlate} by ${req.user.email}`
    );

    return successResponse(res, "Vehicle updated successfully", 200, {
      vehicle,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete vehicle
 * @route DELETE /api/vehicles/:id
 */
const deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    // Check if vehicle is currently in use
    if (vehicle.status === "in_use") {
      throw new AppError("Cannot delete vehicle that is currently in use", 400);
    }

    const licensePlate = vehicle.licensePlate;

    // Soft delete
    await vehicle.update({ status: "inactive", deletedAt: new Date() });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "VEHICLE_DELETED",
      resource: "Vehicle",
      resourceId: id,
      details: { licensePlate },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Vehicle deleted: ${licensePlate} by ${req.user.email}`);

    return successResponse(res, "Vehicle deleted successfully", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Update vehicle status
 * @route PATCH /api/vehicles/:id/status
 */
const updateVehicleStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { status, reason } = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const previousStatus = vehicle.status;
    await vehicle.update({ status });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "VEHICLE_STATUS_CHANGED",
      resource: "Vehicle",
      resourceId: id,
      details: { previousStatus, newStatus: status, reason },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Vehicle ${vehicle.licensePlate} status changed to ${status}`);

    return successResponse(res, "Vehicle status updated successfully", 200, {
      status,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Assign driver to vehicle
 * @route POST /api/vehicles/:id/assign-driver
 */
const assignDriver = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { driverId } = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      throw new AppError("Driver not found", 404);
    }

    // Check if driver is already assigned to another vehicle
    const existingAssignment = await Vehicle.findOne({
      where: { currentDriverId: driverId, id: { [Op.ne]: id } },
    });
    if (existingAssignment) {
      throw new AppError("Driver is already assigned to another vehicle", 400);
    }

    await vehicle.update({ currentDriverId: driverId });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "DRIVER_ASSIGNED_TO_VEHICLE",
      resource: "Vehicle",
      resourceId: id,
      details: {
        driverId,
        driverName: `${driver.firstName} ${driver.lastName}`,
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(
      `Driver ${driver.firstName} assigned to vehicle ${vehicle.licensePlate}`
    );

    return successResponse(
      res,
      "Driver assigned to vehicle successfully",
      200,
      {
        vehicle: await Vehicle.findByPk(id, {
          include: [{ model: Driver, as: "currentDriver" }],
        }),
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Unassign driver from vehicle
 * @route POST /api/vehicles/:id/unassign-driver
 */
const unassignDriver = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    if (!vehicle.currentDriverId) {
      throw new AppError(
        "No driver is currently assigned to this vehicle",
        400
      );
    }

    const previousDriverId = vehicle.currentDriverId;
    await vehicle.update({ currentDriverId: null });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "DRIVER_UNASSIGNED_FROM_VEHICLE",
      resource: "Vehicle",
      resourceId: id,
      details: { previousDriverId },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(
      res,
      "Driver unassigned from vehicle successfully",
      200
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get vehicle maintenance records
 * @route GET /api/vehicles/:id/maintenance
 */
const getMaintenanceRecords = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, type, status } = req.query;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const offset = (page - 1) * limit;
    const where = { vehicleId: id };

    if (type) where.type = type;
    if (status) where.status = status;

    const { count, rows: records } = await MaintenanceRecord.findAndCountAll({
      where,
      order: [["scheduledDate", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    return paginated(
      res,
      "Maintenance records retrieved successfully",
      records,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Add maintenance record
 * @route POST /api/vehicles/:id/maintenance
 */
const addMaintenanceRecord = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const {
      type,
      description,
      scheduledDate,
      completedDate,
      cost,
      vendor,
      notes,
      mileageAtService,
      nextServiceMileage,
      nextServiceDate,
    } = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const record = await MaintenanceRecord.create({
      vehicleId: id,
      type,
      description,
      scheduledDate,
      completedDate,
      cost,
      vendor,
      notes,
      mileageAtService,
      nextServiceMileage,
      nextServiceDate,
      status: completedDate ? "completed" : "scheduled",
      createdBy: req.user.id,
    });

    // If maintenance is scheduled, update vehicle status
    if (!completedDate && type === "repair") {
      await vehicle.update({ status: "maintenance" });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "MAINTENANCE_RECORD_CREATED",
      resource: "Vehicle",
      resourceId: id,
      details: { type, description },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(
      `Maintenance record created for vehicle ${vehicle.licensePlate}`
    );

    return successResponse(
      res,
      "Maintenance record created successfully",
      201,
      {
        record,
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Update maintenance record
 * @route PUT /api/vehicles/:id/maintenance/:recordId
 */
const updateMaintenanceRecord = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id, recordId } = req.params;
    const updateData = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const record = await MaintenanceRecord.findOne({
      where: { id: recordId, vehicleId: id },
    });

    if (!record) {
      throw new AppError("Maintenance record not found", 404);
    }

    // Update status if completedDate is provided
    if (updateData.completedDate && !record.completedDate) {
      updateData.status = "completed";
      // Update vehicle status back to available if it was in maintenance
      if (vehicle.status === "maintenance") {
        await vehicle.update({ status: "available" });
      }
    }

    await record.update(updateData);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "MAINTENANCE_RECORD_UPDATED",
      resource: "Vehicle",
      resourceId: id,
      details: { recordId, updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(
      res,
      "Maintenance record updated successfully",
      200,
      {
        record,
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Get vehicle fuel logs
 * @route GET /api/vehicles/:id/fuel
 */
const getFuelLogs = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const offset = (page - 1) * limit;
    const where = { vehicleId: id };

    if (startDate && endDate) {
      where.date = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    }

    const { count, rows: logs } = await FuelLog.findAndCountAll({
      where,
      order: [["date", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Calculate summary statistics
    const summary = await FuelLog.findAll({
      where: { vehicleId: id },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("quantity")), "totalFuel"],
        [sequelize.fn("SUM", sequelize.col("cost")), "totalCost"],
        [sequelize.fn("AVG", sequelize.col("pricePerUnit")), "avgPrice"],
      ],
      raw: true,
    });

    return paginated(res, "Fuel logs retrieved successfully", logs, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      summary: summary[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Add fuel log
 * @route POST /api/vehicles/:id/fuel
 */
const addFuelLog = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const {
      date,
      quantity,
      pricePerUnit,
      totalCost,
      fuelType,
      mileage,
      station,
      location,
      notes,
      receiptNumber,
    } = req.body;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const log = await FuelLog.create({
      vehicleId: id,
      driverId: req.user.driverId || null,
      date: date || new Date(),
      quantity,
      pricePerUnit,
      totalCost: totalCost || quantity * pricePerUnit,
      fuelType: fuelType || vehicle.fuelType,
      mileage,
      station,
      location,
      notes,
      receiptNumber,
      createdBy: req.user.id,
    });

    // Update vehicle mileage if provided
    if (mileage && mileage > vehicle.mileage) {
      await vehicle.update({ mileage });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "FUEL_LOG_CREATED",
      resource: "Vehicle",
      resourceId: id,
      details: { quantity, totalCost: log.totalCost },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Fuel log created for vehicle ${vehicle.licensePlate}`);

    return successResponse(res, "Fuel log created successfully", 201, { log });
  } catch (err) {
    next(err);
  }
};

/**
 * Get vehicle telemetry data
 * @route GET /api/vehicles/:id/telemetry
 */
const getTelemetry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const query = { vehicleId: id };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const telemetry = await VehicleTelemetry.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return successResponse(
      res,
      "Vehicle telemetry retrieved successfully",
      200,
      {
        telemetry,
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Upload vehicle documents
 * @route POST /api/vehicles/:id/documents
 */
const uploadDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { documentType } = req.body;

    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }

    const vehicle = await Vehicle.findByPk(id);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }

    const documentUrl = await uploadToS3(req.file, `vehicles/${id}/documents`);

    // Add to vehicle's documents array
    const documents = vehicle.documents || [];
    documents.push({
      type: documentType,
      url: documentUrl,
      uploadedAt: new Date(),
      uploadedBy: req.user.id,
    });

    await vehicle.update({ documents });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "VEHICLE_DOCUMENT_UPLOADED",
      resource: "Vehicle",
      resourceId: id,
      details: { documentType },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    return successResponse(res, "Document uploaded successfully", 200, {
      documentUrl,
    });
  } catch (err) {
    next(err);
  }
};

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
  uploadDocuments,
};
