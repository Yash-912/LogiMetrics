/**
 * Routes Index
 * Central router combining all route modules
 */

const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const companyRoutes = require('./company.routes');
const shipmentRoutes = require('./shipment.routes');
const vehicleRoutes = require('./vehicle.routes');
const driverRoutes = require('./driver.routes');
const routeRoutes = require('./route.routes');
const trackingRoutes = require('./tracking.routes');
const paymentRoutes = require('./payment.routes');
const invoiceRoutes = require('./invoice.routes');
const notificationRoutes = require('./notification.routes');
const analyticsRoutes = require('./analytics.routes');
const documentRoutes = require('./document.routes');
const pricingRoutes = require('./pricing.routes');
const adminRoutes = require('./admin.routes');
const webhookRoutes = require('./webhook.routes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/shipments', shipmentRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/routes', routeRoutes);
router.use('/tracking', trackingRoutes);
router.use('/payments', paymentRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/documents', documentRoutes);
router.use('/pricing', pricingRoutes);
router.use('/admin', adminRoutes);
router.use('/webhooks', webhookRoutes);

// API health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0'
    });
});

// API info
router.get('/', (req, res) => {
    res.json({
        name: 'LogiMetrics API',
        version: process.env.API_VERSION || '1.0.0',
        description: 'Next-Gen Logistics Platform API',
        documentation: '/api/docs',
        endpoints: {
            auth: '/api/auth',
            users: '/api/users',
            companies: '/api/companies',
            shipments: '/api/shipments',
            vehicles: '/api/vehicles',
            drivers: '/api/drivers',
            routes: '/api/routes',
            tracking: '/api/tracking',
            payments: '/api/payments',
            invoices: '/api/invoices',
            notifications: '/api/notifications',
            analytics: '/api/analytics',
            documents: '/api/documents',
            pricing: '/api/pricing',
            admin: '/api/admin',
            webhooks: '/api/webhooks'
        }
    });
});

module.exports = router;
