/**
 * Company API Service
 * Handles all company-related API calls
 */

import api from './axios';

const companyApi = {
    /**
     * Get all companies with pagination
     */
    getCompanies: async (params = {}) => {
        const response = await api.get('/companies', { params });
        return response.data;
    },

    /**
     * Get company by ID
     */
    getCompanyById: async (id) => {
        const response = await api.get(`/companies/${id}`);
        return response.data;
    },

    /**
     * Create a new company
     */
    createCompany: async (companyData) => {
        const response = await api.post('/companies', companyData);
        return response.data;
    },

    /**
     * Update company
     */
    updateCompany: async (id, companyData) => {
        const response = await api.put(`/companies/${id}`, companyData);
        return response.data;
    },

    /**
     * Delete company
     */
    deleteCompany: async (id) => {
        const response = await api.delete(`/companies/${id}`);
        return response.data;
    },

    /**
     * Get company settings
     */
    getCompanySettings: async (id) => {
        const response = await api.get(`/companies/${id}/settings`);
        return response.data;
    },

    /**
     * Update company settings
     */
    updateCompanySettings: async (id, settings) => {
        const response = await api.put(`/companies/${id}/settings`, settings);
        return response.data;
    },

    /**
     * Upload company logo
     */
    uploadLogo: async (id, file) => {
        const formData = new FormData();
        formData.append('logo', file);
        const response = await api.post(`/companies/${id}/logo`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    /**
     * Get company subscription details
     */
    getSubscription: async (id) => {
        const response = await api.get(`/companies/${id}/subscription`);
        return response.data;
    },

    /**
     * Update company subscription
     */
    updateSubscription: async (id, subscriptionData) => {
        const response = await api.put(`/companies/${id}/subscription`, subscriptionData);
        return response.data;
    },

    /**
     * Get company team members
     */
    getTeamMembers: async (id) => {
        const response = await api.get(`/companies/${id}/team`);
        return response.data;
    },

    /**
     * Add team member to company
     */
    addTeamMember: async (id, memberData) => {
        const response = await api.post(`/companies/${id}/team`, memberData);
        return response.data;
    },

    /**
     * Remove team member from company
     */
    removeTeamMember: async (id, userId) => {
        const response = await api.delete(`/companies/${id}/team/${userId}`);
        return response.data;
    },

    /**
     * Update team member role
     */
    updateMemberRole: async (id, userId, role) => {
        const response = await api.put(`/companies/${id}/team/${userId}/role`, { role });
        return response.data;
    },
};

export const {
    getCompanies,
    getCompanyById,
    createCompany,
    updateCompany,
    deleteCompany,
    getCompanySettings,
    updateCompanySettings,
    uploadLogo,
    getSubscription,
    updateSubscription,
    getTeamMembers,
    addTeamMember,
    removeTeamMember,
    updateMemberRole,
} = companyApi;

export default companyApi;
