/**
 * Authentication Context
 * Manages authentication state and provides auth methods
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
    login as apiLogin,
    logout as apiLogout,
    register as apiRegister,
    getCurrentUser,
    getStoredUser,
    isAuthenticated as checkAuth
} from '@/api/auth.api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Check authentication status on mount
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Check if we have tokens stored
                if (checkAuth()) {
                    // Get stored user data first
                    const storedUser = getStoredUser();
                    if (storedUser) {
                        setUser(storedUser);
                        setIsAuthenticated(true);
                    }

                    // Optionally verify token in background (don't log out on failure)
                    try {
                        const currentUser = await getCurrentUser();
                        if (currentUser) {
                            setUser(currentUser);
                            localStorage.setItem('user', JSON.stringify(currentUser));
                        }
                    } catch (err) {
                        // Token verification failed, but if we have stored user, keep them logged in
                        // The JWT middleware will handle actual auth failures on protected routes
                        console.warn('Token verification failed, using stored user data:', err.message);
                        // Only clear auth if we don't have stored user data at all
                        if (!storedUser) {
                            setUser(null);
                            setIsAuthenticated(false);
                        }
                    }
                }
            } catch (err) {
                console.error('Auth initialization error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        initAuth();
    }, []);

    // Login function
    const login = useCallback(async (email, password) => {
        setIsLoading(true);
        setError(null);

        try {
            const { user: loggedInUser } = await apiLogin(email, password);
            setUser(loggedInUser);
            setIsAuthenticated(true);
            return { success: true, user: loggedInUser };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Login failed. Please try again.';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Register function - sets auth state after successful registration
    const register = useCallback(async (userData) => {
        setIsLoading(true);
        setError(null);

        try {
            const { user: registeredUser } = await apiRegister(userData);
            setUser(registeredUser);
            setIsAuthenticated(true);
            return { success: true, user: registeredUser };
        } catch (err) {
            const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Logout function
    const logout = useCallback(async () => {
        setIsLoading(true);

        try {
            await apiLogout();
        } catch (err) {
            console.error('Logout error:', err);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
            setError(null);
            localStorage.removeItem('user');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setIsLoading(false);
        }
    }, []);

    // Update user data (e.g., after profile update)
    const updateUser = useCallback((userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    }, []);

    // Clear error
    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value = {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        register,
        logout,
        updateUser,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export default AuthContext;
