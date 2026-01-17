const express = require("express");
const router = express.Router();
const shipmentController = require("../controllers/shipment.controller");
const { shipmentValidator } = require("../validators");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize, checkPermission } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validation.middleware");
const {
  uploadSingle,
  uploadMultiple,
} = require("../middleware/upload.middleware");
const { apiLimiter } = require("../middleware/rateLimit.middleware");

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/shipments
 * @desc    Get all shipments with pagination and filters
 * @access  Private
 */
router.get(
  "/",
  validate(shipmentValidator.getShipments),
  shipmentController.getShipments
);

/**
 * @route   GET /api/shipments/:id
 * @desc    Get shipment by ID
 * @access  Private
 */
router.get(
  "/:id",
  validate(shipmentValidator.getShipmentById),
  shipmentController.getShipmentById
);

/**
 * @route   GET /api/shipments/:id/track
 * @desc    Get shipment tracking information (public tracking)
 * @access  Private (or Public with tracking number)
 */
router.get(
  "/:id/track",
  validate(shipmentValidator.getShipmentById),
  shipmentController.trackShipment
);

/**
 * @route   GET /api/shipments/:id/events
 * @desc    Get shipment event history
 * @access  Private
 */
router.get(
  "/:id/events",
  validate(shipmentValidator.getShipmentById),
  shipmentController.getShipmentEvents
);

/**
 * @route   POST /api/shipments
 * @desc    Create a new shipment
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.post(
  "/",
  authorize(["admin", "manager", "dispatcher"]),
  validate(shipmentValidator.createShipment),
  shipmentController.createShipment
);

/**
 * @route   PUT /api/shipments/:id
 * @desc    Update shipment by ID
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.put(
  "/:id",
  authorize(["admin", "manager", "dispatcher"]),
  validate(shipmentValidator.updateShipment),
  shipmentController.updateShipment
);

/**
 * @route   PUT /api/shipments/:id/status
 * @desc    Update shipment status
 * @access  Private (Admin, Manager, Dispatcher, Driver)
 */
router.put(
  "/:id/status",
  authorize(["admin", "manager", "dispatcher", "driver"]),
  validate(shipmentValidator.updateStatus),
  shipmentController.updateShipmentStatus
);

/**
 * @route   PUT /api/shipments/:id/assign
 * @desc    Assign driver and vehicle to shipment
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.put(
  "/:id/assign",
  authorize(["admin", "manager", "dispatcher"]),
  validate(shipmentValidator.assignShipment),
  shipmentController.assignShipment
);

/**
 * @route   POST /api/shipments/:id/pod
 * @desc    Upload proof of delivery
 * @access  Private (Driver)
 */
router.post(
  "/:id/pod",
  authorize(["admin", "manager", "dispatcher", "driver"]),
  uploadMultiple("pod", 5),
  shipmentController.uploadPOD
);

/**
 * @route   PUT /api/shipments/:id/cancel
 * @desc    Cancel shipment
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id/cancel",
  authorize(["admin", "manager"]),
  validate(shipmentValidator.cancelShipment),
  shipmentController.cancelShipment
);

/**
 * @route   DELETE /api/shipments/:id
 * @desc    Delete shipment (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authorize(["admin"]),
  validate(shipmentValidator.getShipmentById),
  shipmentController.deleteShipment
);

/**
 * @route   POST /api/shipments/bulk
 * @desc    Bulk create shipments
 * @access  Private (Admin, Manager)
 */
router.post(
  "/bulk",
  authorize(["admin", "manager"]),
  validate(shipmentValidator.bulkCreate),
  shipmentController.bulkCreateShipments
);

module.exports = router;
