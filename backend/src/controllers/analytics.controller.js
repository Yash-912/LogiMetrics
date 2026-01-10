const { validationResult } = require("express-validator");
const mongoose = require("mongoose");
const {
  Shipment,
  Vehicle,
  Driver,
  Company,
  Invoice,
  Transaction,
  User,
  Route,
} = require("../models/mongodb");
const {
  ShipmentEvent,
  VehicleTelemetry,
  AuditLog,
} = require("../models/mongodb");
const { successResponse, errorResponse } = require("../utils/response.util");
const { AppError } = require("../middleware/error.middleware");
const { redisClient } = require("../config/redis");
const logger = require("../utils/logger.util");

/**
 * Get dashboard overview
 * @route GET /api/analytics/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    const { startDate, endDate, companyId } = req.query;

    const query = {};
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Company filter
    const companyQuery = {};
    if (companyId) {
      companyQuery.companyId = companyId;
    } else if (req.user.role !== "admin" && req.user.companyId) {
      companyQuery.companyId = req.user.companyId;
    }

    // Combine queries for shipments
    const shipmentQuery = { ...query, ...companyQuery };

    // Shipment stats
    const totalShipments = await Shipment.countDocuments(shipmentQuery);

    const shipmentsByStatus = await Shipment.aggregate([
      { $match: shipmentQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } }
    ]);

    // Active shipments (in transit)
    const activeShipments = await Shipment.countDocuments({
      ...companyQuery,
      status: { $in: ["in_transit", "out_for_delivery"] },
    });

    // Vehicle stats
    const totalVehicles = await Vehicle.countDocuments(companyQuery);
    const activeVehicles = await Vehicle.countDocuments({
      ...companyQuery,
      status: "in_use",
    });

    // Driver stats
    const totalDrivers = await Driver.countDocuments(companyQuery);
    const activeDrivers = await Driver.countDocuments({
      ...companyQuery,
      status: "on_duty",
    });

    // Revenue stats
    const revenueResult = await Transaction.aggregate([
      {
        $match: {
          ...companyQuery,
          ...query,
          type: "payment",
          status: "completed",
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    // Pending invoices
    const pendingInvoicesResult = await Invoice.aggregate([
      {
        $match: {
          ...companyQuery,
          status: { $in: ["sent", "overdue"] },
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          total: { $sum: "$totalAmount" }
        }
      }
    ]);
    const pendingInvoices = pendingInvoicesResult.length > 0 ? pendingInvoicesResult[0] : { count: 0, total: 0 };

    // Delivery performance
    const totalDeliveredDetails = await Shipment.find({
      ...companyQuery,
      ...query,
      status: "delivered",
      actualDeliveryDate: { $exists: true },
      estimatedDeliveryDate: { $exists: true }
    }).select('actualDeliveryDate estimatedDeliveryDate');

    const totalDelivered = totalDeliveredDetails.length;

    const deliveredOnTime = totalDeliveredDetails.filter(s =>
      new Date(s.actualDeliveryDate) <= new Date(s.estimatedDeliveryDate)
    ).length;

    const onTimeRate =
      totalDelivered > 0
        ? Math.round((deliveredOnTime / totalDelivered) * 100)
        : 0;

    return successResponse(res, {
      overview: {
        shipments: {
          total: totalShipments,
          active: activeShipments,
          byStatus: shipmentsByStatus,
        },
        vehicles: {
          total: totalVehicles,
          active: activeVehicles,
          utilization:
            totalVehicles > 0
              ? Math.round((activeVehicles / totalVehicles) * 100)
              : 0,
        },
        drivers: {
          total: totalDrivers,
          active: activeDrivers,
        },
        revenue: {
          total: totalRevenue,
          pendingCount: pendingInvoices.count,
          pendingAmount: pendingInvoices.total,
        },
        performance: {
          onTimeDeliveryRate: onTimeRate,
          totalDelivered,
        },
      },
    }, "Dashboard data retrieved");
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
    const { startDate, endDate, groupBy = "day", companyId } = req.query;

    const companyQuery = {};
    if (companyId) {
      companyQuery.companyId = companyId;
    } else if (req.user.role !== "admin" && req.user.companyId) {
      companyQuery.companyId = req.user.companyId;
    }

    let dateFormat;
    switch (groupBy) {
      case "hour":
        dateFormat = "%Y-%m-%d %H:00";
        break;
      case "week":
        dateFormat = "%Y-W%V"; // Year-Week
        break;
      case "month":
        dateFormat = "%Y-%m";
        break;
      default:
        dateFormat = "%Y-%m-%d";
    }

    const query = { ...companyQuery };
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Shipments over time
    const shipmentsOverTime = await Shipment.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { period: "$_id", count: 1, _id: 0 } }
    ]);

    // By status
    const byStatus = await Shipment.aggregate([
      { $match: query },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } }
    ]);

    // By priority (assuming priority field exists, standard is usually not having one but let's keep it if model has it)
    // If priority doesn't exist in schema, this will return empty or error depending on strictness.
    // Assuming schema is flexible or has it.
    const byPriority = await Shipment.aggregate([
      { $match: query },
      { $group: { _id: "$priority", count: { $sum: 1 } } },
      { $project: { priority: "$_id", count: 1, _id: 0 } }
    ]);

    // Average delivery time (in hours)
    const deliveryTimeResult = await Shipment.aggregate([
      {
        $match: {
          ...companyQuery,
          status: "delivered",
          actualDeliveryDate: { $exists: true, $ne: null },
          actualPickupDate: { $exists: true, $ne: null },
        }
      },
      {
        $project: {
          durationHours: {
            $divide: [
              { $subtract: ["$actualDeliveryDate", "$actualPickupDate"] },
              1000 * 60 * 60 // Convert ms to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgHours: { $avg: "$durationHours" }
        }
      }
    ]);

    const avgDeliveryTimeHours = deliveryTimeResult.length > 0 ? Math.round(deliveryTimeResult[0].avgHours) : 0;

    return successResponse(res, {
      analytics: {
        overTime: shipmentsOverTime,
        byStatus,
        byPriority, // Will be empty if field doesn't exist
        avgDeliveryTimeHours,
      },
    }, "Shipment analytics retrieved");
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
    const { startDate, endDate, groupBy = "day", companyId } = req.query;

    const companyQuery = {};
    if (companyId) {
      companyQuery.companyId = companyId;
    } else if (req.user.role !== "admin" && req.user.companyId) {
      companyQuery.companyId = req.user.companyId;
    }

    let dateFormat;
    switch (groupBy) {
      case "week":
        dateFormat = "%Y-W%V";
        break;
      case "month":
        dateFormat = "%Y-%m";
        break;
      default:
        dateFormat = "%Y-%m-%d";
    }

    const query = {
      ...companyQuery,
      status: "completed",
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Revenue over time
    const revenueOverTime = await Transaction.aggregate([
      { $match: { ...query, type: "payment" } },
      {
        $group: {
          _id: { $dateToString: { format: dateFormat, date: "$createdAt" } },
          revenue: { $sum: "$amount" }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { period: "$_id", revenue: 1, _id: 0 } }
    ]);

    // Total revenue
    const revenueTotalResult = await Transaction.aggregate([
      { $match: { ...query, type: "payment" } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRevenue = revenueTotalResult.length > 0 ? revenueTotalResult[0].total : 0;

    // Total refunds
    const refundTotalResult = await Transaction.aggregate([
      { $match: { ...companyQuery, type: "refund", status: "completed" } }, // Refunds might not have same date constraint
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const totalRefunds = refundTotalResult.length > 0 ? refundTotalResult[0].total : 0;

    // Invoice stats
    const invoiceStats = await Invoice.aggregate([
      { $match: companyQuery },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          total: { $sum: "$totalAmount" }
        }
      },
      { $project: { status: "$_id", count: 1, total: 1, _id: 0 } }
    ]);

    // Average invoice value
    const avgInvoiceResult = await Invoice.aggregate([
      { $match: companyQuery },
      { $group: { _id: null, avg: { $avg: "$totalAmount" } } }
    ]);
    const avgInvoiceValue = avgInvoiceResult.length > 0 ? Math.round(avgInvoiceResult[0].avg) : 0;

    return successResponse(res, {
      analytics: {
        overTime: revenueOverTime,
        summary: {
          totalRevenue,
          totalRefunds: Math.abs(totalRefunds),
          netRevenue: totalRevenue - Math.abs(totalRefunds),
          avgInvoiceValue,
        },
        invoicesByStatus: invoiceStats,
      },
    }, "Revenue analytics retrieved");
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

    const companyQuery = {};
    if (companyId) {
      companyQuery.companyId = companyId;
    } else if (req.user.role !== "admin" && req.user.companyId) {
      companyQuery.companyId = req.user.companyId;
    }

    // Vehicles by status
    const vehiclesByStatus = await Vehicle.aggregate([
      { $match: companyQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } }
    ]);

    // Vehicles by type
    const vehiclesByType = await Vehicle.aggregate([
      { $match: companyQuery },
      { $group: { _id: "$type", count: { $sum: 1 } } },
      { $project: { type: "$_id", count: 1, _id: 0 } }
    ]);

    // Utilization rate (vehicles with shipments)
    const totalVehicles = await Vehicle.countDocuments(companyQuery);

    // Find unique vehicles active on shipments
    // In MongoDB we can distinct on shipment collection
    const activeVehicleIds = await Shipment.distinct("vehicleId", {
      ...companyQuery,
      vehicleId: { $ne: null },
      status: { $in: ["in_transit", "out_for_delivery"] }
    });
    const vehiclesWithShipments = activeVehicleIds.length;

    // Maintenance stats
    const vehiclesInMaintenance = await Vehicle.countDocuments({
      ...companyQuery,
      status: "maintenance"
    });

    // Fuel consumption (from telemetry)
    const vehicleTelemetryMatch = {
      // vehicleId match handling needs ObjectId conversion if storing as ObjectId
    };

    // Find vehicle IDs for this company to filter telemetry
    const vehicles = await Vehicle.find(companyQuery).select('_id');
    const vehicleIds = vehicles.map(v => v._id);

    const telemetryMatch = {
      vehicleId: { $in: vehicleIds }
    };

    if (startDate && endDate) {
      telemetryMatch.timestamp = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const fuelDataResult = await VehicleTelemetry.aggregate([
      { $match: telemetryMatch },
      {
        $group: {
          _id: null,
          avgFuelConsumption: { $avg: "$fuelConsumption" },
          totalDistance: { $sum: "$odometer" }, // Assuming odometer logic is delta, if it's cumulative this is wrong. Assuming simplified model where we sum distance segments.
          // If update sends cumulative odometer, we'd need max-min per vehicle.
          // Let's assume for analytics logic here we take avg/sum simplistic approach as per original code.
        }
      }
    ]);

    const fuelData = fuelDataResult.length > 0 ? fuelDataResult[0] : { avgFuelConsumption: 0, totalDistance: 0 };

    return successResponse(res, {
      analytics: {
        vehicles: {
          total: totalVehicles,
          byStatus: vehiclesByStatus,
          byType: vehiclesByType,
          inMaintenance: vehiclesInMaintenance,
          utilization:
            totalVehicles > 0
              ? Math.round((vehiclesWithShipments / totalVehicles) * 100)
              : 0,
        },
        fuel: fuelData,
      },
    }, "Fleet analytics retrieved");
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

    const companyQuery = {};
    if (companyId) {
      companyQuery.companyId = companyId;
    } else if (req.user.role !== "admin" && req.user.companyId) {
      companyQuery.companyId = req.user.companyId;
    }

    const shipmentQuery = { ...companyQuery };
    if (startDate && endDate) {
      shipmentQuery.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Drivers by status
    const driversByStatus = await Driver.aggregate([
      { $match: companyQuery },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { status: "$_id", count: 1, _id: 0 } }
    ]);

    // Top performers by deliveries (Aggregation)
    const topPerformers = await Shipment.aggregate([
      {
        $match: {
          ...shipmentQuery,
          status: "delivered",
          driverId: { $ne: null }
        }
      },
      {
        $group: {
          _id: "$driverId",
          deliveries: { $sum: 1 }
        }
      },
      { $sort: { deliveries: -1 } },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: "drivers",
          localField: "_id",
          foreignField: "_id",
          as: "driver"
        }
      },
      { $unwind: "$driver" }, // Unwind driver array
      {
        $project: {
          driverId: "$_id",
          deliveries: 1,
          driver: {
            firstName: "$driver.firstName",
            lastName: "$driver.lastName"
          }
        }
      }
    ]);

    // On-time delivery rate by driver
    const onTimeByDriver = await Shipment.aggregate([
      {
        $match: {
          ...shipmentQuery,
          status: "delivered",
          driverId: { $ne: null },
          actualDeliveryDate: { $exists: true },
          estimatedDeliveryDate: { $exists: true }
        }
      },
      {
        $group: {
          _id: "$driverId",
          total: { $sum: 1 },
          onTime: {
            $sum: {
              $cond: [{ $lte: ["$actualDeliveryDate", "$estimatedDeliveryDate"] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          driverId: "$_id",
          total: 1,
          onTime: 1,
          rate: {
            $multiply: [
              { $divide: ["$onTime", "$total"] },
              100
            ]
          }
        }
      }
    ]);

    // Average rating
    const avgRatingResult = await Driver.aggregate([
      { $match: { ...companyQuery, averageRating: { $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: "$averageRating" } } }
    ]);
    const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;

    return successResponse(res, {
      analytics: {
        byStatus: driversByStatus,
        topPerformers,
        onTimeRates: onTimeByDriver.map(d => ({
          ...d,
          rate: Math.round(d.rate)
        })),
        avgRating,
      },
    }, "Driver analytics retrieved");
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
    const { period = "month", companyId } = req.query;

    const companyQuery = {};
    if (companyId) {
      companyQuery.companyId = companyId;
    } else if (req.user.role !== "admin" && req.user.companyId) {
      companyQuery.companyId = req.user.companyId;
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    let previousStartDate;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "quarter":
        startDate = new Date(now.setMonth(now.getMonth() - 3));
        previousStartDate = new Date(startDate.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        previousStartDate = new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default: // month
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        previousStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Current period metrics
    const currentShipments = await Shipment.countDocuments({
      ...companyQuery,
      createdAt: { $gte: startDate },
    });

    const currentRevenueResult = await Transaction.aggregate([
      {
        $match: {
          ...companyQuery,
          type: "payment",
          status: "completed",
          createdAt: { $gte: startDate },
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const currentRevenue = currentRevenueResult.length > 0 ? currentRevenueResult[0].total : 0;

    const currentDelivered = await Shipment.countDocuments({
      ...companyQuery,
      status: "delivered",
      actualDeliveryDate: { $gte: startDate },
    });

    // Mongoose query for on-time is tricky with field comparison in query directly, 
    // better to use aggregate or finds with $where (slow). Aggregation is best.
    const currentOnTimeResult = await Shipment.aggregate([
      {
        $match: {
          ...companyQuery,
          status: "delivered",
          actualDeliveryDate: { $gte: startDate, $exists: true },
          estimatedDeliveryDate: { $exists: true }
        }
      },
      {
        $project: {
          isOnTime: { $lte: ["$actualDeliveryDate", "$estimatedDeliveryDate"] }
        }
      },
      { $match: { isOnTime: true } },
      { $count: "count" }
    ]);
    const currentOnTime = currentOnTimeResult.length > 0 ? currentOnTimeResult[0].count : 0;

    // Previous period metrics
    const previousShipments = await Shipment.countDocuments({
      ...companyQuery,
      createdAt: { $gte: previousStartDate, $lt: startDate },
    });

    const previousRevenueResult = await Transaction.aggregate([
      {
        $match: {
          ...companyQuery,
          type: "payment",
          status: "completed",
          createdAt: { $gte: previousStartDate, $lt: startDate },
        }
      },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);
    const previousRevenue = previousRevenueResult.length > 0 ? previousRevenueResult[0].total : 0;

    // Calculate growth rates
    const shipmentGrowth =
      previousShipments > 0
        ? Math.round(
          ((currentShipments - previousShipments) / previousShipments) * 100
        )
        : 0;

    const revenueGrowth =
      previousRevenue > 0
        ? Math.round(
          ((currentRevenue - previousRevenue) / previousRevenue) * 100
        )
        : 0;

    return successResponse(res, {
      kpis: {
        shipments: {
          current: currentShipments,
          previous: previousShipments,
          growth: shipmentGrowth,
        },
        revenue: {
          current: currentRevenue,
          previous: previousRevenue,
          growth: revenueGrowth,
        },
        delivery: {
          total: currentDelivered,
          onTime: currentOnTime,
          rate:
            currentDelivered > 0
              ? Math.round((currentOnTime / currentDelivered) * 100)
              : 0,
        },
        period,
      },
    }, "KPI metrics retrieved");
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
      return errorResponse(res, "Validation failed", 400, errors.array());
    }

    const { reportType, format, startDate, endDate, filters } = req.body;

    // Generate report data based on type
    let reportData;
    switch (reportType) {
      case "shipments":
        reportData = await generateShipmentReport(
          startDate,
          endDate,
          filters,
          req.user
        );
        break;
      case "revenue":
        reportData = await generateRevenueReport(
          startDate,
          endDate,
          filters,
          req.user
        );
        break;
      case "fleet":
        reportData = await generateFleetReport(
          startDate,
          endDate,
          filters,
          req.user
        );
        break;
      case "drivers":
        reportData = await generateDriverReport(
          startDate,
          endDate,
          filters,
          req.user
        );
        break;
      default:
        throw new AppError("Invalid report type", 400);
    }

    // Log audit event
    await AuditLog.create({
      userId: req.user.id,
      action: "REPORT_EXPORTED",
      resource: "Analytics",
      details: { reportType, format, startDate, endDate },
      ipAddress: req.ip,
      userAgent: req.get("User-Agent"),
    });

    // Return data or file based on format
    if (format === "json") {
      return successResponse(res, "Report generated", 200, {
        report: reportData,
      });
    }

    // For CSV/Excel, you would generate and return a file
    // This is a placeholder for actual file generation
    return successResponse(res, "Report generated", 200, {
      report: reportData,
      message: "File generation would be implemented here",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get real-time metrics
 * @route GET /api/analytics/realtime
 */
