/**
 * Driver Model
 * PostgreSQL table for driver profiles
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Driver = sequelize.define('Driver', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  vehicleId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'vehicles',
      key: 'id'
    }
  },
  licenseNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  licenseType: {
    type: DataTypes.ENUM('two_wheeler', 'light_motor', 'heavy_motor', 'transport'),
    allowNull: false
  },
  licenseExpiry: {
    type: DataTypes.DATE,
    allowNull: false
  },
  licenseDocument: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('available', 'on_duty', 'on_break', 'offline', 'inactive'),
    defaultValue: 'offline'
  },
  currentLocation: {
    type: DataTypes.JSONB,
    defaultValue: {
      coordinates: { lat: null, lng: null },
      address: '',
      updatedAt: null
    }
  },
  emergencyContact: {
    type: DataTypes.JSONB,
    defaultValue: {
      name: '',
      phone: '',
      relationship: ''
    }
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: {
      idProof: { url: null, verified: false },
      addressProof: { url: null, verified: false },
      backgroundCheck: { status: 'pending', verifiedAt: null }
    }
  },
  bankDetails: {
    type: DataTypes.JSONB,
    defaultValue: {
      accountName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: ''
    }
  },
  performance: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalTrips: 0,
      completedTrips: 0,
      cancelledTrips: 0,
      totalDistance: 0,
      rating: 0,
      ratingCount: 0,
      onTimeDeliveryRate: 0
    }
  },
  workingHours: {
    type: DataTypes.JSONB,
    defaultValue: {
      monday: { start: '09:00', end: '18:00', enabled: true },
      tuesday: { start: '09:00', end: '18:00', enabled: true },
      wednesday: { start: '09:00', end: '18:00', enabled: true },
      thursday: { start: '09:00', end: '18:00', enabled: true },
      friday: { start: '09:00', end: '18:00', enabled: true },
      saturday: { start: '09:00', end: '14:00', enabled: true },
      sunday: { start: '00:00', end: '00:00', enabled: false }
    }
  },
  earnings: {
    type: DataTypes.JSONB,
    defaultValue: {
      totalEarnings: 0,
      pendingPayout: 0,
      lastPayout: null,
      lastPayoutAmount: 0
    }
  },
  joinedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'drivers',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['userId'], unique: true },
    { fields: ['licenseNumber'], unique: true },
    { fields: ['companyId'] },
    { fields: ['vehicleId'] },
    { fields: ['status'] }
  ]
});

// Instance methods
Driver.prototype.isAvailable = function() {
  return this.status === 'available';
};

Driver.prototype.getRating = function() {
  if (this.performance.ratingCount === 0) return 0;
  return (this.performance.rating / this.performance.ratingCount).toFixed(1);
};

Driver.prototype.addRating = function(rating) {
  this.performance.rating += rating;
  this.performance.ratingCount += 1;
  return this.getRating();
};

Driver.prototype.isLicenseValid = function() {
  return new Date(this.licenseExpiry) > new Date();
};

module.exports = Driver;
