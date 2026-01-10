const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a shipment
 */
const createShipmentValidation = [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('customerId')
    .notEmpty()
    .withMessage('Customer ID is required')
    .isUUID()
    .withMessage('Invalid customer ID'),
  
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tracking number must not exceed 100 characters'),
  
  body('type')
    .notEmpty()
    .withMessage('Shipment type is required')
    .isIn(['standard', 'express', 'overnight', 'international', 'fragile', 'perishable'])
    .withMessage('Invalid shipment type'),
  
  body('pickupAddress')
    .notEmpty()
    .withMessage('Pickup address is required')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Pickup address must not exceed 500 characters'),
  
  body('pickupCity')
    .notEmpty()
    .withMessage('Pickup city is required')
    .trim(),
  
  body('pickupState')
    .notEmpty()
    .withMessage('Pickup state is required')
    .trim(),
  
  body('pickupCountry')
    .notEmpty()
    .withMessage('Pickup country is required')
    .trim(),
  
  body('pickupPostalCode')
    .notEmpty()
    .withMessage('Pickup postal code is required')
    .trim(),
  
  body('pickupLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Pickup latitude must be between -90 and 90'),
  
  body('pickupLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Pickup longitude must be between -180 and 180'),
  
  body('deliveryAddress')
    .notEmpty()
    .withMessage('Delivery address is required')
    .trim()
    .isLength({ max: 500 })
    .withMessage('Delivery address must not exceed 500 characters'),
  
  body('deliveryCity')
    .notEmpty()
    .withMessage('Delivery city is required')
    .trim(),
  
  body('deliveryState')
    .notEmpty()
    .withMessage('Delivery state is required')
    .trim(),
  
  body('deliveryCountry')
    .notEmpty()
    .withMessage('Delivery country is required')
    .trim(),
  
  body('deliveryPostalCode')
    .notEmpty()
    .withMessage('Delivery postal code is required')
    .trim(),
  
  body('deliveryLat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Delivery latitude must be between -90 and 90'),
  
  body('deliveryLng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Delivery longitude must be between -180 and 180'),
  
  body('scheduledPickupDate')
    .notEmpty()
    .withMessage('Scheduled pickup date is required')
    .isISO8601()
    .withMessage('Invalid pickup date format'),
  
  body('scheduledDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid delivery date format'),
  
  body('weight')
    .notEmpty()
    .withMessage('Weight is required')
    .isFloat({ min: 0.01 })
    .withMessage('Weight must be greater than 0'),
  
  body('weightUnit')
    .optional()
    .isIn(['kg', 'lb'])
    .withMessage('Weight unit must be kg or lb'),
  
  body('dimensions')
    .optional()
    .isObject()
    .withMessage('Dimensions must be an object'),
  
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Length must be greater than 0'),
  
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Width must be greater than 0'),
  
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Height must be greater than 0'),
  
  body('packageCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Package count must be at least 1'),
  
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  
  body('currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('insuranceRequired')
    .optional()
    .isBoolean()
    .withMessage('Insurance required must be a boolean value'),
  
  body('signatureRequired')
    .optional()
    .isBoolean()
    .withMessage('Signature required must be a boolean value'),
  
  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Special instructions must not exceed 1000 characters'),
  
  body('contactName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact name must not exceed 100 characters'),
  
  body('contactPhone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('contactEmail')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Validation rules for updating a shipment
 */
const updateShipmentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid shipment ID'),
  
  body('type')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'international', 'fragile', 'perishable'])
    .withMessage('Invalid shipment type'),
  
  body('scheduledPickupDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid pickup date format'),
  
  body('scheduledDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid delivery date format'),
  
  body('weight')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Weight must be greater than 0'),
  
  body('weightUnit')
    .optional()
    .isIn(['kg', 'lb'])
    .withMessage('Weight unit must be kg or lb'),
  
  body('dimensions')
    .optional()
    .isObject()
    .withMessage('Dimensions must be an object'),
  
  body('packageCount')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Package count must be at least 1'),
  
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  
  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Special instructions must not exceed 1000 characters')
];

