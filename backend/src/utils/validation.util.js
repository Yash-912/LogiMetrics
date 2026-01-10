/**
 * Validation Utility Functions
 */

const { v4: uuidv4, validate: uuidValidate } = require('uuid');

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number (Indian format)
 */
function isValidPhone(phone) {
  const phoneRegex = /^[6-9]\d{9}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
}

/**
 * Validate UUID
 */
function isValidUUID(id) {
  return uuidValidate(id);
}

/**
 * Generate UUID
 */
function generateUUID() {
  return uuidv4();
}

/**
 * Generate tracking ID
 */
function generateTrackingId() {
  const prefix = 'LM';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Generate invoice number
 */
function generateInvoiceNumber() {
  const prefix = 'INV';
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${year}${month}${random}`;
}

/**
 * Sanitize string input
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str.trim().replace(/<[^>]*>/g, '');
}

/**
 * Validate vehicle registration number (Indian format)
 */
function isValidVehicleNumber(number) {
  const regex = /^[A-Z]{2}[0-9]{2}[A-Z]{1,2}[0-9]{4}$/;
  return regex.test(number.replace(/\s/g, '').toUpperCase());
}

/**
 * Validate coordinates
 */
function isValidCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Parse boolean from string
 */
function parseBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true' || value === '1';
  }
  return Boolean(value);
}

/**
 * Parse integer with default
 */
function parseIntWithDefault(value, defaultValue = 0) {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidUUID,
  generateUUID,
  generateTrackingId,
  generateInvoiceNumber,
  sanitizeString,
  isValidVehicleNumber,
  isValidCoordinates,
  parseBoolean,
  parseIntWithDefault
};
