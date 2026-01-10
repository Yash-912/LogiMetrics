/**
 * Route API Service
 * Handles all route-related API calls
 */

import api from './axios';

const routeApi = {
    /**
     * Get all routes with pagination and filters
     */
    getRoutes: async (params = {}) => {
        const response = await api.get('/routes', { params });
        return response.data;
    },

    /**
     * Get route by ID
     */
    getRouteById: async (id) => {
        const response = await api.get(`/routes/${id}`);
        return response.data;
    },

    /**
     * Create a new route
     */
    createRoute: async (routeData) => {
        const response = await api.post('/routes', routeData);
        return response.data;
    },

    /**
     * Update route
     */
    updateRoute: async (id, routeData) => {
        const response = await api.put(`/routes/${id}`, routeData);
        return response.data;
    },

    /**
     * Delete route
     */
    deleteRoute: async (id) => {
        const response = await api.delete(`/routes/${id}`);
        return response.data;
    },

    /**
     * Update route status
     */
    updateRouteStatus: async (id, status) => {
        const response = await api.patch(`/routes/${id}/status`, { status });
        return response.data;
    },

    /**
     * Add waypoint to route
     */
    addWaypoint: async (id, waypointData) => {
        const response = await api.post(`/routes/${id}/waypoints`, waypointData);
        return response.data;
    },

    /**
     * Update waypoint
     */
    updateWaypoint: async (id, waypointId, waypointData) => {
        const response = await api.put(`/routes/${id}/waypoints/${waypointId}`, waypointData);
        return response.data;
    },

    /**
     * Remove waypoint from route
     */
    removeWaypoint: async (id, waypointId) => {
        const response = await api.delete(`/routes/${id}/waypoints/${waypointId}`);
        return response.data;
    },

    /**
     * Reorder waypoints
     */
    reorderWaypoints: async (id, waypointOrder) => {
        const response = await api.put(`/routes/${id}/waypoints/reorder`, { waypointOrder });
        return response.data;
    },

    /**
     * Optimize route using AI
     */
    optimizeRoute: async (id) => {
        const response = await api.post(`/routes/${id}/optimize`);
        return response.data;
    },

    /**
     * Optimize route from waypoints (without existing route)
     */
    optimizeRouteFromWaypoints: async (waypoints) => {
        const response = await api.post('/routes/optimize', { waypoints });
        return response.data;
    },

    /**
     * Get route directions
     */
    getDirections: async (id) => {
        const response = await api.get(`/routes/${id}/directions`);
        return response.data;
    },

    /**
     * Clone route
     */
    cloneRoute: async (id) => {
        const response = await api.post(`/routes/${id}/clone`);
        return response.data;
    },
};

export const {
    getRoutes,
    getRouteById,
    createRoute,
    updateRoute,
    deleteRoute,
    updateRouteStatus,
    addWaypoint,
    updateWaypoint,
    removeWaypoint,
    reorderWaypoints,
    optimizeRoute,
    optimizeRouteFromWaypoints,
    getDirections,
    cloneRoute,
} = routeApi;

export default routeApi;
