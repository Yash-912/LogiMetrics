const { body, param, query } = require('express-validator');

/**
 * Validation rules for creating a company
 */
const createCompanyValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[\d\s-()]+$/)
    .withMessage('Please provide a valid phone number'),
  
  body('businessType')
    .optional()
    .trim()
    .isIn(['logistics', 'courier', 'freight', 'warehouse', 'delivery', 'other'])
    .withMessage('Invalid business type'),
  
  body('registrationNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Registration number must not exceed 100 characters'),
  
  body('taxId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tax ID must not exceed 100 characters'),
  
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
  
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  
  body('subscriptionPlan')
    .optional()
    .isIn(['free', 'basic', 'professional', 'enterprise'])
    .withMessage('Invalid subscription plan')
];

/**
 * Validation rules for updating a company
 */
const updateCompanyValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters'),
  
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
  
  body('businessType')
    .optional()
    .trim()
    .isIn(['logistics', 'courier', 'freight', 'warehouse', 'delivery', 'other'])
    .withMessage('Invalid business type'),
  
  body('registrationNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Registration number must not exceed 100 characters'),
  
  body('taxId')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Tax ID must not exceed 100 characters'),
  
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
  
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be one of: active, inactive, suspended')
];

/**
 * Validation rules for updating company settings
 */
const updateSettingsValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('settings')
    .notEmpty()
    .withMessage('Settings object is required')
    .isObject()
    .withMessage('Settings must be an object'),
  
  body('settings.timezone')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Timezone must not exceed 50 characters'),
  
  body('settings.currency')
    .optional()
    .trim()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code (e.g., USD, EUR)'),
  
  body('settings.dateFormat')
    .optional()
    .isIn(['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'])
    .withMessage('Invalid date format'),
  
  body('settings.timeFormat')
    .optional()
    .isIn(['12h', '24h'])
    .withMessage('Time format must be 12h or 24h'),
  
  body('settings.distanceUnit')
    .optional()
    .isIn(['km', 'mi'])
    .withMessage('Distance unit must be km or mi'),
  
  body('settings.weightUnit')
    .optional()
    .isIn(['kg', 'lb'])
    .withMessage('Weight unit must be kg or lb'),
  
  body('settings.notifications')
    .optional()
    .isObject()
    .withMessage('Notifications must be an object'),
  
  body('settings.features')
    .optional()
    .isObject()
    .withMessage('Features must be an object')
];

/**
 * Validation rules for updating subscription
 */
const updateSubscriptionValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('plan')
    .notEmpty()
    .withMessage('Subscription plan is required')
    .isIn(['free', 'basic', 'professional', 'enterprise'])
    .withMessage('Invalid subscription plan'),
  
  body('billingCycle')
    .optional()
    .isIn(['monthly', 'yearly'])
    .withMessage('Billing cycle must be monthly or yearly'),
  
  body('autoRenew')
    .optional()
    .isBoolean()
    .withMessage('Auto renew must be a boolean value')
];

/**
 * Validation rules for deleting a company
 */
const deleteCompanyValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID')
];

/**
 * Validation rules for getting a company by ID
 */
const getCompanyValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID')
];

/**
 * Validation rules for listing companies
 */
const listCompaniesValidation = [
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
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be one of: active, inactive, suspended'),
  
  query('businessType')
    .optional()
    .trim()
    .isIn(['logistics', 'courier', 'freight', 'warehouse', 'delivery', 'other'])
    .withMessage('Invalid business type'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search query must not exceed 100 characters'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'name'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for managing team members
 */
const teamMemberValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isUUID()
    .withMessage('Invalid user ID'),
  
  body('roleId')
    .optional()
    .isUUID()
    .withMessage('Invalid role ID')
];

/**
 * Validation rules for uploading company logo
 */
const uploadLogoValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID')
  // File validation will be handled by multer middleware
];

/**
 * Validation rules for company statistics
 */
const getStatsValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

module.exports = {
  createCompanyValidation,
  updateCompanyValidation,
  updateSettingsValidation,
  updateSubscriptionValidation,
  deleteCompanyValidation,
  getCompanyValidation,
  listCompaniesValidation,
  teamMemberValidation,
  uploadLogoValidation,
  getStatsValidation
};
