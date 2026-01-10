/**
 * Shipment API Service
 * Uses mock data when backend is unavailable
 */

import api from './axios';
import { mockCreateShipment, mockGetShipments } from './mock.api';

// Set to false when backend is ready
const USE_MOCK = true;

// Mock delay helper
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Mock shipment storage key
const MOCK_SHIPMENTS_KEY = 'mock_shipments';

/**
 * Get all shipments with pagination and filters
 */
export const getShipments = async (params = {}) => {
    if (USE_MOCK) {
        await delay(600);
        const shipments = JSON.parse(localStorage.getItem(MOCK_SHIPMENTS_KEY) || '[]');
        return {
            success: true,
            data: {
                shipments,
                pagination: {
                    total: shipments.length,
                    page: params.page || 1,
                    limit: params.limit || 10
                }
            }
        };
    }
    const response = await api.get('/shipments', { params });
    return response.data;
};

/**
 * Get single shipment by ID
 */
export const getShipment = async (id) => {
    if (USE_MOCK) {
        await delay(400);
        const shipments = JSON.parse(localStorage.getItem(MOCK_SHIPMENTS_KEY) || '[]');
        const shipment = shipments.find(s => s.id === id);
        if (!shipment) {
            throw { response: { data: { message: 'Shipment not found' }, status: 404 } };
        }
        return shipment;
    }
    const response = await api.get(`/shipments/${id}`);
    return response.data.data;
};

/**
 * Create new shipment
 */
export const createShipment = async (shipmentData) => {
    if (USE_MOCK) {
        await delay(1000);
        const shipments = JSON.parse(localStorage.getItem(MOCK_SHIPMENTS_KEY) || '[]');

        const newShipment = {
            id: 'SHP-' + Date.now(),
            trackingNumber: 'TRK' + Math.random().toString(36).substring(2, 10).toUpperCase(),
            status: 'pending',
            ...shipmentData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        shipments.push(newShipment);
        localStorage.setItem(MOCK_SHIPMENTS_KEY, JSON.stringify(shipments));

        return newShipment;
    }
    const response = await api.post('/shipments', shipmentData);
    return response.data.data;
};

/**
 * Update shipment
 */
export const updateShipment = async (id, shipmentData) => {
    if (USE_MOCK) {
        await delay(600);
        const shipments = JSON.parse(localStorage.getItem(MOCK_SHIPMENTS_KEY) || '[]');
        const index = shipments.findIndex(s => s.id === id);
        if (index === -1) {
            throw { response: { data: { message: 'Shipment not found' }, status: 404 } };
        }
        shipments[index] = { ...shipments[index], ...shipmentData, updatedAt: new Date().toISOString() };
        localStorage.setItem(MOCK_SHIPMENTS_KEY, JSON.stringify(shipments));
        return shipments[index];
    }
    const response = await api.put(`/shipments/${id}`, shipmentData);
    return response.data.data;
};

/**
 * Delete shipment
 */
export const deleteShipment = async (id) => {
    if (USE_MOCK) {
        await delay(400);
        const shipments = JSON.parse(localStorage.getItem(MOCK_SHIPMENTS_KEY) || '[]');
        const filtered = shipments.filter(s => s.id !== id);
        localStorage.setItem(MOCK_SHIPMENTS_KEY, JSON.stringify(filtered));
        return { success: true };
    }
    const response = await api.delete(`/shipments/${id}`);
    return response.data;
};

/**
 * Update shipment status
 */
export const updateShipmentStatus = async (id, status, notes) => {
    if (USE_MOCK) {
        await delay(500);
        const shipments = JSON.parse(localStorage.getItem(MOCK_SHIPMENTS_KEY) || '[]');
        const index = shipments.findIndex(s => s.id === id);
        if (index === -1) {
            throw { response: { data: { message: 'Shipment not found' }, status: 404 } };
        }
        shipments[index].status = status;
        shipments[index].statusNotes = notes;
        shipments[index].updatedAt = new Date().toISOString();
        localStorage.setItem(MOCK_SHIPMENTS_KEY, JSON.stringify(shipments));
        return shipments[index];
    }
    const response = await api.patch(`/shipments/${id}/status`, { status, notes });
    return response.data.data;
};

/**
 * Get shipment tracking history
 */
export const getTrackingHistory = async (id) => {
    if (USE_MOCK) {
        await delay(400);
        // Return mock tracking history
        return [
            { status: 'pending', timestamp: new Date(Date.now() - 86400000).toISOString(), location: 'Origin' },
            { status: 'picked_up', timestamp: new Date(Date.now() - 43200000).toISOString(), location: 'Pickup Point' },
            { status: 'in_transit', timestamp: new Date().toISOString(), location: 'In Transit' }
        ];
    }
    const response = await api.get(`/shipments/${id}/tracking`);
    return response.data.data;
};

/**
 * Track shipment by tracking number (public)
 */
export const trackShipment = async (trackingNumber) => {
    if (USE_MOCK) {
        await delay(500);
        const shipments = JSON.parse(localStorage.getItem(MOCK_SHIPMENTS_KEY) || '[]');
        const shipment = shipments.find(s => s.trackingNumber === trackingNumber);
        if (!shipment) {
            throw { response: { data: { message: 'Shipment not found' }, status: 404 } };
        }
        return shipment;
    }
    const response = await api.get(`/shipments/track/${trackingNumber}`);
    return response.data.data;
};

/**
 * Assign driver to shipment
 */
export const assignDriver = async (shipmentId, driverId) => {
    if (USE_MOCK) {
        await delay(500);
        const shipments = JSON.parse(localStorage.getItem(MOCK_SHIPMENTS_KEY) || '[]');
        const index = shipments.findIndex(s => s.id === shipmentId);
        if (index === -1) {
            throw { response: { data: { message: 'Shipment not found' }, status: 404 } };
        }
        shipments[index].driverId = driverId;
        shipments[index].status = 'assigned';
        localStorage.setItem(MOCK_SHIPMENTS_KEY, JSON.stringify(shipments));
        return shipments[index];
    }
    const response = await api.patch(`/shipments/${shipmentId}/assign`, { driverId });
    return response.data.data;
};

export default {
    getShipments,
    getShipment,
    createShipment,
    updateShipment,
    deleteShipment,
    updateShipmentStatus,
    getTrackingHistory,
    trackShipment,
    assignDriver
};
