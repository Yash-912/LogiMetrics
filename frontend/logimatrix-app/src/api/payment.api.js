/**
 * Payment API Service
 * Handles all payment-related API calls
 */

import api from './axios';

const paymentApi = {
    /**
     * Create guest payment intent for invoice
     * @param {Object} data { invoiceId, email, ... }
     */
    createGuestPaymentIntent: async (data) => {
        const response = await api.post('/payments/guest-intent', data);
        return response.data;
    },
};

export const {
    createGuestPaymentIntent,
} = paymentApi;

export default paymentApi;
