/**
 * LogiMetrics Backend - Main Entry Point
 * Initializes and starts the server with all configurations
 */

require('dotenv').config();

const app = require('./app');
const { initializePostgres, sequelize } = require('./config/database');
const { initializeMongoDB } = require('./config/mongodb');
const { initializeRedis } = require('./config/redis');
const { initializeSocket } = require('./config/socket');
const logger = require('./utils/logger.util');
const { startCronJobs } = require('./jobs');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize PostgreSQL
    await initializePostgres();
    logger.info('PostgreSQL connected successfully');

    // Initialize MongoDB
    await initializeMongoDB();
    logger.info('MongoDB connected successfully');

    // Initialize Redis (optional - won't fail if not available)
    try {
      await initializeRedis();
      logger.info('Redis connected successfully');
    } catch (redisError) {
      logger.warn('Redis connection failed, continuing without cache:', redisError.message);
    }

    // Create HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
    });

    // Initialize Socket.io
    initializeSocket(server);
    logger.info('Socket.io initialized');

    // Start cron jobs
    startCronJobs();
    logger.info('Cron jobs started');

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);
      
      server.close(async () => {
        logger.info('HTTP server closed');
        
        try {
          await sequelize.close();
          logger.info('PostgreSQL connection closed');
        } catch (err) {
          logger.error('Error closing PostgreSQL:', err);
        }

        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
