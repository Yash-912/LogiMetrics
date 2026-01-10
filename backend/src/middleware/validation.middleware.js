/**
 * Input Validation Middleware
 * Uses express-validator
 */

const { validationResult } = require('express-validator');
const { validationErrorResponse } = require('../utils/response.util');

/**
 * Validate request and return errors if any
 */
const validate = (validations) => {
  return async (req, res, next) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    return validationErrorResponse(res, errors.array());
  };
};

/**
 * Common validation rules
 */
const { body, param, query } = require('express-validator');

const commonRules = {
  // UUID validation
  uuid: (field, location = 'param') => {
    const validator = location === 'param' ? param(field) : 
                      location === 'query' ? query(field) : body(field);
    return validator
      .trim()
      .isUUID(4)
      .withMessage(`${field} must be a valid UUID`);
  },

  // Email validation
  email: (field = 'email') => 
    body(field)
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),

  // Password validation
  password: (field = 'password') =>
    body(field)
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),

  // Phone validation
  phone: (field = 'phone') =>
    body(field)
      .optional()
      .trim()
      .matches(/^[6-9]\d{9}$/)
      .withMessage('Please provide a valid 10-digit phone number'),

  // Name validation
  name: (field) =>
    body(field)
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage(`${field} must be between 2 and 100 characters`)
      .matches(/^[a-zA-Z\s]+$/)
      .withMessage(`${field} can only contain letters and spaces`),

  // Pagination
  page: () =>
    query('page')
      .optional()
      .isInt({ min: 1 })
      .toInt()
      .withMessage('Page must be a positive integer'),

  limit: () =>
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .toInt()
      .withMessage('Limit must be between 1 and 100'),

  // Date validation
  date: (field, location = 'body') => {
    const validator = location === 'query' ? query(field) : body(field);
    return validator
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid date`);
  },

  // Enum validation
  enum: (field, values, location = 'body') => {
    const validator = location === 'query' ? query(field) : body(field);
    return validator
      .optional()
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(', ')}`);
  },

  // Coordinates validation
  coordinates: () => [
    body('coordinates.lat')
      .isFloat({ min: -90, max: 90 })
      .withMessage('Latitude must be between -90 and 90'),
    body('coordinates.lng')
      .isFloat({ min: -180, max: 180 })
      .withMessage('Longitude must be between -180 and 180')
  ],

  // Vehicle registration number
  vehicleNumber: (field = 'registrationNumber') =>
    body(field)
      .trim()
      .toUpperCase()
      .matches(/^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/)
      .withMessage('Please provide a valid vehicle registration number'),

  // Amount/price validation
  amount: (field) =>
    body(field)
      .isFloat({ min: 0 })
      .withMessage(`${field} must be a positive number`),

  // String with length
  string: (field, min = 1, max = 255, required = true) => {
    let validator = body(field).trim();
    if (!required) validator = validator.optional();
    return validator
      .isLength({ min, max })
      .withMessage(`${field} must be between ${min} and ${max} characters`);
  },

  // Boolean
  boolean: (field) =>
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean`),

  // Array
  array: (field, minLength = 0) =>
    body(field)
      .isArray({ min: minLength })
      .withMessage(`${field} must be an array with at least ${minLength} items`)
};

module.exports = {
  validate,
  commonRules,
  body,
  param,
  query
};
