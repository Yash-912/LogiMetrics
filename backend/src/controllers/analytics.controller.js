const { validationResult } = require('express-validator');
const { Op, Sequelize } = require('sequelize');
const { Shipment, Vehicle, Driver, Company, Invoice, Transaction, User, Route } = require('../models/postgres');
const { ShipmentEvent, VehicleTelemetry, AuditLog } = require('../models/mongodb');
const { success, error } = require('../utils/response.util');
const { AppError } = require('../middleware/error.middleware');
const { redisClient } = require('../config/redis');
const logger = require('../utils/logger.util');

/**
 * Get dashboard overview
 * @route GET /api/analytics/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    const where = {};
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Company filter
    const companyWhere = {};
    if (companyId) {
      companyWhere.companyId = companyId;
    } else if (req.user.role !== 'admin' && req.user.companyId) {
      companyWhere.companyId = req.user.companyId;
    }

    // Shipment stats
    const totalShipments = await Shipment.count({ 
      where: { ...where, ...companyWhere } 
    });

    const shipmentsByStatus = await Shipment.findAll({
      where: { ...where, ...companyWhere },
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Active shipments (in transit)
    const activeShipments = await Shipment.count({
      where: { 
        ...companyWhere,
        status: { [Op.in]: ['in_transit', 'out_for_delivery'] }
      }
    });

    // Vehicle stats
    const totalVehicles = await Vehicle.count({ where: companyWhere });
    const activeVehicles = await Vehicle.count({
      where: { ...companyWhere, status: 'in_use' }
    });

    // Driver stats
    const totalDrivers = await Driver.count({ where: companyWhere });
    const activeDrivers = await Driver.count({
      where: { ...companyWhere, status: 'on_duty' }
    });

    // Revenue stats
    const revenue = await Transaction.findOne({
      where: { 
        ...companyWhere,
        ...where,
        type: 'payment',
        status: 'completed'
      },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'total']
      ],
      raw: true
    });

    // Pending invoices
    const pendingInvoices = await Invoice.findOne({
      where: {
        ...companyWhere,
        status: { [Op.in]: ['sent', 'overdue'] }
      },
      attributes: [
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'total']
      ],
      raw: true
    });

    // Delivery performance
    const deliveredOnTime = await Shipment.count({
      where: {
        ...companyWhere,
        ...where,
        status: 'delivered',
        actualDeliveryDate: {
          [Op.lte]: Sequelize.col('estimatedDeliveryDate')
        }
      }
    });

    const totalDelivered = await Shipment.count({
      where: {
        ...companyWhere,
        ...where,
        status: 'delivered'
      }
    });

    const onTimeRate = totalDelivered > 0 
      ? Math.round((deliveredOnTime / totalDelivered) * 100) 
      : 0;

    return success(res, 'Dashboard data retrieved', 200, {
      overview: {
        shipments: {
          total: totalShipments,
          active: activeShipments,
          byStatus: shipmentsByStatus
        },
        vehicles: {
          total: totalVehicles,
          active: activeVehicles,
          utilization: totalVehicles > 0 
            ? Math.round((activeVehicles / totalVehicles) * 100) 
            : 0
        },
        drivers: {
          total: totalDrivers,
          active: activeDrivers
        },
        revenue: {
          total: revenue?.total || 0,
          pendingCount: pendingInvoices?.count || 0,
          pendingAmount: pendingInvoices?.total || 0
        },
        performance: {
          onTimeDeliveryRate: onTimeRate,
          totalDelivered
        }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get shipment analytics
 * @route GET /api/analytics/shipments
 */
