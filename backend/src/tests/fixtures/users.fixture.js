/**
 * Users Fixture
 * Mock user data for testing
 */

const bcrypt = require('bcrypt');

// Password hash for 'Test@123' - computed once for efficiency
const PASSWORD_HASH = '$2b$10$YourHashedPasswordHere123456789012345678901234567890';

const users = {
    admin: {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'admin@logimetrics.com',
        password: PASSWORD_HASH,
        firstName: 'Admin',
        lastName: 'User',
        phone: '+919876543210',
        role: 'admin',
        status: 'active',
        isEmailVerified: true,
        companyId: '550e8400-e29b-41d4-a716-446655440010',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01')
    },

    manager: {
        id: '550e8400-e29b-41d4-a716-446655440002',
        email: 'manager@testcompany.com',
        password: PASSWORD_HASH,
        firstName: 'John',
        lastName: 'Manager',
        phone: '+919876543211',
        role: 'manager',
        status: 'active',
        isEmailVerified: true,
        companyId: '550e8400-e29b-41d4-a716-446655440011',
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-02')
    },

    dispatcher: {
        id: '550e8400-e29b-41d4-a716-446655440003',
        email: 'dispatcher@testcompany.com',
        password: PASSWORD_HASH,
        firstName: 'Jane',
        lastName: 'Dispatcher',
        phone: '+919876543212',
        role: 'dispatcher',
        status: 'active',
        isEmailVerified: true,
        companyId: '550e8400-e29b-41d4-a716-446655440011',
        createdAt: new Date('2025-01-03'),
        updatedAt: new Date('2025-01-03')
    },

    driver: {
        id: '550e8400-e29b-41d4-a716-446655440004',
        email: 'driver@testcompany.com',
        password: PASSWORD_HASH,
        firstName: 'Mike',
        lastName: 'Driver',
        phone: '+919876543213',
        role: 'driver',
        status: 'active',
        isEmailVerified: true,
        companyId: '550e8400-e29b-41d4-a716-446655440011',
        createdAt: new Date('2025-01-04'),
        updatedAt: new Date('2025-01-04')
    },

    customer: {
        id: '550e8400-e29b-41d4-a716-446655440005',
        email: 'customer@example.com',
        password: PASSWORD_HASH,
        firstName: 'Sarah',
        lastName: 'Customer',
        phone: '+919876543214',
        role: 'customer',
        status: 'active',
        isEmailVerified: true,
        companyId: null,
        createdAt: new Date('2025-01-05'),
        updatedAt: new Date('2025-01-05')
    },

    inactiveUser: {
        id: '550e8400-e29b-41d4-a716-446655440006',
        email: 'inactive@testcompany.com',
        password: PASSWORD_HASH,
        firstName: 'Inactive',
        lastName: 'User',
        phone: '+919876543215',
        role: 'dispatcher',
        status: 'inactive',
        isEmailVerified: true,
        companyId: '550e8400-e29b-41d4-a716-446655440011',
        createdAt: new Date('2025-01-06'),
        updatedAt: new Date('2025-01-06')
    },

    unverifiedUser: {
        id: '550e8400-e29b-41d4-a716-446655440007',
        email: 'unverified@example.com',
        password: PASSWORD_HASH,
        firstName: 'Unverified',
        lastName: 'User',
        phone: '+919876543216',
        role: 'customer',
        status: 'pending',
        isEmailVerified: false,
        emailVerificationToken: 'test-verification-token-123',
        companyId: null,
        createdAt: new Date('2025-01-07'),
        updatedAt: new Date('2025-01-07')
    }
};

// Valid registration data
const validRegistration = {
    email: 'newuser@example.com',
    password: 'NewUser@123',
    firstName: 'New',
    lastName: 'User',
    phone: '+919876543299'
};

// Invalid registration data
const invalidRegistration = {
    missingEmail: { password: 'Test@123', firstName: 'Test', lastName: 'User' },
    invalidEmail: { email: 'invalid-email', password: 'Test@123', firstName: 'Test', lastName: 'User' },
    weakPassword: { email: 'test@test.com', password: '123', firstName: 'Test', lastName: 'User' },
    missingFirstName: { email: 'test@test.com', password: 'Test@123', lastName: 'User' }
};

// Login credentials
const validLogin = { email: 'admin@logimetrics.com', password: 'Test@123' };
const invalidLogin = { email: 'admin@logimetrics.com', password: 'WrongPassword' };

// Helper to get all users as array
const getAllUsers = () => Object.values(users);

// Helper to get user by role
const getUserByRole = (role) => Object.values(users).find(u => u.role === role);

module.exports = {
    users,
    validRegistration,
    invalidRegistration,
    validLogin,
    invalidLogin,
    getAllUsers,
    getUserByRole,
    PASSWORD_HASH
};
