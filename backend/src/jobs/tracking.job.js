/**
 * Tracking Jobs
 * Scheduled tasks for tracking data archival, cleanup, and aggregation
 */

const { LiveTracking, VehicleTelemetry, ShipmentEvent } = require('../models/mongodb');
const { getRedisClient, deleteCache, clearCachePattern } = require('../config/redis');
const logger = require('../utils/logger.util');

// Collection for archived tracking data
const ARCHIVE_COLLECTION = 'live_tracking_archive';

/**
 * Archive old tracking data
 * Moves tracking data older than retention period to archive collection
 */
async function archiveOldTrackingData() {
    logger.info('[TrackingJob] Archiving old tracking data...');

    try {
        const retentionDays = parseInt(process.env.TRACKING_RETENTION_DAYS) || 30;
        const archiveDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

        // Count records to archive
        const count = await LiveTracking.countDocuments({
            timestamp: { $lt: archiveDate }
        });

        if (count === 0) {
            logger.info('[TrackingJob] No tracking data to archive');
            return;
        }

        logger.info(`[TrackingJob] Found ${count} tracking records to archive`);

        // Get the MongoDB connection
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;

        // Archive in batches
        const batchSize = 10000;
        let archivedCount = 0;

        while (archivedCount < count) {
            // Find batch of old records
            const records = await LiveTracking.find({
                timestamp: { $lt: archiveDate }
            })
                .limit(batchSize)
                .lean();

            if (records.length === 0) break;

            // Insert into archive collection
            await db.collection(ARCHIVE_COLLECTION).insertMany(records);

            // Delete archived records from main collection
            const ids = records.map(r => r._id);
            await LiveTracking.deleteMany({ _id: { $in: ids } });

            archivedCount += records.length;
            logger.debug(`[TrackingJob] Archived ${archivedCount}/${count} records`);
        }

        logger.info(`[TrackingJob] Archived ${archivedCount} tracking records`);

        // Also archive old vehicle telemetry
        await archiveVehicleTelemetry(archiveDate);
    } catch (error) {
        logger.error('[TrackingJob] Error archiving tracking data:', error);
        throw error;
    }
}

/**
 * Archive old vehicle telemetry data
 */
async function archiveVehicleTelemetry(olderThan) {
    try {
        const count = await VehicleTelemetry.countDocuments({
            timestamp: { $lt: olderThan }
        });

        if (count === 0) return;

        const mongoose = require('mongoose');
        const db = mongoose.connection.db;

        // Archive in batches
        const batchSize = 10000;
        let archivedCount = 0;

        while (archivedCount < count) {
            const records = await VehicleTelemetry.find({
                timestamp: { $lt: olderThan }
            })
                .limit(batchSize)
                .lean();

            if (records.length === 0) break;

            await db.collection('vehicle_telemetry_archive').insertMany(records);

            const ids = records.map(r => r._id);
            await VehicleTelemetry.deleteMany({ _id: { $in: ids } });

            archivedCount += records.length;
        }

        logger.info(`[TrackingJob] Archived ${archivedCount} telemetry records`);
    } catch (error) {
        logger.error('[TrackingJob] Error archiving telemetry data:', error);
    }
}

/**
 * Cleanup stale tracking sessions
 * Removes tracking entries for vehicles that haven't reported in a while
 */
async function cleanupStaleSessions() {
    logger.info('[TrackingJob] Cleaning up stale tracking sessions...');

    try {
        const staleThreshold = parseInt(process.env.TRACKING_STALE_MINUTES) || 30;
        const staleDate = new Date(Date.now() - staleThreshold * 60 * 1000);

        // Find vehicles with stale tracking
        const staleVehicles = await LiveTracking.aggregate([
            {
                $sort: { vehicleId: 1, timestamp: -1 }
            },
            {
                $group: {
                    _id: '$vehicleId',
                    lastUpdate: { $first: '$timestamp' },
                    lastLocation: { $first: '$coordinates' }
                }
            },
            {
                $match: {
                    lastUpdate: { $lt: staleDate }
                }
            }
        ]);

        if (staleVehicles.length === 0) {
            logger.debug('[TrackingJob] No stale tracking sessions found');
            return;
        }

        logger.info(`[TrackingJob] Found ${staleVehicles.length} stale tracking sessions`);

        // Clear cached locations for stale vehicles
        const redis = getRedisClient();
        if (redis && redis.isOpen) {
            for (const vehicle of staleVehicles) {
                await deleteCache(`tracking:vehicle:${vehicle._id}`);
                await deleteCache(`tracking:latest:${vehicle._id}`);
            }
        }

        // Optionally emit socket event for stale vehicles
        // This would be handled by the socket module

        logger.info(`[TrackingJob] Cleaned up ${staleVehicles.length} stale sessions`);
    } catch (error) {
        logger.error('[TrackingJob] Error cleaning up stale sessions:', error);
        throw error;
    }
}

/**
 * Aggregate tracking metrics for reporting
 * Creates daily summary documents for analytics
 */
async function aggregateTrackingMetrics() {
    logger.info('[TrackingJob] Aggregating tracking metrics...');

    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(0, 0, 0, 0);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Aggregate vehicle metrics for yesterday
        const vehicleMetrics = await LiveTracking.aggregate([
            {
                $match: {
                    timestamp: { $gte: yesterday, $lt: today }
                }
            },
            {
                $group: {
                    _id: '$vehicleId',
                    totalPoints: { $sum: 1 },
                    avgSpeed: { $avg: '$speed' },
                    maxSpeed: { $max: '$speed' },
                    movingTime: {
                        $sum: { $cond: ['$isMoving', 1, 0] }
                    },
                    idleTime: {
                        $sum: { $cond: ['$isMoving', 0, 1] }
                    },
                    firstLocation: { $first: '$coordinates' },
                    lastLocation: { $last: '$coordinates' }
                }
            }
        ]);

        // Store aggregated metrics
        const mongoose = require('mongoose');
        const db = mongoose.connection.db;

        if (vehicleMetrics.length > 0) {
            const dailyMetrics = vehicleMetrics.map(metric => ({
                vehicleId: metric._id,
                date: yesterday,
                totalPoints: metric.totalPoints,
                avgSpeed: Math.round(metric.avgSpeed * 100) / 100,
                maxSpeed: metric.maxSpeed,
                movingTimeMinutes: metric.movingTime * 5, // Assuming 5-min intervals
                idleTimeMinutes: metric.idleTime * 5,
                firstLocation: metric.firstLocation,
                lastLocation: metric.lastLocation,
                createdAt: new Date()
            }));

            await db.collection('tracking_daily_metrics').insertMany(dailyMetrics);
        }

        // Aggregate shipment tracking events
        const shipmentMetrics = await ShipmentEvent.aggregate([
            {
                $match: {
                    timestamp: { $gte: yesterday, $lt: today }
                }
            },
            {
                $group: {
                    _id: '$eventType',
                    count: { $sum: 1 }
                }
            }
        ]);

        logger.info(`[TrackingJob] Aggregated metrics for ${vehicleMetrics.length} vehicles, ${shipmentMetrics.length} event types`);

        // Clear analytics cache to force refresh
        await clearCachePattern('analytics:tracking:*');
    } catch (error) {
        logger.error('[TrackingJob] Error aggregating tracking metrics:', error);
        throw error;
    }
}

module.exports = {
    archiveOldTrackingData,
    cleanupStaleSessions,
    aggregateTrackingMetrics
};
