/**
 * Route Model
 * PostgreSQL table for shipment routes
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Route = sequelize.define('Route', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  shipmentId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'shipments',
      key: 'id'
    }
  },
  waypoints: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of waypoint objects with coordinates and details'
  },
  polyline: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Encoded polyline for map display'
  },
  distance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Total distance in kilometers'
  },
  estimatedTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Estimated time in minutes'
  },
  actualTime: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Actual time taken in minutes'
  },
  startedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('planned', 'active', 'completed', 'cancelled'),
    defaultValue: 'planned'
  },
  trafficConditions: {
    type: DataTypes.JSONB,
    defaultValue: {
      level: 'normal', // light, normal, heavy, severe
      delayMinutes: 0,
      updatedAt: null
    }
  },
  deviations: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of route deviation events'
  },
  optimizedOrder: {
    type: DataTypes.ARRAY(DataTypes.INTEGER),
    allowNull: true,
    comment: 'Optimized waypoint order for multi-stop routes'
  }
}, {
  tableName: 'routes',
  timestamps: true,
  indexes: [
    { fields: ['shipmentId'] },
    { fields: ['status'] }
  ]
});

module.exports = Route;
