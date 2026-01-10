/**
 * Controllers Index
 * Central export file for all controllers
 */

const authController = require('./auth.controller');
const userController = require('./user.controller');
const companyController = require('./company.controller');
const shipmentController = require('./shipment.controller');
const vehicleController = require('./vehicle.controller');
const driverController = require('./driver.controller');
const routeController = require('./route.controller');
const trackingController = require('./tracking.controller');
const paymentController = require('./payment.controller');
const invoiceController = require('./invoice.controller');
const notificationController = require('./notification.controller');
const analyticsController = require('./analytics.controller');
const documentController = require('./document.controller');
const pricingController = require('./pricing.controller');
const adminController = require('./admin.controller');
const webhookController = require('./webhook.controller');

module.exports = {
  authController,
  userController,
  companyController,
  shipmentController,
  vehicleController,
  driverController,
  routeController,
  trackingController,
  paymentController,
  invoiceController,
  notificationController,
  analyticsController,
  documentController,
  pricingController,
  adminController,
  webhookController
};
