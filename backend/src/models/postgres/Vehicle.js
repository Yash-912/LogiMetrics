/**
 * Vehicle Model
 * PostgreSQL table for fleet vehicles
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Vehicle = sequelize.define('Vehicle', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'companies',
      key: 'id'
    }
  },
  registrationNumber: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true
  },
  type: {
    type: DataTypes.ENUM('bike', 'auto', 'mini_van', 'van', 'mini_truck', 'truck', 'container', 'refrigerated'),
    allowNull: false
  },
  make: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  model: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  year: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  color: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  capacity: {
    type: DataTypes.JSONB,
    defaultValue: {
      weight: 0, // in kg
      volume: 0, // in cubic meters
      pallets: 0
    }
  },
  fuelType: {
    type: DataTypes.ENUM('petrol', 'diesel', 'cng', 'electric', 'hybrid'),
    defaultValue: 'diesel'
  },
  fuelEfficiency: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
    comment: 'km per liter'
  },
  status: {
    type: DataTypes.ENUM('available', 'in_use', 'maintenance', 'inactive', 'retired'),
    defaultValue: 'available'
  },
  currentLocation: {
    type: DataTypes.JSONB,
    defaultValue: {
      coordinates: { lat: null, lng: null },
      address: '',
      updatedAt: null
    }
  },
  odometer: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Current odometer reading in km'
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: {
      registration: { url: null, expiryDate: null },
      insurance: { url: null, expiryDate: null },
      fitness: { url: null, expiryDate: null },
      permit: { url: null, expiryDate: null },
      puc: { url: null, expiryDate: null }
    }
  },
  maintenance: {
    type: DataTypes.JSONB,
    defaultValue: {
      lastServiceDate: null,
      lastServiceOdometer: 0,
      nextServiceDate: null,
      nextServiceOdometer: 0,
      serviceIntervalKm: 10000,
      serviceIntervalDays: 90
    }
  },
  features: {
    type: DataTypes.JSONB,
    defaultValue: {
      gpsEnabled: true,
      temperatureControlled: false,
      minTemp: null,
      maxTemp: null,
      hasLiftgate: false,
      hasRamp: false
    }
  },
  assignedHub: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'vehicles',
  timestamps: true,
  paranoid: true,
  indexes: [
    { fields: ['registrationNumber'], unique: true },
    { fields: ['companyId'] },
    { fields: ['type'] },
    { fields: ['status'] }
  ]
});

// Instance methods
Vehicle.prototype.isAvailable = function() {
  return this.status === 'available';
};

Vehicle.prototype.needsMaintenance = function() {
  const { maintenance } = this;
  const today = new Date();
  
  if (maintenance.nextServiceDate && new Date(maintenance.nextServiceDate) <= today) {
    return true;
  }
  
  if (maintenance.nextServiceOdometer && this.odometer >= maintenance.nextServiceOdometer) {
    return true;
  }
  
  return false;
};

Vehicle.prototype.getDocumentStatus = function() {
  const { documents } = this;
  const today = new Date();
  const warnings = [];
  const expired = [];
  
  Object.entries(documents).forEach(([docType, doc]) => {
    if (doc.expiryDate) {
      const expiryDate = new Date(doc.expiryDate);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        expired.push(docType);
      } else if (daysUntilExpiry <= 30) {
        warnings.push({ docType, daysUntilExpiry });
      }
    }
  });
  
  return { expired, warnings };
};

module.exports = Vehicle;
