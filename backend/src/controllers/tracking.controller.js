const { LiveTracking } = require("../models/mongodb");
const { successResponse, errorResponse } = require("../utils/response.util");

/**
 * Get live location of all vehicles (Latest position)
 */
const getLiveFleetLocation = async (req, res, next) => {
  try {
    // Aggregation to get the latest document for each vehicleId
    const fleetLocations = await LiveTracking.aggregate([
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: "$vehicleId",
          latestLocation: { $first: "$$ROOT" }
        }
      },
      {
        $replaceRoot: { newRoot: "$latestLocation" }
      }
    ]);

    return successResponse(res, fleetLocations, "Live fleet locations retrieved successfully");
  } catch (err) {
    next(err);
  }
};

/**
 * Get history for a specific vehicle
 */
const getVehicleHistory = async (req, res, next) => {
  try {
    const { vehicleId } = req.params;
    const history = await LiveTracking.find({ vehicleId })
      .sort({ timestamp: -1 })
      .limit(100);

    return successResponse(res, history, "Vehicle tracking history retrieved successfully");
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getLiveFleetLocation,
  getVehicleHistory
};
