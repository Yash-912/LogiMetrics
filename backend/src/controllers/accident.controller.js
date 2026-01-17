const { successResponse } = require("../utils/response.util");
const { AccidentZone } = require("../models/mongodb");

/**
 * Get accident heatmap data
 */
const getAccidentHeatmap = async (req, res, next) => {
    try {
        // Fetch real accident zones from DB
        const accidentZones = await AccidentZone.find({});

        return successResponse(res, accidentZones, "Accident zones retrieved");
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAccidentHeatmap
};
