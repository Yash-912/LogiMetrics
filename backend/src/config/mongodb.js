/**
 * MongoDB Configuration
 * Using Mongoose ODM for tracking and logs
 */

const mongoose = require("mongoose");
const logger = require("../utils/logger.util");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://sagacitychess_db_user:pOU7R8EwhrsErudP@logimatrix-shard-00-00.fwvtwz8.mongodb.net:27017,logimatrix-shard-00-01.fwvtwz8.mongodb.net:27017,logimatrix-shard-00-02.fwvtwz8.mongodb.net:27017/logi_matrix?ssl=true&replicaSet=atlas-11x9yo-shard-0&authSource=admin&retryWrites=true&w=majority";

const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

async function initializeMongoDB() {
  try {
    mongoose.set("strictQuery", false);

    // ✅ Attach listeners FIRST
    mongoose.connection.on("connected", () => {
      logger.info("MongoDB connected successfully");
    });

    mongoose.connection.on("error", (err) => {
      logger.error("MongoDB connection error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });

    // ✅ Now connect
    await mongoose.connect(MONGODB_URI, mongoOptions);

    return mongoose.connection;
  } catch (error) {
    logger.warn("MongoDB connection failed:", error.message);
    logger.warn(
      "App will continue without MongoDB - some features may not work"
    );
    return null;
  }
}

async function closeMongoDB() {
  try {
    await mongoose.connection.close();
    logger.info("MongoDB connection closed");
  } catch (error) {
    logger.error("Error closing MongoDB connection:", error);
    throw error;
  }
}

module.exports = {
  mongoose,
  initializeMongoDB,
  closeMongoDB,
};
