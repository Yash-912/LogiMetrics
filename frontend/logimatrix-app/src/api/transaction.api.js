/**
 * Transaction/Payment API Service
 * Handles all transaction and payment-related API calls
 */

import api from './axios';

const transactionApi = {
    /**
     * Get all transactions with pagination and filters
     */
    getTransactions: async (params = {}) => {
        const response = await api.get('/payments/transactions', { params });
        return response.data;
    },

    /**
     * Get transaction by ID
     */
    getTransactionById: async (id) => {
        const response = await api.get(`/payments/transactions/${id}`);
        return response.data;
    },

    /**
     * Create a new payment
     */
    createPayment: async (paymentData) => {
        const response = await api.post('/payments', paymentData);
        return response.data;
    },

    /**
     * Process payment for invoice
     */
    processInvoicePayment: async (invoiceId, paymentData) => {
        const response = await api.post(`/payments/invoice/${invoiceId}`, paymentData);
        return response.data;
    },

    /**
     * Refund payment
     */
    refundPayment: async (transactionId, refundData) => {
        const response = await api.post(`/payments/${transactionId}/refund`, refundData);
        return response.data;
    },

    /**
     * Get payment methods
     */
    getPaymentMethods: async () => {
        const response = await api.get('/payments/methods');
        return response.data;
    },

    /**
     * Add payment method
     */
    addPaymentMethod: async (methodData) => {
        const response = await api.post('/payments/methods', methodData);
        return response.data;
    },

    /**
     * Delete payment method
     */
    deletePaymentMethod: async (methodId) => {
        const response = await api.delete(`/payments/methods/${methodId}`);
        return response.data;
    },

    /**
     * Get payment summary/stats
     */
    getPaymentSummary: async (params = {}) => {
        const response = await api.get('/payments/summary', { params });
        return response.data;
    },
};

export const {
    getTransactions,
    getTransactionById,
    createPayment,
    processInvoicePayment,
    refundPayment,
    getPaymentMethods,
    addPaymentMethod,
    deletePaymentMethod,
    getPaymentSummary,
} = transactionApi;

export default transactionApi;
