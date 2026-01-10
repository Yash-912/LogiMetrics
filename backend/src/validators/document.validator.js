const { body, param, query } = require('express-validator');

/**
 * Validation rules for uploading a document
 */
const uploadDocumentValidation = [
  body('companyId')
    .notEmpty()
    .withMessage('Company ID is required')
    .isUUID()
    .withMessage('Invalid company ID'),
  
  body('documentType')
    .notEmpty()
    .withMessage('Document type is required')
    .isIn([
      'invoice',
      'receipt',
      'pod', // Proof of Delivery
      'license',
      'registration',
      'insurance',
      'contract',
      'report',
      'image',
      'other'
    ])
    .withMessage('Invalid document type'),
  
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Document title is required')
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('relatedEntityType')
    .optional()
    .isIn(['shipment', 'vehicle', 'driver', 'invoice', 'company', 'user'])
    .withMessage('Invalid related entity type'),
  
  body('relatedEntityId')
    .optional()
    .isUUID()
    .withMessage('Invalid related entity ID'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must not exceed 50 characters'),
  
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
  // File validation will be handled by multer middleware
];

/**
 * Validation rules for updating a document
 */
const updateDocumentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID'),
  
  body('title')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Title must not exceed 200 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description must not exceed 1000 characters'),
  
  body('documentType')
    .optional()
    .isIn([
      'invoice',
      'receipt',
      'pod',
      'license',
      'registration',
      'insurance',
      'contract',
      'report',
      'image',
      'other'
    ])
    .withMessage('Invalid document type'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must not exceed 50 characters'),
  
  body('expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid expiry date format'),
  
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

/**
 * Validation rules for getting a document by ID
 */
const getDocumentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID')
];

/**
 * Validation rules for deleting a document
 */
const deleteDocumentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID')
];

/**
 * Validation rules for listing documents
 */
const listDocumentsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('documentType')
    .optional()
    .isIn([
      'invoice',
      'receipt',
      'pod',
      'license',
      'registration',
      'insurance',
      'contract',
      'report',
      'image',
      'other'
    ])
    .withMessage('Invalid document type'),
  
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('uploadedBy')
    .optional()
    .isUUID()
    .withMessage('Invalid user ID'),
  
  query('relatedEntityType')
    .optional()
    .isIn(['shipment', 'vehicle', 'driver', 'invoice', 'company', 'user'])
    .withMessage('Invalid related entity type'),
  
  query('relatedEntityId')
    .optional()
    .isUUID()
    .withMessage('Invalid related entity ID'),
  
  query('tags')
    .optional()
    .trim(),
  
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
  
  query('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean value'),
  
  query('expired')
    .optional()
    .isBoolean()
    .withMessage('expired must be a boolean value'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'title', 'expiryDate'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for downloading a document
 */
const downloadDocumentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID')
];

/**
 * Validation rules for sharing a document
 */
const shareDocumentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID'),
  
  body('shareWith')
    .isArray({ min: 1 })
    .withMessage('Share with must be a non-empty array'),
  
  body('shareWith.*')
    .isEmail()
    .withMessage('Each email must be valid')
    .normalizeEmail(),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Message must not exceed 500 characters'),
  
  body('expiryDays')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Expiry days must be between 1 and 365')
];

/**
 * Validation rules for bulk document operations
 */
const bulkOperationValidation = [
  body('documentIds')
    .isArray({ min: 1 })
    .withMessage('Document IDs must be a non-empty array'),
  
  body('documentIds.*')
    .isUUID()
    .withMessage('Each document ID must be a valid UUID'),
  
  body('action')
    .notEmpty()
    .withMessage('Action is required')
    .isIn(['delete', 'archive', 'unarchive', 'download'])
    .withMessage('Action must be one of: delete, archive, unarchive, download')
];

/**
 * Validation rules for generating document access token
 */
const generateAccessTokenValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID'),
  
  body('expiresIn')
    .optional()
    .isInt({ min: 60, max: 86400 })
    .withMessage('Expires in must be between 60 seconds and 24 hours (86400 seconds)')
];

/**
 * Validation rules for document version upload
 */
const uploadVersionValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID'),
  
  body('versionNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Version notes must not exceed 500 characters')
  // File validation will be handled by multer middleware
];

/**
 * Validation rules for getting document versions
 */
const getVersionsValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID')
];

/**
 * Validation rules for reverting to a document version
 */
const revertVersionValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid document ID'),
  
  param('versionId')
    .isUUID()
    .withMessage('Invalid version ID')
];

/**
 * Validation rules for getting document statistics
 */
const getStatsValidation = [
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
    .withMessage('End date must be a valid ISO 8601 date')
];

module.exports = {
  uploadDocumentValidation,
  updateDocumentValidation,
  getDocumentValidation,
  deleteDocumentValidation,
  listDocumentsValidation,
  downloadDocumentValidation,
  shareDocumentValidation,
  bulkOperationValidation,
  generateAccessTokenValidation,
  uploadVersionValidation,
  getVersionsValidation,
  revertVersionValidation,
  getStatsValidation
};
