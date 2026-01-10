/**
 * File Upload Middleware
 * Multer configuration for file uploads
 */

const multer = require('multer');
const path = require('path');
const { generateUniqueFilename, ALLOWED_IMAGE_TYPES, ALLOWED_DOCUMENT_TYPES, MAX_FILE_SIZE } = require('../utils/fileUpload.util');

// Memory storage for S3 uploads
const memoryStorage = multer.memoryStorage();

// Disk storage for local uploads
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    cb(null, generateUniqueFilename(file.originalname));
  }
});

// File filter for images
const imageFilter = (req, file, cb) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'), false);
  }
};

// File filter for documents
const documentFilter = (req, file, cb) => {
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and image files are allowed'), false);
  }
};

// File filter for all allowed types
const allFilesFilter = (req, file, cb) => {
  const allAllowed = [...new Set([...ALLOWED_IMAGE_TYPES, ...ALLOWED_DOCUMENT_TYPES])];
  if (allAllowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

// Upload configurations
const uploadImage = multer({
  storage: memoryStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB for images
  }
});

const uploadDocument = multer({
  storage: memoryStorage,
  fileFilter: documentFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

const uploadAny = multer({
  storage: memoryStorage,
  fileFilter: allFilesFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Local disk storage upload
const uploadLocal = multer({
  storage: diskStorage,
  fileFilter: allFilesFilter,
  limits: {
    fileSize: MAX_FILE_SIZE
  }
});

// Upload middleware handlers
const singleImage = uploadImage.single('image');
const singleDocument = uploadDocument.single('document');
const multipleImages = uploadImage.array('images', 10);
const multipleDocuments = uploadDocument.array('documents', 10);
const singleFile = uploadAny.single('file');
const multipleFiles = uploadAny.array('files', 10);

// POD (Proof of Delivery) upload - signature and photo
const podUpload = uploadImage.fields([
  { name: 'signature', maxCount: 1 },
  { name: 'photo', maxCount: 3 }
]);

// Error handler for multer
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field name for file upload'
      });
    }
    return res.status(400).json({
      success: false,
      message: err.message
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed'
    });
  }

  next();
};

// Dynamic single file upload - takes field name as parameter
const uploadSingle = (fieldName) => uploadImage.single(fieldName);
const uploadDocumentSingle = (fieldName) => uploadDocument.single(fieldName);

// Dynamic multiple file upload - takes field name and max count as parameters
const uploadMultiple = (fieldName, maxCount = 10) => uploadImage.array(fieldName, maxCount);
const uploadDocumentMultiple = (fieldName, maxCount = 10) => uploadDocument.array(fieldName, maxCount);

module.exports = {
  uploadImage,
  uploadDocument,
  uploadAny,
  uploadLocal,
  singleImage,
  singleDocument,
  multipleImages,
  multipleDocuments,
  singleFile,
  multipleFiles,
  podUpload,
  handleUploadError,
  // Dynamic upload functions for flexibility
  uploadSingle,
  uploadDocumentSingle,
  uploadMultiple,
  uploadDocumentMultiple
};
