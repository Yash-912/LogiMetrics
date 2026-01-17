/**
 * Driver Service
 * Handles driver assignment, availability, and performance tracking
 */

const { Op, Sequelize } = require("sequelize");
const {
  Driver,
  Vehicle,
  Shipment,
  Company,
  User,
} = require("../models/mongodb");
const { AuditLog } = require("../models/mongodb");
const { uploadToS3, deleteFromS3 } = require("../utils/fileUpload.util");
const logger = require("../utils/logger.util");

/**
 * Get all drivers with pagination and filters
 */
async function getDrivers({
  page = 1,
  limit = 10,
  search,
  status,
  companyId,
  licenseType,
  sortBy = "createdAt",
  sortOrder = "desc",
}) {
  const offset = (page - 1) * limit;
  const where = {};

  if (search) {
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${search}%` } },
      { lastName: { [Op.iLike]: `%${search}%` } },
      { phone: { [Op.iLike]: `%${search}%` } },
      { licenseNumber: { [Op.iLike]: `%${search}%` } },
    ];
  }

  if (status) where.status = status;
  if (companyId) where.companyId = companyId;
  if (licenseType) where.licenseType = licenseType;

  const { count, rows } = await Driver.findAndCountAll({
    where,
    include: [
      {
        model: Vehicle,
        as: "currentVehicle",
        attributes: ["id", "registrationNumber", "type"],
      },
    ],
    order: [[sortBy, sortOrder.toUpperCase()]],
    limit,
    offset,
  });

  return {
    drivers: rows,
    pagination: {
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Get driver by ID
 */
async function getDriverById(driverId) {
  const driver = await Driver.findByPk(driverId, {
    include: [
      { model: Company, as: "company" },
      { model: Vehicle, as: "currentVehicle" },
      { model: User, as: "user", attributes: ["id", "email", "status"] },
    ],
  });

  if (!driver) {
    throw new Error("Driver not found");
  }

  return driver;
}

/**
 * Create a new driver
 */
async function createDriver(driverData, createdBy) {
  const {
    companyId,
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    licenseNumber,
    licenseType,
    licenseExpiry,
    address,
    city,
    state,
    country,
    postalCode,
    emergencyContact,
    emergencyPhone,
    employmentType,
    joiningDate,
  } = driverData;

  // Check if license number already exists
  const existing = await Driver.findOne({ where: { licenseNumber } });
  if (existing) {
    throw new Error("Driver with this license number already exists");
  }

  const driver = await Driver.create({
    companyId,
    firstName,
    lastName,
    email,
    phone,
    dateOfBirth,
    licenseNumber,
    licenseType,
    licenseExpiry,
    address,
    city,
    state,
    country,
    postalCode,
    emergencyContact,
    emergencyPhone,
    employmentType: employmentType || "full_time",
    joiningDate: joiningDate || new Date(),
    status: "active",
    createdBy,
  });

  // Log the action
  await logDriverAction(createdBy, "create", driver.id, { licenseNumber });

  return driver;
}

/**
 * Update driver
 */
async function updateDriver(driverId, updateData, updatedBy) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  await driver.update(updateData);

  // Log the action
  await logDriverAction(updatedBy, "update", driverId, {
    fields: Object.keys(updateData),
  });

  return driver;
}

/**
 * Delete driver (soft delete)
 */
async function deleteDriver(driverId, deletedBy) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  // Check if driver has active assignments
  if (driver.currentVehicleId) {
    throw new Error("Cannot delete driver with active vehicle assignment");
  }

  await driver.update({
    status: "deleted",
    deletedAt: new Date(),
  });

  // Log the action
  await logDriverAction(deletedBy, "delete", driverId, {});

  return { message: "Driver deleted successfully" };
}

/**
 * Update driver status
 */
async function updateDriverStatus(driverId, status, notes, updatedBy) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  const validStatuses = ["active", "inactive", "on_leave", "suspended"];
  if (!validStatuses.includes(status)) {
    throw new Error("Invalid status");
  }

  await driver.update({
    status,
    statusNotes: notes,
    statusUpdatedAt: new Date(),
  });

  // Log the action
  await logDriverAction(updatedBy, "status_change", driverId, {
    status,
    notes,
  });

  return driver;
}

/**
 * Get driver availability
 */
async function getAvailability(driverId) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  return {
    driverId,
    status: driver.status,
    isAvailable: driver.status === "active" && !driver.currentVehicleId,
    currentVehicleId: driver.currentVehicleId,
    availability: driver.availability || getDefaultAvailability(),
    lastUpdated: driver.availabilityUpdatedAt,
  };
}

/**
 * Update driver availability
 */
async function updateAvailability(driverId, availabilityData, updatedBy) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  await driver.update({
    availability: availabilityData,
    availabilityUpdatedAt: new Date(),
  });

  // Log the action
  await logDriverAction(updatedBy, "update_availability", driverId, {});

  return driver;
}

/**
 * Update driver license information
 */
async function updateLicense(driverId, licenseData, updatedBy) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  await driver.update({
    licenseNumber: licenseData.licenseNumber || driver.licenseNumber,
    licenseType: licenseData.licenseType || driver.licenseType,
    licenseExpiry: licenseData.licenseExpiry || driver.licenseExpiry,
    licenseVerified: false, // Reset verification when license is updated
    licenseUpdatedAt: new Date(),
  });

  // Log the action
  await logDriverAction(updatedBy, "update_license", driverId, {});

  return driver;
}

/**
 * Verify driver license
 */
async function verifyLicense(driverId, verifiedBy) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  await driver.update({
    licenseVerified: true,
    licenseVerifiedAt: new Date(),
    licenseVerifiedBy: verifiedBy,
  });

  // Log the action
  await logDriverAction(verifiedBy, "verify_license", driverId, {});

  return driver;
}

/**
 * Get driver performance metrics
 */
async function getPerformance(driverId, { startDate, endDate }) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  const dateFilter = {};
  if (startDate && endDate) {
    dateFilter.createdAt = {
      [Op.between]: [new Date(startDate), new Date(endDate)],
    };
  }

  // Get shipment statistics
  const shipments = await Shipment.findAll({
    where: { driverId, ...dateFilter },
    attributes: [
      "status",
      [Sequelize.fn("COUNT", Sequelize.col("id")), "count"],
    ],
    group: ["status"],
  });

  const totalShipments = shipments.reduce(
    (sum, s) => sum + parseInt(s.dataValues.count),
    0
  );
  const deliveredShipments =
    shipments.find((s) => s.status === "delivered")?.dataValues.count || 0;
  const failedDeliveries =
    shipments.find((s) => s.status === "failed_delivery")?.dataValues.count ||
    0;

  // Calculate on-time delivery rate
  const onTimeDeliveries = await Shipment.count({
    where: {
      driverId,
      status: "delivered",
      actualDeliveryDate: {
        [Op.lte]: Sequelize.col("scheduledDeliveryDate"),
      },
      ...dateFilter,
    },
  });

  return {
    driverId,
    period: { startDate, endDate },
    totalShipments,
    deliveredShipments: parseInt(deliveredShipments),
    failedDeliveries: parseInt(failedDeliveries),
    deliveryRate:
      totalShipments > 0
        ? ((deliveredShipments / totalShipments) * 100).toFixed(2)
        : 0,
    onTimeDeliveryRate:
      deliveredShipments > 0
        ? ((onTimeDeliveries / deliveredShipments) * 100).toFixed(2)
        : 0,
    rating: driver.averageRating || 0,
    totalRatings: driver.totalRatings || 0,
  };
}

/**
 * Upload driver photo
 */
async function uploadPhoto(driverId, file, uploadedBy) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  // Delete old photo if exists
  if (driver.photo) {
    try {
      await deleteFromS3(driver.photo);
    } catch (error) {
      logger.error("Failed to delete old photo:", error);
    }
  }

  const photoUrl = await uploadToS3(file, `drivers/${driverId}/photo`);

  await driver.update({ photo: photoUrl });

  return { photoUrl };
}

/**
 * Upload driver document
 */
async function uploadDocument(driverId, file, documentData, uploadedBy) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  const documentUrl = await uploadToS3(file, `drivers/${driverId}/documents`);

  const document = await DriverDocument.create({
    driverId,
    documentType: documentData.documentType,
    documentNumber: documentData.documentNumber,
    expiryDate: documentData.expiryDate,
    url: documentUrl,
    uploadedBy,
  });

  return document;
}

/**
 * Get driver documents
 */
async function getDocuments(driverId) {
  const documents = await DriverDocument.findAll({
    where: { driverId },
    order: [["createdAt", "DESC"]],
  });

  return documents;
}

/**
 * Link driver to user account
 */
async function linkUserAccount(driverId, userId, linkedBy) {
  const driver = await Driver.findByPk(driverId);

  if (!driver) {
    throw new Error("Driver not found");
  }

  const user = await User.findByPk(userId);

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is already linked to another driver
  const existingDriver = await Driver.findOne({
    where: { userId, id: { [Op.ne]: driverId } },
  });

  if (existingDriver) {
    throw new Error("User is already linked to another driver");
  }

  await driver.update({ userId });
  await user.update({ role: "driver" });

  // Log the action
  await logDriverAction(linkedBy, "link_user", driverId, { userId });

  return driver;
}

/**
 * Get available drivers
 */
async function getAvailableDrivers(companyId) {
  const drivers = await Driver.findAll({
    where: {
      companyId,
      status: "active",
      currentVehicleId: null,
    },
    attributes: ["id", "firstName", "lastName", "phone", "licenseType"],
  });

  return drivers;
}

/**
 * Get drivers with expiring licenses
 */
async function getDriversWithExpiringLicenses(companyId, daysAhead = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  const drivers = await Driver.findAll({
    where: {
      companyId,
      status: { [Op.ne]: "deleted" },
      licenseExpiry: {
        [Op.lte]: futureDate,
      },
    },
  });

  return drivers;
}

// Helper functions

function getDefaultAvailability() {
  return {
    monday: { isWorkingDay: true, startTime: "09:00", endTime: "18:00" },
    tuesday: { isWorkingDay: true, startTime: "09:00", endTime: "18:00" },
    wednesday: { isWorkingDay: true, startTime: "09:00", endTime: "18:00" },
    thursday: { isWorkingDay: true, startTime: "09:00", endTime: "18:00" },
    friday: { isWorkingDay: true, startTime: "09:00", endTime: "18:00" },
    saturday: { isWorkingDay: false, startTime: "09:00", endTime: "13:00" },
    sunday: { isWorkingDay: false, startTime: null, endTime: null },
  };
}

async function logDriverAction(actorId, action, driverId, metadata) {
  try {
    await AuditLog.create({
      userId: actorId,
      action: `driver:${action}`,
      resource: "driver",
      resourceId: driverId,
      metadata,
      timestamp: new Date(),
    });
  } catch (error) {
    logger.error("Failed to log driver action:", error);
  }
}

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
  updateDriverStatus,
  getAvailability,
  updateAvailability,
  updateLicense,
  verifyLicense,
  getPerformance,
  uploadPhoto,
  uploadDocument,
  getDocuments,
  linkUserAccount,
  getAvailableDrivers,
  getDriversWithExpiringLicenses,
};
