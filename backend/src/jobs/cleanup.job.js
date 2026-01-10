/**
 * Cleanup Jobs
 * Scheduled tasks for database cleanup, log rotation, and temp file removal
 */

const { Op } = require('sequelize');
const { User, Shipment, Vehicle, Driver, Document, Notification } = require('../models/postgres');
const { AuditLog } = require('../models/mongodb');
const { getRedisClient, clearCachePattern } = require('../config/redis');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger.util');

// Retention periods in days
const RETENTION = {
    SOFT_DELETED: 90,      // Keep soft-deleted records for 90 days
    TEMP_FILES: 1,         // Keep temp files for 1 day
    REFRESH_TOKENS: 30,    // Keep expired tokens for 30 days
    AUDIT_LOGS: 365,       // Keep audit logs for 1 year (also handled by MongoDB TTL)
    OLD_LOGS: 30           // Keep log files for 30 days
};

/**
 * Cleanup soft-deleted database records past retention period
 */
async function cleanupDatabase() {
    logger.info('[CleanupJob] Starting database cleanup...');

    try {
        const retentionDate = new Date(
            Date.now() - RETENTION.SOFT_DELETED * 24 * 60 * 60 * 1000
        );

        // Models with paranoid: true (soft delete)
        const paranoiModels = [
            { model: Shipment, name: 'Shipment' },
            { model: Vehicle, name: 'Vehicle' },
            { model: Driver, name: 'Driver' },
            { model: Document, name: 'Document' },
            { model: Notification, name: 'Notification' }
        ];

        let totalDeleted = 0;

        for (const { model, name } of paranoiModels) {
            try {
                // Force delete records that were soft-deleted before retention date
                const deleted = await model.destroy({
                    where: {
                        deletedAt: { [Op.lt]: retentionDate }
                    },
                    force: true // Permanent delete
                });

                if (deleted > 0) {
                    logger.info(`[CleanupJob] Permanently deleted ${deleted} ${name} records`);
                    totalDeleted += deleted;
                }
            } catch (error) {
                logger.error(`[CleanupJob] Error cleaning up ${name}:`, error);
            }
        }

        // Cleanup old MongoDB audit logs that somehow escaped TTL
        try {
            const auditRetentionDate = new Date(
                Date.now() - RETENTION.AUDIT_LOGS * 24 * 60 * 60 * 1000
            );

            const auditResult = await AuditLog.deleteMany({
                timestamp: { $lt: auditRetentionDate }
            });

            if (auditResult.deletedCount > 0) {
                logger.info(`[CleanupJob] Deleted ${auditResult.deletedCount} old audit logs`);
                totalDeleted += auditResult.deletedCount;
            }
        } catch (error) {
            logger.error('[CleanupJob] Error cleaning up audit logs:', error);
        }

        logger.info(`[CleanupJob] Database cleanup complete. Total deleted: ${totalDeleted}`);
    } catch (error) {
        logger.error('[CleanupJob] Error during database cleanup:', error);
        throw error;
    }
}

/**
 * Rotate and compress old log files
 */
async function rotateLogs() {
    logger.info('[CleanupJob] Starting log rotation...');

    try {
        const logsDir = path.join(__dirname, '../../logs');
        const archiveDir = path.join(logsDir, 'archive');

        // Ensure directories exist
        try {
            await fs.mkdir(logsDir, { recursive: true });
            await fs.mkdir(archiveDir, { recursive: true });
        } catch (mkdirError) {
            // Directory exists, continue
        }

        const retentionDate = new Date(
            Date.now() - RETENTION.OLD_LOGS * 24 * 60 * 60 * 1000
        );

        // Get all log files
        let files;
        try {
            files = await fs.readdir(logsDir);
        } catch (readError) {
            logger.debug('[CleanupJob] No logs directory found');
            return;
        }

        let archivedCount = 0;
        let deletedCount = 0;

        for (const file of files) {
            if (file === 'archive' || !file.endsWith('.log')) continue;

            const filePath = path.join(logsDir, file);

            try {
                const stats = await fs.stat(filePath);

                if (stats.mtime < retentionDate) {
                    // Delete old log files
                    await fs.unlink(filePath);
                    deletedCount++;
                    logger.debug(`[CleanupJob] Deleted old log file: ${file}`);
                } else if (stats.size > 10 * 1024 * 1024) { // Files larger than 10MB
                    // Archive large files
                    const archiveName = `${file}.${Date.now()}`;
                    await fs.rename(filePath, path.join(archiveDir, archiveName));
                    archivedCount++;
                    logger.debug(`[CleanupJob] Archived log file: ${file}`);
                }
            } catch (fileError) {
                logger.error(`[CleanupJob] Error processing log file ${file}:`, fileError);
            }
        }

        // Clean up old archived files
        try {
            const archiveFiles = await fs.readdir(archiveDir);
            const archiveRetentionDate = new Date(
                Date.now() - RETENTION.OLD_LOGS * 2 * 24 * 60 * 60 * 1000
            );

            for (const file of archiveFiles) {
                const filePath = path.join(archiveDir, file);
                const stats = await fs.stat(filePath);

                if (stats.mtime < archiveRetentionDate) {
                    await fs.unlink(filePath);
                    deletedCount++;
                }
            }
        } catch (archiveError) {
            // Archive directory might be empty
        }

        logger.info(`[CleanupJob] Log rotation complete. Archived: ${archivedCount}, Deleted: ${deletedCount}`);
    } catch (error) {
        logger.error('[CleanupJob] Error during log rotation:', error);
        throw error;
    }
}

