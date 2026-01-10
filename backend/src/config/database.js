/**
 * PostgreSQL Database Configuration
 * Using Sequelize ORM
 */

const { Sequelize } = require("sequelize");
const logger = require("../utils/logger.util");

// Use DATABASE_URL if provided (for services like Neon.tech)
const databaseUrl = process.env.DATABASE_URL;

const config = databaseUrl
  ? {
      dialect: "postgres",
      logging:
        process.env.NODE_ENV === "development"
          ? (msg) => logger.debug(msg)
          : false,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      },
      pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    }
  : {
      host: process.env.POSTGRES_HOST || "localhost",
      port: parseInt(process.env.POSTGRES_PORT) || 5432,
      username: process.env.POSTGRES_USER || "logimetrics",
      password: process.env.POSTGRES_PASSWORD || "logimetrics123",
      database: process.env.POSTGRES_DB || "logistics",
      dialect: "postgres",
      logging:
        process.env.NODE_ENV === "development"
          ? (msg) => logger.debug(msg)
          : false,
      pool: {
        max: 20,
        min: 5,
        acquire: 30000,
        idle: 10000,
      },
      define: {
        timestamps: true,
        underscored: true,
        freezeTableName: true,
      },
    };

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, config)
  : new Sequelize(config.database, config.username, config.password, config);

async function initializePostgres() {
  try {
    await sequelize.authenticate();
    logger.info("PostgreSQL connection established successfully");

    // Auto-sync disabled - use migrations to create tables
    // To enable, uncomment the lines below:
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ force: false });
    //   logger.info('Database models synchronized');
    // }

    logger.info(
      "Auto-sync disabled. Run migrations to create tables: npm run migrate"
    );

    return sequelize;
  } catch (error) {
    logger.warn("PostgreSQL connection failed:", error.message);
    logger.warn(
      "App will continue without PostgreSQL - some features may not work"
    );
    return null;
  }
}

module.exports = {
  sequelize,
  initializePostgres,
  Sequelize,
};
