const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a route
 */
const createRouteValidation = [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Route name is required')
    .isLength({ max: 200 })
    .withMessage('Route name must not exceed 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('startLocation')
    .notEmpty()
    .withMessage('Start location is required')
    .isObject()
    .withMessage('Start location must be an object'),
  
  body('startLocation.address')
    .trim()
    .notEmpty()
    .withMessage('Start address is required'),
  
  body('startLocation.latitude')
    .notEmpty()
    .withMessage('Start latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Start latitude must be between -90 and 90'),
  
  body('startLocation.longitude')
    .notEmpty()
    .withMessage('Start longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Start longitude must be between -180 and 180'),
  
  body('endLocation')
    .notEmpty()
    .withMessage('End location is required')
    .isObject()
    .withMessage('End location must be an object'),
  
  body('endLocation.address')
    .trim()
    .notEmpty()
    .withMessage('End address is required'),
  
  body('endLocation.latitude')
    .notEmpty()
    .withMessage('End latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('End latitude must be between -90 and 90'),
  
  body('endLocation.longitude')
    .notEmpty()
    .withMessage('End longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('End longitude must be between -180 and 180'),
  
  body('waypoints')
    .optional()
    .isArray()
    .withMessage('Waypoints must be an array'),
  
  body('waypoints.*.address')
    .optional()
    .trim(),
  
  body('waypoints.*.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Waypoint latitude must be between -90 and 90'),
  
  body('waypoints.*.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Waypoint longitude must be between -180 and 180'),
  
  body('waypoints.*.stopDuration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stop duration must be a positive integer (minutes)'),
  
  body('waypoints.*.sequence')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sequence must be a positive integer'),
  
  body('distance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Distance must be a positive number'),
  
  body('distanceUnit')
    .optional()
    .isIn(['km', 'mi'])
    .withMessage('Distance unit must be km or mi'),
  
  body('estimatedDuration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Estimated duration must be a positive integer (minutes)'),
  
  body('driverId')
    .optional()
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('vehicleId')
    .optional()
    .isUUID()
    .withMessage('Invalid vehicle ID'),
  
  body('status')
    .optional()
    .isIn(['planned', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('scheduledStartTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled start time format'),
  
  body('scheduledEndTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled end time format')
];

/**
 * Validation rules for updating a route
 */
const updateRouteValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid route ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Route name must not exceed 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('waypoints')
    .optional()
    .isArray()
    .withMessage('Waypoints must be an array'),
  
  body('distance')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Distance must be a positive number'),
  
  body('estimatedDuration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Estimated duration must be a positive integer (minutes)'),
  
  body('driverId')
    .optional()
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('vehicleId')
    .optional()
    .isUUID()
    .withMessage('Invalid vehicle ID'),
  
  body('status')
    .optional()
    .isIn(['planned', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('scheduledStartTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled start time format'),
  
  body('scheduledEndTime')
    .optional()
    .isISO8601()
    .withMessage('Invalid scheduled end time format')
];

/**
 * Validation rules for route optimization request
 */
const optimizeRouteValidation = [
  body('waypoints')
    .notEmpty()
    .withMessage('Waypoints are required')
    .isArray({ min: 2 })
    .withMessage('At least 2 waypoints are required for optimization'),
  
  body('waypoints.*.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Waypoint latitude must be between -90 and 90'),
  
  body('waypoints.*.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Waypoint longitude must be between -180 and 180'),
  
  body('waypoints.*.address')
    .optional()
    .trim(),
  
  body('waypoints.*.priority')
    .optional()
    .isInt({ min: 1, max: 10 })
    .withMessage('Priority must be between 1 and 10'),
  
  body('waypoints.*.timeWindow')
    .optional()
    .isObject()
    .withMessage('Time window must be an object'),
  
  body('waypoints.*.timeWindow.start')
    .optional()
    .isISO8601()
    .withMessage('Invalid time window start format'),
  
  body('waypoints.*.timeWindow.end')
    .optional()
    .isISO8601()
    .withMessage('Invalid time window end format'),
  
  body('startLocation')
    .optional()
    .isObject()
    .withMessage('Start location must be an object'),
  
  body('startLocation.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Start latitude must be between -90 and 90'),
  
  body('startLocation.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Start longitude must be between -180 and 180'),
  
  body('optimizationGoal')
    .optional()
    .isIn(['distance', 'time', 'cost', 'balanced'])
    .withMessage('Invalid optimization goal'),
  
  body('vehicleType')
    .optional()
    .isIn(['car', 'van', 'truck', 'motorcycle'])
    .withMessage('Invalid vehicle type'),
  
  body('avoidTolls')
    .optional()
    .isBoolean()
    .withMessage('Avoid tolls must be a boolean value'),
  
  body('avoidHighways')
    .optional()
    .isBoolean()
    .withMessage('Avoid highways must be a boolean value')
];

/**
 * Validation rules for adding waypoints to a route
 */
const addWaypointValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid route ID'),
  
  body('waypoint')
    .notEmpty()
    .withMessage('Waypoint is required')
    .isObject()
    .withMessage('Waypoint must be an object'),
  
  body('waypoint.address')
    .trim()
    .notEmpty()
    .withMessage('Waypoint address is required'),
  
  body('waypoint.latitude')
    .notEmpty()
    .withMessage('Waypoint latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Waypoint latitude must be between -90 and 90'),
  
  body('waypoint.longitude')
    .notEmpty()
    .withMessage('Waypoint longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Waypoint longitude must be between -180 and 180'),
  
  body('waypoint.stopDuration')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Stop duration must be a positive integer (minutes)'),
  
  body('waypoint.sequence')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sequence must be a positive integer')
];

/**
 * Validation rules for removing a waypoint
 */
const removeWaypointValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid route ID'),
  
  param('waypointId')
    .isUUID()
    .withMessage('Invalid waypoint ID')
];

/**
 * Validation rules for updating waypoint sequence
 */
const updateWaypointSequenceValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid route ID'),
  
  body('waypoints')
    .isArray({ min: 1 })
    .withMessage('Waypoints must be a non-empty array'),
  
  body('waypoints.*.id')
    .isUUID()
    .withMessage('Invalid waypoint ID'),
  
  body('waypoints.*.sequence')
    .isInt({ min: 1 })
    .withMessage('Sequence must be a positive integer')
];

/**
 * Validation rules for getting a route by ID
 */
const getRouteValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid route ID')
];

/**
 * Validation rules for deleting a route
 */
const deleteRouteValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid route ID')
];

/**
 * Validation rules for listing routes
 */
const listRoutesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('status')
    .optional()
    .isIn(['planned', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('driverId')
    .optional()
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  query('vehicleId')
    .optional()
    .isUUID()
    .withMessage('Invalid vehicle ID'),
  
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'name', 'distance', 'scheduledStartTime'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for calculating route distance
 */
const calculateDistanceValidation = [
  body('origin')
    .notEmpty()
    .withMessage('Origin is required')
    .isObject()
    .withMessage('Origin must be an object'),
  
  body('origin.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Origin latitude must be between -90 and 90'),
  
  body('origin.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Origin longitude must be between -180 and 180'),
  
  body('destination')
    .notEmpty()
    .withMessage('Destination is required')
    .isObject()
    .withMessage('Destination must be an object'),
  
  body('destination.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Destination latitude must be between -90 and 90'),
  
  body('destination.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Destination longitude must be between -180 and 180'),
  
  body('waypoints')
    .optional()
    .isArray()
    .withMessage('Waypoints must be an array')
];

/**
 * Validation rules for updating route status
 */
const updateStatusValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid route ID'),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['planned', 'active', 'completed', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

module.exports = {
  createRouteValidation,
  updateRouteValidation,
  optimizeRouteValidation,
  addWaypointValidation,
  removeWaypointValidation,
  updateWaypointSequenceValidation,
  getRouteValidation,
  deleteRouteValidation,
  listRoutesValidation,
  calculateDistanceValidation,
  updateStatusValidation
};
