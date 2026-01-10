const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Driver, Company, Vehicle, User, DriverDocument } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { success, error, paginated } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const { uploadToS3, deleteFromS3 } = require('../utils/fileUpload.util');
const logger = require('../utils/logger.util');

/**
 * Get all drivers with pagination and filters
 * @route GET /api/drivers
 */
const getDrivers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      companyId,
      licenseType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (status) where.status = status;
    if (companyId) where.companyId = companyId;
    if (licenseType) where.licenseType = licenseType;
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
        { licenseNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Filter by user's company if not admin
    if (req.user.role !== 'admin' && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    const { count, rows: drivers } = await Driver.findAndCountAll({
      where,
      include: [
        { model: Company, as: 'company', attributes: ['id', 'name'] },
        { model: Vehicle, as: 'assignedVehicle', attributes: ['id', 'licensePlate', 'type'] }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return paginated(res, 'Drivers retrieved successfully', drivers, {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get driver by ID
 * @route GET /api/drivers/:id
 */
const getDriverById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const driver = await Driver.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: Vehicle, as: 'assignedVehicle' },
        { model: User, as: 'user', attributes: ['id', 'email', 'status'] },
        { model: DriverDocument, as: 'documents' }
      ]
    });

    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    return success(res, 'Driver retrieved successfully', 200, { driver });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new driver
 * @route POST /api/drivers
 */
const createDriver = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      address,
      city,
      state,
      country,
      postalCode,
      licenseNumber,
      licenseType,
      licenseExpiry,
      licenseState,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      hireDate,
      hourlyRate,
      paymentType
    } = req.body;

    // Check if driver with same email exists
    const existingEmail = await Driver.findOne({ where: { email } });
    if (existingEmail) {
      throw new AppError('Driver with this email already exists', 409);
    }

    // Check if driver with same license number exists
    const existingLicense = await Driver.findOne({ where: { licenseNumber } });
    if (existingLicense) {
      throw new AppError('Driver with this license number already exists', 409);
    }

    const driver = await Driver.create({
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      address,
      city,
      state,
      country,
      postalCode,
      licenseNumber,
      licenseType,
      licenseExpiry,
      licenseState,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation,
      hireDate: hireDate || new Date(),
      hourlyRate,
      paymentType: paymentType || 'hourly',
      companyId: req.user.companyId,
      status: 'pending_verification'
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DRIVER_CREATED',
      resource: 'Driver',
      resourceId: driver.id,
      details: { email: driver.email, licenseNumber: driver.licenseNumber },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Driver created: ${driver.email} by ${req.user.email}`);

    return success(res, 'Driver created successfully', 201, { driver });
  } catch (err) {
    next(err);
  }
};

/**
 * Update driver
 * @route PUT /api/drivers/:id
 */
const updateDriver = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const updateData = req.body;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    // Check email uniqueness
    if (updateData.email && updateData.email !== driver.email) {
      const existingEmail = await Driver.findOne({ where: { email: updateData.email } });
      if (existingEmail) {
        throw new AppError('Email is already in use', 409);
      }
    }

    // Check license number uniqueness
    if (updateData.licenseNumber && updateData.licenseNumber !== driver.licenseNumber) {
      const existingLicense = await Driver.findOne({ 
        where: { licenseNumber: updateData.licenseNumber } 
      });
      if (existingLicense) {
        throw new AppError('License number is already in use', 409);
      }
    }

    await driver.update(updateData);

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DRIVER_UPDATED',
      resource: 'Driver',
      resourceId: driver.id,
      details: { updatedFields: Object.keys(updateData) },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Driver updated: ${driver.email} by ${req.user.email}`);

    const updatedDriver = await Driver.findByPk(id, {
      include: [
        { model: Company, as: 'company' },
        { model: Vehicle, as: 'assignedVehicle' }
      ]
    });

    return success(res, 'Driver updated successfully', 200, { driver: updatedDriver });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete driver
 * @route DELETE /api/drivers/:id
 */
const deleteDriver = async (req, res, next) => {
  try {
    const { id } = req.params;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    // Check if driver is currently on duty
    if (driver.status === 'on_duty') {
      throw new AppError('Cannot delete driver who is currently on duty', 400);
    }

    const driverEmail = driver.email;

    // Soft delete
    await driver.update({ status: 'inactive', deletedAt: new Date() });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DRIVER_DELETED',
      resource: 'Driver',
      resourceId: id,
      details: { email: driverEmail },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Driver deleted: ${driverEmail} by ${req.user.email}`);

    return success(res, 'Driver deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Update driver status
 * @route PATCH /api/drivers/:id/status
 */
const updateDriverStatus = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { status, reason } = req.body;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const previousStatus = driver.status;
    await driver.update({ status });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DRIVER_STATUS_CHANGED',
      resource: 'Driver',
      resourceId: id,
      details: { previousStatus, newStatus: status, reason },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info(`Driver ${driver.email} status changed to ${status}`);

    return success(res, 'Driver status updated successfully', 200, { status });
  } catch (err) {
    next(err);
  }
};

/**
 * Update driver license information
 * @route PUT /api/drivers/:id/license
 */
const updateLicense = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const {
      licenseNumber,
      licenseType,
      licenseExpiry,
      licenseState,
      endorsements,
      restrictions
    } = req.body;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    // Check license number uniqueness
    if (licenseNumber && licenseNumber !== driver.licenseNumber) {
      const existingLicense = await Driver.findOne({ where: { licenseNumber } });
      if (existingLicense) {
        throw new AppError('License number is already in use', 409);
      }
    }

    await driver.update({
      licenseNumber,
      licenseType,
      licenseExpiry,
      licenseState,
      endorsements,
      restrictions,
      licenseVerified: false, // Reset verification when license is updated
      licenseVerifiedAt: null
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DRIVER_LICENSE_UPDATED',
      resource: 'Driver',
      resourceId: id,
      details: { licenseNumber, licenseExpiry },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Driver license updated successfully', 200, { 
      driver: await Driver.findByPk(id) 
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify driver license
 * @route POST /api/drivers/:id/verify-license
 */
const verifyLicense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { verified, notes } = req.body;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    await driver.update({
      licenseVerified: verified,
      licenseVerifiedAt: verified ? new Date() : null,
      licenseVerifiedBy: req.user.id,
      licenseVerificationNotes: notes,
      status: verified ? 'available' : 'pending_verification'
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: verified ? 'DRIVER_LICENSE_VERIFIED' : 'DRIVER_LICENSE_REJECTED',
      resource: 'Driver',
      resourceId: id,
      details: { verified, notes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, `Driver license ${verified ? 'verified' : 'rejected'} successfully`, 200, {
      verified,
      driver: await Driver.findByPk(id)
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get driver availability
 * @route GET /api/drivers/:id/availability
 */
const getAvailability = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    // Return driver's availability schedule
    return success(res, 'Driver availability retrieved successfully', 200, {
      driverId: id,
      status: driver.status,
      availability: driver.availability || {},
      timeOff: driver.timeOff || []
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update driver availability
 * @route PUT /api/drivers/:id/availability
 */
const updateAvailability = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { availability, timeOff } = req.body;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    await driver.update({
      availability: availability || driver.availability,
      timeOff: timeOff || driver.timeOff
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DRIVER_AVAILABILITY_UPDATED',
      resource: 'Driver',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Driver availability updated successfully', 200, {
      availability: driver.availability,
      timeOff: driver.timeOff
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get driver performance metrics
 * @route GET /api/drivers/:id/performance
 */
const getPerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    // Calculate performance metrics
    const performance = {
      driverId: id,
      period: { startDate, endDate },
      metrics: {
        totalDeliveries: driver.totalDeliveries || 0,
        onTimeDeliveryRate: driver.onTimeDeliveryRate || 0,
        averageRating: driver.averageRating || 0,
        totalDistance: driver.totalDistance || 0,
        fuelEfficiency: driver.fuelEfficiency || 0,
        incidentCount: driver.incidentCount || 0,
        customerComplaints: driver.customerComplaints || 0
      }
    };

    return success(res, 'Driver performance retrieved successfully', 200, { performance });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload driver photo
 * @route POST /api/drivers/:id/photo
 */
const uploadPhoto = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    // Delete old photo if exists
    if (driver.photoUrl) {
      try {
        await deleteFromS3(driver.photoUrl);
      } catch (deleteErr) {
        logger.warn(`Failed to delete old photo: ${deleteErr.message}`);
      }
    }

    const photoUrl = await uploadToS3(req.file, `drivers/${id}/photo`);

    await driver.update({ photoUrl });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DRIVER_PHOTO_UPLOADED',
      resource: 'Driver',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Driver photo uploaded successfully', 200, { photoUrl });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload driver document
 * @route POST /api/drivers/:id/documents
 */
const uploadDocument = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { documentType, expiryDate, notes } = req.body;

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const documentUrl = await uploadToS3(req.file, `drivers/${id}/documents`);

    const document = await DriverDocument.create({
      driverId: id,
      type: documentType,
      url: documentUrl,
      expiryDate,
      notes,
      uploadedBy: req.user.id,
      status: 'pending_review'
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DRIVER_DOCUMENT_UPLOADED',
      resource: 'Driver',
      resourceId: id,
      details: { documentType },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Driver document uploaded successfully', 201, { document });
  } catch (err) {
    next(err);
  }
};

/**
 * Get driver documents
 * @route GET /api/drivers/:id/documents
 */
const getDocuments = async (req, res, next) => {
  try {
    const { id } = req.params;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    const documents = await DriverDocument.findAll({
      where: { driverId: id },
      order: [['createdAt', 'DESC']]
    });

    return success(res, 'Driver documents retrieved successfully', 200, { documents });
  } catch (err) {
    next(err);
  }
};

/**
 * Link driver to user account
 * @route POST /api/drivers/:id/link-user
 */
const linkUserAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const driver = await Driver.findByPk(id);
    if (!driver) {
      throw new AppError('Driver not found', 404);
    }

    if (driver.userId) {
      throw new AppError('Driver is already linked to a user account', 400);
    }

    const user = await User.findByPk(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check if user is already linked to another driver
    const existingDriver = await Driver.findOne({ where: { userId } });
    if (existingDriver) {
      throw new AppError('User is already linked to another driver', 400);
    }

    await driver.update({ userId });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DRIVER_USER_LINKED',
      resource: 'Driver',
      resourceId: id,
      details: { linkedUserId: userId },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Driver linked to user account successfully', 200, { 
      driver: await Driver.findByPk(id, {
        include: [{ model: User, as: 'user', attributes: ['id', 'email'] }]
      })
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  updateLicense,
  verifyLicense,
  getAvailability,
  updateAvailability,
  getPerformance,
  uploadPhoto,
  uploadDocument,
  getDocuments,
  linkUserAccount
};
