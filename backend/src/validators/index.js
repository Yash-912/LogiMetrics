/**
 * Central export file for all validators
 * @module validators
 */

const authValidator = require('./auth.validator');
const userValidator = require('./user.validator');
const companyValidator = require('./company.validator');
const shipmentValidator = require('./shipment.validator');
const vehicleValidator = require('./vehicle.validator');
const driverValidator = require('./driver.validator');
const routeValidator = require('./route.validator');
const paymentValidator = require('./payment.validator');
const documentValidator = require('./document.validator');
const notificationValidator = require('./notification.validator');
const analyticsValidator = require('./analytics.validator');

module.exports = {
  // Named exports for direct access
  authValidator,
  userValidator,
  companyValidator,
  shipmentValidator,
  vehicleValidator,
  driverValidator,
  routeValidator,
  paymentValidator,
  documentValidator,
  notificationValidator,
  analyticsValidator,

  // Aliased exports for route files
  auth: authValidator,
  user: userValidator,
  company: companyValidator,
  shipment: shipmentValidator,
  vehicle: vehicleValidator,
  driver: driverValidator,
  route: routeValidator,
  payment: paymentValidator,
  document: documentValidator,
  notification: notificationValidator,
  analytics: analyticsValidator
};
