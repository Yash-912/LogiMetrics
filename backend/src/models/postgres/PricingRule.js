/**
 * PricingRule Model
 * PostgreSQL table for pricing configurations
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const PricingRule = sequelize.define('PricingRule', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  companyId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'companies',
      key: 'id'
    },
    comment: 'Null for system-wide rules'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  vehicleType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Null applies to all vehicle types'
  },
  serviceType: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Null applies to all service types'
  },
  baseRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Base rate per shipment'
  },
  perKmRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Rate per kilometer'
  },
  perKgRate: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    comment: 'Rate per kilogram'
  },
  minimumCharge: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: 'Minimum charge for any shipment'
  },
  surcharges: {
    type: DataTypes.JSONB,
    defaultValue: {
      fragile: 0,
      hazardous: 0,
      oversized: 0,
      urgent: 0,
      weekend: 0,
      holiday: 0,
      nightDelivery: 0,
      codHandling: 0
    }
  },
  weightSlabs: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Weight-based pricing slabs'
  },
  distanceSlabs: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Distance-based pricing slabs'
  },
  taxRate: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 18,
    comment: 'Tax percentage (GST)'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'INR'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  validFrom: {
    type: DataTypes.DATE,
    allowNull: true
  },
  validTo: {
    type: DataTypes.DATE,
    allowNull: true
  },
  priority: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: 'Higher priority rules are applied first'
  }
}, {
  tableName: 'pricing_rules',
  timestamps: true,
  indexes: [
    { fields: ['companyId'] },
    { fields: ['vehicleType'] },
    { fields: ['serviceType'] },
    { fields: ['isActive'] },
    { fields: ['priority'] }
  ]
});

// Static method to calculate price
PricingRule.calculatePrice = function(rule, shipmentDetails) {
  const { distance = 0, weight = 0, serviceType = 'standard', options = {} } = shipmentDetails;
  
  let baseCharge = rule.baseRate;
  let distanceCharge = distance * rule.perKmRate;
  let weightCharge = weight * rule.perKgRate;
  
  // Apply weight slabs if defined
  if (rule.weightSlabs && rule.weightSlabs.length > 0) {
    const slab = rule.weightSlabs.find(s => weight >= s.minWeight && weight < s.maxWeight);
    if (slab) {
      weightCharge = slab.rate * weight;
    }
  }
  
  // Apply distance slabs if defined
  if (rule.distanceSlabs && rule.distanceSlabs.length > 0) {
    const slab = rule.distanceSlabs.find(s => distance >= s.minDistance && distance < s.maxDistance);
    if (slab) {
      distanceCharge = slab.rate * distance;
    }
  }
  
  // Calculate surcharges
  let surcharges = 0;
  if (options.fragile) surcharges += rule.surcharges.fragile || 0;
  if (options.hazardous) surcharges += rule.surcharges.hazardous || 0;
  if (options.urgent) surcharges += rule.surcharges.urgent || 0;
  if (options.cod) surcharges += rule.surcharges.codHandling || 0;
  
  const subtotal = Math.max(baseCharge + distanceCharge + weightCharge + surcharges, rule.minimumCharge);
  const tax = subtotal * (rule.taxRate / 100);
  const total = subtotal + tax;
  
  return {
    baseCharge,
    distanceCharge,
    weightCharge,
    surcharges,
    subtotal,
    taxRate: rule.taxRate,
    tax,
    total,
    currency: rule.currency
  };
};

module.exports = PricingRule;
