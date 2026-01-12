const express = require("express");
const AccidentZone = require("../models/mongodb/AccidentZone");
const { LiveTrackingAlert } = require("../models/mongodb");
const AccidentZoneAlerting = require("../services/AccidentZoneAlerting");
const logger = require("../utils/logger.util");

const router = express.Router();

// Heatmap data
router.get("/heatmap", async (req, res, next) => {
  try {
    const zones = await AccidentZone.find();
    res.json({ success: true, data: zones });
  } catch (err) {
    next(err);
  }
});

// Nearby alert zones
router.get("/nearby", async (req, res, next) => {
  try {
    const { lat, lng } = req.query;

    const zones = await AccidentZone.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: 500,
        },
      },
    });

    res.json({ success: true, data: zones });
  } catch (err) {
    next(err);
  }
});

// Get nearby zones for live tracking
router.get("/nearby-zones", async (req, res, next) => {
  try {
    const { lat, lng, radius = 5000 } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Latitude and longitude are required",
      });
    }

    const nearbyZones = await AccidentZoneAlerting.getNearbyZonesForLocation(
      Number(lat),
      Number(lng),
      Number(radius)
    );

    res.json({
      success: true,
      data: {
        zones: nearbyZones,
        count: nearbyZones.length,
        searchRadius: radius,
        location: { latitude: lat, longitude: lng },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get vehicle alerts
router.get("/vehicle/:vehicleId/alerts", async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { status = "active", limit = 50, hours = 24 } = req.query;

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const query = {
      vehicleId,
      createdAt: { $gte: cutoffTime },
    };

    if (status !== "all") {
      query.status = status;
    }

    const alerts = await LiveTrackingAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        vehicleId,
        timeRange: {
          from: cutoffTime,
          to: new Date(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get driver alerts
router.get("/driver/:driverId/alerts", async (req, res, next) => {
  try {
    const { driverId } = req.params;
    const { status = "active", limit = 50, hours = 24 } = req.query;

    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);

    const query = {
      driverId,
      createdAt: { $gte: cutoffTime },
    };

    if (status !== "all") {
      query.status = status;
    }

    const alerts = await LiveTrackingAlert.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        driverId,
        timeRange: {
          from: cutoffTime,
          to: new Date(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Get alert statistics for a vehicle
router.get("/vehicle/:vehicleId/stats", async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const { hours = 24 } = req.query;

    const stats = await AccidentZoneAlerting.getVehicleAlertStats(
      vehicleId,
      Number(hours)
    );

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found or no alerts",
      });
    }

    res.json({
      success: true,
      data: {
        vehicleId,
        stats,
        timeRange: {
          hours: hours,
          from: new Date(Date.now() - hours * 60 * 60 * 1000),
          to: new Date(),
        },
      },
    });
  } catch (err) {
    next(err);
  }
});

// Acknowledge an alert
router.patch("/alerts/:alertId/acknowledge", async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;

    const alert = await LiveTrackingAlert.findByIdAndUpdate(
      alertId,
      {
        status: "acknowledged",
        acknowledgedAt: new Date(),
        acknowledgedBy,
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
});

// Resolve an alert
router.patch("/alerts/:alertId/resolve", async (req, res, next) => {
  try {
    const { alertId } = req.params;
    const { resolvedBy } = req.body;

    const alert = await LiveTrackingAlert.findByIdAndUpdate(
      alertId,
      {
        status: "resolved",
        acknowledgedAt: new Date(),
        acknowledgedBy: resolvedBy,
      },
      { new: true }
    );

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found",
      });
    }

    res.json({
      success: true,
      data: alert,
    });
  } catch (err) {
    next(err);
  }
});

// Get all active alerts
router.get("/active", async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;

    const alerts = await LiveTrackingAlert.find({ status: "active" })
      .sort({ createdAt: -1 })
      .limit(Number(limit));

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
