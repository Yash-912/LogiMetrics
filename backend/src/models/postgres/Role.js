/**
 * Role Model
 * PostgreSQL table for user roles
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Role = sequelize.define('Role', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isSystem: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'System roles cannot be deleted'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'roles',
  timestamps: true,
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['isActive'] }
  ]
});

// Default roles to be seeded
Role.DEFAULT_ROLES = [
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full system access with all permissions',
    isSystem: true
  },
  {
    name: 'fleet_manager',
    displayName: 'Fleet Manager',
    description: 'Manage vehicles, drivers, and shipments',
    isSystem: true
  },
  {
    name: 'driver',
    displayName: 'Driver',
    description: 'Handle deliveries and update shipment status',
    isSystem: true
  },
  {
    name: 'customer',
    displayName: 'Customer',
    description: 'Create shipments and track deliveries',
    isSystem: true
  },
  {
    name: 'accountant',
    displayName: 'Accountant',
    description: 'Manage invoices, payments, and financial reports',
    isSystem: true
  },
  {
    name: 'support',
    displayName: 'Support Staff',
    description: 'Handle customer queries and basic operations',
    isSystem: true
  }
];

module.exports = Role;
