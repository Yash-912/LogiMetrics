const { validationResult } = require("express-validator");

const {
  Shipment,
  User,
  Company,
  Vehicle,
  Driver,
  Route,
} = require("../models/mongodb");
const { ShipmentEvent, LiveTracking, AuditLog } = require("../models/mongodb");
const {
  successResponse,
  errorResponse,
  paginatedResponse,
} = require("../utils/response.util");
const { AppError } = require("../middleware/error.middleware");
const { uploadToS3 } = require("../utils/fileUpload.util");
const {
  calculateDistance,
  estimateDeliveryTime,
} = require("../utils/calculations.util");
const logger = require("../utils/logger.util");
const { redisClient } = require("../config/redis");

/**
 * Get all shipments with pagination and filters
 * @route GET /api/shipments
 */
const getShipments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      companyId,
      customerId,
      driverId,
      vehicleId,
      startDate,
      endDate,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const skip = (page - 1) * limit;
    const filter = {};

    // Apply filters
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (companyId) filter.companyId = companyId;
    if (customerId) filter.customerId = customerId; // Ensure Schema has customerId
    if (driverId) filter.driverId = driverId;
    if (vehicleId) filter.vehicleId = vehicleId;

    // Date Range
    if (startDate && endDate) {
      filter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Search
    if (search) {
      filter.$or = [
        { trackingNumber: { $regex: search, $options: "i" } },
        { shipmentNumber: { $regex: search, $options: "i" } }, // Changed ReferenceNumber to shipmentNumber as per schema
      ];
    }

    // Filter by user's company if not admin
    if (req.user.role !== "admin" && req.user.companyId) {
      filter.companyId = req.user.companyId;
    }

    const total = await Shipment.countDocuments(filter);
    const shipments = await Shipment.find(filter)
      .populate("companyId", "name")
      // .populate("customerId", "email firstName lastName") // Commented out as customerId might be missing in Schema
      .populate("driverId", "firstName lastName phone")
      .populate("vehicleId", "licensePlate type")
      .sort({ [sortBy]: sortOrder === "desc" ? -1 : 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Mongoose populates in-place, so fields like 'driverId' become objects.
    // If frontend expects 'driver.firstName', we might need to map or frontend handles 'driverId.firstName'
    // Usually standardizing on 'driver' is better, but this requires mapped response.
    // For now, return raw Mongoose docs which use populated fields.

    return paginatedResponse(res, shipments, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
    }, "Shipments retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Get shipment by ID
 * @route GET /api/shipments/:id
 */
const getShipmentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const shipment = await Shipment.findById(id)
      .populate("companyId")
      .populate("driverId")
      .populate("vehicleId")
      .populate("routeId");

    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    // Get shipment events from MongoDB
    const events = await ShipmentEvent.find({ shipmentId: id })
      .sort({ createdAt: -1 })
      .limit(50);

    return successResponse(res, {
      shipment,
      events,
    }, "Shipment retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Get shipment by tracking number (public)
 * @route GET /api/shipments/track/:trackingNumber
 */
const trackShipment = async (req, res, next) => {
  try {
    const { trackingNumber } = req.params;

    const shipment = await Shipment.findOne({ trackingNumber })
      .select(
        "id trackingNumber status priority pickupAddress deliveryAddress estimatedPickupDate estimatedDeliveryDate actualPickupDate actualDeliveryDate"
      );

    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    // Get public events
    const events = await ShipmentEvent.find({
      shipmentId: shipment.id,
      isPublic: true,
    })
      .sort({ createdAt: -1 })
      .select("eventType description location createdAt");

    // Get current location from cache
    const currentLocation = await redisClient.get(
      `shipment:${shipment.id}:location`
    );

    return successResponse(res, {
      shipment,
      events,
      currentLocation: currentLocation ? JSON.parse(currentLocation) : null,
    }, "Shipment tracking info retrieved");
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new shipment
 * @route POST /api/shipments
 */
const createShipment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const {
      customerId,
      pickupAddress,
      pickupCity,
      pickupState,
      pickupCountry,
      pickupPostalCode,
      pickupLatitude,
      pickupLongitude,
      pickupContactName,
      pickupContactPhone,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      deliveryCountry,
      deliveryPostalCode,
      deliveryLatitude,
      deliveryLongitude,
      deliveryContactName,
      deliveryContactPhone,
      packageType,
      weight,
      dimensions,
      quantity,
      description,
      specialInstructions,
      priority,
      scheduledPickupDate,
      estimatedDeliveryDate,
      serviceType,
      insuranceValue,
      declaredValue,
    } = req.body;

    // Generate tracking number
    const trackingNumber = `LM${Date.now()}${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    // Calculate distance and estimated delivery
    let distance = null;
    let estimatedDuration = null;
    if (
      pickupLatitude &&
      pickupLongitude &&
      deliveryLatitude &&
      deliveryLongitude
    ) {
      distance = calculateDistance(
        pickupLatitude,
        pickupLongitude,
        deliveryLatitude,
        deliveryLongitude
      );
      estimatedDuration = estimateDeliveryTime(distance, serviceType);
    }

    const shipment = await Shipment.create({
      trackingNumber,
      companyId: req.user.companyId,
      customerId,
      createdBy: req.user.id,
      pickupAddress,
      pickupCity,
      pickupState,
      pickupCountry,
      pickupPostalCode,
      pickupLatitude,
      pickupLongitude,
      pickupContactName,
      pickupContactPhone,
      deliveryAddress,
      deliveryCity,
      deliveryState,
      deliveryCountry,
      deliveryPostalCode,
      deliveryLatitude,
      deliveryLongitude,
      deliveryContactName,
      deliveryContactPhone,
      packageType,
      weight,
      dimensions,
      quantity: quantity || 1,
      description,
      specialInstructions,
      priority: priority || "standard",
      scheduledPickupDate,
      estimatedDeliveryDate,
      serviceType: serviceType || "standard",
      insuranceValue,
      declaredValue,
      distance,
      estimatedDuration,
      status: "pending",
    });

    // Create initial shipment event
    await ShipmentEvent.create({
      shipmentId: shipment.id,
      eventType: "SHIPMENT_CREATED",
      description: "Shipment has been created and is pending pickup",
      performedBy: req.user.id,
      isPublic: true,
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "SHIPMENT_CREATED",
      resource: "Shipment",
      resourceId: shipment.id,
      details: { trackingNumber },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Shipment created: ${trackingNumber} by ${req.user.email}`);

    return successResponse(res, {
      shipment,
    }, "Shipment created successfully", 201);
  } catch (err) {
    next(err);
  }
};

/**
 * Update shipment
 * @route PUT /api/shipments/:id
 */
const updateShipment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const updateData = req.body;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    // Prevent updates to completed/cancelled shipments
    if (["delivered", "cancelled"].includes(shipment.status)) {
      throw new AppError(`Cannot update ${shipment.status} shipment`, 400);
    }

    // Remove fields that shouldn't be updated directly
    delete updateData.trackingNumber;
    delete updateData.status;
    delete updateData.companyId;

    Object.assign(shipment, updateData);
    await shipment.save();

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "SHIPMENT_UPDATED",
      resource: "Shipment",
      resourceId: shipment.id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    const updatedShipment = await Shipment.findById(id)
      .populate("driverId", "firstName lastName")
      .populate("vehicleId", "licensePlate");

    return successResponse(res, "Shipment updated successfully", 200, {
      shipment: updatedShipment,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update shipment status
 * @route PATCH /api/shipments/:id/status
 */
const updateShipmentStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { status, notes, location, latitude, longitude } = req.body;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    // Validate status transition
    const validTransitions = {
      pending: ["confirmed", "cancelled"],
      confirmed: ["assigned", "cancelled"],
      assigned: ["picked_up", "cancelled"],
      picked_up: ["in_transit"],
      in_transit: ["out_for_delivery", "delayed"],
      delayed: ["in_transit", "out_for_delivery"],
      out_for_delivery: ["delivered", "failed_delivery"],
      failed_delivery: ["out_for_delivery", "returned"],
    };

    if (validTransitions[shipment.status] && !validTransitions[shipment.status].includes(status)) {
      // Only throw if current status is in validTransitions map (strict)
      // or allow loose transitions? Logic was strict.
      throw new AppError(
        `Invalid status transition from ${shipment.status} to ${status}`,
        400
      );
    }

    const updateData = { status };

    // Set timestamps
    switch (status) {
      case "picked_up":
        updateData.actualPickupDate = new Date();
        break;
      case "delivered":
        updateData.actualDeliveryDate = new Date();
        break;
    }

    Object.assign(shipment, updateData);
    await shipment.save();

    // Create shipment event
    await ShipmentEvent.create({
      shipmentId: id,
      eventType: `STATUS_${status.toUpperCase()}`,
      description: notes || `Shipment status changed to ${status}`,
      location,
      latitude,
      longitude,
      performedBy: req.user.id,
      isPublic: true,
    });

    // Update real-time cache
    if (latitude && longitude) {
      await redisClient.set(
        `shipment:${id}:location`,
        JSON.stringify({ latitude, longitude, timestamp: new Date() }),
        "EX",
        3600
      );
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "SHIPMENT_STATUS_CHANGED",
      resource: "Shipment",
      resourceId: id,
      details: { previousStatus: shipment.status, newStatus: status },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(
      `Shipment ${shipment.trackingNumber} status changed to ${status}`
    );

    return successResponse(res, "Shipment status updated successfully", 200, {
      status,
      trackingNumber: shipment.trackingNumber,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Assign driver and vehicle to shipment
 * @route PATCH /api/shipments/:id/assign
 */
const assignShipment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { driverId, vehicleId, routeId } = req.body;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    if (!["pending", "confirmed"].includes(shipment.status)) {
      throw new AppError("Shipment cannot be assigned in current status", 400);
    }

    // Verify driver exists and is available
    const driver = await Driver.findById(driverId);
    if (!driver) {
      throw new AppError("Driver not found", 404);
    }
    if (driver.status !== "available") {
      throw new AppError("Driver is not available", 400);
    }

    // Verify vehicle exists and is available
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      throw new AppError("Vehicle not found", 404);
    }
    if (vehicle.status !== "available") {
      throw new AppError("Vehicle is not available", 400);
    }

    Object.assign(shipment, {
      driverId,
      vehicleId,
      routeId,
      status: "assigned",
      assignedAt: new Date(),
    });
    await shipment.save();

    // Update driver and vehicle status
    await Driver.updateOne({ _id: driverId }, { status: "on_duty" });
    await Vehicle.updateOne({ _id: vehicleId }, { status: "in_use" });

    // Create shipment event
    await ShipmentEvent.create({
      shipmentId: id,
      eventType: "SHIPMENT_ASSIGNED",
      description: `Assigned to driver ${driver.firstName} ${driver.lastName} with vehicle ${vehicle.licensePlate}`,
      performedBy: req.user.id,
      isPublic: true,
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "SHIPMENT_ASSIGNED",
      resource: "Shipment",
      resourceId: id,
      details: { driverId, vehicleId, routeId },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(
      `Shipment ${shipment.trackingNumber} assigned to driver ${driver.id}`
    );

    return successResponse(res, "Shipment assigned successfully", 200, {
      shipment: await Shipment.findById(id)
        .populate("driverId")
        .populate("vehicleId"),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload proof of delivery
 * @route POST /api/shipments/:id/pod
 */
const uploadPOD = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { recipientName, recipientSignature, notes } = req.body;

    if (!req.files || req.files.length === 0) {
      throw new AppError(
        "At least one image is required for proof of delivery",
        400
      );
    }

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    if (shipment.status !== "out_for_delivery") {
      throw new AppError(
        "POD can only be uploaded when shipment is out for delivery",
        400
      );
    }

    // Upload images to S3
    const podImages = [];
    for (const file of req.files) {
      const imageUrl = await uploadToS3(file, `shipments/${id}/pod`);
      podImages.push(imageUrl);
    }

    // Update shipment with POD data
    Object.assign(shipment, {
      status: "delivered",
      actualDeliveryDate: new Date(),
      podImages,
      podRecipientName: recipientName,
      podSignature: recipientSignature,
      podNotes: notes,
      podUploadedAt: new Date(),
      podUploadedBy: req.user.id,
    });
    await shipment.save();

    // Create shipment event
    await ShipmentEvent.create({
      shipmentId: id,
      eventType: "DELIVERED",
      description: `Delivered and signed by ${recipientName}`,
      performedBy: req.user.id,
      metadata: { podImages, recipientName },
      isPublic: true,
    });

    // Release driver and vehicle
    if (shipment.driverId) {
      await Driver.updateOne({ _id: shipment.driverId }, { status: "available" });
    }
    if (shipment.vehicleId) {
      await Vehicle.updateOne({ _id: shipment.vehicleId }, { status: "available" });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "POD_UPLOADED",
      resource: "Shipment",
      resourceId: id,
      details: { recipientName },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`POD uploaded for shipment ${shipment.trackingNumber}`);

    return successResponse(
      res,
      "Proof of delivery uploaded successfully",
      200,
      {
        shipment: await Shipment.findById(id),
      }
    );
  } catch (err) {
    next(err);
  }
};

/**
 * Cancel shipment
 * @route POST /api/shipments/:id/cancel
 */
const cancelShipment = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { id } = req.params;
    const { reason } = req.body;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    // Can only cancel pending, confirmed, or assigned shipments
    if (!["pending", "confirmed", "assigned"].includes(shipment.status)) {
      throw new AppError("Shipment cannot be cancelled in current status", 400);
    }

    Object.assign(shipment, {
      status: "cancelled",
      cancellationReason: reason,
      cancelledAt: new Date(),
      cancelledBy: req.user.id,
    });
    await shipment.save();

    // Release driver and vehicle if assigned
    if (shipment.driverId) {
      await Driver.updateOne({ _id: shipment.driverId }, { status: "available" });
    }
    if (shipment.vehicleId) {
      await Vehicle.updateOne({ _id: shipment.vehicleId }, { status: "available" });
    }

    // Create shipment event
    await ShipmentEvent.create({
      shipmentId: id,
      eventType: "SHIPMENT_CANCELLED",
      description: `Shipment cancelled: ${reason}`,
      performedBy: req.user.id,
      isPublic: true,
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "SHIPMENT_CANCELLED",
      resource: "Shipment",
      resourceId: id,
      details: { reason },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Shipment ${shipment.trackingNumber} cancelled: ${reason}`);

    return successResponse(res, "Shipment cancelled successfully", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Delete shipment
 * @route DELETE /api/shipments/:id
 */
const deleteShipment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const shipment = await Shipment.findById(id);
    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    // Can only delete pending shipments
    if (shipment.status !== "pending") {
      throw new AppError("Only pending shipments can be deleted", 400);
    }

    const trackingNumber = shipment.trackingNumber;
    await shipment.deleteOne(); // Mongoose delete

    // Delete related events
    await ShipmentEvent.deleteMany({ shipmentId: id });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "SHIPMENT_DELETED",
      resource: "Shipment",
      resourceId: id,
      details: { trackingNumber },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(`Shipment ${trackingNumber} deleted by ${req.user.email}`);

    return successResponse(res, "Shipment deleted successfully", 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk create shipments
 * @route POST /api/shipments/bulk
 */
const bulkCreateShipments = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, "Validation failed", 400, errors.array());
    }

    const { shipments } = req.body;
    const createdShipments = [];
    const failedShipments = [];

    for (const shipmentData of shipments) {
      try {
        const trackingNumber = `LM${Date.now()}${Math.random()
          .toString(36)
          .substr(2, 4)
          .toUpperCase()}`;

        const shipment = await Shipment.create({
          ...shipmentData,
          trackingNumber,
          companyId: req.user.companyId,
          createdBy: req.user.id,
          status: "pending",
        });

        await ShipmentEvent.create({
          shipmentId: shipment.id,
          eventType: "SHIPMENT_CREATED",
          description: "Shipment has been created (bulk import)",
          performedBy: req.user.id,
          isPublic: true,
        });

        createdShipments.push(shipment);
      } catch (shipmentErr) {
        failedShipments.push({
          data: shipmentData,
          error: shipmentErr.message,
        });
      }
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "BULK_SHIPMENTS_CREATED",
      resource: "Shipment",
      details: {
        total: shipments.length,
        created: createdShipments.length,
        failed: failedShipments.length,
      },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    logger.info(
      `Bulk shipments created: ${createdShipments.length} success, ${failedShipments.length} failed`
    );

    return successResponse(res, "Bulk shipment creation completed", 201, {
      created: createdShipments,
      failed: failedShipments,
      summary: {
        total: shipments.length,
        successful: createdShipments.length,
        failed: failedShipments.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get shipment events/timeline
 * @route GET /api/shipments/:id/events
 */
const getShipmentEvents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const shipment = await Shipment.findByPk(id);
    if (!shipment) {
      throw new AppError("Shipment not found", 404);
    }

    const skip = (page - 1) * limit;

    const events = await ShipmentEvent.find({ shipmentId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await ShipmentEvent.countDocuments({ shipmentId: id });

    return paginated(res, "Shipment events retrieved successfully", events, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getShipments,
  getShipmentById,
  trackShipment,
  createShipment,
  updateShipment,
  updateShipmentStatus,
  assignShipment,
  uploadPOD,
  cancelShipment,
  deleteShipment,
  bulkCreateShipments,
  getShipmentEvents,
};
