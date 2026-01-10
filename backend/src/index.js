/**
 * LogiMetrics Backend - Main Entry Point
 * Initializes and starts the server with all configurations
 */

require("dotenv").config();

const app = require("./app");
const { initializePostgres, sequelize } = require("./config/database");
const { initializeMongoDB } = require("./config/mongodb");
const { initializeSocket } = require("./config/socket");
const logger = require("./utils/logger.util");
const { initializeJobs } = require("./jobs");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize PostgreSQL
    console.log("Step 1: Connecting to PostgreSQL...");
    await initializePostgres();
    console.log("Step 1: PostgreSQL connected successfully");

    // Initialize MongoDB
    console.log("Step 2: Connecting to MongoDB...");
    const mongoConnection = await initializeMongoDB();

    if (mongoConnection) {
      console.log("Step 2: MongoDB connected successfully");
    } else {
      console.log("Step 2: MongoDB skipped");
    }

    // Create HTTP server
    console.log("Step 4: Starting HTTP server...");
    const server = app.listen(PORT, () => {
      console.log(
        `Step 4: Server running on port ${PORT} in ${
          process.env.NODE_ENV || "development"
        } mode`
      );
    });

    // Initialize Socket.io
    console.log("Step 5: Initializing Socket.io...");
    initializeSocket(server);
    console.log("Step 5: Socket.io initialized");

    // Start cron jobs
    console.log("Step 6: Starting cron jobs...");
    initializeJobs();
    console.log("Step 6: Cron jobs started");

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info("HTTP server closed");

        try {
          await sequelize.close();
          logger.info("PostgreSQL connection closed");
        } catch (err) {
          logger.error("Error closing PostgreSQL:", err);
        }

        process.exit(0);
      });

      // Force close after 30 seconds
      setTimeout(() => {
        logger.error(
          "Could not close connections in time, forcefully shutting down"
        );
        process.exit(1);
      }, 30000);
    };

    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
