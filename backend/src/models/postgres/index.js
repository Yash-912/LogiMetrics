/**
 * PostgreSQL Models Index
 * Initializes Sequelize and exports all models
 */

const { sequelize, Sequelize } = require('../../config/database');

// Import models
const User = require('./User');
const Company = require('./Company');
const Role = require('./Role');
const Permission = require('./Permission');
const Shipment = require('./Shipment');
const Vehicle = require('./Vehicle');
const Driver = require('./Driver');
const Route = require('./Route');
const Invoice = require('./Invoice');
const Transaction = require('./Transaction');
const PricingRule = require('./PricingRule');
const Document = require('./Document');
const Notification = require('./Notification');

// Define associations
// User - Company
Company.hasMany(User, { foreignKey: 'companyId', as: 'users' });
User.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// User - Role
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'role' });

// Role - Permission (Many-to-Many)
Role.belongsToMany(Permission, { through: 'RolePermissions', as: 'permissions' });
Permission.belongsToMany(Role, { through: 'RolePermissions', as: 'roles' });

// Shipment associations
Company.hasMany(Shipment, { foreignKey: 'companyId', as: 'shipments' });
Shipment.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

User.hasMany(Shipment, { foreignKey: 'customerId', as: 'customerShipments' });
Shipment.belongsTo(User, { foreignKey: 'customerId', as: 'customer' });

Driver.hasMany(Shipment, { foreignKey: 'driverId', as: 'shipments' });
Shipment.belongsTo(Driver, { foreignKey: 'driverId', as: 'driver' });

Vehicle.hasMany(Shipment, { foreignKey: 'vehicleId', as: 'shipments' });
Shipment.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'vehicle' });

// Vehicle associations
Company.hasMany(Vehicle, { foreignKey: 'companyId', as: 'vehicles' });
Vehicle.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// Driver associations
Company.hasMany(Driver, { foreignKey: 'companyId', as: 'drivers' });
Driver.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

User.hasOne(Driver, { foreignKey: 'userId', as: 'driverProfile' });
Driver.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Vehicle.hasOne(Driver, { foreignKey: 'vehicleId', as: 'assignedDriver' });
Driver.belongsTo(Vehicle, { foreignKey: 'vehicleId', as: 'assignedVehicle' });

// Route associations
Shipment.hasMany(Route, { foreignKey: 'shipmentId', as: 'routes' });
Route.belongsTo(Shipment, { foreignKey: 'shipmentId', as: 'shipment' });

// Invoice associations
Shipment.hasOne(Invoice, { foreignKey: 'shipmentId', as: 'invoice' });
Invoice.belongsTo(Shipment, { foreignKey: 'shipmentId', as: 'shipment' });

Company.hasMany(Invoice, { foreignKey: 'companyId', as: 'invoices' });
Invoice.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

// Transaction associations
Invoice.hasMany(Transaction, { foreignKey: 'invoiceId', as: 'transactions' });
Transaction.belongsTo(Invoice, { foreignKey: 'invoiceId', as: 'invoice' });

// Document associations
Shipment.hasMany(Document, { foreignKey: 'shipmentId', as: 'documents' });
Document.belongsTo(Shipment, { foreignKey: 'shipmentId', as: 'shipment' });

User.hasMany(Document, { foreignKey: 'uploadedBy', as: 'uploadedDocuments' });
Document.belongsTo(User, { foreignKey: 'uploadedBy', as: 'uploader' });

// Notification associations
User.hasMany(Notification, { foreignKey: 'userId', as: 'notifications' });
Notification.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// PricingRule associations
Company.hasMany(PricingRule, { foreignKey: 'companyId', as: 'pricingRules' });
PricingRule.belongsTo(Company, { foreignKey: 'companyId', as: 'company' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  Company,
  Role,
  Permission,
  Shipment,
  Vehicle,
  Driver,
  Route,
  Invoice,
  Transaction,
  PricingRule,
  Document,
  Notification
};
