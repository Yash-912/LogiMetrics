const { validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Document, User, Company, Shipment, Vehicle, Driver } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { success, error } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const { uploadToS3, deleteFromS3, getSignedUrl, getFileMetadata } = require('../utils/fileUpload.util');
const logger = require('../utils/logger.util');
const path = require('path');
const crypto = require('crypto');

/**
 * Get all documents with filters
 * @route GET /api/documents
 */
const getDocuments = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      category,
      entityType,
      entityId,
      status,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};

    // Company filter
    if (req.user.role !== 'admin' && req.user.companyId) {
      where.companyId = req.user.companyId;
    }

    if (type) where.type = type;
    if (category) where.category = category;
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (status) where.status = status;

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (page - 1) * limit;

    const { rows: documents, count } = await Document.findAndCountAll({
      where,
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'lastModifiedBy', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset
    });

    return success(res, 'Documents retrieved', 200, {
      documents,
      pagination: {
        total: count,
        pages: Math.ceil(count / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get document by ID
 * @route GET /api/documents/:id
 */
const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: User, as: 'lastModifiedBy', attributes: ['id', 'firstName', 'lastName'] }
      ]
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Authorization check
    if (req.user.role !== 'admin' && document.companyId !== req.user.companyId) {
      throw new AppError('Not authorized to access this document', 403);
    }

    // Increment view count
    await document.increment('viewCount');

    // Generate signed URL for access
    const signedUrl = await getSignedUrl(document.s3Key, 3600); // 1 hour expiry

    return success(res, 'Document retrieved', 200, {
      document: {
        ...document.toJSON(),
        downloadUrl: signedUrl
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload a new document
 * @route POST /api/documents
 */
const uploadDocument = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const {
      name,
      description,
      type,
      category,
      entityType,
      entityId,
      tags,
      expiryDate,
      isPublic
    } = req.body;

    // Validate entity exists if provided
    if (entityType && entityId) {
      await validateEntity(entityType, entityId, req.user);
    }

    // Generate unique filename
    const ext = path.extname(req.file.originalname);
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const s3Key = `documents/${req.user.companyId || 'system'}/${entityType || 'general'}/${uniqueFilename}`;

    // Upload to S3
    const uploadResult = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    // Get file metadata
    const metadata = await getFileMetadata(req.file);

    // Create document record
    const document = await Document.create({
      name: name || req.file.originalname,
      description,
      type: type || detectDocumentType(req.file.mimetype),
      category,
      entityType,
      entityId,
      companyId: req.user.companyId,
      uploadedById: req.user.id,
      originalName: req.file.originalname,
      fileName: uniqueFilename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      s3Key,
      s3Bucket: uploadResult.bucket,
      url: uploadResult.location,
      tags: tags ? JSON.parse(tags) : [],
      expiryDate,
      isPublic: isPublic === 'true',
      status: 'active',
      metadata,
      version: 1
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DOCUMENT_UPLOADED',
      resource: 'Document',
      resourceId: document.id,
      details: { name: document.name, type, size: req.file.size },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    logger.info('Document uploaded', { documentId: document.id, userId: req.user.id });

    return success(res, 'Document uploaded successfully', 201, { document });
  } catch (err) {
    next(err);
  }
};

/**
 * Update document metadata
 * @route PUT /api/documents/:id
 */
const updateDocument = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const {
      name,
      description,
      category,
      tags,
      expiryDate,
      isPublic,
      status
    } = req.body;

    const document = await Document.findByPk(id);
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Authorization check
    if (req.user.role !== 'admin' && document.companyId !== req.user.companyId) {
      throw new AppError('Not authorized to update this document', 403);
    }

    await document.update({
      name,
      description,
      category,
      tags,
      expiryDate,
      isPublic,
      status,
      lastModifiedById: req.user.id
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DOCUMENT_UPDATED',
      resource: 'Document',
      resourceId: document.id,
      changes: req.body,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Document updated successfully', 200, { document });
  } catch (err) {
    next(err);
  }
};

/**
 * Upload new version of document
 * @route POST /api/documents/:id/versions
 */
const uploadVersion = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new AppError('No file uploaded', 400);
    }

    const { id } = req.params;
    const { changeNotes } = req.body;

    const document = await Document.findByPk(id);
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Authorization check
    if (req.user.role !== 'admin' && document.companyId !== req.user.companyId) {
      throw new AppError('Not authorized to update this document', 403);
    }

    // Archive current version
    const versionHistory = document.versionHistory || [];
    versionHistory.push({
      version: document.version,
      s3Key: document.s3Key,
      size: document.size,
      uploadedById: document.lastModifiedById || document.uploadedById,
      uploadedAt: document.updatedAt,
      changeNotes: document.changeNotes
    });

    // Upload new version
    const ext = path.extname(req.file.originalname);
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    const s3Key = `documents/${document.companyId || 'system'}/${document.entityType || 'general'}/v${document.version + 1}-${uniqueFilename}`;

    const uploadResult = await uploadToS3(req.file.buffer, s3Key, req.file.mimetype);

    await document.update({
      originalName: req.file.originalname,
      fileName: uniqueFilename,
      mimeType: req.file.mimetype,
      size: req.file.size,
      s3Key,
      url: uploadResult.location,
      version: document.version + 1,
      versionHistory,
      changeNotes,
      lastModifiedById: req.user.id
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DOCUMENT_VERSION_UPLOADED',
      resource: 'Document',
      resourceId: document.id,
      details: { version: document.version, changeNotes },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'New version uploaded successfully', 200, { document });
  } catch (err) {
    next(err);
  }
};

/**
 * Get document version history
 * @route GET /api/documents/:id/versions
 */
const getVersionHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      attributes: ['id', 'name', 'version', 'versionHistory', 'companyId']
    });

    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Authorization check
    if (req.user.role !== 'admin' && document.companyId !== req.user.companyId) {
      throw new AppError('Not authorized to access this document', 403);
    }

    const versions = [
      {
        version: document.version,
        isCurrent: true
      },
      ...(document.versionHistory || []).map(v => ({
        ...v,
        isCurrent: false
      })).reverse()
    ];

    return success(res, 'Version history retrieved', 200, {
      documentId: document.id,
      documentName: document.name,
      versions
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Download document
 * @route GET /api/documents/:id/download
 */
const downloadDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { version } = req.query;

    const document = await Document.findByPk(id);
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Authorization check
    if (!document.isPublic && req.user.role !== 'admin' && document.companyId !== req.user.companyId) {
      throw new AppError('Not authorized to download this document', 403);
    }

    let s3Key = document.s3Key;
    
    // Get specific version if requested
    if (version && parseInt(version) !== document.version) {
      const versionData = document.versionHistory?.find(v => v.version === parseInt(version));
      if (!versionData) {
        throw new AppError('Version not found', 404);
      }
      s3Key = versionData.s3Key;
    }

    // Generate signed URL for download
    const signedUrl = await getSignedUrl(s3Key, 300, {
      ResponseContentDisposition: `attachment; filename="${document.originalName}"`
    });

    // Increment download count
    await document.increment('downloadCount');

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DOCUMENT_DOWNLOADED',
      resource: 'Document',
      resourceId: document.id,
      details: { version: version || document.version },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Download URL generated', 200, { 
      downloadUrl: signedUrl,
      fileName: document.originalName
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Share document (generate shareable link)
 * @route POST /api/documents/:id/share
 */
const shareDocument = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const { id } = req.params;
    const { 
      expiresIn = 7, // days
      password,
      maxDownloads,
      recipientEmails
    } = req.body;

    const document = await Document.findByPk(id);
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Authorization check
    if (req.user.role !== 'admin' && document.companyId !== req.user.companyId) {
      throw new AppError('Not authorized to share this document', 403);
    }

    // Generate share token
    const shareToken = crypto.randomBytes(32).toString('hex');
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + expiresIn);

    // Store share configuration
    const shareConfig = {
      token: shareToken,
      expiryDate,
      password: password ? await bcryptHash(password) : null,
      maxDownloads,
      downloadCount: 0,
      recipientEmails,
      createdBy: req.user.id,
      createdAt: new Date()
    };

    const shareLinks = document.shareLinks || [];
    shareLinks.push(shareConfig);

    await document.update({ shareLinks });

    // Generate shareable URL
    const shareUrl = `${process.env.APP_URL}/shared/${shareToken}`;

    // Optionally send email to recipients
    if (recipientEmails && recipientEmails.length > 0) {
      // Send share notification emails
      // await emailService.sendDocumentSharedEmail(recipientEmails, document, shareUrl, req.user);
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DOCUMENT_SHARED',
      resource: 'Document',
      resourceId: document.id,
      details: { expiresIn, recipientCount: recipientEmails?.length || 0 },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Share link generated', 200, {
      shareUrl,
      expiryDate,
      maxDownloads
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Access shared document
 * @route GET /api/documents/shared/:token
 */
const accessSharedDocument = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.query;

    // Find document with this share token
    const documents = await Document.findAll({
      where: {
        shareLinks: {
          [Op.contains]: [{ token }]
        }
      }
    });

    if (documents.length === 0) {
      throw new AppError('Shared link not found or expired', 404);
    }

    const document = documents[0];
    const shareConfig = document.shareLinks.find(s => s.token === token);

    // Check expiry
    if (new Date(shareConfig.expiryDate) < new Date()) {
      throw new AppError('Share link has expired', 410);
    }

    // Check max downloads
    if (shareConfig.maxDownloads && shareConfig.downloadCount >= shareConfig.maxDownloads) {
      throw new AppError('Maximum download limit reached', 403);
    }

    // Check password if required
    if (shareConfig.password) {
      if (!password) {
        return error(res, 'Password required', 401, { passwordRequired: true });
      }
      const isValid = await bcryptCompare(password, shareConfig.password);
      if (!isValid) {
        throw new AppError('Invalid password', 401);
      }
    }

    // Generate download URL
    const signedUrl = await getSignedUrl(document.s3Key, 300, {
      ResponseContentDisposition: `attachment; filename="${document.originalName}"`
    });

    // Update download count
    const updatedShareLinks = document.shareLinks.map(s => {
      if (s.token === token) {
        return { ...s, downloadCount: (s.downloadCount || 0) + 1 };
      }
      return s;
    });
    await document.update({ shareLinks: updatedShareLinks });

    return success(res, 'Document access granted', 200, {
      document: {
        name: document.name,
        fileName: document.originalName,
        size: document.size,
        mimeType: document.mimeType
      },
      downloadUrl: signedUrl
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete document
 * @route DELETE /api/documents/:id
 */
const deleteDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { permanent = false } = req.query;

    const document = await Document.findByPk(id);
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    // Authorization check
    if (req.user.role !== 'admin' && document.companyId !== req.user.companyId) {
      throw new AppError('Not authorized to delete this document', 403);
    }

    if (permanent === 'true') {
      // Delete from S3
      await deleteFromS3(document.s3Key);
      
      // Delete version history files
      if (document.versionHistory) {
        for (const version of document.versionHistory) {
          await deleteFromS3(version.s3Key);
        }
      }

      // Permanently delete record
      await document.destroy();

      logger.info('Document permanently deleted', { documentId: id, userId: req.user.id });
    } else {
      // Soft delete
      await document.update({ 
        status: 'deleted',
        deletedAt: new Date(),
        deletedBy: req.user.id
      });
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: permanent === 'true' ? 'DOCUMENT_PERMANENTLY_DELETED' : 'DOCUMENT_DELETED',
      resource: 'Document',
      resourceId: id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Document deleted successfully', 200);
  } catch (err) {
    next(err);
  }
};

/**
 * Restore deleted document
 * @route POST /api/documents/:id/restore
 */
const restoreDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id);
    if (!document) {
      throw new AppError('Document not found', 404);
    }

    if (document.status !== 'deleted') {
      throw new AppError('Document is not deleted', 400);
    }

    // Authorization check
    if (req.user.role !== 'admin' && document.companyId !== req.user.companyId) {
      throw new AppError('Not authorized to restore this document', 403);
    }

    await document.update({
      status: 'active',
      deletedAt: null,
      deletedBy: null
    });

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DOCUMENT_RESTORED',
      resource: 'Document',
      resourceId: document.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, 'Document restored successfully', 200, { document });
  } catch (err) {
    next(err);
  }
};

