/**
 * Company Model
 * PostgreSQL table for company/organization accounts
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  type: {
    type: DataTypes.ENUM('shipper', 'carrier', 'both', 'enterprise'),
    defaultValue: 'shipper'
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  website: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  logo: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  address: {
    type: DataTypes.JSONB,
    defaultValue: {
      street: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      coordinates: {
        lat: null,
        lng: null
      }
    }
  },
  registrationNumber: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'GST/Tax registration number'
  },
  panNumber: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  bankDetails: {
    type: DataTypes.JSONB,
    defaultValue: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      branch: ''
    }
  },
  settings: {
    type: DataTypes.JSONB,
    defaultValue: {
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      autoInvoicing: true,
      notifyOnDelivery: true,
      requirePOD: true
    }
  },
  subscription: {
    type: DataTypes.JSONB,
    defaultValue: {
      plan: 'free',
      startDate: null,
      endDate: null,
      features: []
    }
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
    defaultValue: 'pending'
  },
  verifiedAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'companies',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['type'] },
    { fields: ['status'] },
    { fields: ['registrationNumber'] }
  ]
});

module.exports = Company;
