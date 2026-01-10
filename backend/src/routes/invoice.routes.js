const express = require("express");
const router = express.Router();
const invoiceController = require("../controllers/invoice.controller");
const { payment: paymentValidator } = require("../validators");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validation.middleware");
const { apiLimiter } = require("../middleware/rateLimit.middleware");
const { body, param } = require("express-validator");

// Apply authentication to all routes
router.use(authenticate);

/**
 * @route   GET /api/invoices
 * @desc    Get all invoices with pagination and filters
 * @access  Private
 */
router.get(
  "/",
  validate(paymentValidator.listInvoicesValidation),
  invoiceController.getInvoices
);

/**
 * @route   GET /api/invoices/:id
 * @desc    Get invoice by ID
 * @access  Private
 */
router.get(
  "/:id",
  validate(paymentValidator.getInvoiceValidation),
  invoiceController.getInvoiceById
);

/**
 * @route   GET /api/invoices/number/:invoiceNumber
 * @desc    Get invoice by number
 * @access  Private
 */
router.get(
  "/number/:invoiceNumber",
  validate([
    param("invoiceNumber")
      .trim()
      .notEmpty()
      .withMessage("Invoice number is required"),
  ]),
  invoiceController.getInvoiceByNumber
);

/**
 * @route   POST /api/invoices
 * @desc    Create a new invoice
 * @access  Private (Admin, Manager)
 */
router.post(
  "/",
  authorize(["admin", "manager"]),
  validate(paymentValidator.createInvoiceValidation),
  invoiceController.createInvoice
);

/**
 * @route   PUT /api/invoices/:id
 * @desc    Update invoice
 * @access  Private (Admin, Manager)
 */
router.put(
  "/:id",
  authorize(["admin", "manager"]),
  validate(paymentValidator.updateInvoiceValidation),
  invoiceController.updateInvoice
);

/**
 * @route   DELETE /api/invoices/:id
 * @desc    Delete invoice
 * @access  Private (Admin)
 */
router.delete(
  "/:id",
  authorize(["admin"]),
  validate(paymentValidator.deleteInvoiceValidation),
  invoiceController.deleteInvoice
);

/**
 * @route   PATCH /api/invoices/:id/status
 * @desc    Update invoice status
 * @access  Private (Admin, Manager)
 */
router.patch(
  "/:id/status",
  authorize(["admin", "manager"]),
  validate([
    param("id").isUUID().withMessage("Invalid invoice ID"),
    body("status")
      .isIn(["draft", "sent", "paid", "overdue", "cancelled", "void"])
      .withMessage("Invalid status"),
  ]),
  invoiceController.updateInvoiceStatus
);

/**
 * @route   POST /api/invoices/:id/send
 * @desc    Send invoice to customer
 * @access  Private (Admin, Manager)
 */
router.post(
  "/:id/send",
  authorize(["admin", "manager"]),
  validate(paymentValidator.sendInvoiceValidation),
  invoiceController.sendInvoice
);

/**
 * @route   GET /api/invoices/:id/pdf
 * @desc    Download invoice PDF
 * @access  Private
 */
router.get(
  "/:id/pdf",
  validate(paymentValidator.getInvoiceValidation),
  invoiceController.downloadInvoicePDF
);

/**
 * @route   GET /api/invoices/:id/preview
 * @desc    Preview invoice PDF
 * @access  Private
 */
router.get(
  "/:id/preview",
  validate(paymentValidator.getInvoiceValidation),
  invoiceController.previewInvoicePDF
);

/**
 * @route   POST /api/invoices/:id/view
 * @desc    Mark invoice as viewed
 * @access  Private
 */
router.post(
  "/:id/view",
  paymentValidator.getInvoiceValidation,
  validate,
  invoiceController.markAsViewed
);

/**
 * @route   POST /api/invoices/:id/items
 * @desc    Add line item to invoice
 * @access  Private (Admin, Manager)
 */
router.post(
  "/:id/items",
  authorize(["admin", "manager"]),
  [
    param("id").isUUID().withMessage("Invalid invoice ID"),
    body("description")
      .trim()
      .notEmpty()
      .withMessage("Description is required"),
    body("quantity")
      .isInt({ min: 1 })
      .withMessage("Quantity must be at least 1"),
    body("unitPrice")
      .isFloat({ min: 0 })
      .withMessage("Unit price must be positive"),
    body("taxRate")
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage("Tax rate must be between 0 and 100"),
  ],
  validate,
  invoiceController.addLineItem
);

/**
 * @route   DELETE /api/invoices/:id/items/:itemId
 * @desc    Remove line item from invoice
 * @access  Private (Admin, Manager)
 */
router.delete(
  "/:id/items/:itemId",
  authorize(["admin", "manager"]),
  [
    param("id").isUUID().withMessage("Invalid invoice ID"),
    param("itemId").isUUID().withMessage("Invalid item ID"),
  ],
  validate,
  invoiceController.removeLineItem
);

/**
 * @route   POST /api/invoices/:id/duplicate
 * @desc    Duplicate invoice
 * @access  Private (Admin, Manager)
 */
router.post(
  "/:id/duplicate",
  authorize(["admin", "manager"]),
  paymentValidator.getInvoiceValidation,
  validate,
  invoiceController.duplicateInvoice
);

/**
 * @route   POST /api/invoices/generate
 * @desc    Generate invoice from shipments
 * @access  Private (Admin, Manager)
 */
router.post(
  "/generate",
  authorize(["admin", "manager"]),
  [
    body("shipmentIds")
      .isArray({ min: 1 })
      .withMessage("Shipment IDs must be a non-empty array"),
    body("shipmentIds.*")
      .isUUID()
      .withMessage("Each shipment ID must be a valid UUID"),
    body("customerId").isUUID().withMessage("Invalid customer ID"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Invalid due date format"),
  ],
  validate,
  invoiceController.generateFromShipments
);

module.exports = router;
