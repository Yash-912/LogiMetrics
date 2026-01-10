const { successResponse } = require("../utils/response.util");

/**
 * Get accident heatmap data
 */
const getAccidentHeatmap = async (req, res, next) => {
    try {
        // Return mock data for now, or fetch from DB if Accodent model existed
        const accidentZones = [
            {
                _id: "zone-1",
                location: { coordinates: [73.8567, 18.5204] }, // Pune
                severity: "high",
                accidentCount: 15
            },
            {
                _id: "zone-2",
                location: { coordinates: [77.5946, 12.9716] }, // Bangalore
                severity: "medium",
                accidentCount: 8
            },
            {
                _id: "zone-3",
                location: { coordinates: [72.8777, 19.0760] }, // Mumbai
                severity: "high",
                accidentCount: 22
            }
        ];

        return successResponse(res, accidentZones, "Accident zones retrieved");
    } catch (err) {
        next(err);
    }
};

module.exports = {
    getAccidentHeatmap
};
