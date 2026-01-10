const express = require("express");
const router = express.Router();
const documentController = require("../controllers/document.controller");
const { document: documentValidator } = require("../validators");
const { authenticate } = require("../middleware/auth.middleware");
const { authorize } = require("../middleware/rbac.middleware");
const { validate } = require("../middleware/validation.middleware");
const { uploadSingle } = require("../middleware/upload.middleware");
const { apiLimiter } = require("../middleware/rateLimit.middleware");
const { param } = require("express-validator");

// Public route for shared document access (must be before authenticate middleware)
router.get(
  "/shared/:token",
  validate([param("token").trim().notEmpty().withMessage("Token is required")]),
  documentController.accessSharedDocument
);

// Apply authentication to all other routes
router.use(authenticate);

/**
 * @route   GET /api/documents
 * @desc    Get all documents with filters
 * @access  Private
 */
router.get(
  "/",
  validate(documentValidator.listDocumentsValidation),
  documentController.getDocuments
);

/**
 * @route   GET /api/documents/entity/:entityType/:entityId
 * @desc    Get documents for an entity
 * @access  Private
 */
router.get(
  "/entity/:entityType/:entityId",
  validate([
    param("entityType")
      .isIn(["shipment", "vehicle", "driver", "company", "invoice"])
      .withMessage("Invalid entity type"),
    param("entityId").isUUID().withMessage("Invalid entity ID"),
  ]),
  documentController.getEntityDocuments
);

/**
 * @route   GET /api/documents/:id
 * @desc    Get document by ID
 * @access  Private
 */
router.get(
  "/:id",
  validate(documentValidator.getDocumentValidation),
  documentController.getDocumentById
);

/**
 * @route   POST /api/documents
 * @desc    Upload a new document
 * @access  Private
 */
router.post(
  "/",
  uploadSingle("file"),
  documentValidator.uploadDocumentValidation,
  validate,
  documentController.uploadDocument
);

/**
 * @route   PUT /api/documents/:id
 * @desc    Update document metadata
 * @access  Private
 */
router.put(
  "/:id",
  validate(documentValidator.updateDocumentValidation),
  documentController.updateDocument
);

/**
 * @route   DELETE /api/documents/:id
 * @desc    Delete document
 * @access  Private
 */
router.delete(
  "/:id",
  validate(documentValidator.deleteDocumentValidation),
  documentController.deleteDocument
);

/**
 * @route   POST /api/documents/:id/restore
 * @desc    Restore deleted document
 * @access  Private
 */
router.post(
  "/:id/restore",
  validate(documentValidator.getDocumentValidation),
  documentController.restoreDocument
);

/**
 * @route   GET /api/documents/:id/download
 * @desc    Download document
 * @access  Private
 */
router.get(
  "/:id/download",
  validate(documentValidator.downloadDocumentValidation),
  documentController.downloadDocument
);

/**
 * @route   POST /api/documents/:id/versions
 * @desc    Upload new version of document
 * @access  Private
 */
router.post(
  "/:id/versions",
  uploadSingle("file"),
  documentValidator.uploadVersionValidation,
  validate,
  documentController.uploadVersion
);

/**
 * @route   GET /api/documents/:id/versions
 * @desc    Get document version history
 * @access  Private
 */
router.get(
  "/:id/versions",
  validate(documentValidator.getVersionsValidation),
  documentController.getVersionHistory
);

/**
 * @route   POST /api/documents/:id/share
 * @desc    Share document (generate shareable link)
 * @access  Private
 */
router.post(
  "/:id/share",
  validate(documentValidator.shareDocumentValidation),
  documentController.shareDocument
);

/**
 * @route   POST /api/documents/bulk-delete
 * @desc    Bulk delete documents
 * @access  Private (Admin, Manager)
 */
router.post(
  "/bulk-delete",
  authorize(["admin", "manager"]),
  validate(documentValidator.bulkOperationValidation),
  documentController.bulkDeleteDocuments
);

module.exports = router;
