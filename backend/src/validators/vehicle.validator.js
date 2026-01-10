const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a vehicle
 */
const createVehicleValidation = [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isUUID()
    .withMessage('Invalid company ID'),

  body('registrationNumber')
    .trim()
    .notEmpty()
    .withMessage('Registration number is required')
    .isLength({ max: 50 })
    .withMessage('Registration number must not exceed 50 characters'),

  body('make')
    .trim()
    .notEmpty()
    .withMessage('Vehicle make is required')
    .isLength({ max: 100 })
    .withMessage('Make must not exceed 100 characters'),

  body('model')
    .trim()
    .notEmpty()
    .withMessage('Vehicle model is required')
    .isLength({ max: 100 })
    .withMessage('Model must not exceed 100 characters'),

  body('year')
    .notEmpty()
    .withMessage('Year is required')
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Please provide a valid year'),

  body('type')
    .notEmpty()
    .withMessage('Vehicle type is required')
    .isIn(['truck', 'van', 'motorcycle', 'car', 'trailer', 'container'])
    .withMessage('Invalid vehicle type'),

  body('capacity')
    .notEmpty()
    .withMessage('Capacity is required')
    .isFloat({ min: 0 })
    .withMessage('Capacity must be a positive number'),

  body('capacityUnit')
    .optional()
    .isIn(['kg', 'ton', 'lb', 'm3', 'ft3'])
    .withMessage('Invalid capacity unit'),

  body('fuelType')
    .optional()
    .isIn(['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'])
    .withMessage('Invalid fuel type'),

  body('color')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Color must not exceed 50 characters'),

  body('vinNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('VIN number must not exceed 50 characters'),

  body('engineNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Engine number must not exceed 50 characters'),

  body('purchaseDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid purchase date format'),

  body('registrationExpiry')
    .optional()
    .isISO8601()
    .withMessage('Invalid registration expiry date format'),

  body('insuranceExpiry')
    .optional()
    .isISO8601()
    .withMessage('Invalid insurance expiry date format'),

  body('insuranceProvider')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Insurance provider must not exceed 200 characters'),

  body('insurancePolicyNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Insurance policy number must not exceed 100 characters'),

  body('status')
    .optional()
    .isIn(['available', 'in_use', 'maintenance', 'inactive', 'retired'])
    .withMessage('Invalid status'),

  body('gpsEnabled')
    .optional()
    .isBoolean()
    .withMessage('GPS enabled must be a boolean value'),

  body('gpsDeviceId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('GPS device ID must not exceed 100 characters')
];

/**
 * Validation rules for updating a vehicle
 */
const updateVehicleValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid vehicle ID'),

  body('registrationNumber')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Registration number must not exceed 50 characters'),

  body('make')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Make must not exceed 100 characters'),

  body('model')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Model must not exceed 100 characters'),

  body('year')
    .optional()
    .isInt({ min: 1900, max: new Date().getFullYear() + 1 })
    .withMessage('Please provide a valid year'),

  body('type')
    .optional()
    .isIn(['truck', 'van', 'motorcycle', 'car', 'trailer', 'container'])
    .withMessage('Invalid vehicle type'),

  body('capacity')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Capacity must be a positive number'),

  body('capacityUnit')
    .optional()
    .isIn(['kg', 'ton', 'lb', 'm3', 'ft3'])
    .withMessage('Invalid capacity unit'),

  body('fuelType')
    .optional()
    .isIn(['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'])
    .withMessage('Invalid fuel type'),

  body('color')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Color must not exceed 50 characters'),

  body('registrationExpiry')
    .optional()
    .isISO8601()
    .withMessage('Invalid registration expiry date format'),

  body('insuranceExpiry')
    .optional()
    .isISO8601()
    .withMessage('Invalid insurance expiry date format'),

  body('insuranceProvider')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Insurance provider must not exceed 200 characters'),

  body('insurancePolicyNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Insurance policy number must not exceed 100 characters'),

  body('status')
    .optional()
    .isIn(['available', 'in_use', 'maintenance', 'inactive', 'retired'])
    .withMessage('Invalid status'),

  body('gpsEnabled')
    .optional()
    .isBoolean()
    .withMessage('GPS enabled must be a boolean value'),

  body('gpsDeviceId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('GPS device ID must not exceed 100 characters')
];

/**
 * Validation rules for adding maintenance record
 */
const addMaintenanceValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid vehicle ID'),

  body('type')
    .notEmpty()
    .withMessage('Maintenance type is required')
    .isIn(['scheduled', 'repair', 'inspection', 'oil_change', 'tire_change', 'brake_service', 'other'])
    .withMessage('Invalid maintenance type'),

  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost must be a positive number'),

  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),

  body('serviceDate')
    .notEmpty()
    .withMessage('Service date is required')
    .isISO8601()
    .withMessage('Invalid service date format'),

  body('nextServiceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid next service date format'),

  body('mileage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Mileage must be a positive integer'),

  body('serviceProvider')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Service provider must not exceed 200 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

/**
 * Validation rules for updating maintenance record
 */
const updateMaintenanceValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid vehicle ID'),

  param('recordId')
    .isUUID()
    .withMessage('Invalid maintenance record ID'),

  body('type')
    .optional()
    .isIn(['scheduled', 'repair', 'inspection', 'oil_change', 'tire_change', 'brake_service', 'other'])
    .withMessage('Invalid maintenance type'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),

  body('cost')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost must be a positive number'),

  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),

  body('serviceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid service date format'),

  body('nextServiceDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid next service date format'),

  body('mileage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Mileage must be a positive integer'),

  body('serviceProvider')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Service provider must not exceed 200 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),

  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled'])
    .withMessage('Invalid maintenance status')
];

