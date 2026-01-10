/**
 * File Upload Utility Functions
 */

const path = require('path');
const crypto = require('crypto');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/jpg',
  'image/png'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Validate file type
 */
function isValidFileType(mimetype, allowedTypes) {
  return allowedTypes.includes(mimetype);
}

/**
 * Validate image file
 */
function isValidImage(file) {
  return isValidFileType(file.mimetype, ALLOWED_IMAGE_TYPES);
}

/**
 * Validate document file
 */
function isValidDocument(file) {
  return isValidFileType(file.mimetype, ALLOWED_DOCUMENT_TYPES);
}

/**
 * Validate file size
 */
function isValidFileSize(size, maxSize = MAX_FILE_SIZE) {
  return size <= maxSize;
}

/**
 * Generate unique filename
 */
function generateUniqueFilename(originalname) {
  const ext = path.extname(originalname);
  const hash = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${hash}${ext}`;
}

/**
 * Get file extension
 */
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get content type from extension
 */
function getContentType(filename) {
  const ext = getFileExtension(filename);
  const contentTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

/**
 * Sanitize filename
 */
function sanitizeFilename(filename) {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255);
}

module.exports = {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE,
  isValidFileType,
  isValidImage,
  isValidDocument,
  isValidFileSize,
  generateUniqueFilename,
  getFileExtension,
  formatFileSize,
  getContentType,
  sanitizeFilename
};
