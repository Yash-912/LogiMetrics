/**
 * Shipment Model
 * PostgreSQL table for shipment records
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const { generateTrackingId } = require('../../utils/validation.util');

const Shipment = sequelize.define('Shipment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  trackingId: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  customerId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  driverId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'drivers',
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
  origin: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      coordinates: { lat: null, lng: null },
      contactName: '',
      contactPhone: ''
    }
  },
  destination: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      coordinates: { lat: null, lng: null },
      contactName: '',
      contactPhone: ''
    }
  },
  packageDetails: {
    type: DataTypes.JSONB,
    defaultValue: {
      weight: 0,
      weightUnit: 'kg',
      dimensions: { length: 0, width: 0, height: 0 },
      dimensionUnit: 'cm',
      quantity: 1,
      description: '',
      category: 'general',
      fragile: false,
      hazardous: false,
      temperatureControlled: false
    }
  },
  status: {
    type: DataTypes.ENUM(
      'pending',
      'confirmed',
      'pickup_scheduled',
      'picked_up',
      'in_transit',
      'out_for_delivery',
      'delivered',
      'failed_delivery',
      'returned',
      'cancelled'
    ),
    defaultValue: 'pending'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    defaultValue: 'normal'
  },
  serviceType: {
    type: DataTypes.ENUM('standard', 'express', 'same_day', 'next_day', 'scheduled'),
    defaultValue: 'standard'
  },
  scheduledPickup: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualPickup: {
    type: DataTypes.DATE,
    allowNull: true
  },
  estimatedDelivery: {
    type: DataTypes.DATE,
    allowNull: true
  },
  actualDelivery: {
    type: DataTypes.DATE,
    allowNull: true
  },
  currentLocation: {
    type: DataTypes.JSONB,
    defaultValue: {
      coordinates: { lat: null, lng: null },
      address: '',
      updatedAt: null
    }
  },
  distance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: 'Distance in kilometers'
  },
  cost: {
    type: DataTypes.JSONB,
    defaultValue: {
      baseRate: 0,
      distanceCharge: 0,
      weightCharge: 0,
      serviceCharge: 0,
      taxes: 0,
      discount: 0,
      total: 0,
      currency: 'INR'
    }
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'partial', 'paid', 'refunded'),
    defaultValue: 'pending'
  },
  instructions: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Special delivery instructions'
  },
  proofOfDelivery: {
    type: DataTypes.JSONB,
    defaultValue: {
      signature: null,
      photo: null,
      receiverName: null,
      receivedAt: null,
      notes: null
    }
  },
  failureReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
}, {
  tableName: 'shipments',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['trackingId'], unique: true },
    { fields: ['companyId'] },
    { fields: ['customerId'] },
    { fields: ['driverId'] },
    { fields: ['vehicleId'] },
    { fields: ['status'] },
    { fields: ['paymentStatus'] },
    { fields: ['createdAt'] },
    { fields: ['estimatedDelivery'] }
  ],
  hooks: {
    beforeCreate: (shipment) => {
      if (!shipment.trackingId) {
        shipment.trackingId = generateTrackingId();
      }
    }
  }
});

// Instance methods
Shipment.prototype.isEditable = function() {
  return ['pending', 'confirmed', 'pickup_scheduled'].includes(this.status);
};

Shipment.prototype.canBeCancelled = function() {
  return !['delivered', 'cancelled', 'returned'].includes(this.status);
};

module.exports = Shipment;