const getShipmentAnalytics = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      groupBy = 'day',
      companyId 
    } = req.query;

    const companyWhere = {};
    if (companyId) {
      companyWhere.companyId = companyId;
    } else if (req.user.role !== 'admin' && req.user.companyId) {
      companyWhere.companyId = req.user.companyId;
    }

    let dateFormat;
    switch (groupBy) {
      case 'hour':
        dateFormat = 'YYYY-MM-DD HH24:00';
        break;
      case 'week':
        dateFormat = 'IYYY-IW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const where = { ...companyWhere };
    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Shipments over time
    const shipmentsOverTime = await Shipment.findAll({
      where,
      attributes: [
        [Sequelize.fn('TO_CHAR', Sequelize.col('createdAt'), dateFormat), 'period'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('TO_CHAR', Sequelize.col('createdAt'), dateFormat)],
      order: [[Sequelize.literal('period'), 'ASC']],
      raw: true
    });

    // By status
    const byStatus = await Shipment.findAll({
      where,
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // By priority
    const byPriority = await Shipment.findAll({
      where,
      attributes: [
        'priority',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['priority'],
      raw: true
    });

    // Average delivery time
    const avgDeliveryTime = await Shipment.findOne({
      where: {
        ...companyWhere,
        status: 'delivered',
        actualDeliveryDate: { [Op.ne]: null },
        actualPickupDate: { [Op.ne]: null }
      },
      attributes: [
        [
          Sequelize.fn('AVG', 
            Sequelize.literal('EXTRACT(EPOCH FROM ("actualDeliveryDate" - "actualPickupDate")) / 3600')
          ),
          'avgHours'
        ]
      ],
      raw: true
    });

    return success(res, 'Shipment analytics retrieved', 200, {
      analytics: {
        overTime: shipmentsOverTime,
        byStatus,
        byPriority,
        avgDeliveryTimeHours: Math.round(avgDeliveryTime?.avgHours || 0)
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get revenue analytics
 * @route GET /api/analytics/revenue
 */
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { 
      startDate, 
      endDate, 
      groupBy = 'day',
      companyId 
    } = req.query;

    const companyWhere = {};
    if (companyId) {
      companyWhere.companyId = companyId;
    } else if (req.user.role !== 'admin' && req.user.companyId) {
      companyWhere.companyId = req.user.companyId;
    }

    let dateFormat;
    switch (groupBy) {
      case 'week':
        dateFormat = 'IYYY-IW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    const where = { 
      ...companyWhere,
      status: 'completed'
    };

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Revenue over time
    const revenueOverTime = await Transaction.findAll({
      where: { ...where, type: 'payment' },
      attributes: [
        [Sequelize.fn('TO_CHAR', Sequelize.col('createdAt'), dateFormat), 'period'],
        [Sequelize.fn('SUM', Sequelize.col('amount')), 'revenue']
      ],
      group: [Sequelize.fn('TO_CHAR', Sequelize.col('createdAt'), dateFormat)],
      order: [[Sequelize.literal('period'), 'ASC']],
      raw: true
    });

    // Total revenue
    const totalRevenue = await Transaction.sum('amount', {
      where: { ...where, type: 'payment' }
    }) || 0;

    // Total refunds
    const totalRefunds = await Transaction.sum('amount', {
      where: { ...where, type: 'refund' }
    }) || 0;

    // Invoice stats
    const invoiceStats = await Invoice.findAll({
      where: companyWhere,
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count'],
        [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'total']
      ],
      group: ['status'],
      raw: true
    });

    // Average invoice value
    const avgInvoiceValue = await Invoice.findOne({
      where: companyWhere,
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('totalAmount')), 'avg']
      ],
      raw: true
    });

    return success(res, 'Revenue analytics retrieved', 200, {
      analytics: {
        overTime: revenueOverTime,
        summary: {
          totalRevenue,
          totalRefunds: Math.abs(totalRefunds),
          netRevenue: totalRevenue - Math.abs(totalRefunds),
          avgInvoiceValue: Math.round(avgInvoiceValue?.avg || 0)
        },
        invoicesByStatus: invoiceStats
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get fleet analytics
 * @route GET /api/analytics/fleet
 */
const getFleetAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    const companyWhere = {};
    if (companyId) {
      companyWhere.companyId = companyId;
    } else if (req.user.role !== 'admin' && req.user.companyId) {
      companyWhere.companyId = req.user.companyId;
    }

    // Vehicles by status
    const vehiclesByStatus = await Vehicle.findAll({
      where: companyWhere,
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Vehicles by type
    const vehiclesByType = await Vehicle.findAll({
      where: companyWhere,
      attributes: [
        'type',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['type'],
      raw: true
    });

    // Utilization rate (vehicles with shipments)
    const totalVehicles = await Vehicle.count({ where: companyWhere });
    const vehiclesWithShipments = await Shipment.count({
      where: { 
        ...companyWhere,
        vehicleId: { [Op.ne]: null },
        status: { [Op.in]: ['in_transit', 'out_for_delivery'] }
      },
      distinct: true,
      col: 'vehicleId'
    });

    // Maintenance stats
    const vehiclesInMaintenance = await Vehicle.count({
      where: { ...companyWhere, status: 'maintenance' }
    });

    // Fuel consumption (from telemetry)
    const vehicleIds = await Vehicle.findAll({
      where: companyWhere,
      attributes: ['id'],
      raw: true
    });

    const fuelData = await VehicleTelemetry.aggregate([
      { 
        $match: { 
          vehicleId: { $in: vehicleIds.map(v => v.id) },
          timestamp: startDate && endDate 
            ? { $gte: new Date(startDate), $lte: new Date(endDate) }
            : { $exists: true }
        }
      },
      {
        $group: {
          _id: null,
          avgFuelConsumption: { $avg: '$fuelConsumption' },
          totalDistance: { $sum: '$odometer' }
        }
      }
    ]);

    return success(res, 'Fleet analytics retrieved', 200, {
      analytics: {
        vehicles: {
          total: totalVehicles,
          byStatus: vehiclesByStatus,
          byType: vehiclesByType,
          inMaintenance: vehiclesInMaintenance,
          utilization: totalVehicles > 0 
            ? Math.round((vehiclesWithShipments / totalVehicles) * 100) 
            : 0
        },
        fuel: fuelData[0] || { avgFuelConsumption: 0, totalDistance: 0 }
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get driver performance analytics
 * @route GET /api/analytics/drivers
 */
const getDriverAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate, companyId, limit = 10 } = req.query;

    const companyWhere = {};
    if (companyId) {
      companyWhere.companyId = companyId;
    } else if (req.user.role !== 'admin' && req.user.companyId) {
      companyWhere.companyId = req.user.companyId;
    }

    const shipmentWhere = { ...companyWhere };
    if (startDate && endDate) {
      shipmentWhere.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Drivers by status
    const driversByStatus = await Driver.findAll({
      where: companyWhere,
      attributes: [
        'status',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Top performers by deliveries
    const topPerformers = await Shipment.findAll({
      where: {
        ...shipmentWhere,
        status: 'delivered',
        driverId: { [Op.ne]: null }
      },
      attributes: [
        'driverId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'deliveries']
      ],
      include: [{
        model: Driver,
        as: 'driver',
        attributes: ['firstName', 'lastName']
      }],
      group: ['driverId', 'driver.id', 'driver.firstName', 'driver.lastName'],
      order: [[Sequelize.literal('deliveries'), 'DESC']],
      limit: parseInt(limit),
      raw: true,
      nest: true
    });

    // On-time delivery rate by driver
    const onTimeByDriver = await Shipment.findAll({
      where: {
        ...shipmentWhere,
        status: 'delivered',
        driverId: { [Op.ne]: null }
      },
      attributes: [
        'driverId',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'total'],
        [
          Sequelize.fn('SUM', 
            Sequelize.literal('CASE WHEN "actualDeliveryDate" <= "estimatedDeliveryDate" THEN 1 ELSE 0 END')
          ),
          'onTime'
        ]
      ],
      group: ['driverId'],
      raw: true
    });

    // Average rating (if implemented)
    const avgRatings = await Driver.findAll({
      where: { ...companyWhere, averageRating: { [Op.ne]: null } },
      attributes: [
        [Sequelize.fn('AVG', Sequelize.col('averageRating')), 'avgRating']
      ],
      raw: true
    });

    return success(res, 'Driver analytics retrieved', 200, {
      analytics: {
        byStatus: driversByStatus,
        topPerformers,
        onTimeRates: onTimeByDriver.map(d => ({
          driverId: d.driverId,
          total: d.total,
          onTime: d.onTime,
          rate: d.total > 0 ? Math.round((d.onTime / d.total) * 100) : 0
        })),
        avgRating: avgRatings[0]?.avgRating || 0
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get KPI metrics
 * @route GET /api/analytics/kpis
 */
const getKPIs = async (req, res, next) => {
  try {
    const { period = 'month', companyId } = req.query;

    const companyWhere = {};
    if (companyId) {
      companyWhere.companyId = companyId;
    } else if (req.user.role !== 'admin' && req.user.companyId) {
      companyWhere.companyId = req.user.companyId;
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    let previousStartDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        previousStartDate = new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Current period metrics
    const currentShipments = await Shipment.count({
      where: {
        ...companyWhere,
        createdAt: { [Op.gte]: startDate }
      }
    });

    const currentRevenue = await Transaction.sum('amount', {
      where: {
        ...companyWhere,
        type: 'payment',
        status: 'completed',
        createdAt: { [Op.gte]: startDate }
      }
    }) || 0;

    const currentDelivered = await Shipment.count({
      where: {
        ...companyWhere,
        status: 'delivered',
        actualDeliveryDate: { [Op.gte]: startDate }
      }
    });

    const currentOnTime = await Shipment.count({
      where: {
        ...companyWhere,
        status: 'delivered',
        actualDeliveryDate: { [Op.gte]: startDate },
        actualDeliveryDate: { [Op.lte]: Sequelize.col('estimatedDeliveryDate') }
      }
    });

    // Previous period metrics
    const previousShipments = await Shipment.count({
      where: {
        ...companyWhere,
        createdAt: { [Op.between]: [previousStartDate, startDate] }
      }
    });

    const previousRevenue = await Transaction.sum('amount', {
      where: {
        ...companyWhere,
        type: 'payment',
        status: 'completed',
        createdAt: { [Op.between]: [previousStartDate, startDate] }
      }
    }) || 0;

    // Calculate growth rates
    const shipmentGrowth = previousShipments > 0 
      ? Math.round(((currentShipments - previousShipments) / previousShipments) * 100)
      : 0;

    const revenueGrowth = previousRevenue > 0
      ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100)
      : 0;

    return success(res, 'KPI metrics retrieved', 200, {
      kpis: {
        shipments: {
          current: currentShipments,
          previous: previousShipments,
          growth: shipmentGrowth
        },
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          growth: revenueGrowth
        },
        delivery: {
          total: currentDelivered,
          onTime: currentOnTime,
          rate: currentDelivered > 0 ? Math.round((currentOnTime / currentDelivered) * 100) : 0
        },
        period
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Export analytics report
 * @route POST /api/analytics/export
 */
const exportReport = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return error(res, 'Validation failed', 400, errors.array());
    }

    const {
      reportType,
      format,
      startDate,
      endDate,
      filters
    } = req.body;

    // Generate report data based on type
    let reportData;
    switch (reportType) {
      case 'shipments':
        reportData = await generateShipmentReport(startDate, endDate, filters, req.user);
        break;
      case 'revenue':
        reportData = await generateRevenueReport(startDate, endDate, filters, req.user);
        break;
      case 'fleet':
        reportData = await generateFleetReport(startDate, endDate, filters, req.user);
        break;
      case 'drivers':
        reportData = await generateDriverReport(startDate, endDate, filters, req.user);
        break;
      default:
        throw new AppError('Invalid report type', 400);
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: 'REPORT_EXPORTED',
      resource: 'Analytics',
      details: { reportType, format, startDate, endDate },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    // Return data or file based on format
    if (format === 'json') {
      return success(res, 'Report generated', 200, { report: reportData });
    }

    // For CSV/Excel, you would generate and return a file
    // This is a placeholder for actual file generation
    return success(res, 'Report generated', 200, { 
      report: reportData,
      message: 'File generation would be implemented here'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get real-time metrics
 * @route GET /api/analytics/realtime
 */
const getRealTimeMetrics = async (req, res, next) => {
  try {
    const companyWhere = {};
    if (req.user.role !== 'admin' && req.user.companyId) {
      companyWhere.companyId = req.user.companyId;
    }

    // Active shipments
    const activeShipments = await Shipment.count({
      where: {
        ...companyWhere,
        status: { [Op.in]: ['in_transit', 'out_for_delivery'] }
      }
    });

    // Vehicles in motion (from cache)
    const vehicleIds = await Vehicle.findAll({
      where: { ...companyWhere, status: 'in_use' },
      attributes: ['id'],
      raw: true
    });

    let vehiclesWithLocation = 0;
    for (const { id } of vehicleIds) {
      const location = await redisClient.get(`vehicle:${id}:location`);
      if (location) vehiclesWithLocation++;
    }

    // Pending deliveries today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingToday = await Shipment.count({
      where: {
        ...companyWhere,
        status: { [Op.in]: ['in_transit', 'out_for_delivery'] },
        estimatedDeliveryDate: { [Op.between]: [today, tomorrow] }
      }
    });

    // Alerts count (from cache or recent events)
    const alertsKey = `company:${req.user.companyId || 'all'}:alerts:count`;
    const alertsCount = await redisClient.get(alertsKey) || 0;

    return success(res, 'Real-time metrics retrieved', 200, {
      realtime: {
        activeShipments,
        vehiclesTracked: vehiclesWithLocation,
        pendingDeliveriesToday: pendingToday,
        activeAlerts: parseInt(alertsCount)
      }
    });
  } catch (err) {
    next(err);
  }
};

// Helper functions for report generation
const generateShipmentReport = async (startDate, endDate, filters, user) => {
  // Implementation would fetch and format shipment data
  return { type: 'shipments', data: [] };
};

const generateRevenueReport = async (startDate, endDate, filters, user) => {
  return { type: 'revenue', data: [] };
};

const generateFleetReport = async (startDate, endDate, filters, user) => {
  return { type: 'fleet', data: [] };
};

const generateDriverReport = async (startDate, endDate, filters, user) => {
  return { type: 'drivers', data: [] };
};

module.exports = {
  getDashboard,
  getShipmentAnalytics,
  getRevenueAnalytics,
  getFleetAnalytics,
  getDriverAnalytics,
  getKPIs,
  exportReport,
  getRealTimeMetrics
};
