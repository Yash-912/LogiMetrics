/**
 * Permission Model
 * PostgreSQL table for granular permissions
 */

const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  displayName: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  module: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Module/feature this permission belongs to'
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'Action type: create, read, update, delete, manage'
  }
}, {
  tableName: 'permissions',
  timestamps: true,
  indexes: [
    { fields: ['name'], unique: true },
    { fields: ['module'] },
    { fields: ['action'] }
  ]
});

// Default permissions to be seeded
Permission.DEFAULT_PERMISSIONS = [
  // User permissions
  { name: 'users.create', displayName: 'Create Users', module: 'users', action: 'create' },
  { name: 'users.read', displayName: 'View Users', module: 'users', action: 'read' },
  { name: 'users.update', displayName: 'Update Users', module: 'users', action: 'update' },
  { name: 'users.delete', displayName: 'Delete Users', module: 'users', action: 'delete' },
  { name: 'users.manage', displayName: 'Manage Users', module: 'users', action: 'manage' },

  // Shipment permissions
  { name: 'shipments.create', displayName: 'Create Shipments', module: 'shipments', action: 'create' },
  { name: 'shipments.read', displayName: 'View Shipments', module: 'shipments', action: 'read' },
  { name: 'shipments.update', displayName: 'Update Shipments', module: 'shipments', action: 'update' },
  { name: 'shipments.delete', displayName: 'Delete Shipments', module: 'shipments', action: 'delete' },
  { name: 'shipments.assign', displayName: 'Assign Shipments', module: 'shipments', action: 'assign' },
  { name: 'shipments.manage', displayName: 'Manage Shipments', module: 'shipments', action: 'manage' },

  // Vehicle permissions
  { name: 'vehicles.create', displayName: 'Create Vehicles', module: 'vehicles', action: 'create' },
  { name: 'vehicles.read', displayName: 'View Vehicles', module: 'vehicles', action: 'read' },
  { name: 'vehicles.update', displayName: 'Update Vehicles', module: 'vehicles', action: 'update' },
  { name: 'vehicles.delete', displayName: 'Delete Vehicles', module: 'vehicles', action: 'delete' },
  { name: 'vehicles.manage', displayName: 'Manage Vehicles', module: 'vehicles', action: 'manage' },

  // Driver permissions
  { name: 'drivers.create', displayName: 'Create Drivers', module: 'drivers', action: 'create' },
  { name: 'drivers.read', displayName: 'View Drivers', module: 'drivers', action: 'read' },
  { name: 'drivers.update', displayName: 'Update Drivers', module: 'drivers', action: 'update' },
  { name: 'drivers.delete', displayName: 'Delete Drivers', module: 'drivers', action: 'delete' },
  { name: 'drivers.manage', displayName: 'Manage Drivers', module: 'drivers', action: 'manage' },

  // Payment permissions
  { name: 'payments.create', displayName: 'Process Payments', module: 'payments', action: 'create' },
  { name: 'payments.read', displayName: 'View Payments', module: 'payments', action: 'read' },
  { name: 'payments.refund', displayName: 'Process Refunds', module: 'payments', action: 'refund' },
  { name: 'payments.manage', displayName: 'Manage Payments', module: 'payments', action: 'manage' },

  // Invoice permissions
  { name: 'invoices.create', displayName: 'Create Invoices', module: 'invoices', action: 'create' },
  { name: 'invoices.read', displayName: 'View Invoices', module: 'invoices', action: 'read' },
  { name: 'invoices.update', displayName: 'Update Invoices', module: 'invoices', action: 'update' },
  { name: 'invoices.manage', displayName: 'Manage Invoices', module: 'invoices', action: 'manage' },

  // Analytics permissions
  { name: 'analytics.read', displayName: 'View Analytics', module: 'analytics', action: 'read' },
  { name: 'analytics.export', displayName: 'Export Analytics', module: 'analytics', action: 'export' },
  { name: 'analytics.manage', displayName: 'Manage Analytics', module: 'analytics', action: 'manage' },

  // Settings permissions
  { name: 'settings.read', displayName: 'View Settings', module: 'settings', action: 'read' },
  { name: 'settings.update', displayName: 'Update Settings', module: 'settings', action: 'update' },
  { name: 'settings.manage', displayName: 'Manage Settings', module: 'settings', action: 'manage' },

  // Document permissions
  { name: 'documents.create', displayName: 'Upload Documents', module: 'documents', action: 'create' },
  { name: 'documents.read', displayName: 'View Documents', module: 'documents', action: 'read' },
  { name: 'documents.delete', displayName: 'Delete Documents', module: 'documents', action: 'delete' },
  { name: 'documents.verify', displayName: 'Verify Documents', module: 'documents', action: 'verify' }
];

module.exports = Permission;
