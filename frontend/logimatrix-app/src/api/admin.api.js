/**
 * Admin API Service
 * Handles all admin-related API calls
 */

import api from './axios';

const adminApi = {
    /**
     * Get system statistics (admin dashboard)
     */
    getSystemStats: async (params = {}) => {
        const response = await api.get('/admin/stats', { params });
        return response.data;
    },

    /**
     * Get all users (admin)
     */
    getAllUsers: async (params = {}) => {
        const response = await api.get('/admin/users', { params });
        return response.data;
    },

    /**
     * Update user status
     */
    updateUserStatus: async (id, status, reason = '') => {
        const response = await api.put(`/admin/users/${id}/status`, { status, reason });
        return response.data;
    },

    /**
     * Update user role
     */
    updateUserRole: async (id, role) => {
        const response = await api.put(`/admin/users/${id}/role`, { role });
        return response.data;
    },

    /**
     * Delete user
     */
    deleteUser: async (id) => {
        const response = await api.delete(`/admin/users/${id}`);
        return response.data;
    },

    /**
     * Get all companies (admin)
     */
    getAllCompanies: async (params = {}) => {
        const response = await api.get('/admin/companies', { params });
        return response.data;
    },

    /**
     * Update company status
     */
    updateCompanyStatus: async (id, status, reason = '') => {
        const response = await api.put(`/admin/companies/${id}/status`, { status, reason });
        return response.data;
    },

    /**
     * Get system settings
     */
    getSystemSettings: async () => {
        const response = await api.get('/admin/settings');
        return response.data;
    },

    /**
     * Update system setting
     */
    updateSystemSetting: async (key, value) => {
        const response = await api.put(`/admin/settings/${key}`, { value });
        return response.data;
    },

    /**
     * Toggle maintenance mode
     */
    toggleMaintenanceMode: async (enabled, message = '', scheduledEnd = null) => {
        const response = await api.post('/admin/maintenance', { enabled, message, scheduledEnd });
        return response.data;
    },

    /**
     * Get audit logs
     */
    getAuditLogs: async (params = {}) => {
        const response = await api.get('/admin/audit-logs', { params });
        return response.data;
    },

    /**
     * Clear cache
     */
    clearCache: async (pattern = '', all = false) => {
        const response = await api.post('/admin/cache/clear', { pattern, all });
        return response.data;
    },

    /**
     * Get system health
     */
    getSystemHealth: async () => {
        const response = await api.get('/admin/health');
        return response.data;
    },

    /**
     * Impersonate user
     */
    impersonateUser: async (userId) => {
        const response = await api.post(`/admin/impersonate/${userId}`);
        return response.data;
    },

    /**
     * Send broadcast notification
     */
    sendBroadcast: async (broadcastData) => {
        const response = await api.post('/admin/broadcast', broadcastData);
        return response.data;
    },
};

export const {
    getSystemStats,
    getAllUsers,
    updateUserStatus,
    updateUserRole,
    deleteUser,
    getAllCompanies,
    updateCompanyStatus,
    getSystemSettings,
    updateSystemSetting,
    toggleMaintenanceMode,
    getAuditLogs,
    clearCache,
    getSystemHealth,
    impersonateUser,
    sendBroadcast,
} = adminApi;

export default adminApi;
