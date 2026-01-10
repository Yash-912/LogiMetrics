/**
 * Accident Zone Alerting Service
 * Monitors vehicle locations and alerts when entering accident-prone zones
 */

const {
    AccidentZone,
    LiveTracking,
    LiveTrackingAlert,
} = require("../models/mongodb");
const logger = require("../utils/logger.util");

const EARTH_RADIUS_KM = 6371;
const ALERT_RADIUS_METERS = 1000; // Alert when within 1km of accident zone
const BUFFER_TIME_MS = 60000; // Don't re-alert for same zone within 1 minute

class AccidentZoneAlerting {
    constructor() {
        this.activeAlerts = new Map(); // Track active alerts to avoid duplicates
    }

    /**
     * Check if a vehicle location is near accident zones
     * @param {Object} locationData - Location update from vehicle
     * @returns {Promise<Array>} Array of nearby accident zones
     */
    async checkNearbyZones(locationData) {
        try {
            const { vehicleId, longitude, latitude } = locationData;

            // Find accident zones within alert radius
            const nearbyZones = await AccidentZone.find({
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [longitude, latitude],
                        },
                        $maxDistance: ALERT_RADIUS_METERS,
                    },
                },
            });

            return nearbyZones;
        } catch (error) {
            logger.error("Error checking nearby accident zones:", error);
            return [];
        }
    }

    /**
     * Calculate distance between two coordinates in meters
     * @param {number} lat1 - Latitude 1
     * @param {number} lon1 - Longitude 1
     * @param {number} lat2 - Latitude 2
     * @param {number} lon2 - Longitude 2
     * @returns {number} Distance in meters
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = EARTH_RADIUS_KM * 1000; // Convert to meters
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) *
            Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) *
            Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    toRad(deg) {
        return deg * (Math.PI / 180);
    }

    /**
     * Determine alert severity based on accident count and distance
     * @param {number} accidentCount - Number of accidents in zone
     * @param {number} distance - Distance from zone center in meters
     * @returns {string} Severity level: 'low', 'medium', 'high'
     */
    determineSeverity(accidentCount, distance) {
        // Closer = more severe
        const distanceFactor = Math.max(0, 1 - distance / ALERT_RADIUS_METERS);

        // More accidents = more severe
        const severityScore = accidentCount * distanceFactor;

        if (severityScore > 5) return "high";
        if (severityScore > 2) return "medium";
        return "low";
    }

    /**
     * Get alert key for deduplication
     * @param {string} vehicleId
     * @param {string} zoneId
     * @returns {string} Alert key
     */
    getAlertKey(vehicleId, zoneId) {
        return `${vehicleId}:${zoneId}`;
    }

    /**
     * Check if we should send an alert (avoid spam)
     * @param {string} alertKey
     * @returns {boolean} True if we should send the alert
     */
    shouldSendAlert(alertKey) {
        const lastAlertTime = this.activeAlerts.get(alertKey);
        const now = Date.now();

        if (!lastAlertTime || now - lastAlertTime > BUFFER_TIME_MS) {
            this.activeAlerts.set(alertKey, now);
            return true;
        }

        return false;
    }

    /**
     * Process location update and generate alerts
     * @param {Object} locationData - Location update from vehicle
     * @param {Object} vehicleData - Vehicle information
     * @returns {Promise<Object>} Alert information
     */
    async processLocationUpdate(locationData, vehicleData = null) {
        try {
            const { vehicleId, driverId, longitude, latitude, shipmentId } =
                locationData;

            // Get nearby accident zones
            const nearbyZones = await this.checkNearbyZones(locationData);

            if (nearbyZones.length === 0) {
                return { hasAlert: false, zones: [] };
            }

            const alerts = [];

            for (const zone of nearbyZones) {
                const [zoneLng, zoneLat] = zone.location.coordinates;
                const distance = this.calculateDistance(
                    latitude,
                    longitude,
                    zoneLat,
                    zoneLng
                );
                const severity = this.determineSeverity(zone.accidentCount, distance);

                const alertKey = this.getAlertKey(vehicleId, zone._id.toString());

                // Check if we should send this alert
                if (!this.shouldSendAlert(alertKey)) {
                    continue; // Skip if we've already alerted recently
                }

                // Log the alert
                const alertRecord = await LiveTrackingAlert.create({
                    vehicleId,
                    driverId,
                    shipmentId,
                    accidentZoneId: zone._id,
                    distance,
                    severity,
                    accidentCount: zone.accidentCount,
                    zoneLocation: {
                        type: "Point",
                        coordinates: [zoneLng, zoneLat],
                    },
                    vehicleLocation: {
                        type: "Point",
                        coordinates: [longitude, latitude],
                    },
                    status: "active",
                });

                alerts.push({
                    zoneId: zone._id,
                    zoneName: `Accident Zone (${zone.severity} severity)`,
                    distance: Math.round(distance),
                    accidentCount: zone.accidentCount,
                    severity,
                    message: this.generateAlertMessage(
                        severity,
                        distance,
                        zone.accidentCount
                    ),
                    alertId: alertRecord._id,
                    timestamp: new Date(),
                });
            }

            return {
                hasAlert: alerts.length > 0,
                zones: alerts,
                vehicleId,
                driverId,
                shipmentId,
                location: { latitude, longitude },
            };
        } catch (error) {
            logger.error(
                "Error processing location update for accident alerts:",
                error
            );
            return { hasAlert: false, zones: [], error: error.message };
        }
    }

    /**
     * Generate alert message for driver
     * @param {string} severity - Alert severity
     * @param {number} distance - Distance in meters
     * @param {number} accidentCount - Number of accidents
     * @returns {string} Alert message
     */
    generateAlertMessage(severity, distance, accidentCount) {
        const distanceKm = (distance / 1000).toFixed(1);
        const severityText = severity.toUpperCase();

        let message = `⚠️ ${severityText} ACCIDENT ZONE ALERT!\n`;
        message += `You are ${distanceKm}km from an accident-prone area.\n`;
        message += `${accidentCount} accidents recorded in this zone.\n`;
        message += `Drive with extra caution!`;

        return message;
    }

    /**
     * Get all nearby zones for a location
     * @param {number} latitude
     * @param {number} longitude
     * @param {number} radiusMeters - Search radius in meters
     * @returns {Promise<Array>} Array of nearby zones
     */
    async getNearbyZonesForLocation(latitude, longitude, radiusMeters = 5000) {
        try {
            const zones = await AccidentZone.find({
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [longitude, latitude],
                        },
                        $maxDistance: radiusMeters,
                    },
                },
            });

            return zones.map((zone) => ({
                id: zone._id,
                coordinates: zone.location.coordinates,
                severity: zone.severity,
                accidentCount: zone.accidentCount,
                distance: this.calculateDistance(
                    latitude,
                    longitude,
                    zone.location.coordinates[1],
                    zone.location.coordinates[0]
                ),
            }));
        } catch (error) {
            logger.error("Error getting nearby zones:", error);
            return [];
        }
    }

    /**
     * Clear old alerts (cleanup)
     * @param {number} ageMs - Age threshold in milliseconds
     * @returns {Promise<number>} Number of cleared alerts
     */
    async clearOldAlerts(ageMs = 24 * 60 * 60 * 1000) {
        try {
            const cutoffTime = new Date(Date.now() - ageMs);
            const result = await LiveTrackingAlert.deleteMany({
                createdAt: { $lt: cutoffTime },
                status: "resolved",
            });

            return result.deletedCount;
        } catch (error) {
            logger.error("Error clearing old alerts:", error);
            return 0;
        }
    }

    /**
     * Get alert statistics for a vehicle
     * @param {string} vehicleId
     * @param {number} hoursBack - How many hours back to check
     * @returns {Promise<Object>} Alert statistics
     */
    async getVehicleAlertStats(vehicleId, hoursBack = 24) {
        try {
            const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

            const stats = {
                total: 0,
                byHour: {},
                bySeverity: { low: 0, medium: 0, high: 0 },
                topZones: [],
            };

            const alerts = await LiveTrackingAlert.find({
                vehicleId,
                createdAt: { $gte: cutoffTime },
            }).populate("accidentZoneId");

            stats.total = alerts.length;

            // Group by hour
            alerts.forEach((alert) => {
                const hour = new Date(alert.createdAt).getHours();
                stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
                stats.bySeverity[alert.severity]++;
            });

            // Top accident zones
            const zoneMap = {};
            alerts.forEach((alert) => {
                const zoneId = alert.accidentZoneId._id.toString();
                if (!zoneMap[zoneId]) {
                    zoneMap[zoneId] = {
                        zoneId,
                        zoneName: `Zone ${zoneId.substring(0, 8)}`,
                        count: 0,
                    };
                }
                zoneMap[zoneId].count++;
            });

            stats.topZones = Object.values(zoneMap)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            return stats;
        } catch (error) {
            logger.error("Error getting vehicle alert stats:", error);
            return null;
        }
    }
}

module.exports = new AccidentZoneAlerting();