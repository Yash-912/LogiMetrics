const express = require("express");
const router = express.Router();
const trackingController = require("../controllers/tracking.controller");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validation.middleware");
const {
  apiLimiter,
  strictLimiter,
} = require("../middleware/rateLimit.middleware");
const { body, param, query } = require("express-validator");

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   POST /api/tracking/location
 * @desc    Update vehicle location (from driver app or GPS device)
 * @access  Private (Driver, Admin, Manager)
 */
router.post(
  "/location",
  authorize(["admin", "manager", "driver"]),
  validate([
    body("vehicleId").isUUID().withMessage("Invalid vehicle ID"),
    body("latitude")
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude"),
    body("longitude")
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude"),
    body("speed")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Speed must be positive"),
    body("heading")
      .optional()
      .isFloat({ min: 0, max: 360 })
      .withMessage("Heading must be between 0 and 360"),
    body("accuracy")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Accuracy must be positive"),
    body("altitude").optional().isFloat().withMessage("Invalid altitude"),
  ]),
  trackingController.updateLocation
);

/**
 * @route   GET /api/tracking/vehicle/:vehicleId/location
 * @desc    Get current location of a vehicle
 * @access  Private
 */
router.get(
  "/vehicle/:vehicleId/location",
  validate([param("vehicleId").isUUID().withMessage("Invalid vehicle ID")]),
  trackingController.getVehicleLocation
);

/**
 * @route   GET /api/tracking/shipment/:shipmentId/location
 * @desc    Get current location of a shipment
 * @access  Private
 */
router.get(
  "/shipment/:shipmentId/location",
  validate([param("shipmentId").isUUID().withMessage("Invalid shipment ID")]),
  trackingController.getShipmentLocation
);

/**
 * @route   GET /api/tracking/vehicle/:vehicleId/history
 * @desc    Get location history for a vehicle
 * @access  Private
 */
router.get(
  "/vehicle/:vehicleId/history",
  validate([
    param("vehicleId").isUUID().withMessage("Invalid vehicle ID"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 1000 })
      .withMessage("Limit must be between 1 and 1000"),
  ]),
  trackingController.getVehicleLocationHistory
);

/**
 * @route   GET /api/tracking/shipment/:shipmentId/history
 * @desc    Get location history for a shipment
 * @access  Private
 */
router.get(
  "/shipment/:shipmentId/history",
  validate([
    param("shipmentId").isUUID().withMessage("Invalid shipment ID"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
  ]),
  trackingController.getShipmentLocationHistory
);

/**
 * @route   GET /api/tracking/vehicles/active
 * @desc    Get all active vehicles with their locations
 * @access  Private
 */
router.get(
  "/vehicles/active",
  validate([
    query("companyId").optional().isUUID().withMessage("Invalid company ID"),
    query("bounds")
      .optional()
      .isString()
      .withMessage("Bounds must be a string"),
  ]),
  trackingController.getActiveVehicles
);

/**
 * @route   POST /api/tracking/telemetry
 * @desc    Update vehicle telemetry data (engine data, fuel, etc.)
 * @access  Private (Driver, Admin, Manager)
 */
router.post(
  "/telemetry",
  authorize(["admin", "manager", "driver"]),
  validate([
    body("vehicleId").isUUID().withMessage("Invalid vehicle ID"),
    body("engineStatus")
      .optional()
      .isIn(["on", "off", "idle"])
      .withMessage("Invalid engine status"),
    body("fuelLevel")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("Fuel level must be between 0 and 100"),
    body("odometer")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Odometer must be positive"),
    body("engineTemperature")
      .optional()
      .isFloat()
      .withMessage("Invalid engine temperature"),
    body("batteryVoltage")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Battery voltage must be positive"),
  ]),
  trackingController.updateTelemetry
);

/**
 * @route   GET /api/tracking/vehicle/:vehicleId/telemetry
 * @desc    Get vehicle telemetry
 * @access  Private
 */
router.get(
  "/vehicle/:vehicleId/telemetry",
  validate([
    param("vehicleId").isUUID().withMessage("Invalid vehicle ID"),
    query("startDate").optional().isISO8601().withMessage("Invalid start date"),
    query("endDate").optional().isISO8601().withMessage("Invalid end date"),
  ]),
  trackingController.getVehicleTelemetry
);

/**
 * @route   POST /api/tracking/geofences
 * @desc    Create geofence
 * @access  Private (Admin, Manager)
 */
router.post(
  "/geofences",
  authorize(["admin", "manager"]),
  validate([
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("type")
      .isIn(["circle", "polygon"])
      .withMessage("Type must be circle or polygon"),
    body("center")
      .optional()
      .isObject()
      .withMessage("Center must be an object"),
    body("radius")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Radius must be positive"),
    body("coordinates")
      .optional()
      .isArray()
      .withMessage("Coordinates must be an array"),
    body("alertOnEntry")
      .optional()
      .isBoolean()
      .withMessage("Alert on entry must be boolean"),
    body("alertOnExit")
      .optional()
      .isBoolean()
      .withMessage("Alert on exit must be boolean"),
  ]),
  trackingController.createGeofence
);

/**
 * @route   GET /api/tracking/geofences
 * @desc    Get all geofences
 * @access  Private
 */
router.get(
  "/geofences",
  validate([
    query("companyId").optional().isUUID().withMessage("Invalid company ID"),
    query("active")
      .optional()
      .isBoolean()
      .withMessage("Active must be boolean"),
  ]),
  trackingController.getGeofences
);

/**
 * @route   DELETE /api/tracking/geofences/:geofenceId
 * @desc    Delete geofence
 * @access  Private (Admin, Manager)
 */
router.delete(
  "/geofences/:geofenceId",
  authorize(["admin", "manager"]),
  validate([param("geofenceId").isUUID().withMessage("Invalid geofence ID")]),
  trackingController.deleteGeofence
);

/**
 * @route   GET /api/tracking/shipment/:shipmentId/eta
 * @desc    Get ETA for shipment
 * @access  Private
 */
router.get(
  "/shipment/:shipmentId/eta",
  [param("shipmentId").isUUID().withMessage("Invalid shipment ID")],
  validate,
  trackingController.getShipmentETA
);

module.exports = router;
