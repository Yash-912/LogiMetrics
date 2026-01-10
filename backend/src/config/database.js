/**
 * PostgreSQL Database Configuration
 * Using Sequelize ORM
 */

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger.util');

const config = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT) || 5432,
  username: process.env.POSTGRES_USER || 'logimetrics',
  password: process.env.POSTGRES_PASSWORD || 'logimetrics123',
  database: process.env.POSTGRES_DB || 'logistics',
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 20,
    min: 5,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
};

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

async function initializePostgres() {
  try {
    await sequelize.authenticate();
    logger.info('PostgreSQL connection established successfully');
    
    // Sync models in development (be careful in production)
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database models synchronized');
    }
    
    return sequelize;
  } catch (error) {
    logger.error('Unable to connect to PostgreSQL:', error);
    throw error;
  }
}

module.exports = {
  sequelize,
  initializePostgres,
  Sequelize
};
