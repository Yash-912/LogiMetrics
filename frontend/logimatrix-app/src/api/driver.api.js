/**
 * Driver API Service
 */

import api from './axios';

/**
 * Get all drivers with pagination and filters
 */
export const getDrivers = async (params = {}) => {
    const response = await api.get('/drivers', { params });
    return response.data;
};

/**
 * Get single driver by ID
 */
export const getDriver = async (id) => {
    const response = await api.get(`/drivers/${id}`);
    return response.data.data;
};

/**
 * Create new driver
 */
export const createDriver = async (driverData) => {
    const response = await api.post('/drivers', driverData);
    return response.data.data;
};

/**
 * Update driver
 */
export const updateDriver = async (id, driverData) => {
    const response = await api.put(`/drivers/${id}`, driverData);
    return response.data.data;
};

/**
 * Delete driver
 */
export const deleteDriver = async (id) => {
    const response = await api.delete(`/drivers/${id}`);
    return response.data;
};

/**
 * Update driver status
 */
export const updateDriverStatus = async (id, status) => {
    const response = await api.patch(`/drivers/${id}/status`, { status });
    return response.data.data;
};

/**
 * Get driver's current location
 */
export const getDriverLocation = async (id) => {
    const response = await api.get(`/drivers/${id}/location`);
    return response.data.data;
};

/**
 * Get driver's assigned shipments
 */
export const getDriverShipments = async (id) => {
    const response = await api.get(`/drivers/${id}/shipments`);
    return response.data.data;
};

/**
 * Assign vehicle to driver
 */
export const assignVehicle = async (driverId, vehicleId) => {
    const response = await api.patch(`/drivers/${driverId}/vehicle`, { vehicleId });
    return response.data.data;
};

/**
 * Get driver performance metrics
 */
export const getDriverPerformance = async (id, params = {}) => {
    const response = await api.get(`/drivers/${id}/performance`, { params });
    return response.data.data;
};

export default {
    getDrivers,
    getDriver,
    createDriver,
    updateDriver,
    deleteDriver,
    updateDriverStatus,
    getDriverLocation,
    getDriverShipments,
    assignVehicle,
    getDriverPerformance,
};
