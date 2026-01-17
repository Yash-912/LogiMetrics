/**
 * Authentication API Service
 * Handles login, logout, register, and token management
 * 
 * Uses MOCK API for frontend-only development when backend is unavailable
 */

import api, { setTokens, clearTokens } from './axios';
import { mockLogin, mockRegister, mockGetMe, mockLogout, isMockMode } from './mock.api';

// Check if we should use mock API (set to false for real backend connection)
const USE_MOCK = false; // import.meta.env.VITE_USE_MOCK_API === 'true';

/**
 * Login user with email and password
 * @param {string} email 
 * @param {string} password 
 * @returns {Promise<{user: Object, accessToken: string, refreshToken: string}>}
 */
export const login = async (email, password) => {
    if (USE_MOCK) {
        const response = await mockLogin({ email, password });
        const { user, tokens } = response.data.data;
        setTokens(tokens.accessToken, tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }

    const response = await api.post('/auth/login', { email, password });
    const data = response.data.data;
    const user = data.user;
    const tokens = data.tokens;

    setTokens(tokens.accessToken, tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
};

/**
 * Register a new user with company
 * @param {Object} userData - { firstName, lastName, email, password, phone, role, company }
 * @returns {Promise<{user: Object, accessToken: string}>}
 */
export const register = async (userData) => {
    if (USE_MOCK) {
        const response = await mockRegister(userData);
        const { user, tokens } = response.data.data;
        setTokens(tokens.accessToken, tokens.refreshToken);
        localStorage.setItem('user', JSON.stringify(user));
        return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    }

    const response = await api.post('/auth/register', userData);
    const data = response.data.data;
    const user = data.user;
    const tokens = data.tokens;

    setTokens(tokens.accessToken, tokens.refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    return { user, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
};

/**
 * Get current authenticated user
 * @returns {Promise<Object>} user object
 */
export const getCurrentUser = async () => {
    if (USE_MOCK) {
        const response = await mockGetMe();
        return response.data.data.user;
    }

    const response = await api.get('/auth/me');
    return response.data.data.user;
};

/**
 * Logout user - clear tokens and call backend
 * @returns {Promise<void>}
 */
export const logout = async () => {
    if (USE_MOCK) {
        await mockLogout();
        clearTokens();
        return;
    }

    try {
        await api.post('/auth/logout');
    } catch (error) {
        console.error('Logout API error:', error);
    } finally {
        clearTokens();
    }
};

/**
 * Refresh access token
 * @param {string} refreshToken 
 * @returns {Promise<{accessToken: string, refreshToken: string}>}
 */
export const refreshAccessToken = async (refreshToken) => {
    if (USE_MOCK) {
        // In mock mode, just return success
        return { accessToken: 'mock-refreshed-token', refreshToken };
    }

    const response = await api.post('/auth/refresh', { refreshToken });
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    setTokens(accessToken, newRefreshToken);
    return { accessToken, refreshToken: newRefreshToken };
};

/**
 * Request password reset
 * @param {string} email 
 * @returns {Promise<void>}
 */
export const forgotPassword = async (email) => {
    if (USE_MOCK) {
        console.log('Mock: Password reset email sent to', email);
        return;
    }
    await api.post('/auth/forgot-password', { email });
};

/**
 * Reset password with token
 * @param {string} token 
 * @param {string} newPassword 
 * @returns {Promise<void>}
 */
export const resetPassword = async (token, newPassword) => {
    if (USE_MOCK) {
        console.log('Mock: Password reset successful');
        return;
    }
    await api.post('/auth/reset-password', { token, newPassword });
};

/**
 * Verify email with token
 * @param {string} token 
 * @returns {Promise<void>}
 */
export const verifyEmail = async (token) => {
    if (USE_MOCK) {
        console.log('Mock: Email verified');
        return;
    }
    await api.post('/auth/verify-email', { token });
};

/**
 * Change password for authenticated user
 * @param {string} currentPassword 
 * @param {string} newPassword 
 * @returns {Promise<void>}
 */
export const changePassword = async (currentPassword, newPassword) => {
    if (USE_MOCK) {
        console.log('Mock: Password changed');
        return;
    }
    await api.post('/auth/change-password', { currentPassword, newPassword });
};

/**
 * Check if user is authenticated (has valid token)
 * @returns {boolean}
 */
export const isAuthenticated = () => {
    const token = localStorage.getItem('accessToken');
    return !!token;
};

/**
 * Get stored user from localStorage
 * @returns {Object|null}
 */
export const getStoredUser = () => {
    const user = localStorage.getItem('user');
    if (!user) {
        // Also check mock storage
        const mockUser = localStorage.getItem('mock_current_user');
        return mockUser ? JSON.parse(mockUser) : null;
    }
    return JSON.parse(user);
};

export default {
    login,
    register,
    getCurrentUser,
    logout,
    refreshAccessToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    changePassword,
    isAuthenticated,
    getStoredUser,
};
