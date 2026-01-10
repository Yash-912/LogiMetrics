/**
 * Companies Fixture
 * Mock company data for testing
 */

const companies = {
    logimetrics: {
        id: '550e8400-e29b-41d4-a716-446655440010',
        name: 'LogiMetrics Inc.',
        email: 'info@logimetrics.com',
        phone: '+919876543200',
        type: 'platform',
        status: 'active',
        address: {
            street: '123 Tech Park',
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            zipCode: '560001'
        },
        settings: {
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY'
        },
        subscription: {
            plan: 'enterprise',
            status: 'active',
            startDate: new Date('2025-01-01'),
            endDate: new Date('2026-01-01')
        },
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
    },

    testCompany: {
        id: '550e8400-e29b-41d4-a716-446655440011',
        name: 'Test Logistics Co.',
        email: 'info@testlogistics.com',
        phone: '+919876543201',
        type: 'logistics',
        status: 'active',
        address: {
            street: '456 Industrial Area',
            city: 'Mumbai',
            state: 'Maharashtra',
            country: 'India',
            zipCode: '400001'
        },
        settings: {
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY'
        },
        subscription: {
            plan: 'professional',
            status: 'active',
            startDate: new Date('2025-02-01'),
            endDate: new Date('2026-02-01')
        },
        createdAt: new Date('2025-02-01'),
        updatedAt: new Date('2025-02-01')
    },

    customerCompany: {
        id: '550e8400-e29b-41d4-a716-446655440012',
        name: 'ABC Retailers',
        email: 'orders@abcretailers.com',
        phone: '+919876543202',
        type: 'customer',
        status: 'active',
        address: {
            street: '789 Market Street',
            city: 'Delhi',
            state: 'Delhi',
            country: 'India',
            zipCode: '110001'
        },
        settings: {
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY'
        },
        subscription: {
            plan: 'basic',
            status: 'active',
            startDate: new Date('2025-03-01'),
            endDate: new Date('2026-03-01')
        },
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date('2025-03-01')
    },

    inactiveCompany: {
        id: '550e8400-e29b-41d4-a716-446655440013',
        name: 'Inactive Corp',
        email: 'info@inactivecorp.com',
        phone: '+919876543203',
        type: 'logistics',
        status: 'inactive',
        address: {
            street: '000 Closed Road',
            city: 'Chennai',
            state: 'Tamil Nadu',
            country: 'India',
            zipCode: '600001'
        },
        settings: {
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            dateFormat: 'DD/MM/YYYY'
        },
        subscription: {
            plan: 'basic',
            status: 'expired',
            startDate: new Date('2024-01-01'),
            endDate: new Date('2025-01-01')
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2025-01-01')
    }
};

// Valid company registration data
const validCompanyRegistration = {
    name: 'New Logistics Company',
    email: 'info@newlogistics.com',
    phone: '+919876543299',
    type: 'logistics',
    address: {
        street: '999 New Street',
        city: 'Pune',
        state: 'Maharashtra',
        country: 'India',
        zipCode: '411001'
    }
};

// Invalid company data
const invalidCompanyData = {
    missingName: { email: 'test@test.com', phone: '+919876543299' },
    invalidEmail: { name: 'Test Co', email: 'invalid-email', phone: '+919876543299' },
    missingAddress: { name: 'Test Co', email: 'test@test.com', phone: '+919876543299' }
};

// Helper functions
const getAllCompanies = () => Object.values(companies);
const getCompanyByType = (type) => Object.values(companies).find(c => c.type === type);
const getActiveCompanies = () => Object.values(companies).filter(c => c.status === 'active');

module.exports = {
    companies,
    validCompanyRegistration,
    invalidCompanyData,
    getAllCompanies,
    getCompanyByType,
    getActiveCompanies
};
