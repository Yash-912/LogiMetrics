const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicle.controller");
const { vehicleValidator } = require("../validators");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize, checkPermission } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validation.middleware");
const { uploadMultiple } = require("../middleware/upload.middleware");
const { apiLimiter } = require("../middleware/rateLimit.middleware");

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/vehicles
 * @desc    Get all vehicles with pagination and filters
 * @access  Private
 */
router.get(
  "/",
  validate(vehicleValidator.getVehicles),
  vehicleController.getVehicles
);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Private
 */
router.get(
  "/:id",
  validate(vehicleValidator.getVehicleById),
  vehicleController.getVehicleById
);

/**
 * @route   POST /api/vehicles
 * @desc    Create a new vehicle
 * @access  Private (Admin, Manager)
 */
router.post(
  "/",
  authorize(["admin", "manager"]),
  validate(vehicleValidator.createVehicle),
  vehicleController.createVehicle
);

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Update vehicle by ID
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id",
  authorize(["admin", "manager"]),
  validate(vehicleValidator.updateVehicle),
  vehicleController.updateVehicle
);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Delete vehicle (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authorize(["admin"]),
  validate(vehicleValidator.getVehicleById),
  vehicleController.deleteVehicle
);

/**
 * @route   PUT /api/vehicles/:id/status
 * @desc    Update vehicle status
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id/status",
  authorize(["admin", "manager"]),
  validate(vehicleValidator.updateStatus),
  vehicleController.updateVehicleStatus
);

/**
 * @route   PUT /api/vehicles/:id/assign-driver
 * @desc    Assign driver to vehicle
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.put(
  "/:id/assign-driver",
  authorize(["admin", "manager", "dispatcher"]),
  validate(vehicleValidator.assignDriver),
  vehicleController.assignDriver
);

/**
 * @route   PUT /api/vehicles/:id/unassign-driver
 * @desc    Unassign driver from vehicle
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.put(
  "/:id/unassign-driver",
  authorize(["admin", "manager", "dispatcher"]),
  validate(vehicleValidator.getVehicleById),
  vehicleController.unassignDriver
);

/**
 * @route   GET /api/vehicles/:id/maintenance
 * @desc    Get vehicle maintenance records
 * @access  Private
 */
router.get(
  "/:id/maintenance",
  validate(vehicleValidator.getVehicleById),
  vehicleController.getMaintenanceRecords
);

/**
 * @route   POST /api/vehicles/:id/maintenance
 * @desc    Add maintenance record
 * @access  Private (Admin, Manager)
 */
router.post(
  "/:id/maintenance",
  authorize(["admin", "manager"]),
  validate(vehicleValidator.addMaintenance),
  vehicleController.addMaintenanceRecord
);

/**
 * @route   PUT /api/vehicles/:id/maintenance/:recordId
 * @desc    Update maintenance record
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id/maintenance/:recordId",
  authorize(["admin", "manager"]),
  validate(vehicleValidator.updateMaintenance),
  vehicleController.updateMaintenanceRecord
);

/**
 * @route   GET /api/vehicles/:id/fuel
 * @desc    Get vehicle fuel logs
 * @access  Private
 */
router.get(
  "/:id/fuel",
  validate(vehicleValidator.getVehicleById),
  vehicleController.getFuelLogs
);

/**
 * @route   POST /api/vehicles/:id/fuel
 * @desc    Add fuel log entry
 * @access  Private (Admin, Manager, Driver)
 */
router.post(
  "/:id/fuel",
  authorize(["admin", "manager", "driver"]),
  validate(vehicleValidator.addFuelLog),
  vehicleController.addFuelLog
);

/**
 * @route   GET /api/vehicles/:id/telemetry
 * @desc    Get vehicle telemetry data
 * @access  Private
 */
router.get(
  "/:id/telemetry",
  validate(vehicleValidator.getTelemetry),
  vehicleController.getTelemetry
);

/**
 * @route   POST /api/vehicles/:id/documents
 * @desc    Upload vehicle documents (registration, insurance, etc.)
 * @access  Private (Admin, Manager)
 */
router.post(
  "/:id/documents",
  authorize(["admin", "manager"]),
  uploadMultiple("documents", 10),
  vehicleController.uploadDocuments
);

module.exports = router;