/**
 * Remove temporary uploaded files
 */
async function cleanupTempFiles() {
    logger.info('[CleanupJob] Cleaning up temporary files...');

    try {
        const tempDirs = [
            path.join(__dirname, '../../uploads/temp'),
            path.join(__dirname, '../../tmp'),
            path.join(process.env.TEMP || '/tmp', 'logimetrics')
        ];

        const retentionDate = new Date(
            Date.now() - RETENTION.TEMP_FILES * 24 * 60 * 60 * 1000
        );

        let deletedCount = 0;
        let freedBytes = 0;

        for (const tempDir of tempDirs) {
            try {
                const files = await fs.readdir(tempDir);

                for (const file of files) {
                    const filePath = path.join(tempDir, file);

                    try {
                        const stats = await fs.stat(filePath);

                        if (stats.mtime < retentionDate) {
                            if (stats.isDirectory()) {
                                await fs.rm(filePath, { recursive: true });
                            } else {
                                await fs.unlink(filePath);
                            }
                            freedBytes += stats.size;
                            deletedCount++;
                        }
                    } catch (fileError) {
                        // File might have been deleted already
                    }
                }
            } catch (dirError) {
                // Directory might not exist
            }
        }

        // Also cleanup orphaned documents in database
        const orphanedDocs = await Document.findAll({
            where: {
                status: 'uploading',
                createdAt: { [Op.lt]: retentionDate }
            }
        });

        if (orphanedDocs.length > 0) {
            await Document.destroy({
                where: {
                    id: { [Op.in]: orphanedDocs.map(d => d.id) }
                },
                force: true
            });
            deletedCount += orphanedDocs.length;
        }

        const freedMB = Math.round(freedBytes / (1024 * 1024) * 100) / 100;
        logger.info(`[CleanupJob] Temp cleanup complete. Deleted: ${deletedCount} files, Freed: ${freedMB} MB`);
    } catch (error) {
        logger.error('[CleanupJob] Error cleaning up temp files:', error);
        throw error;
    }
}

/**
 * Cleanup expired refresh tokens
 */
async function cleanupExpiredTokens() {
    logger.info('[CleanupJob] Cleaning up expired tokens...');

    try {
        const redis = getRedisClient();
        let deletedFromRedis = 0;

        // Clean up Redis tokens (if using Redis for token storage)
        if (redis && redis.isOpen) {
            try {
                // Get all refresh token keys
                const tokenKeys = await redis.keys('refresh_token:*');

                for (const key of tokenKeys) {
                    const ttl = await redis.ttl(key);
                    // If TTL is -1 (no expiry) or -2 (doesn't exist), delete
                    if (ttl < 0) {
                        await redis.del(key);
                        deletedFromRedis++;
                    }
                }

                // Also clean up blacklisted tokens older than retention period
                const blacklistKeys = await redis.keys('blacklist:*');
                for (const key of blacklistKeys) {
                    const ttl = await redis.ttl(key);
                    if (ttl < 0) {
                        await redis.del(key);
                        deletedFromRedis++;
                    }
                }
            } catch (redisError) {
                logger.error('[CleanupJob] Error cleaning Redis tokens:', redisError);
            }
        }

        // Clean up users with expired refresh tokens in database
        const retentionDate = new Date(
            Date.now() - RETENTION.REFRESH_TOKENS * 24 * 60 * 60 * 1000
        );

        const [updatedCount] = await User.update(
            { refreshToken: null },
            {
                where: {
                    refreshTokenExpiresAt: { [Op.lt]: retentionDate }
                }
            }
        );

        logger.info(`[CleanupJob] Token cleanup complete. Redis: ${deletedFromRedis}, DB: ${updatedCount}`);
    } catch (error) {
        logger.error('[CleanupJob] Error cleaning up expired tokens:', error);
        throw error;
    }
}

module.exports = {
    cleanupDatabase,
    rotateLogs,
    cleanupTempFiles,
    cleanupExpiredTokens
};
