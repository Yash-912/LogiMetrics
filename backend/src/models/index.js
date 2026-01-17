/**
 * Main Models Export
 * Using MongoDB only
 */

const {
  User,
  Company,
  Vehicle,
  Driver,
  Shipment,
  Location,
  Route,
  Invoice,
  Transaction,
  LiveTracking,
  ShipmentEvent,
  VehicleTelemetry,
  AuditLog,
} = require("./mongodb");

module.exports = {
  User,
  Company,
  Vehicle,
  Driver,
  Shipment,
  Location,
  Route,
  Invoice,
  Transaction,
  LiveTracking,
  ShipmentEvent,
  VehicleTelemetry,
  AuditLog,
};
