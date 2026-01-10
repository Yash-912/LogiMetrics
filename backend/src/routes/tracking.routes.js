const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth.middleware");
const { getLiveFleetLocation, getVehicleHistory } = require("../controllers/tracking.controller");

// Protect all routes
router.use(authenticate);

// Get live location of all vehicles
router.get("/live", getLiveFleetLocation);

// Get history for a specific vehicle
router.get("/:vehicleId/history", getVehicleHistory);

module.exports = router;
