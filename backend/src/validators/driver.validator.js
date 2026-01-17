const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a driver
 */
const createDriverValidation = [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('userId')
    .optional()
    .isUUID()
    .withMessage('Invalid user ID'),
  
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Invalid date of birth format')
    .custom((value) => {
      const age = Math.floor((new Date() - new Date(value)) / 31557600000);
      return age >= 18 && age <= 100;
    })
    .withMessage('Driver must be between 18 and 100 years old'),
  
  body('licenseNumber')
    .trim()
    .notEmpty()
    .withMessage('License number is required')
    .isLength({ max: 100 })
    .withMessage('License number must not exceed 100 characters'),
  
  body('licenseType')
    .notEmpty()
    .withMessage('License type is required')
    .isIn(['car', 'motorcycle', 'light_vehicle', 'heavy_vehicle', 'commercial'])
    .withMessage('Invalid license type'),
  
  body('licenseExpiry')
    .notEmpty()
    .withMessage('License expiry date is required')
    .isISO8601()
    .withMessage('Invalid license expiry date format')
    .custom((value) => {
      return new Date(value) > new Date();
    })
    .withMessage('License expiry date must be in the future'),
  
  body('licenseIssueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid license issue date format'),
  
  body('licenseIssuingAuthority')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('License issuing authority must not exceed 200 characters'),
  
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),
  
  body('state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters'),
  
  body('country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),
  
  body('postalCode')
    .trim()
    .notEmpty()
    .withMessage('Postal code is required')
    .isLength({ max: 20 })
    .withMessage('Postal code must not exceed 20 characters'),
  
  body('emergencyContactName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name must not exceed 100 characters'),
  
  body('emergencyContactPhone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid emergency contact phone number'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'on_leave', 'suspended'])
    .withMessage('Invalid status'),
  
  body('employmentType')
    .optional()
    .isIn(['full_time', 'part_time', 'contract', 'freelance'])
    .withMessage('Invalid employment type'),
  
  body('joiningDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid joining date format')
];

/**
 * Validation rules for updating a driver
 */
const updateDriverValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('licenseNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('License number must not exceed 100 characters'),
  
  body('licenseType')
    .optional()
    .isIn(['car', 'motorcycle', 'light_vehicle', 'heavy_vehicle', 'commercial'])
    .withMessage('Invalid license type'),
  
  body('licenseExpiry')
    .optional()
    .isISO8601()
    .withMessage('Invalid license expiry date format')
    .custom((value) => {
      return new Date(value) > new Date();
    })
    .withMessage('License expiry date must be in the future'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must not exceed 500 characters'),
  
  body('city')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('City must not exceed 100 characters'),
  
  body('state')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('State must not exceed 100 characters'),
  
  body('country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country must not exceed 100 characters'),
  
  body('postalCode')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Postal code must not exceed 20 characters'),
  
  body('emergencyContactName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact name must not exceed 100 characters'),
  
  body('emergencyContactPhone')
    .optional()
    .trim()
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid emergency contact phone number'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'on_leave', 'suspended'])
    .withMessage('Invalid status'),
  
  body('employmentType')
    .optional()
    .isIn(['full_time', 'part_time', 'contract', 'freelance'])
    .withMessage('Invalid employment type')
];

/**
 * Validation rules for updating driver availability
 */
const updateAvailabilityValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('availability')
    .notEmpty()
    .withMessage('Availability is required')
    .isIn(['available', 'busy', 'off_duty', 'on_break'])
    .withMessage('Invalid availability status'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

/**
 * Validation rules for assigning vehicle to driver
 */
const assignVehicleValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('vehicleId')
    .notEmpty()
    .withMessage('Vehicle ID is required')
    .isUUID()
    .withMessage('Invalid vehicle ID')
];

/**
 * Validation rules for updating driver status
 */
const updateStatusValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn(['active', 'inactive', 'on_leave', 'suspended'])
    .withMessage('Invalid status'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

/**
 * Validation rules for getting a driver by ID
 */
const getDriverValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID')
];

/**
 * Validation rules for deleting a driver
 */
const deleteDriverValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID')
];

/**
 * Validation rules for listing drivers
 */
const listDriversValidation = [
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
    .isIn(['active', 'inactive', 'on_leave', 'suspended'])
    .withMessage('Invalid status'),
  
  query('availability')
    .optional()
    .isIn(['available', 'busy', 'off_duty', 'on_break'])
    .withMessage('Invalid availability status'),
  
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('licenseType')
    .optional()
    .isIn(['car', 'motorcycle', 'light_vehicle', 'heavy_vehicle', 'commercial'])
    .withMessage('Invalid license type'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'firstName', 'lastName', 'rating'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for driver performance metrics
 */
const getPerformanceValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID'),
  
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
 * Validation rules for uploading driver documents
 */
const uploadDocumentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('documentType')
    .notEmpty()
    .withMessage('Document type is required')
    .isIn(['license', 'id_proof', 'address_proof', 'medical_certificate', 'other'])
    .withMessage('Invalid document type'),
  
  body('documentNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Document number must not exceed 100 characters'),
  
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format')
  // File validation will be handled by multer middleware
];

/**
 * Validation rules for driver rating
 */
const rateDriverValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('shipmentId')
    .notEmpty()
    .withMessage('Shipment ID is required')
    .isUUID()
    .withMessage('Invalid shipment ID'),
  
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Feedback must not exceed 1000 characters')
];

/**
 * Validation rules for driver schedule
 */
const updateScheduleValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid driver ID'),
  
  body('schedule')
    .isArray({ min: 1 })
    .withMessage('Schedule must be a non-empty array'),
  
  body('schedule.*.day')
    .isIn(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])
    .withMessage('Invalid day'),
  
  body('schedule.*.startTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('Start time must be in HH:MM format'),
  
  body('schedule.*.endTime')
    .matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .withMessage('End time must be in HH:MM format'),
  
  body('schedule.*.isWorkingDay')
    .isBoolean()
    .withMessage('isWorkingDay must be a boolean value')
];

module.exports = {
  createDriverValidation,
  updateDriverValidation,
  updateAvailabilityValidation,
  assignVehicleValidation,
  updateStatusValidation,
  getDriverValidation,
  deleteDriverValidation,
  listDriversValidation,
  getPerformanceValidation,
  uploadDocumentValidation,
  rateDriverValidation,
  updateScheduleValidation
};
