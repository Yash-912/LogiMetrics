/**
 * Analytics Jobs
 * Scheduled tasks for generating reports and caching analytics data
 */

const { Op, fn, col, literal } = require('sequelize');
const { Shipment, Vehicle, Driver, Invoice, Transaction, Company } = require('../models/postgres');
const { AuditLog, LiveTracking } = require('../models/mongodb');
const { setCache, getRedisClient, clearCachePattern } = require('../config/redis');
const logger = require('../utils/logger.util');

/**
 * Generate daily reports for all companies
 */
async function generateDailyReports() {
    logger.info('[AnalyticsJob] Generating daily reports...');

    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get all active companies
        const companies = await Company.findAll({
            where: { status: 'active' },
            attributes: ['id', 'name']
        });

        logger.info(`[AnalyticsJob] Generating daily reports for ${companies.length} companies`);

        for (const company of companies) {
            try {
                const report = await generateCompanyDailyReport(company.id, yesterday, today);

                // Store report in MongoDB
                const mongoose = require('mongoose');
                const db = mongoose.connection.db;

                await db.collection('daily_reports').insertOne({
                    companyId: company.id,
                    date: yesterday,
                    report,
                    createdAt: new Date()
                });

                logger.debug(`[AnalyticsJob] Generated daily report for company ${company.id}`);
            } catch (error) {
                logger.error(`[AnalyticsJob] Failed to generate report for company ${company.id}:`, error);
            }
        }

        logger.info('[AnalyticsJob] Daily reports generated successfully');
    } catch (error) {
        logger.error('[AnalyticsJob] Error generating daily reports:', error);
        throw error;
    }
}

/**
 * Generate daily report for a specific company
 */
async function generateCompanyDailyReport(companyId, startDate, endDate) {
    const dateFilter = {
        createdAt: { [Op.between]: [startDate, endDate] }
    };

    // Shipment stats
    const [totalShipments, completedShipments, cancelledShipments] = await Promise.all([
        Shipment.count({ where: { companyId, ...dateFilter } }),
        Shipment.count({ where: { companyId, status: 'delivered', ...dateFilter } }),
        Shipment.count({ where: { companyId, status: 'cancelled', ...dateFilter } })
    ]);

    // Revenue stats
    const revenueData = await Invoice.findOne({
        where: { companyId, status: 'paid', ...dateFilter },
        attributes: [
            [fn('SUM', col('total')), 'totalRevenue'],
            [fn('COUNT', col('id')), 'invoiceCount']
        ],
        raw: true
    });

    // Vehicle stats
    const vehicleStats = await Vehicle.findAll({
        where: { companyId },
        attributes: [
            'status',
            [fn('COUNT', col('id')), 'count']
        ],
        group: ['status'],
        raw: true
    });

    // Driver stats
    const driverStats = await Driver.findAll({
        where: { companyId },
        attributes: [
            'status',
            [fn('COUNT', col('id')), 'count']
        ],
        group: ['status'],
        raw: true
    });

    return {
        date: startDate,
        shipments: {
            total: totalShipments,
            completed: completedShipments,
            cancelled: cancelledShipments,
            completionRate: totalShipments > 0
                ? Math.round((completedShipments / totalShipments) * 100)
                : 0
        },
        revenue: {
            total: parseFloat(revenueData?.totalRevenue || 0),
            invoiceCount: parseInt(revenueData?.invoiceCount || 0)
        },
        fleet: {
            vehicles: vehicleStats.reduce((acc, v) => {
                acc[v.status] = parseInt(v.count);
                return acc;
            }, {}),
            drivers: driverStats.reduce((acc, d) => {
                acc[d.status] = parseInt(d.count);
                return acc;
            }, {})
        }
    };
}

/**
 * Generate weekly reports
 */
async function generateWeeklyReports() {
    logger.info('[AnalyticsJob] Generating weekly reports...');

    try {
        const lastWeekStart = new Date();
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);

        const lastWeekEnd = new Date();
        lastWeekEnd.setDate(lastWeekEnd.getDate() - 1);
        lastWeekEnd.setHours(23, 59, 59, 999);

        const companies = await Company.findAll({
            where: { status: 'active' },
            attributes: ['id', 'name']
        });

        for (const company of companies) {
            try {
                // Aggregate daily reports for the week
                const mongoose = require('mongoose');
                const db = mongoose.connection.db;

                const dailyReports = await db.collection('daily_reports').find({
                    companyId: company.id,
                    date: { $gte: lastWeekStart, $lte: lastWeekEnd }
                }).toArray();

                const weeklyReport = aggregateReports(dailyReports, 'weekly');

                await db.collection('weekly_reports').insertOne({
                    companyId: company.id,
                    weekStart: lastWeekStart,
                    weekEnd: lastWeekEnd,
                    report: weeklyReport,
                    createdAt: new Date()
                });

                logger.debug(`[AnalyticsJob] Generated weekly report for company ${company.id}`);
            } catch (error) {
                logger.error(`[AnalyticsJob] Failed to generate weekly report for company ${company.id}:`, error);
            }
        }

        logger.info('[AnalyticsJob] Weekly reports generated successfully');
    } catch (error) {
        logger.error('[AnalyticsJob] Error generating weekly reports:', error);
        throw error;
    }
}