/**
 * Validation rules for adding fuel log
 */
const addFuelLogValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid vehicle ID'),

  body('fuelType')
    .notEmpty()
    .withMessage('Fuel type is required')
    .isIn(['petrol', 'diesel', 'electric', 'hybrid', 'cng', 'lpg'])
    .withMessage('Invalid fuel type'),

  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),

  body('unit')
    .optional()
    .isIn(['liters', 'gallons', 'kwh'])
    .withMessage('Invalid unit'),

  body('cost')
    .notEmpty()
    .withMessage('Cost is required')
    .isFloat({ min: 0 })
    .withMessage('Cost must be a positive number'),

  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),

  body('fuelDate')
    .notEmpty()
    .withMessage('Fuel date is required')
    .isISO8601()
    .withMessage('Invalid fuel date format'),

  body('mileage')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Mileage must be a positive integer'),

  body('location')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Location must not exceed 200 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

/**
 * Validation rules for updating vehicle status
 */
const updateStatusValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid vehicle ID'),

  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['available', 'in_use', 'maintenance', 'inactive', 'retired'])
    .withMessage('Invalid status'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

/**
 * Validation rules for getting a vehicle by ID
 */
const getVehicleValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid vehicle ID')
];

/**
 * Validation rules for deleting a vehicle
 */
const deleteVehicleValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid vehicle ID')
];

/**
 * Validation rules for listing vehicles
 */
const listVehiclesValidation = [
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
    .isIn(['available', 'in_use', 'maintenance', 'inactive', 'retired'])
    .withMessage('Invalid status'),

  query('type')
    .optional()
    .isIn(['truck', 'van', 'motorcycle', 'car', 'trailer', 'container'])
    .withMessage('Invalid vehicle type'),

  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),

  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'registrationNumber', 'make', 'model', 'year'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for vehicle statistics
 */
const getStatsValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid vehicle ID'),

  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

/**
 * Validation rules for assigning driver to vehicle
 */
const assignDriverValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid vehicle ID'),

  body('driverId')
    .notEmpty()
    .withMessage('Driver ID is required')
    .isUUID()
    .withMessage('Invalid driver ID')
];

module.exports = {
  createVehicleValidation,
  updateVehicleValidation,
  addMaintenanceValidation,
  updateMaintenanceValidation,
  addFuelLogValidation,
  updateStatusValidation,
  getVehicleValidation,
  deleteVehicleValidation,
  listVehiclesValidation,
  getStatsValidation,
  assignDriverValidation,

  // Aliases expected by route files
  getVehicles: listVehiclesValidation,
  getVehicleById: getVehicleValidation,
  createVehicle: createVehicleValidation,
  updateVehicle: updateVehicleValidation,
  deleteVehicle: deleteVehicleValidation,
  updateStatus: updateStatusValidation,
  assignDriver: assignDriverValidation,
  addMaintenance: addMaintenanceValidation,
  updateMaintenance: updateMaintenanceValidation,
  addFuelLog: addFuelLogValidation,
  getTelemetry: getVehicleValidation,
  getDocuments: getVehicleValidation
};
