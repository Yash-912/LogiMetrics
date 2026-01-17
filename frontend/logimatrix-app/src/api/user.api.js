/**
 * User API Service
 */

import api from './axios';

/**
 * Get all users with pagination and filters
 */
export const getUsers = async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
};

/**
 * Get single user by ID
 */
export const getUser = async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data.data;
};

/**
 * Create new user
 */
export const createUser = async (userData) => {
    const response = await api.post('/users', userData);
    return response.data.data;
};

/**
 * Update user
 */
export const updateUser = async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data.data;
};

/**
 * Delete user
 */
export const deleteUser = async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
};

/**
 * Update user profile (self)
 */
export const updateProfile = async (profileData) => {
    const response = await api.put('/users/profile', profileData);
    return response.data.data;
};

/**
 * Upload avatar
 */
export const uploadAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data;
};

/**
 * Update user preferences
 */
export const updatePreferences = async (preferences) => {
    const response = await api.patch('/users/preferences', preferences);
    return response.data.data;
};

/**
 * Get user notification settings
 */
export const getNotificationSettings = async () => {
    const response = await api.get('/users/notifications/settings');
    return response.data.data;
};

/**
 * Update user notification settings
 */
export const updateNotificationSettings = async (settings) => {
    const response = await api.patch('/users/notifications/settings', settings);
    return response.data.data;
};

export default {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    updateProfile,
    uploadAvatar,
    updatePreferences,
    getNotificationSettings,
    updateNotificationSettings,
};
