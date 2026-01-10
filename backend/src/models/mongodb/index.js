/**
 * MongoDB Models Index
 * Exports all MongoDB models
 */

const LiveTracking = require('./LiveTracking');
const ShipmentEvent = require('./ShipmentEvent');
const VehicleTelemetry = require('./VehicleTelemetry');
const AuditLog = require('./AuditLog');

module.exports = {
  LiveTracking,
  ShipmentEvent,
  VehicleTelemetry,
  AuditLog
};
