/**
 * Vehicle API Service
 */

import api from './axios';

/**
 * Get all vehicles with pagination and filters
 */
export const getVehicles = async (params = {}) => {
    const response = await api.get('/vehicles', { params });
    return response.data;
};

/**
 * Get single vehicle by ID
 */
export const getVehicle = async (id) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data.data;
};

/**
 * Create new vehicle
 */
export const createVehicle = async (vehicleData) => {
    const response = await api.post('/vehicles', vehicleData);
    return response.data.data;
};

/**
 * Update vehicle
 */
export const updateVehicle = async (id, vehicleData) => {
    const response = await api.put(`/vehicles/${id}`, vehicleData);
    return response.data.data;
};

/**
 * Delete vehicle
 */
export const deleteVehicle = async (id) => {
    const response = await api.delete(`/vehicles/${id}`);
    return response.data;
};

/**
 * Update vehicle status
 */
export const updateVehicleStatus = async (id, status) => {
    const response = await api.patch(`/vehicles/${id}/status`, { status });
    return response.data.data;
};

/**
 * Get vehicle location
 */
export const getVehicleLocation = async (id) => {
    const response = await api.get(`/vehicles/${id}/location`);
    return response.data.data;
};

/**
 * Add maintenance record
 */
export const addMaintenanceRecord = async (vehicleId, maintenanceData) => {
    const response = await api.post(`/vehicles/${vehicleId}/maintenance`, maintenanceData);
    return response.data.data;
};

/**
 * Get maintenance history
 */
export const getMaintenanceHistory = async (vehicleId) => {
    const response = await api.get(`/vehicles/${vehicleId}/maintenance`);
    return response.data.data;
};

export default {
    getVehicles,
    getVehicle,
    createVehicle,
    updateVehicle,
    deleteVehicle,
    updateVehicleStatus,
    getVehicleLocation,
    addMaintenanceRecord,
    getMaintenanceHistory,
};