/**
 * Validation rules for updating shipment status
 */
const updateStatusValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid shipment ID'),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn([
      'pending',
      'confirmed',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled',
      'returned'
    ])
    .withMessage('Invalid status'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  body('location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];

/**
 * Validation rules for assigning driver/vehicle
 */
const assignResourcesValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid shipment ID'),
  
  body('driverId')
    .optional()
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('vehicleId')
    .optional()
    .isUUID()
    .withMessage('Invalid vehicle ID'),
  
  body('routeId')
    .optional()
    .isUUID()
    .withMessage('Invalid route ID')
];

/**
 * Validation rules for getting a shipment by ID
 */
const getShipmentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid shipment ID')
];

/**
 * Validation rules for deleting a shipment
 */
const deleteShipmentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid shipment ID')
];

/**
 * Validation rules for listing shipments
 */
const listShipmentsValidation = [
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
    .isIn([
      'pending',
      'confirmed',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed',
      'cancelled',
      'returned'
    ])
    .withMessage('Invalid status'),
  
  query('type')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'international', 'fragile', 'perishable'])
    .withMessage('Invalid shipment type'),
  
  query('customerId')
    .optional()
    .isUUID()
    .withMessage('Invalid customer ID'),
  
  query('driverId')
    .optional()
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  query('vehicleId')
    .optional()
    .isUUID()
    .withMessage('Invalid vehicle ID'),
  
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
    .isIn(['createdAt', 'updatedAt', 'scheduledPickupDate', 'scheduledDeliveryDate', 'trackingNumber'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for tracking a shipment
 */
const trackShipmentValidation = [
  param('trackingNumber')
    .trim()
    .notEmpty()
    .withMessage('Tracking number is required')
];

/**
 * Validation rules for uploading proof of delivery
 */
const uploadPODValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid shipment ID'),
  
  body('signatureName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Signature name must not exceed 100 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
  // File validation will be handled by multer middleware
];

/**
 * Validation rules for bulk shipment operations
 */
const bulkOperationValidation = [
  body('shipmentIds')
    .isArray({ min: 1 })
    .withMessage('Shipment IDs must be a non-empty array'),
  
  body('shipmentIds.*')
    .isUUID()
    .withMessage('Each shipment ID must be a valid UUID'),
  
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['assign_driver', 'assign_vehicle', 'cancel', 'export'])
    .withMessage('Invalid action'),
  
  body('driverId')
    .if(body('action').equals('assign_driver'))
    .notEmpty()
    .withMessage('Driver ID is required for assign_driver action')
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('vehicleId')
    .if(body('action').equals('assign_vehicle'))
    .notEmpty()
    .withMessage('Vehicle ID is required for assign_vehicle action')
    .isUUID()
    .withMessage('Invalid vehicle ID')
];

/**
 * Validation rules for calculating shipment cost
 */
const calculateCostValidation = [
  body('weight')
    .notEmpty()
    .withMessage('Weight is required')
    .isFloat({ min: 0.01 })
    .withMessage('Weight must be greater than 0'),
  
  body('distance')
    .notEmpty()
    .withMessage('Distance is required')
    .isFloat({ min: 0.01 })
    .withMessage('Distance must be greater than 0'),
  
  body('type')
    .notEmpty()
    .withMessage('Shipment type is required')
    .isIn(['standard', 'express', 'overnight', 'international', 'fragile', 'perishable'])
    .withMessage('Invalid shipment type'),
  
  body('insuranceRequired')
    .optional()
    .isBoolean()
    .withMessage('Insurance required must be a boolean value'),
  
  body('value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number')
];

module.exports = {
  createShipmentValidation,
  updateShipmentValidation,
  updateStatusValidation,
  assignResourcesValidation,
  getShipmentValidation,
  deleteShipmentValidation,
  listShipmentsValidation,
  trackShipmentValidation,
  uploadPODValidation,
  bulkOperationValidation,
  calculateCostValidation
};
