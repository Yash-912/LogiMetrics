/**
 * Queue Service
 * Background job queue management using Bull
 */

const Queue = require('bull');
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger.util');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Queue instances
const queues = {};

/**
 * Get or create a queue
 */
function getQueue(name) {
    if (!queues[name]) {
        queues[name] = new Queue(name, REDIS_URL, {
            defaultJobOptions: {
                removeOnComplete: 100,
                removeOnFail: 50,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                }
            }
        });

        // Add event listeners
        queues[name].on('failed', (job, err) => {
            logger.error(`Job ${job.id} in queue ${name} failed:`, err);
        });

        queues[name].on('completed', (job) => {
            logger.debug(`Job ${job.id} in queue ${name} completed`);
        });

        queues[name].on('stalled', (job) => {
            logger.warn(`Job ${job.id} in queue ${name} stalled`);
        });
    }

    return queues[name];
}

/**
 * Add job to queue
 */
async function addJob(queueName, data, options = {}) {
    const queue = getQueue(queueName);
    const job = await queue.add(data, {
        priority: options.priority || 0,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        jobId: options.jobId,
        repeat: options.repeat
    });

    logger.info(`Job ${job.id} added to queue ${queueName}`);
    return job;
}

/**
 * Add delayed job
 */
async function addDelayedJob(queueName, data, delayMs) {
    return addJob(queueName, data, { delay: delayMs });
}

/**
 * Add scheduled job (cron)
 */
async function addScheduledJob(queueName, data, cronExpression) {
    return addJob(queueName, data, { repeat: { cron: cronExpression } });
}

/**
 * Process queue jobs
 */
function processQueue(queueName, processor, concurrency = 1) {
    const queue = getQueue(queueName);
    queue.process(concurrency, async (job) => {
        logger.info(`Processing job ${job.id} from queue ${queueName}`);
        return processor(job.data, job);
    });
}

/**
 * Get job by ID
 */
async function getJob(queueName, jobId) {
    const queue = getQueue(queueName);
    return queue.getJob(jobId);
}

/**
 * Get job status
 */
async function getJobStatus(queueName, jobId) {
    const job = await getJob(queueName, jobId);
    if (!job) return null;

    const state = await job.getState();
    return {
        id: job.id,
        state,
        data: job.data,
        progress: job.progress(),
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn
    };
}

/**
 * Retry failed job
 */
async function retryJob(queueName, jobId) {
    const job = await getJob(queueName, jobId);
    if (!job) throw new Error('Job not found');

    await job.retry();
    logger.info(`Job ${jobId} retried in queue ${queueName}`);
    return true;
}

/**
 * Remove job
 */
async function removeJob(queueName, jobId) {
    const job = await getJob(queueName, jobId);
    if (!job) throw new Error('Job not found');

    await job.remove();
    logger.info(`Job ${jobId} removed from queue ${queueName}`);
    return true;
}

/**
 * Get queue stats
 */
async function getQueueStats(queueName) {
    const queue = getQueue(queueName);

    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.getPausedCount()
    ]);

    return { waiting, active, completed, failed, delayed, paused };
}

/**
 * Pause queue
 */
async function pauseQueue(queueName) {
    const queue = getQueue(queueName);
    await queue.pause();
    logger.info(`Queue ${queueName} paused`);
    return true;
}

/**
 * Resume queue
 */
async function resumeQueue(queueName) {
    const queue = getQueue(queueName);
    await queue.resume();
    logger.info(`Queue ${queueName} resumed`);
    return true;
}

/**
 * Clean queue (remove completed/failed jobs)
 */
async function cleanQueue(queueName, grace = 0, type = 'completed') {
    const queue = getQueue(queueName);
    const cleaned = await queue.clean(grace, type);
    logger.info(`Cleaned ${cleaned.length} ${type} jobs from queue ${queueName}`);
    return cleaned.length;
}

/**
 * Empty queue (remove all jobs)
 */
async function emptyQueue(queueName) {
    const queue = getQueue(queueName);
    await queue.empty();
    logger.info(`Queue ${queueName} emptied`);
    return true;
}

/**
 * Close queue
 */
async function closeQueue(queueName) {
    if (queues[queueName]) {
        await queues[queueName].close();
        delete queues[queueName];
        logger.info(`Queue ${queueName} closed`);
    }
    return true;
}

/**
 * Close all queues
 */
async function closeAllQueues() {
    const queueNames = Object.keys(queues);
    await Promise.all(queueNames.map(name => closeQueue(name)));
    logger.info('All queues closed');
    return true;
}

/**
 * Get all queue names
 */
function getActiveQueues() {
    return Object.keys(queues);
}

// Queue names constants
const QUEUE_NAMES = {
    EMAIL: 'email-queue',
    SMS: 'sms-queue',
    NOTIFICATION: 'notification-queue',
    INVOICE: 'invoice-queue',
    TRACKING: 'tracking-queue',
    ANALYTICS: 'analytics-queue',
    CLEANUP: 'cleanup-queue',
    SYNC: 'sync-queue'
};

module.exports = {
    QUEUE_NAMES,
    getQueue,
    addJob,
    addDelayedJob,
    addScheduledJob,
    processQueue,
    getJob,
    getJobStatus,
    retryJob,
    removeJob,
    getQueueStats,
    pauseQueue,
    resumeQueue,
    cleanQueue,
    emptyQueue,
    closeQueue,
    closeAllQueues,
    getActiveQueues
};