/**
 * Generate monthly reports
 */
async function generateMonthlyReports() {
    logger.info('[AnalyticsJob] Generating monthly reports...');

    try {
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const monthStart = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
        const monthEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59);

        const companies = await Company.findAll({
            where: { status: 'active' },
            attributes: ['id', 'name']
        });

        for (const company of companies) {
            try {
                const mongoose = require('mongoose');
                const db = mongoose.connection.db;

                const dailyReports = await db.collection('daily_reports').find({
                    companyId: company.id,
                    date: { $gte: monthStart, $lte: monthEnd }
                }).toArray();

                const monthlyReport = aggregateReports(dailyReports, 'monthly');

                // Calculate month-over-month comparisons
                const prevMonthStart = new Date(monthStart);
                prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
                const prevMonthEnd = new Date(monthStart);
                prevMonthEnd.setDate(prevMonthEnd.getDate() - 1);

                const prevReports = await db.collection('daily_reports').find({
                    companyId: company.id,
                    date: { $gte: prevMonthStart, $lte: prevMonthEnd }
                }).toArray();

                const prevMonthData = aggregateReports(prevReports, 'monthly');

                // Add comparison data
                monthlyReport.comparison = {
                    shipmentsChange: calculatePercentChange(
                        monthlyReport.shipments?.total,
                        prevMonthData.shipments?.total
                    ),
                    revenueChange: calculatePercentChange(
                        monthlyReport.revenue?.total,
                        prevMonthData.revenue?.total
                    )
                };

                await db.collection('monthly_reports').insertOne({
                    companyId: company.id,
                    month: monthStart,
                    report: monthlyReport,
                    createdAt: new Date()
                });

                logger.debug(`[AnalyticsJob] Generated monthly report for company ${company.id}`);
            } catch (error) {
                logger.error(`[AnalyticsJob] Failed to generate monthly report for company ${company.id}:`, error);
            }
        }

        logger.info('[AnalyticsJob] Monthly reports generated successfully');
    } catch (error) {
        logger.error('[AnalyticsJob] Error generating monthly reports:', error);
        throw error;
    }
}

/**
 * Aggregate multiple reports
 */
function aggregateReports(reports, type) {
    if (!reports || reports.length === 0) {
        return { shipments: {}, revenue: {}, fleet: {} };
    }

    const aggregated = {
        period: type,
        shipments: {
            total: 0,
            completed: 0,
            cancelled: 0
        },
        revenue: {
            total: 0,
            invoiceCount: 0
        },
        daysWithData: reports.length
    };

    for (const r of reports) {
        if (r.report?.shipments) {
            aggregated.shipments.total += r.report.shipments.total || 0;
            aggregated.shipments.completed += r.report.shipments.completed || 0;
            aggregated.shipments.cancelled += r.report.shipments.cancelled || 0;
        }
        if (r.report?.revenue) {
            aggregated.revenue.total += r.report.revenue.total || 0;
            aggregated.revenue.invoiceCount += r.report.revenue.invoiceCount || 0;
        }
    }

    aggregated.shipments.completionRate = aggregated.shipments.total > 0
        ? Math.round((aggregated.shipments.completed / aggregated.shipments.total) * 100)
        : 0;

    return aggregated;
}

/**
 * Calculate percentage change
 */
function calculatePercentChange(current, previous) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
}

/**
 * Cache analytics data for dashboard
 */
async function cacheAnalyticsData() {
    logger.info('[AnalyticsJob] Caching analytics data...');

    try {
        const companies = await Company.findAll({
            where: { status: 'active' },
            attributes: ['id']
        });

        for (const company of companies) {
            try {
                // Cache dashboard stats
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                const stats = {
                    shipments: {
                        today: await Shipment.count({
                            where: {
                                companyId: company.id,
                                createdAt: { [Op.gte]: today }
                            }
                        }),
                        inTransit: await Shipment.count({
                            where: { companyId: company.id, status: 'in_transit' }
                        }),
                        pending: await Shipment.count({
                            where: { companyId: company.id, status: 'pending' }
                        })
                    },
                    fleet: {
                        availableVehicles: await Vehicle.count({
                            where: { companyId: company.id, status: 'available' }
                        }),
                        availableDrivers: await Driver.count({
                            where: { companyId: company.id, status: 'available' }
                        })
                    },
                    cachedAt: new Date().toISOString()
                };

                await setCache(`analytics:dashboard:${company.id}`, stats, 900); // 15 min TTL
            } catch (error) {
                logger.error(`[AnalyticsJob] Failed to cache analytics for company ${company.id}:`, error);
            }
        }

        logger.info('[AnalyticsJob] Analytics data cached successfully');
    } catch (error) {
        logger.error('[AnalyticsJob] Error caching analytics data:', error);
        throw error;
    }
}

module.exports = {
    generateDailyReports,
    generateWeeklyReports,
    generateMonthlyReports,
    cacheAnalyticsData
};
