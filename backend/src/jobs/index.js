/**
 * Job Scheduler
 * Initializes and manages all scheduled background jobs using node-cron
 */

const cron = require('node-cron');
const logger = require('../utils/logger.util');

// Import job modules
const invoiceJobs = require('./invoice.job');
const notificationJobs = require('./notification.job');
const trackingJobs = require('./tracking.job');
const analyticsJobs = require('./analytics.job');
const maintenanceJobs = require('./maintenance.job');
const cleanupJobs = require('./cleanup.job');
const syncJobs = require('./sync.job');

// Store active scheduled tasks for management
const scheduledTasks = new Map();

// Job configurations with cron expressions
const JOB_SCHEDULES = {
    // Invoice jobs
    processRecurringInvoices: {
        schedule: '0 1 * * *', // Daily at 1:00 AM
        handler: invoiceJobs.processRecurringInvoices,
        enabled: true
    },
    sendPaymentReminders: {
        schedule: '0 9 * * *', // Daily at 9:00 AM
        handler: invoiceJobs.sendPaymentReminders,
        enabled: true
    },
    updateOverdueStatus: {
        schedule: '0 0 * * *', // Daily at midnight
        handler: invoiceJobs.updateOverdueStatus,
        enabled: true
    },

    // Notification jobs
    processNotificationQueue: {
        schedule: '*/5 * * * *', // Every 5 minutes
        handler: notificationJobs.processNotificationQueue,
        enabled: true
    },
    cleanupOldNotifications: {
        schedule: '0 2 * * *', // Daily at 2:00 AM
        handler: notificationJobs.cleanupOldNotifications,
        enabled: true
    },
    sendDigestNotifications: {
        schedule: '0 8 * * *', // Daily at 8:00 AM
        handler: notificationJobs.sendDigestNotifications,
        enabled: true
    },

    // Tracking jobs
    archiveOldTrackingData: {
        schedule: '0 3 * * 0', // Weekly on Sunday at 3:00 AM
        handler: trackingJobs.archiveOldTrackingData,
        enabled: true
    },
    cleanupStaleSessions: {
        schedule: '*/30 * * * *', // Every 30 minutes
        handler: trackingJobs.cleanupStaleSessions,
        enabled: true
    },
    aggregateTrackingMetrics: {
        schedule: '0 4 * * *', // Daily at 4:00 AM
        handler: trackingJobs.aggregateTrackingMetrics,
        enabled: true
    },

    // Analytics jobs
    generateDailyReports: {
        schedule: '0 5 * * *', // Daily at 5:00 AM
        handler: analyticsJobs.generateDailyReports,
        enabled: true
    },
    generateWeeklyReports: {
        schedule: '0 6 * * 1', // Weekly on Monday at 6:00 AM
        handler: analyticsJobs.generateWeeklyReports,
        enabled: true
    },
    generateMonthlyReports: {
        schedule: '0 7 1 * *', // Monthly on 1st at 7:00 AM
        handler: analyticsJobs.generateMonthlyReports,
        enabled: true
    },
    cacheAnalyticsData: {
        schedule: '*/15 * * * *', // Every 15 minutes
        handler: analyticsJobs.cacheAnalyticsData,
        enabled: true
    },

    // Maintenance jobs
    checkVehicleMaintenance: {
        schedule: '0 8 * * *', // Daily at 8:00 AM
        handler: maintenanceJobs.checkVehicleMaintenance,
        enabled: true
    },
    checkLicenseExpiry: {
        schedule: '0 9 * * *', // Daily at 9:00 AM
        handler: maintenanceJobs.checkLicenseExpiry,
        enabled: true
    },
    checkDocumentExpiry: {
        schedule: '0 10 * * *', // Daily at 10:00 AM
        handler: maintenanceJobs.checkDocumentExpiry,
        enabled: true
    },

    // Cleanup jobs
    cleanupDatabase: {
        schedule: '0 2 * * 0', // Weekly on Sunday at 2:00 AM
        handler: cleanupJobs.cleanupDatabase,
        enabled: true
    },
    rotateLogs: {
        schedule: '0 3 1 * *', // Monthly on 1st at 3:00 AM
        handler: cleanupJobs.rotateLogs,
        enabled: true
    },
    cleanupTempFiles: {
        schedule: '0 4 * * *', // Daily at 4:00 AM
        handler: cleanupJobs.cleanupTempFiles,
        enabled: true
    },
    cleanupExpiredTokens: {
        schedule: '0 1 * * *', // Daily at 1:00 AM
        handler: cleanupJobs.cleanupExpiredTokens,
        enabled: true
    },

    // Sync jobs
    syncExternalSystems: {
        schedule: '*/30 * * * *', // Every 30 minutes
        handler: syncJobs.syncExternalSystems,
        enabled: process.env.ENABLE_EXTERNAL_SYNC === 'true'
    },
    reconcilePayments: {
        schedule: '0 6 * * *', // Daily at 6:00 AM
        handler: syncJobs.reconcilePayments,
        enabled: true
    },
    syncMLPredictions: {
        schedule: '0 */4 * * *', // Every 4 hours
        handler: syncJobs.syncMLPredictions,
        enabled: process.env.ML_SERVICE_URL ? true : false
    },
    healthCheck: {
        schedule: '*/10 * * * *', // Every 10 minutes
        handler: syncJobs.healthCheck,
        enabled: true
    }
};

