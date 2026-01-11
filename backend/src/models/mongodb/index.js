/**
 * MongoDB Models Index
 * Exports all MongoDB models
 */

const User = require("./User");
const Company = require("./Company");
const Vehicle = require("./Vehicle");
const Driver = require("./Driver");
const Shipment = require("./Shipment");
const Location = require("./Location");
const Route = require("./Route");
const Invoice = require("./Invoice");
const Transaction = require("./Transaction");
const LiveTracking = require("./LiveTracking");
const ShipmentEvent = require("./ShipmentEvent");
const VehicleTelemetry = require("./VehicleTelemetry");
const AuditLog = require("./AuditLog");
const AccidentZone = require("./AccidentZone");
const LiveTrackingAlert = require("./LiveTrackingAlert");

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
  AccidentZone,
  LiveTrackingAlert,
};
