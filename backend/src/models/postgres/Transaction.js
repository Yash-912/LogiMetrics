/**
 * Transaction Model
 * PostgreSQL table for payment transactions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  invoiceId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'invoices',
      key: 'id'
    }
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'External transaction ID from payment gateway'
  },
  paymentMethod: {
    type: DataTypes.ENUM('card', 'upi', 'netbanking', 'wallet', 'cash', 'cheque', 'bank_transfer'),
    allowNull: false
  },
  gateway: {
    type: DataTypes.ENUM('razorpay', 'stripe', 'manual'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR'
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'),
    defaultValue: 'pending'
  },
  gatewayResponse: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Raw response from payment gateway'
  },
  gatewayOrderId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  refundId: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  refundAmount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  refundReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'transactions',
  timestamps: true,
  indexes: [
    { fields: ['invoiceId'] },
    { fields: ['transactionId'] },
    { fields: ['status'] },
    { fields: ['gateway'] },
    { fields: ['createdAt'] }
  ]
});

module.exports = Transaction;
