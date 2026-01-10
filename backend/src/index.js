/**
 * LogiMetrics Backend - Main Entry Point
 * Initializes and starts the server with MongoDB only
 */

require("dotenv").config();

const app = require("./app");
const { initializePostgres } = require("./config/database");
const { initializeSocket } = require("./config/socket");
const logger = require("./utils/logger.util");
const { initializeJobs } = require("./jobs");

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    // Initialize MongoDB (using initializePostgres for compatibility)
    console.log("Step 1: Connecting to MongoDB...");
    await initializePostgres();
    console.log("Step 1: MongoDB connected successfully");

    // Create HTTP server
    console.log("Step 2: Starting HTTP server...");
    const server = app.listen(PORT, () => {
      console.log(
        `Step 2: Server running on port ${PORT} in ${
          process.env.NODE_ENV || "development"
        } mode`
      );
    });

    // Initialize Socket.io
    console.log("Step 3: Initializing Socket.io...");
    initializeSocket(server);
    console.log("Step 3: Socket.io initialized");

    // Start cron jobs
    console.log("Step 4: Starting cron jobs...");
    initializeJobs();
    console.log("Step 4: Cron jobs started");

    // Graceful shutdown
    const gracefulShutdown = async (signal) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      server.close(async () => {
        logger.info("HTTP server closed");
        process.exit(0);
      });

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
