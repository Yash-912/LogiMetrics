/**
 * Document Model
 * PostgreSQL table for uploaded documents
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Document = sequelize.define('Document', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  shipmentId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'shipments',
      key: 'id'
    }
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM(
      'pod', // Proof of Delivery
      'eway_bill',
      'consignment_note',
      'invoice',
      'lorry_receipt',
      'insurance',
      'customs',
      'other'
    ),
    allowNull: false
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileKey: {
    type: DataTypes.STRING(500),
    allowNull: false,
    comment: 'S3 key or file path'
  },
  fileUrl: {
    type: DataTypes.STRING(1000),
    allowNull: true
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Size in bytes'
  },
  status: {
    type: DataTypes.ENUM('pending', 'verified', 'rejected'),
    defaultValue: 'pending'
  },
  verifiedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  rejectionReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  extractedData: {
    type: DataTypes.JSONB,
    defaultValue: {},
    comment: 'Data extracted via OCR'
  },
  expiryDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'documents',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['shipmentId'] },
    { fields: ['uploadedBy'] },
    { fields: ['type'] },
    { fields: ['status'] }
  ]
});

module.exports = Document;
