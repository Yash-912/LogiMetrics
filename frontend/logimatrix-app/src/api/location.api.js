/**
 * Location API Service
 * Handles all location-related API calls
 */

import api from './axios';

const locationApi = {
    /**
     * Get all locations with pagination and filters
     */
    getLocations: async (params = {}) => {
        const response = await api.get('/locations', { params });
        return response.data;
    },

    /**
     * Get location by ID
     */
    getLocationById: async (id) => {
        const response = await api.get(`/locations/${id}`);
        return response.data;
    },

    /**
     * Create a new location
     */
    createLocation: async (locationData) => {
        const response = await api.post('/locations', locationData);
        return response.data;
    },

    /**
     * Update location
     */
    updateLocation: async (id, locationData) => {
        const response = await api.put(`/locations/${id}`, locationData);
        return response.data;
    },

    /**
     * Delete location
     */
    deleteLocation: async (id) => {
        const response = await api.delete(`/locations/${id}`);
        return response.data;
    },

    /**
     * Get nearby locations
     */
    getNearbyLocations: async (lat, lng, radius = 5000) => {
        const response = await api.get('/locations/nearby', {
            params: { lat, lng, radius },
        });
        return response.data;
    },

    /**
     * Search locations
     */
    searchLocations: async (query) => {
        const response = await api.get('/locations/search', {
            params: { q: query },
        });
        return response.data;
    },
};

export const {
    getLocations,
    getLocationById,
    createLocation,
    updateLocation,
    deleteLocation,
    getNearbyLocations,
    searchLocations,
} = locationApi;

export default locationApi;
