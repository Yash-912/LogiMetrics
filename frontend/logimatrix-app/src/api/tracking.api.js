/**
 * Tracking API Service
 * Handles all tracking-related API calls (live tracking, telemetry, geofences)
 */

import api from './axios';

const trackingApi = {
    /**
     * Update vehicle location (from driver app or GPS device)
     */
    updateLocation: async (locationData) => {
        const response = await api.post('/tracking/location', locationData);
        return response.data;
    },

    /**
     * Get current location of a vehicle
     */
    getVehicleLocation: async (vehicleId) => {
        const response = await api.get(`/tracking/vehicle/${vehicleId}/location`);
        return response.data;
    },

    /**
     * Get current location of a shipment
     */
    getShipmentLocation: async (shipmentId) => {
        const response = await api.get(`/tracking/shipment/${shipmentId}/location`);
        return response.data;
    },

    /**
     * Get location history for a vehicle
     */
    getVehicleLocationHistory: async (vehicleId, params = {}) => {
        const response = await api.get(`/tracking/vehicle/${vehicleId}/history`, { params });
        return response.data;
    },

    /**
     * Get location history for a shipment
     */
    getShipmentLocationHistory: async (shipmentId, params = {}) => {
        const response = await api.get(`/tracking/shipment/${shipmentId}/history`, { params });
        return response.data;
    },

    /**
     * Get all active vehicles with their locations
     */
    getActiveVehicles: async (params = {}) => {
        const response = await api.get('/tracking/live', { params });
        return response.data;
    },

    /**
     * Update vehicle telemetry data
     */
    updateTelemetry: async (telemetryData) => {
        const response = await api.post('/tracking/telemetry', telemetryData);
        return response.data;
    },

    /**
     * Get vehicle telemetry
     */
    getVehicleTelemetry: async (vehicleId, params = {}) => {
        const response = await api.get(`/tracking/vehicle/${vehicleId}/telemetry`, { params });
        return response.data;
    },

    /**
     * Create geofence
     */
    createGeofence: async (geofenceData) => {
        const response = await api.post('/tracking/geofences', geofenceData);
        return response.data;
    },

    /**
     * Get all geofences
     */
    getGeofences: async (params = {}) => {
        const response = await api.get('/tracking/geofences', { params });
        return response.data;
    },

    /**
     * Delete geofence
     */
    deleteGeofence: async (geofenceId) => {
        const response = await api.delete(`/tracking/geofences/${geofenceId}`);
        return response.data;
    },

    /**
     * Get ETA for shipment
     */
    getShipmentETA: async (shipmentId) => {
        const response = await api.get(`/tracking/shipment/${shipmentId}/eta`);
        return response.data;
    },
};

export const {
    updateLocation,
    getVehicleLocation,
    getShipmentLocation,
    getVehicleLocationHistory,
    getShipmentLocationHistory,
    getActiveVehicles,
    updateTelemetry,
    getVehicleTelemetry,
    createGeofence,
    getGeofences,
    deleteGeofence,
    getShipmentETA,
} = trackingApi;

export default trackingApi;
