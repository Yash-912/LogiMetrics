/**
 * Analytics Service
 * KPI calculations, report generation, and data aggregation
 */

const { Op, Sequelize } = require('sequelize');
const { Shipment, Vehicle, Driver, Invoice, Transaction, Route, Company } = require('../models/postgres');
const { VehicleTelemetry } = require('../models/mongodb');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger.util');

/**
 * Get dashboard statistics
 */
async function getDashboardStats(companyId, dateRange = {}) {
    const cacheKey = `analytics:dashboard:${companyId}:${dateRange.startDate || 'all'}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const where = companyId ? { companyId } : {};
    if (dateRange.startDate && dateRange.endDate) {
        where.createdAt = { [Op.between]: [new Date(dateRange.startDate), new Date(dateRange.endDate)] };
    }

    const [totalShipments, activeShipments, deliveredShipments, totalRevenue, totalVehicles, activeVehicles, totalDrivers, activeDrivers] = await Promise.all([
        Shipment.count({ where }),
        Shipment.count({ where: { ...where, status: { [Op.in]: ['pending', 'in_transit', 'out_for_delivery'] } } }),
        Shipment.count({ where: { ...where, status: 'delivered' } }),
        Transaction.sum('amount', { where: { ...where, type: 'payment', status: 'completed' } }),
        Vehicle.count({ where: companyId ? { companyId } : {} }),
        Vehicle.count({ where: { ...(companyId ? { companyId } : {}), status: 'active' } }),
        Driver.count({ where: companyId ? { companyId } : {} }),
        Driver.count({ where: { ...(companyId ? { companyId } : {}), status: 'active' } })
    ]);

    const stats = {
        shipments: { total: totalShipments, active: activeShipments, delivered: deliveredShipments, deliveryRate: totalShipments ? ((deliveredShipments / totalShipments) * 100).toFixed(1) : 0 },
        revenue: { total: totalRevenue || 0 },
        fleet: { totalVehicles, activeVehicles, utilizationRate: totalVehicles ? ((activeVehicles / totalVehicles) * 100).toFixed(1) : 0 },
        drivers: { totalDrivers, activeDrivers, utilizationRate: totalDrivers ? ((activeDrivers / totalDrivers) * 100).toFixed(1) : 0 }
    };

    await setCache(cacheKey, stats, 300);
    return stats;
}

/**
 * Get shipment analytics
 */
async function getShipmentAnalytics(companyId, startDate, endDate) {
    const where = { companyId };
    if (startDate && endDate) where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };

    const [byStatus, byDay, deliveryTimes, onTimeDeliveries, totalDelivered] = await Promise.all([
        Shipment.findAll({ where, attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']], group: ['status'], raw: true }),
        Shipment.findAll({ where, attributes: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'], [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']], group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))], order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']], raw: true }),
        Shipment.findAll({ where: { ...where, status: 'delivered', deliveredAt: { [Op.ne]: null } }, attributes: [[Sequelize.fn('AVG', Sequelize.literal('EXTRACT(EPOCH FROM ("deliveredAt" - "createdAt")) / 3600')), 'avgHours']], raw: true }),
        Shipment.count({ where: { ...where, status: 'delivered', deliveredAt: { [Op.lte]: Sequelize.col('estimatedDelivery') } } }),
        Shipment.count({ where: { ...where, status: 'delivered' } })
    ]);

    return { byStatus, byDay, avgDeliveryTime: deliveryTimes[0]?.avgHours ? parseFloat(deliveryTimes[0].avgHours).toFixed(1) : 0, onTimeDeliveryRate: totalDelivered ? ((onTimeDeliveries / totalDelivered) * 100).toFixed(1) : 0 };
}

/**
 * Get revenue analytics
 */
async function getRevenueAnalytics(companyId, startDate, endDate) {
    const where = { companyId, type: 'payment', status: 'completed' };
    if (startDate && endDate) where.createdAt = { [Op.between]: [new Date(startDate), new Date(endDate)] };

    const [byDay, byMonth, totalRevenue, totalRefunds, avgTransaction] = await Promise.all([
        Transaction.findAll({ where, attributes: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'date'], [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'], [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']], group: [Sequelize.fn('DATE', Sequelize.col('createdAt'))], order: [[Sequelize.fn('DATE', Sequelize.col('createdAt')), 'ASC']], raw: true }),
        Transaction.findAll({ where, attributes: [[Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'month'], [Sequelize.fn('SUM', Sequelize.col('amount')), 'total'], [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']], group: [Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt'))], order: [[Sequelize.fn('DATE_TRUNC', 'month', Sequelize.col('createdAt')), 'ASC']], raw: true }),
        Transaction.sum('amount', { where }),
        Transaction.sum('amount', { where: { ...where, type: 'refund', status: 'completed' } }),
        Transaction.findOne({ where, attributes: [[Sequelize.fn('AVG', Sequelize.col('amount')), 'avg']], raw: true })
    ]);

    return { byDay, byMonth, totalRevenue: totalRevenue || 0, totalRefunds: Math.abs(totalRefunds || 0), netRevenue: (totalRevenue || 0) - Math.abs(totalRefunds || 0), avgTransactionValue: avgTransaction?.avg ? parseFloat(avgTransaction.avg).toFixed(2) : 0 };
}

/**
 * Get fleet analytics
 */
async function getFleetAnalytics(companyId) {
    const vehicleWhere = companyId ? { companyId } : {};
    const [byStatus, byType, maintenanceDue] = await Promise.all([
        Vehicle.findAll({ where: vehicleWhere, attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']], group: ['status'], raw: true }),
        Vehicle.findAll({ where: vehicleWhere, attributes: ['type', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']], group: ['type'], raw: true }),
        Vehicle.count({ where: { ...vehicleWhere, nextMaintenanceDate: { [Op.between]: [new Date(), new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)] } } })
    ]);
    return { byStatus, byType, maintenanceDue };
}

/**
 * Get driver analytics
 */
async function getDriverAnalytics(companyId) {
    const where = companyId ? { companyId } : {};
    const [byStatus, licenseExpiring] = await Promise.all([
        Driver.findAll({ where, attributes: ['status', [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']], group: ['status'], raw: true }),
        Driver.count({ where: { ...where, licenseExpiry: { [Op.between]: [new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] } } })
    ]);
    return { byStatus, licenseExpiring };
}

/**
 * Calculate KPIs
 */
async function calculateKPIs(companyId, period = 'month') {
    const now = new Date();
    const periodDays = { day: 1, week: 7, month: 30, quarter: 90, year: 365 };
    const startDate = new Date(now.getTime() - (periodDays[period] || 30) * 24 * 60 * 60 * 1000);

    const where = { companyId, createdAt: { [Op.gte]: startDate } };
    const [totalDeliveries, onTimeDeliveries, totalRevenue] = await Promise.all([
        Shipment.count({ where: { ...where, status: 'delivered' } }),
        Shipment.count({ where: { ...where, status: 'delivered', deliveredAt: { [Op.lte]: Sequelize.col('estimatedDelivery') } } }),
        Transaction.sum('amount', { where: { ...where, type: 'payment', status: 'completed' } })
    ]);

    return {
        period,
        kpis: {
            deliveryRate: { value: totalDeliveries ? ((onTimeDeliveries / totalDeliveries) * 100).toFixed(1) : 0, unit: '%', label: 'On-Time Delivery Rate' },
            revenue: { value: totalRevenue || 0, unit: 'USD', label: 'Total Revenue' },
            totalDeliveries: { value: totalDeliveries, unit: '', label: 'Total Deliveries' }
        }
    };
}

/**
 * Generate report
 */
async function generateReport(type, companyId, options = {}) {
    const { startDate, endDate } = options;
    const reportMap = {
        shipments: () => getShipmentAnalytics(companyId, startDate, endDate),
        revenue: () => getRevenueAnalytics(companyId, startDate, endDate),
        fleet: () => getFleetAnalytics(companyId),
        drivers: () => getDriverAnalytics(companyId),
        kpis: () => calculateKPIs(companyId, options.period),
        dashboard: () => getDashboardStats(companyId, { startDate, endDate })
    };

    if (!reportMap[type]) throw new Error(`Unknown report type: ${type}`);

    const data = await reportMap[type]();
    logger.info(`Report generated: ${type} for company ${companyId}`);
    return { type, generatedAt: new Date(), period: { startDate, endDate }, companyId, data };
}

module.exports = { getDashboardStats, getShipmentAnalytics, getRevenueAnalytics, getFleetAnalytics, getDriverAnalytics, calculateKPIs, generateReport };