/**
 * Get real-time metrics
 * @route GET /api/analytics/realtime
 */
const getRealTimeMetrics = async (req, res, next) => {
  try {
    const companyQuery = {};
    if (req.user.role !== "admin" && req.user.companyId) {
      companyQuery.companyId = req.user.companyId;
    }

    // Active shipments
    const activeShipments = await Shipment.countDocuments({
      ...companyQuery,
      status: { $in: ["in_transit", "out_for_delivery"] },
    });

    // Vehicles in motion (from cache)
    const vehicleIds = await Vehicle.find({
      ...companyQuery,
      status: "in_use"
    }).select('_id');

    let vehiclesWithLocation = 0;
    for (const v of vehicleIds) {
      const location = await redisClient.get(`vehicle:${v._id}:location`);
      if (location) vehiclesWithLocation++;
    }

    // Pending deliveries today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const pendingToday = await Shipment.countDocuments({
      ...companyQuery,
      status: { $in: ["in_transit", "out_for_delivery"] },
      estimatedDeliveryDate: { $gte: today, $lt: tomorrow },
    });

    // Alerts count (from cache or recent events)
    const alertsKey = `company:${req.user.companyId || "all"}:alerts:count`;
    const alertsCount = (await redisClient.get(alertsKey)) || 0;

    return successResponse(res, {
      realtime: {
        activeShipments,
        vehiclesTracked: vehiclesWithLocation,
        pendingDeliveriesToday: pendingToday,
        activeAlerts: parseInt(alertsCount),
      },
    }, "Real-time metrics retrieved");
  } catch (err) {
    next(err);
  }
};

// Helper functions for report generation
const generateShipmentReport = async (startDate, endDate, filters, user) => {
  // Implementation would fetch and format shipment data
  return { type: "shipments", data: [] };
};

const generateRevenueReport = async (startDate, endDate, filters, user) => {
  return { type: "revenue", data: [] };
};

const generateFleetReport = async (startDate, endDate, filters, user) => {
  return { type: "fleet", data: [] };
};

const generateDriverReport = async (startDate, endDate, filters, user) => {
  return { type: "drivers", data: [] };
};

module.exports = {
  getDashboard,
  getShipmentAnalytics,
  getRevenueAnalytics,
  getFleetAnalytics,
  getDriverAnalytics,
  getKPIs,
  exportReport,
  getRealTimeMetrics,
};
