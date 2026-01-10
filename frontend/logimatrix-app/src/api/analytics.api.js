/**
 * Analytics API Service
 */

import api from './axios';

/**
 * Get dashboard overview stats
 */
export const getDashboardStats = async () => {
    const response = await api.get('/analytics/dashboard');
    return response.data.data;
};

/**
 * Get shipment analytics
 */
export const getShipmentAnalytics = async (params = {}) => {
    const response = await api.get('/analytics/shipments', { params });
    return response.data.data;
};

/**
 * Get vehicle utilization analytics
 */
export const getVehicleAnalytics = async (params = {}) => {
    const response = await api.get('/analytics/vehicles', { params });
    return response.data.data;
};

/**
 * Get driver performance analytics
 */
export const getDriverAnalytics = async (params = {}) => {
    const response = await api.get('/analytics/drivers', { params });
    return response.data.data;
};

/**
 * Get revenue analytics
 */
export const getRevenueAnalytics = async (params = {}) => {
    const response = await api.get('/analytics/revenue', { params });
    return response.data.data;
};

/**
 * Get route optimization suggestions
 */
export const getRouteOptimization = async (params = {}) => {
    const response = await api.get('/analytics/routes', { params });
    return response.data.data;
};

/**
 * Get delivery time predictions
 */
export const getDeliveryPredictions = async (shipmentId) => {
    const response = await api.get(`/analytics/predictions/${shipmentId}`);
    return response.data.data;
};

/**
 * Get trend analysis
 */
export const getTrendAnalysis = async (params = {}) => {
    const response = await api.get('/analytics/trends', { params });
    return response.data.data;
};

/**
 * Export analytics report
 */
export const exportReport = async (reportType, params = {}) => {
    const response = await api.get(`/analytics/export/${reportType}`, {
        params,
        responseType: 'blob'
    });
    return response.data;
};

export default {
    getDashboardStats,
    getShipmentAnalytics,
    getVehicleAnalytics,
    getDriverAnalytics,
    getRevenueAnalytics,
    getRouteOptimization,
    getDeliveryPredictions,
    getTrendAnalysis,
    exportReport,
};
