const { body, param, query } = require('express-validator');

/**
 * Validation rules for initiating a payment
 */
const initiatePaymentValidation = [
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
  
  body('amount')
    .notEmpty()
    .withMessage('Amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  
  body('currency')
    .trim()
    .notEmpty()
    .withMessage('Currency is required')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code (e.g., USD, EUR)'),
  
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['card', 'bank_transfer', 'upi', 'wallet', 'cash', 'cod'])
    .withMessage('Invalid payment method'),
  
  body('paymentGateway')
    .optional()
    .isIn(['razorpay', 'stripe'])
    .withMessage('Invalid payment gateway'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('invoiceId')
    .optional()
    .isUUID()
    .withMessage('Invalid invoice ID'),
  
  body('shipmentId')
    .optional()
    .isUUID()
    .withMessage('Invalid shipment ID'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object'),
  
  body('successUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Success URL must be a valid URL'),
  
  body('cancelUrl')
    .optional()
    .trim()
    .isURL()
    .withMessage('Cancel URL must be a valid URL')
];

/**
 * Validation rules for verifying a payment
 */
const verifyPaymentValidation = [
  body('paymentId')
    .trim()
    .notEmpty()
    .withMessage('Payment ID is required'),
  
  body('paymentGateway')
    .notEmpty()
    .withMessage('Payment gateway is required')
    .isIn(['razorpay', 'stripe'])
    .withMessage('Invalid payment gateway'),
  
  body('signature')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Signature is required for verification'),
  
  body('orderId')
    .optional()
    .trim()
];

/**
 * Validation rules for processing refund
 */
const refundPaymentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid transaction ID'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be greater than 0'),
  
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Refund reason is required')
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
];

/**
 * Validation rules for getting payment by ID
 */
const getPaymentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid payment ID')
];

/**
 * Validation rules for listing payments
 */
const listPaymentsValidation = [
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
    .isIn(['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('paymentMethod')
    .optional()
    .isIn(['card', 'bank_transfer', 'upi', 'wallet', 'cash', 'cod'])
    .withMessage('Invalid payment method'),
  
  query('paymentGateway')
    .optional()
    .isIn(['razorpay', 'stripe'])
    .withMessage('Invalid payment gateway'),
  
  query('customerId')
    .optional()
    .isUUID()
    .withMessage('Invalid customer ID'),
  
  query('companyId')
    .optional()
    .isUUID()
    .withMessage('Invalid company ID'),
  
  query('invoiceId')
    .optional()
    .isUUID()
    .withMessage('Invalid invoice ID'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be a positive number'),
  
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum amount must be a positive number'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'updatedAt', 'amount'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for creating an invoice
 */
const createInvoiceValidation = [
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
  
  body('invoiceNumber')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Invoice number must not exceed 100 characters'),
  
  body('issueDate')
    .notEmpty()
    .withMessage('Issue date is required')
    .isISO8601()
    .withMessage('Invalid issue date format'),
  
  body('dueDate')
    .notEmpty()
    .withMessage('Due date is required')
    .isISO8601()
    .withMessage('Invalid due date format')
    .custom((value, { req }) => {
      return new Date(value) >= new Date(req.body.issueDate);
    })
    .withMessage('Due date must be after or equal to issue date'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('Invoice must have at least one item'),
  
  body('items.*.description')
    .trim()
    .notEmpty()
    .withMessage('Item description is required'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Item quantity must be at least 1'),
  
  body('items.*.unitPrice')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be a positive number'),
  
  body('items.*.taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('currency')
    .trim()
    .notEmpty()
    .withMessage('Currency is required')
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('subtotal')
    .notEmpty()
    .withMessage('Subtotal is required')
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be a positive number'),
  
  body('taxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Tax amount must be a positive number'),
  
  body('discountAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Discount amount must be a positive number'),
  
  body('total')
    .notEmpty()
    .withMessage('Total is required')
    .isFloat({ min: 0 })
    .withMessage('Total must be a positive number'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  
  body('terms')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Terms must not exceed 2000 characters')
];

/**
 * Validation rules for updating an invoice
 */
const updateInvoiceValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid invoice ID'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid due date format'),
  
  body('status')
    .optional()
    .isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
    .withMessage('Invalid status'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),
  
  body('terms')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Terms must not exceed 2000 characters')
];

/**
 * Validation rules for getting invoice by ID
 */
const getInvoiceValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid invoice ID')
];

/**
 * Validation rules for deleting an invoice
 */
const deleteInvoiceValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid invoice ID')
];

/**
 * Validation rules for listing invoices
 */
const listInvoicesValidation = [
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
    .isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
    .withMessage('Invalid status'),
  
  query('customerId')
    .optional()
    .isUUID()
    .withMessage('Invalid customer ID'),
  
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
    .isIn(['createdAt', 'updatedAt', 'issueDate', 'dueDate', 'total'])
    .withMessage('Invalid sort field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for sending invoice email
 */
const sendInvoiceValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid invoice ID'),
  
  body('to')
    .trim()
    .notEmpty()
    .withMessage('Recipient email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('cc')
    .optional()
    .isArray()
    .withMessage('CC must be an array'),
  
  body('cc.*')
    .optional()
    .isEmail()
    .withMessage('Each CC email must be valid')
    .normalizeEmail(),
  
  body('subject')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Subject must not exceed 200 characters'),
  
  body('message')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Message must not exceed 2000 characters')
];

/**
 * Validation rules for recording payment for invoice
 */
const recordPaymentValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid invoice ID'),
  
  body('amount')
    .notEmpty()
    .withMessage('Payment amount is required')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be greater than 0'),
  
  body('paymentDate')
    .notEmpty()
    .withMessage('Payment date is required')
    .isISO8601()
    .withMessage('Invalid payment date format'),
  
  body('paymentMethod')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['card', 'bank_transfer', 'upi', 'wallet', 'cash', 'cod'])
    .withMessage('Invalid payment method'),
  
  body('transactionId')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Transaction ID must not exceed 200 characters'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

module.exports = {
  // Original names
  initiatePaymentValidation,
  verifyPaymentValidation,
  refundPaymentValidation,
  getPaymentValidation,
  listPaymentsValidation,
  createInvoiceValidation,
  updateInvoiceValidation,
  getInvoiceValidation,
  deleteInvoiceValidation,
  listInvoicesValidation,
  sendInvoiceValidation,
  recordPaymentValidation,
  
  // Aliased names for routes
  refundValidation: refundPaymentValidation,
  processPayment: initiatePaymentValidation,
  verifyPayment: verifyPaymentValidation
};
