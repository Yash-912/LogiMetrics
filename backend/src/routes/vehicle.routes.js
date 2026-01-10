const express = require('express');
const router = express.Router();
const vehicleController = require('../controllers/vehicle.controller');
const { vehicleValidator } = require('../validators');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize, checkPermission } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { uploadMultiple } = require('../middleware/upload.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/vehicles
 * @desc    Get all vehicles with pagination and filters
 * @access  Private
 */
router.get(
  '/',
  vehicleValidator.getVehicles,
  validate,
  vehicleController.getVehicles
);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicle by ID
 * @access  Private
 */
router.get(
  '/:id',
  vehicleValidator.getVehicleById,
  validate,
  vehicleController.getVehicleById
);

/**
 * @route   POST /api/vehicles
 * @desc    Create a new vehicle
 * @access  Private (Admin, Manager)
 */
router.post(
  '/',
  authorize(['admin', 'manager']),
  vehicleValidator.createVehicle,
  validate,
  vehicleController.createVehicle
);

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Update vehicle by ID
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id',
  authorize(['admin', 'manager']),
  vehicleValidator.updateVehicle,
  validate,
  vehicleController.updateVehicle
);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Delete vehicle (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authorize(['admin']),
  vehicleValidator.getVehicleById,
  validate,
  vehicleController.deleteVehicle
);

/**
 * @route   PUT /api/vehicles/:id/status
 * @desc    Update vehicle status
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id/status',
  authorize(['admin', 'manager']),
  vehicleValidator.updateStatus,
  validate,
  vehicleController.updateVehicleStatus
);

/**
 * @route   PUT /api/vehicles/:id/assign-driver
 * @desc    Assign driver to vehicle
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.put(
  '/:id/assign-driver',
  authorize(['admin', 'manager', 'dispatcher']),
  vehicleValidator.assignDriver,
  validate,
  vehicleController.assignDriver
);

/**
 * @route   PUT /api/vehicles/:id/unassign-driver
 * @desc    Unassign driver from vehicle
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.put(
  '/:id/unassign-driver',
  authorize(['admin', 'manager', 'dispatcher']),
  vehicleValidator.getVehicleById,
  validate,
  vehicleController.unassignDriver
);

/**
 * @route   GET /api/vehicles/:id/maintenance
 * @desc    Get vehicle maintenance records
 * @access  Private
 */
router.get(
  '/:id/maintenance',
  vehicleValidator.getVehicleById,
  validate,
  vehicleController.getMaintenanceRecords
);

/**
 * @route   POST /api/vehicles/:id/maintenance
 * @desc    Add maintenance record
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/maintenance',
  authorize(['admin', 'manager']),
  vehicleValidator.addMaintenance,
  validate,
  vehicleController.addMaintenanceRecord
);

/**
 * @route   PUT /api/vehicles/:id/maintenance/:recordId
 * @desc    Update maintenance record
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id/maintenance/:recordId',
  authorize(['admin', 'manager']),
  vehicleValidator.updateMaintenance,
  validate,
  vehicleController.updateMaintenanceRecord
);

/**
 * @route   GET /api/vehicles/:id/fuel
 * @desc    Get vehicle fuel logs
 * @access  Private
 */
router.get(
  '/:id/fuel',
  vehicleValidator.getVehicleById,
  validate,
  vehicleController.getFuelLogs
);

/**
 * @route   POST /api/vehicles/:id/fuel
 * @desc    Add fuel log entry
 * @access  Private (Admin, Manager, Driver)
 */
router.post(
  '/:id/fuel',
  authorize(['admin', 'manager', 'driver']),
  vehicleValidator.addFuelLog,
  validate,
  vehicleController.addFuelLog
);

/**
 * @route   GET /api/vehicles/:id/telemetry
 * @desc    Get vehicle telemetry data
 * @access  Private
 */
router.get(
  '/:id/telemetry',
  vehicleValidator.getTelemetry,
  validate,
  vehicleController.getTelemetry
);

/**
 * @route   POST /api/vehicles/:id/documents
 * @desc    Upload vehicle documents (registration, insurance, etc.)
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/documents',
  authorize(['admin', 'manager']),
  uploadMultiple('documents', 10),
  vehicleController.uploadDocuments
);

module.exports = router;