/**
 * Get documents for an entity
 * @route GET /api/documents/entity/:entityType/:entityId
 */
const getEntityDocuments = async (req, res, next) => {
  try {
    const { entityType, entityId } = req.params;
    const { category, type } = req.query;

    // Validate entity
    await validateEntity(entityType, entityId, req.user);

    const where = {
      entityType,
      entityId,
      status: 'active'
    };

    if (category) where.category = category;
    if (type) where.type = type;

    const documents = await Document.findAll({
      where,
      include: [
        { model: User, as: 'uploadedBy', attributes: ['id', 'firstName', 'lastName'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    return success(res, 'Entity documents retrieved', 200, { documents });
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk delete documents
 * @route POST /api/documents/bulk-delete
 */
const bulkDeleteDocuments = async (req, res, next) => {
  try {
    const { documentIds, permanent = false } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      throw new AppError('Document IDs required', 400);
    }

    const where = {
      id: { [Op.in]: documentIds }
    };

    // Non-admin can only delete their company's documents
    if (req.user.role !== 'admin') {
      where.companyId = req.user.companyId;
    }

    const documents = await Document.findAll({ where });

    if (permanent) {
      for (const doc of documents) {
        await deleteFromS3(doc.s3Key);
        if (doc.versionHistory) {
          for (const version of doc.versionHistory) {
            await deleteFromS3(version.s3Key);
          }
        }
      }
      await Document.destroy({ where: { id: { [Op.in]: documents.map(d => d.id) } } });
    } else {
      await Document.update(
        { status: 'deleted', deletedAt: new Date(), deletedBy: req.user.id },
        { where: { id: { [Op.in]: documents.map(d => d.id) } } }
      );
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'DOCUMENTS_BULK_DELETED',
      resource: 'Document',
      details: { count: documents.length, permanent },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    return success(res, `${documents.length} documents deleted successfully`, 200);
  } catch (err) {
    next(err);
  }
};

// Helper functions
const validateEntity = async (entityType, entityId, user) => {
  let entity;
  const companyCheck = user.role !== 'admin' ? { companyId: user.companyId } : {};

  switch (entityType) {
    case 'shipment':
      entity = await Shipment.findByPk(entityId, { where: companyCheck });
      break;
    case 'vehicle':
      entity = await Vehicle.findByPk(entityId, { where: companyCheck });
      break;
    case 'driver':
      entity = await Driver.findByPk(entityId, { where: companyCheck });
      break;
    case 'company':
      entity = await Company.findByPk(entityId);
      break;
    case 'user':
      entity = await User.findByPk(entityId);
      break;
    default:
      throw new AppError('Invalid entity type', 400);
  }

  if (!entity) {
    throw new AppError(`${entityType} not found`, 404);
  }

  return entity;
};

const detectDocumentType = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('document') || mimeType.includes('word')) return 'document';
  return 'other';
};

const bcryptHash = async (password) => {
  const bcrypt = require('bcrypt');
  return bcrypt.hash(password, 10);
};

const bcryptCompare = async (password, hash) => {
  const bcrypt = require('bcrypt');
  return bcrypt.compare(password, hash);
};

module.exports = {
  getDocuments,
  getDocumentById,
  uploadDocument,
  updateDocument,
  uploadVersion,
  getVersionHistory,
  downloadDocument,
  shareDocument,
  accessSharedDocument,
  deleteDocument,
  restoreDocument,
  getEntityDocuments,
  bulkDeleteDocuments
};
