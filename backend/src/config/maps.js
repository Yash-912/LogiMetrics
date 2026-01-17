/**
 * Maps API Configuration
 * Google Maps and Mapbox integration for routing and geocoding
 */

const axios = require('axios');
const logger = require('../utils/logger.util');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN;

/**
 * Geocode address to coordinates using Google Maps
 */
async function geocodeAddress(address) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const location = response.data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formattedAddress: response.data.results[0].formatted_address
      };
    }

    throw new Error('No results found for the address');
  } catch (error) {
    logger.error('Geocoding error:', error);
    throw error;
  }
}

/**
 * Reverse geocode coordinates to address
 */
async function reverseGeocode(lat, lng) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        latlng: `${lat},${lng}`,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK' && response.data.results.length > 0) {
      return {
        address: response.data.results[0].formatted_address,
        components: response.data.results[0].address_components
      };
    }

    throw new Error('No address found for the coordinates');
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    throw error;
  }
}

/**
 * Calculate distance and duration between two points
 */
async function getDistanceMatrix(origins, destinations, mode = 'driving') {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: origins.join('|'),
        destinations: destinations.join('|'),
        mode,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK') {
      return response.data.rows.map((row, i) => ({
        origin: response.data.origin_addresses[i],
        destinations: row.elements.map((element, j) => ({
          destination: response.data.destination_addresses[j],
          distance: element.distance,
          duration: element.duration,
          status: element.status
        }))
      }));
    }

    throw new Error('Distance matrix calculation failed');
  } catch (error) {
    logger.error('Distance matrix error:', error);
    throw error;
  }
}

/**
 * Get directions between two points
 */
async function getDirections(origin, destination, waypoints = [], mode = 'driving') {
  try {
    const params = {
      origin,
      destination,
      mode,
      key: GOOGLE_MAPS_API_KEY,
      alternatives: false
    };

    if (waypoints.length > 0) {
      params.waypoints = `optimize:true|${waypoints.join('|')}`;
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params
    });

    if (response.data.status === 'OK' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
        duration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
        distanceText: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0) / 1000 + ' km',
        durationText: Math.ceil(route.legs.reduce((sum, leg) => sum + leg.duration.value, 0) / 60) + ' mins',
        polyline: route.overview_polyline.points,
        legs: route.legs.map(leg => ({
          startAddress: leg.start_address,
          endAddress: leg.end_address,
          distance: leg.distance,
          duration: leg.duration,
          steps: leg.steps.map(step => ({
            instruction: step.html_instructions,
            distance: step.distance,
            duration: step.duration
          }))
        })),
        waypointOrder: response.data.routes[0].waypoint_order
      };
    }

    throw new Error('No route found');
  } catch (error) {
    logger.error('Directions error:', error);
    throw error;
  }
}

/**
 * Get traffic-aware route using Mapbox
 */
async function getMapboxRoute(coordinates, profile = 'driving-traffic') {
  try {
    const coordsString = coordinates.map(c => `${c.lng},${c.lat}`).join(';');
    
    const response = await axios.get(
      `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordsString}`,
      {
        params: {
          access_token: MAPBOX_ACCESS_TOKEN,
          geometries: 'geojson',
          overview: 'full',
          steps: true,
          annotations: 'duration,distance,speed'
        }
      }
    );

    if (response.data.code === 'Ok' && response.data.routes.length > 0) {
      const route = response.data.routes[0];
      return {
        distance: route.distance,
        duration: route.duration,
        geometry: route.geometry,
        legs: route.legs
      };
    }

    throw new Error('Mapbox routing failed');
  } catch (error) {
    logger.error('Mapbox routing error:', error);
    throw error;
  }
}

/**
 * Calculate ETA based on current traffic
 */
async function calculateETA(origin, destination) {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: `${origin.lat},${origin.lng}`,
        destinations: `${destination.lat},${destination.lng}`,
        mode: 'driving',
        departure_time: 'now',
        traffic_model: 'best_guess',
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status === 'OK') {
      const element = response.data.rows[0].elements[0];
      const durationInTraffic = element.duration_in_traffic || element.duration;
      
      return {
        distance: element.distance,
        duration: element.duration,
        durationInTraffic,
        eta: new Date(Date.now() + durationInTraffic.value * 1000)
      };
    }

    throw new Error('ETA calculation failed');
  } catch (error) {
    logger.error('ETA calculation error:', error);
    throw error;
  }
}

/**
 * Check if a point is within a geofence
 */
function isPointInGeofence(point, center, radiusInMeters) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (point.lat * Math.PI) / 180;
  const φ2 = (center.lat * Math.PI) / 180;
  const Δφ = ((center.lat - point.lat) * Math.PI) / 180;
  const Δλ = ((center.lng - point.lng) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance <= radiusInMeters;
}

module.exports = {
  geocodeAddress,
  reverseGeocode,
  getDistanceMatrix,
  getDirections,
  getMapboxRoute,
  calculateETA,
  isPointInGeofence
};
