/**
 * Invoice API Service
 * Handles all invoice-related API calls
 */

import api from './axios';

const invoiceApi = {
    /**
     * Get all invoices with pagination and filters
     */
    getInvoices: async (params = {}) => {
        const response = await api.get('/invoices', { params });
        return response.data;
    },

    /**
     * Get invoice by ID
     */
    getInvoiceById: async (id) => {
        const response = await api.get(`/invoices/${id}`);
        return response.data;
    },

    /**
     * Get invoice by number
     */
    getInvoiceByNumber: async (invoiceNumber) => {
        const response = await api.get(`/invoices/number/${invoiceNumber}`);
        return response.data;
    },

    /**
     * Create a new invoice
     */
    createInvoice: async (invoiceData) => {
        const response = await api.post('/invoices', invoiceData);
        return response.data;
    },

    /**
     * Update invoice
     */
    updateInvoice: async (id, invoiceData) => {
        const response = await api.put(`/invoices/${id}`, invoiceData);
        return response.data;
    },

    /**
     * Delete invoice
     */
    deleteInvoice: async (id) => {
        const response = await api.delete(`/invoices/${id}`);
        return response.data;
    },

    /**
     * Update invoice status
     */
    updateInvoiceStatus: async (id, status) => {
        const response = await api.patch(`/invoices/${id}/status`, { status });
        return response.data;
    },

    /**
     * Send invoice to customer
     */
    sendInvoice: async (id, emailData = {}) => {
        const response = await api.post(`/invoices/${id}/send`, emailData);
        return response.data;
    },

    /**
     * Download invoice PDF
     */
    downloadInvoicePDF: async (id) => {
        const response = await api.get(`/invoices/${id}/pdf`, {
            responseType: 'blob',
        });
        return response.data;
    },

    /**
     * Preview invoice PDF
     */
    previewInvoicePDF: async (id) => {
        const response = await api.get(`/invoices/${id}/preview`);
        return response.data;
    },

    /**
     * Mark invoice as viewed
     */
    markAsViewed: async (id) => {
        const response = await api.post(`/invoices/${id}/view`);
        return response.data;
    },

    /**
     * Add line item to invoice
     */
    addLineItem: async (id, itemData) => {
        const response = await api.post(`/invoices/${id}/items`, itemData);
        return response.data;
    },

    /**
     * Remove line item from invoice
     */
    removeLineItem: async (id, itemId) => {
        const response = await api.delete(`/invoices/${id}/items/${itemId}`);
        return response.data;
    },

    /**
     * Duplicate invoice
     */
    duplicateInvoice: async (id) => {
        const response = await api.post(`/invoices/${id}/duplicate`);
        return response.data;
    },

    /**
     * Generate invoice from shipments
     */
    generateFromShipments: async (data) => {
        const response = await api.post('/invoices/generate', data);
        return response.data;
    },
};

export const {
    getInvoices,
    getInvoiceById,
    getInvoiceByNumber,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    updateInvoiceStatus,
    sendInvoice,
    downloadInvoicePDF,
    previewInvoicePDF,
    markAsViewed,
    addLineItem,
    removeLineItem,
    duplicateInvoice,
    generateFromShipments,
} = invoiceApi;

export default invoiceApi;
