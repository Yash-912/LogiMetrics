/**
 * Notification Model
 * PostgreSQL table for user notifications
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM(
      'shipment_created',
      'shipment_updated',
      'shipment_delivered',
      'shipment_delayed',
      'payment_received',
      'payment_due',
      'invoice_generated',
      'driver_assigned',
      'maintenance_due',
      'document_uploaded',
      'system_alert',
      'general'
    ),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  data: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Additional data like shipmentId, invoiceId, etc.'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  channels: {
    type: DataTypes.JSONB,
    defaultValue: {
      inApp: true,
      email: false,
      sms: false,
      push: false
    }
  },
  deliveryStatus: {
    type: DataTypes.JSONB,
    defaultValue: {
      inApp: 'delivered',
      email: null,
      sms: null,
      push: null
    }
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  readAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actionUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'URL to navigate when clicked'
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'notifications',
  timestamps: true,
  indexes: [
    { fields: ['userId'] },
    { fields: ['type'] },
    { fields: ['isRead'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = Notification;
