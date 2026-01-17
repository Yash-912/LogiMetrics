const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analytics.controller");
const { analytics: analyticsValidator } = require("../validators");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validation.middleware");
const { apiLimiter } = require("../middleware/rateLimit.middleware");

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Get dashboard overview
 * @access  Private
 */
router.get(
  "/dashboard",
  validate(analyticsValidator.getDashboardValidation),
  analyticsController.getDashboard
);

/**
 * @route   GET /api/analytics/shipments
 * @desc    Get shipment analytics
 * @access  Private
 */
router.get(
  "/shipments",
  validate(analyticsValidator.getShipmentAnalyticsValidation),
  analyticsController.getShipmentAnalytics
);

/**
 * @route   GET /api/analytics/revenue
 * @desc    Get revenue analytics
 * @access  Private (Admin, Manager)
 */
router.get(
  "/revenue",
  authorize(["admin", "manager"]),
  validate(analyticsValidator.getDashboardValidation),
  analyticsController.getRevenueAnalytics
);

/**
 * @route   GET /api/analytics/fleet
 * @desc    Get fleet analytics
 * @access  Private
 */
router.get(
  "/fleet",
  validate(analyticsValidator.getFleetAnalyticsValidation),
  analyticsController.getFleetAnalytics
);

/**
 * @route   GET /api/analytics/drivers
 * @desc    Get driver performance analytics
 * @access  Private
 */
router.get(
  "/drivers",
  validate(analyticsValidator.getDriverAnalyticsValidation),
  analyticsController.getDriverAnalytics
);

/**
 * @route   GET /api/analytics/kpis
 * @desc    Get KPI metrics
 * @access  Private (Admin, Manager)
 */
router.get(
  "/kpis",
  authorize(["admin", "manager"]),
  validate(analyticsValidator.getKPIValidation),
  analyticsController.getKPIs
);

/**
 * @route   POST /api/analytics/export
 * @desc    Export analytics report
 * @access  Private (Admin, Manager)
 */
router.post(
  "/export",
  authorize(["admin", "manager"]),
  validate(analyticsValidator.exportDataValidation),
  analyticsController.exportReport
);

/**
 * @route   GET /api/analytics/realtime
 * @desc    Get real-time metrics
 * @access  Private
 */
router.get("/realtime", analyticsController.getRealTimeMetrics);

/**
 * @route   POST /api/analytics/reports
 * @desc    Generate custom report
 * @access  Private (Admin, Manager)
 */
router.post(
  "/reports",
  authorize(["admin", "manager"]),
  validate(analyticsValidator.generateReportValidation),
  analyticsController.exportReport
);

/**
 * @route   GET /api/analytics/routes
 * @desc    Get route analytics
 * @access  Private
 */
router.get(
  "/routes",
  validate(analyticsValidator.getRouteAnalyticsValidation),
  analyticsController.getShipmentAnalytics
);

/**
 * @route   GET /api/analytics/comparison
 * @desc    Get comparison analytics
 * @access  Private (Admin, Manager)
 */
router.get(
  "/comparison",
  authorize(["admin", "manager"]),
  validate(analyticsValidator.getComparisonValidation),
  analyticsController.getShipmentAnalytics
);

/**
 * @route   GET /api/analytics/trends
 * @desc    Get trend analysis
 * @access  Private (Admin, Manager)
 */
router.get(
  "/trends",
  authorize(["admin", "manager"]),
  analyticsValidator.getTrendValidation,
  validate,
  analyticsController.getShipmentAnalytics
);

module.exports = router;
