const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driver.controller');
const { driver: driverValidator } = require('../validators');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { uploadSingle, uploadMultiple } = require('../middleware/upload.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/drivers
 * @desc    Get all drivers with pagination and filters
 * @access  Private
 */
router.get(
  '/',
  driverValidator.listDriversValidation,
  validate,
  driverController.getDrivers
);

/**
 * @route   GET /api/drivers/:id
 * @desc    Get driver by ID
 * @access  Private
 */
router.get(
  '/:id',
  driverValidator.getDriverValidation,
  validate,
  driverController.getDriverById
);

/**
 * @route   POST /api/drivers
 * @desc    Create a new driver
 * @access  Private (Admin, Manager)
 */
router.post(
  '/',
  authorize(['admin', 'manager']),
  driverValidator.createDriverValidation,
  validate,
  driverController.createDriver
);

/**
 * @route   PUT /api/drivers/:id
 * @desc    Update driver by ID
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id',
  authorize(['admin', 'manager']),
  driverValidator.updateDriverValidation,
  validate,
  driverController.updateDriver
);

/**
 * @route   DELETE /api/drivers/:id
 * @desc    Delete driver (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authorize(['admin']),
  driverValidator.deleteDriverValidation,
  validate,
  driverController.deleteDriver
);

/**
 * @route   PATCH /api/drivers/:id/status
 * @desc    Update driver status
 * @access  Private (Admin, Manager)
 */
router.patch(
  '/:id/status',
  authorize(['admin', 'manager']),
  driverValidator.updateStatusValidation,
  validate,
  driverController.updateDriverStatus
);

/**
 * @route   GET /api/drivers/:id/availability
 * @desc    Get driver availability
 * @access  Private
 */
router.get(
  '/:id/availability',
  driverValidator.getDriverValidation,
  validate,
  driverController.getAvailability
);

/**
 * @route   PUT /api/drivers/:id/availability
 * @desc    Update driver availability
 * @access  Private (Admin, Manager, Driver)
 */
router.put(
  '/:id/availability',
  authorize(['admin', 'manager', 'driver']),
  driverValidator.updateAvailabilityValidation,
  validate,
  driverController.updateAvailability
);

/**
 * @route   PUT /api/drivers/:id/license
 * @desc    Update driver license information
 * @access  Private (Admin, Manager)
 */
router.put(
  '/:id/license',
  authorize(['admin', 'manager']),
  driverValidator.updateDriverValidation,
  validate,
  driverController.updateLicense
);

/**
 * @route   POST /api/drivers/:id/verify-license
 * @desc    Verify driver license
 * @access  Private (Admin)
 */
router.post(
  '/:id/verify-license',
  authorize(['admin']),
  driverValidator.getDriverValidation,
  validate,
  driverController.verifyLicense
);

/**
 * @route   GET /api/drivers/:id/performance
 * @desc    Get driver performance metrics
 * @access  Private
 */
router.get(
  '/:id/performance',
  driverValidator.getPerformanceValidation,
  validate,
  driverController.getPerformance
);

/**
 * @route   POST /api/drivers/:id/photo
 * @desc    Upload driver photo
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/photo',
  authorize(['admin', 'manager']),
  uploadSingle('photo'),
  driverController.uploadPhoto
);

/**
 * @route   POST /api/drivers/:id/documents
 * @desc    Upload driver document
 * @access  Private (Admin, Manager)
 */
router.post(
  '/:id/documents',
  authorize(['admin', 'manager']),
  uploadSingle('document'),
  driverValidator.uploadDocumentValidation,
  validate,
  driverController.uploadDocument
);

/**
 * @route   GET /api/drivers/:id/documents
 * @desc    Get driver documents
 * @access  Private
 */
router.get(
  '/:id/documents',
  driverValidator.getDriverValidation,
  validate,
  driverController.getDocuments
);

/**
 * @route   POST /api/drivers/:id/link-user
 * @desc    Link driver to user account
 * @access  Private (Admin)
 */
router.post(
  '/:id/link-user',
  authorize(['admin']),
  driverValidator.getDriverValidation,
  validate,
  driverController.linkUserAccount
);

module.exports = router;
