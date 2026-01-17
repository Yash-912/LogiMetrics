/**
 * Maps Service
 * Geocoding, distance matrix, and route optimization
 */

const { geocodeAddress, reverseGeocode, getDistanceMatrix, getDirections, getMapboxRoute, calculateETA, isPointInGeofence } = require('../config/maps');
const { getCache, setCache } = require('../config/redis');
const logger = require('../utils/logger.util');

/**
 * Geocode address with caching
 */
async function geocode(address) {
    const cacheKey = `geocode:${address.toLowerCase().replace(/\s+/g, '_')}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const result = await geocodeAddress(address);
    await setCache(cacheKey, result, 86400 * 7); // Cache for 7 days

    return result;
}

/**
 * Reverse geocode with caching
 */
async function reverseGeocodeCached(lat, lng) {
    const cacheKey = `reverse:${lat.toFixed(6)}_${lng.toFixed(6)}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const result = await reverseGeocode(lat, lng);
    await setCache(cacheKey, result, 86400 * 7);

    return result;
}

/**
 * Get distance between two points
 */
async function getDistance(origin, destination) {
    const cacheKey = `distance:${origin.replace(/\s+/g, '_')}_${destination.replace(/\s+/g, '_')}`;
    const cached = await getCache(cacheKey);
    if (cached) return cached;

    const result = await getDistanceMatrix([origin], [destination]);
    const distance = result[0]?.destinations[0];

    if (distance) {
        await setCache(cacheKey, distance, 3600); // Cache for 1 hour
    }

    return distance;
}

/**
 * Get route directions
 */
async function getRoute(origin, destination, waypoints = [], options = {}) {
    const waypointsKey = waypoints.join('_').replace(/\s+/g, '_');
    const cacheKey = `route:${origin}_${destination}_${waypointsKey}`.replace(/\s+/g, '_');

    const useCache = options.useCache !== false;
    if (useCache) {
        const cached = await getCache(cacheKey);
        if (cached) return cached;
    }

    const result = await getDirections(origin, destination, waypoints, options.mode);

    if (useCache) {
        await setCache(cacheKey, result, 1800); // Cache for 30 minutes
    }

    return result;
}

/**
 * Optimize route with multiple stops
 */
async function optimizeRoute(origin, destination, stops) {
    if (!stops || stops.length === 0) {
        return getRoute(origin, destination);
    }

    // Get optimized route with waypoints
    const result = await getDirections(origin, destination, stops, 'driving');

    // Return optimized order
    return {
        ...result,
        optimizedStops: result.waypointOrder.map(i => stops[i]),
        originalStops: stops
    };
}

/**
 * Get traffic-aware ETA
 */
async function getTrafficAwareETA(origin, destination) {
    const eta = await calculateETA(origin, destination);
    return {
        ...eta,
        etaFormatted: new Date(eta.eta).toLocaleString()
    };
}

/**
 * Check if point is in geofence
 */
function checkGeofence(point, center, radiusMeters) {
    return isPointInGeofence(point, center, radiusMeters);
}

/**
 * Calculate haversine distance between two points
 */
function haversineDistance(point1, point2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.lat * Math.PI) / 180;
    const φ2 = (point2.lat * Math.PI) / 180;
    const Δφ = ((point2.lat - point1.lat) * Math.PI) / 180;
    const Δλ = ((point2.lng - point1.lng) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

/**
 * Find nearest point from a list
 */
function findNearestPoint(origin, points) {
    if (!points || points.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const point of points) {
        const distance = haversineDistance(origin, point);
        if (distance < minDistance) {
            minDistance = distance;
            nearest = { ...point, distance };
        }
    }

    return nearest;
}

/**
 * Get route polyline for visualization
 */
async function getRoutePolyline(origin, destination, waypoints = []) {
    const route = await getRoute(origin, destination, waypoints);
    return route.polyline;
}

/**
 * Batch geocode multiple addresses
 */
async function batchGeocode(addresses) {
    const results = await Promise.allSettled(addresses.map(address => geocode(address)));

    return results.map((result, index) => ({
        address: addresses[index],
        success: result.status === 'fulfilled',
        ...(result.status === 'fulfilled' ? result.value : { error: result.reason?.message })
    }));
}

/**
 * Get Mapbox route (traffic-aware)
 */
async function getMapboxTrafficRoute(coordinates) {
    return getMapboxRoute(coordinates);
}

module.exports = {
    geocode,
    reverseGeocodeCached,
    getDistance,
    getRoute,
    optimizeRoute,
    getTrafficAwareETA,
    checkGeofence,
    haversineDistance,
    findNearestPoint,
    getRoutePolyline,
    batchGeocode,
    getMapboxTrafficRoute
};
