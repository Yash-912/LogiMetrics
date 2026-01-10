/**
 * Services Index
 * Central export file for all backend services
 */

const authService = require('./auth.service');
const userService = require('./user.service');
const companyService = require('./company.service');
const shipmentService = require('./shipment.service');
const vehicleService = require('./vehicle.service');
const driverService = require('./driver.service');
const routeService = require('./route.service');
const trackingService = require('./tracking.service');
const paymentService = require('./payment.service');
const invoiceService = require('./invoice.service');
const notificationService = require('./notification.service');
const analyticsService = require('./analytics.service');
const pricingService = require('./pricing.service');
const emailService = require('./email.service');
const smsService = require('./sms.service');
const mapsService = require('./maps.service');
const mlService = require('./ml.service');
const cacheService = require('./cache.service');
const queueService = require('./queue.service');

module.exports = {
    // Core Services
    authService,
    userService,
    companyService,

    // Operations Services
    shipmentService,
    vehicleService,
    driverService,
    routeService,
    trackingService,

    // Financial Services
    paymentService,
    invoiceService,
    pricingService,

    // Communication Services
    notificationService,
    emailService,
    smsService,

    // Analytics & ML Services
    analyticsService,
    mlService,

    // Utility Services
    mapsService,
    cacheService,
    queueService
};
