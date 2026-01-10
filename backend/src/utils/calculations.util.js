/**
 * Distance and ETA Calculation Utilities
 */

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Estimate travel time based on distance and average speed
 * Returns time in minutes
 */
function estimateTravelTime(distanceKm, avgSpeedKmh = 40) {
  return (distanceKm / avgSpeedKmh) * 60;
}

/**
 * Calculate ETA based on current location and destination
 */
function calculateETA(currentLat, currentLon, destLat, destLon, avgSpeedKmh = 40) {
  const distance = calculateDistance(currentLat, currentLon, destLat, destLon);
  const travelTimeMinutes = estimateTravelTime(distance, avgSpeedKmh);
  const eta = new Date(Date.now() + travelTimeMinutes * 60 * 1000);

  return {
    distance: Math.round(distance * 100) / 100,
    distanceUnit: 'km',
    estimatedMinutes: Math.ceil(travelTimeMinutes),
    eta: eta.toISOString()
  };
}

/**
 * Calculate total route distance for multiple waypoints
 */
function calculateRouteDistance(waypoints) {
  let totalDistance = 0;

  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistance += calculateDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
  }

  return Math.round(totalDistance * 100) / 100;
}

/**
 * Calculate bearing between two points
 * Returns bearing in degrees (0-360)
 */
function calculateBearing(lat1, lon1, lat2, lon2) {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  let bearing = Math.atan2(y, x) * (180 / Math.PI);
  return (bearing + 360) % 360;
}

/**
 * Get compass direction from bearing
 */
function getCompassDirection(bearing) {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(bearing / 45) % 8;
  return directions[index];
}

/**
 * Calculate shipping cost based on distance and weight
 */
function calculateShippingCost({
  distanceKm,
  weightKg,
  vehicleType = 'standard',
  baseRate = 50,
  perKmRate = 10,
  perKgRate = 5
}) {
  const vehicleMultipliers = {
    bike: 0.5,
    standard: 1,
    mini_truck: 1.5,
    truck: 2,
    container: 3
  };

  const multiplier = vehicleMultipliers[vehicleType] || 1;
  
  const distanceCost = distanceKm * perKmRate;
  const weightCost = weightKg * perKgRate;
  const totalCost = (baseRate + distanceCost + weightCost) * multiplier;

  return {
    baseRate,
    distanceCost: Math.round(distanceCost * 100) / 100,
    weightCost: Math.round(weightCost * 100) / 100,
    vehicleMultiplier: multiplier,
    subtotal: Math.round(totalCost * 100) / 100,
    tax: Math.round(totalCost * 0.18 * 100) / 100, // 18% GST
    total: Math.round(totalCost * 1.18 * 100) / 100
  };
}

/**
 * Check if coordinates are within a bounding box
 */
function isWithinBounds(lat, lng, bounds) {
  return (
    lat >= bounds.south &&
    lat <= bounds.north &&
    lng >= bounds.west &&
    lng <= bounds.east
  );
}

/**
 * Get bounding box for a center point and radius
 */
function getBoundingBox(centerLat, centerLng, radiusKm) {
  const latOffset = radiusKm / 111.32; // 1 degree lat ≈ 111.32 km
  const lngOffset = radiusKm / (111.32 * Math.cos(toRad(centerLat)));

  return {
    north: centerLat + latOffset,
    south: centerLat - latOffset,
    east: centerLng + lngOffset,
    west: centerLng - lngOffset
  };
}

module.exports = {
  calculateDistance,
  estimateTravelTime,
  calculateETA,
  calculateRouteDistance,
  calculateBearing,
  getCompassDirection,
  calculateShippingCost,
  isWithinBounds,
  getBoundingBox
};