/**
 * Wrap job handler with error handling and logging
 */
function wrapJobHandler(name, handler) {
    return async () => {
        const startTime = Date.now();
        logger.info(`[Job] Starting: ${name}`);

        try {
            await handler();
            const duration = Date.now() - startTime;
            logger.info(`[Job] Completed: ${name} (${duration}ms)`);
        } catch (error) {
            const duration = Date.now() - startTime;
            logger.error(`[Job] Failed: ${name} (${duration}ms)`, error);
        }
    };
}

/**
 * Initialize all scheduled jobs
 */
function initializeJobs() {
    logger.info('[Jobs] Initializing job scheduler...');

    let enabledCount = 0;
    let disabledCount = 0;

    for (const [name, config] of Object.entries(JOB_SCHEDULES)) {
        if (!config.enabled) {
            logger.debug(`[Jobs] Skipping disabled job: ${name}`);
            disabledCount++;
            continue;
        }

        if (!cron.validate(config.schedule)) {
            logger.error(`[Jobs] Invalid cron expression for ${name}: ${config.schedule}`);
            continue;
        }

        const task = cron.schedule(
            config.schedule,
            wrapJobHandler(name, config.handler),
            {
                scheduled: true,
                timezone: process.env.TZ || 'Asia/Kolkata'
            }
        );

        scheduledTasks.set(name, task);
        enabledCount++;
        logger.debug(`[Jobs] Registered: ${name} (${config.schedule})`);
    }

    logger.info(`[Jobs] Initialized ${enabledCount} jobs (${disabledCount} disabled)`);
}

/**
 * Stop all scheduled jobs
 */
function stopAllJobs() {
    logger.info('[Jobs] Stopping all jobs...');

    for (const [name, task] of scheduledTasks) {
        task.stop();
        logger.debug(`[Jobs] Stopped: ${name}`);
    }

    scheduledTasks.clear();
    logger.info('[Jobs] All jobs stopped');
}

/**
 * Get status of all scheduled jobs
 */
function getJobsStatus() {
    const status = {};

    for (const [name, config] of Object.entries(JOB_SCHEDULES)) {
        const task = scheduledTasks.get(name);
        status[name] = {
            schedule: config.schedule,
            enabled: config.enabled,
            running: task ? true : false
        };
    }

    return status;
}

/**
 * Run a specific job manually
 */
async function runJobManually(jobName) {
    const config = JOB_SCHEDULES[jobName];

    if (!config) {
        throw new Error(`Job not found: ${jobName}`);
    }

    logger.info(`[Jobs] Running job manually: ${jobName}`);
    await wrapJobHandler(jobName, config.handler)();
}

/**
 * Pause a specific job
 */
function pauseJob(jobName) {
    const task = scheduledTasks.get(jobName);

    if (!task) {
        throw new Error(`Job not found or not running: ${jobName}`);
    }

    task.stop();
    logger.info(`[Jobs] Paused: ${jobName}`);
}

/**
 * Resume a specific job
 */
function resumeJob(jobName) {
    const task = scheduledTasks.get(jobName);

    if (!task) {
        throw new Error(`Job not found: ${jobName}`);
    }

    task.start();
    logger.info(`[Jobs] Resumed: ${jobName}`);
}

module.exports = {
    initializeJobs,
    stopAllJobs,
    getJobsStatus,
    runJobManually,
    pauseJob,
    resumeJob,
    JOB_SCHEDULES
};
