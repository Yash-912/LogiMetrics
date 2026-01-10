/**
 * MongoDB Database Configuration
 */

const mongoose = require("mongoose");
const logger = require("../utils/logger.util");

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb+srv://logimatrix:LogiMetrics123@logimatrix-shard-00-00.fwvtwz8.mongodb.net:27017/logi_matrix?retryWrites=true&w=majority";

let isConnected = false;

/**
 * Initialize MongoDB Connection
 */
async function initializePostgres() {
  if (isConnected) {
    logger.info("[MongoDB] Connection already established");
    return true;
  }

  try {
    const connection = await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });

    isConnected = true;
    logger.info(
      `[MongoDB] Connected to database: ${connection.connection.name}`
    );
    logger.info(`[MongoDB] Connection host: ${connection.connection.host}`);

    return connection;
  } catch (error) {
    logger.error("[MongoDB] Connection failed:", error.message);
    return null;
  }
}

/**
 * Get MongoDB Connection Status
 */
function getMongoDBStatus() {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name,
  };
}

/**
 * Close MongoDB Connection
 */
async function closeMongoDBConnection() {
  try {
    await mongoose.disconnect();
    isConnected = false;
    logger.info("[MongoDB] Disconnected successfully");
  } catch (error) {
    logger.error("[MongoDB] Disconnection error:", error.message);
  }
}

module.exports = {
  initializePostgres,
  getMongoDBStatus,
  closeMongoDBConnection,
  mongoose,
  Sequelize: mongoose, // For compatibility
  sequelize: mongoose, // For compatibility
};
