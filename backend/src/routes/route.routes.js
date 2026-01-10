const express = require('express');
const router = express.Router();
const routeController = require('../controllers/route.controller');
const { route: routeValidator } = require('../validators');
const { authenticate } = require('../middleware/auth.middleware');
const { authorize } = require('../middleware/rbac.middleware');
const { validate } = require('../middleware/validation.middleware');
const { apiLimiter } = require('../middleware/rateLimit.middleware');

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/routes
 * @desc    Get all routes with pagination and filters
 * @access  Private
 */
router.get(
    '/',
    routeValidator.listRoutesValidation,
    validate,
    routeController.getRoutes
);

/**
 * @route   GET /api/routes/:id
 * @desc    Get route by ID
 * @access  Private
 */
router.get(
    '/:id',
    routeValidator.getRouteValidation,
    validate,
    routeController.getRouteById
);

/**
 * @route   POST /api/routes
 * @desc    Create a new route
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.post(
    '/',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.createRouteValidation,
    validate,
    routeController.createRoute
);

/**
 * @route   PUT /api/routes/:id
 * @desc    Update route by ID
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.put(
    '/:id',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.updateRouteValidation,
    validate,
    routeController.updateRoute
);

/**
 * @route   DELETE /api/routes/:id
 * @desc    Delete route
 * @access  Private (Admin, Manager)
 */
router.delete(
    '/:id',
    authorize(['admin', 'manager']),
    routeValidator.deleteRouteValidation,
    validate,
    routeController.deleteRoute
);

/**
 * @route   PATCH /api/routes/:id/status
 * @desc    Update route status
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.patch(
    '/:id/status',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.updateStatusValidation,
    validate,
    routeController.updateRouteStatus
);

/**
 * @route   POST /api/routes/:id/waypoints
 * @desc    Add waypoint to route
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.post(
    '/:id/waypoints',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.addWaypointValidation,
    validate,
    routeController.addWaypoint
);

/**
 * @route   PUT /api/routes/:id/waypoints/:waypointId
 * @desc    Update waypoint
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.put(
    '/:id/waypoints/:waypointId',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.removeWaypointValidation,
    validate,
    routeController.updateWaypoint
);

/**
 * @route   DELETE /api/routes/:id/waypoints/:waypointId
 * @desc    Remove waypoint from route
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.delete(
    '/:id/waypoints/:waypointId',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.removeWaypointValidation,
    validate,
    routeController.removeWaypoint
);

/**
 * @route   PUT /api/routes/:id/waypoints/reorder
 * @desc    Reorder waypoints
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.put(
    '/:id/waypoints/reorder',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.updateWaypointSequenceValidation,
    validate,
    routeController.reorderWaypoints
);

/**
 * @route   POST /api/routes/:id/optimize
 * @desc    Optimize route using AI
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.post(
    '/:id/optimize',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.getRouteValidation,
    validate,
    routeController.optimizeRouteOrder
);

/**
 * @route   POST /api/routes/optimize
 * @desc    Optimize route from waypoints (without existing route)
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.post(
    '/optimize',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.optimizeRouteValidation,
    validate,
    routeController.optimizeRouteOrder
);

/**
 * @route   GET /api/routes/:id/directions
 * @desc    Get route directions
 * @access  Private
 */
router.get(
    '/:id/directions',
    routeValidator.getRouteValidation,
    validate,
    routeController.getDirections
);

/**
 * @route   POST /api/routes/:id/clone
 * @desc    Clone route
 * @access  Private (Admin, Manager, Dispatcher)
 */
router.post(
    '/:id/clone',
    authorize(['admin', 'manager', 'dispatcher']),
    routeValidator.getRouteValidation,
    validate,
    routeController.cloneRoute
);

module.exports = router;
