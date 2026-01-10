/**
 * Authentication Unit Tests
 * Tests for auth service and utilities
 */

const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

// Mock dependencies
jest.mock('../../models/postgres', () => ({
    User: {
        findOne: jest.fn(),
        findByPk: jest.fn(),
        create: jest.fn()
    }
}));

jest.mock('../../utils/jwt.util', () => ({
    generateAccessToken: jest.fn(() => 'mock-access-token'),
    generateRefreshToken: jest.fn(() => 'mock-refresh-token'),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn()
}));

jest.mock('../../utils/bcrypt.util', () => ({
    hashPassword: jest.fn(() => 'hashed-password'),
    comparePassword: jest.fn()
}));

const { users, validLogin, invalidLogin, validRegistration } = require('../fixtures/users.fixture');
const { User } = require('../../models/postgres');
const { generateAccessToken, generateRefreshToken, verifyAccessToken } = require('../../utils/jwt.util');
const { hashPassword, comparePassword } = require('../../utils/bcrypt.util');

describe('Authentication Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Login', () => {
        it('should login with valid credentials', async () => {
            User.findOne.mockResolvedValue(users.admin);
            comparePassword.mockResolvedValue(true);

            const user = await User.findOne({ where: { email: validLogin.email } });
            const isValidPassword = await comparePassword(validLogin.password, user.password);

            expect(user).toBeTruthy();
            expect(user.email).toBe(validLogin.email);
            expect(isValidPassword).toBe(true);
        });

        it('should reject login with invalid password', async () => {
            User.findOne.mockResolvedValue(users.admin);
            comparePassword.mockResolvedValue(false);

            const user = await User.findOne({ where: { email: invalidLogin.email } });
            const isValidPassword = await comparePassword(invalidLogin.password, user.password);

            expect(isValidPassword).toBe(false);
        });

        it('should reject login for non-existent user', async () => {
            User.findOne.mockResolvedValue(null);

            const user = await User.findOne({ where: { email: 'nonexistent@test.com' } });

            expect(user).toBeNull();
        });

        it('should reject login for inactive user', async () => {
            User.findOne.mockResolvedValue(users.inactiveUser);

            const user = await User.findOne({ where: { email: users.inactiveUser.email } });

            expect(user.status).toBe('inactive');
        });
    });

    describe('Token Generation', () => {
        it('should generate access token', () => {
            const token = generateAccessToken({ id: users.admin.id, role: users.admin.role });

            expect(token).toBe('mock-access-token');
            expect(generateAccessToken).toHaveBeenCalledWith({ id: users.admin.id, role: users.admin.role });
        });

        it('should generate refresh token', () => {
            const token = generateRefreshToken({ id: users.admin.id });

            expect(token).toBe('mock-refresh-token');
            expect(generateRefreshToken).toHaveBeenCalledWith({ id: users.admin.id });
        });

        it('should verify valid access token', () => {
            verifyAccessToken.mockReturnValue({ id: users.admin.id, role: users.admin.role });

            const decoded = verifyAccessToken('valid-token');

            expect(decoded).toHaveProperty('id', users.admin.id);
            expect(decoded).toHaveProperty('role', users.admin.role);
        });

        it('should reject invalid access token', () => {
            verifyAccessToken.mockImplementation(() => { throw new Error('Invalid token'); });

            expect(() => verifyAccessToken('invalid-token')).toThrow('Invalid token');
        });
    });

    describe('Registration', () => {
        it('should register new user with valid data', async () => {
            User.findOne.mockResolvedValue(null); // User doesn't exist
            User.create.mockResolvedValue({ id: 'new-user-id', ...validRegistration });

            const existingUser = await User.findOne({ where: { email: validRegistration.email } });
            expect(existingUser).toBeNull();

            const hashedPassword = await hashPassword(validRegistration.password);
            expect(hashedPassword).toBe('hashed-password');

            const newUser = await User.create({ ...validRegistration, password: hashedPassword });
            expect(newUser).toHaveProperty('id');
            expect(newUser.email).toBe(validRegistration.email);
        });

        it('should reject registration with existing email', async () => {
            User.findOne.mockResolvedValue(users.admin);

            const existingUser = await User.findOne({ where: { email: users.admin.email } });

            expect(existingUser).toBeTruthy();
            expect(existingUser.email).toBe(users.admin.email);
        });
    });

    describe('Password Hashing', () => {
        it('should hash password correctly', async () => {
            const hashedPassword = await hashPassword('TestPassword123');

            expect(hashedPassword).toBe('hashed-password');
            expect(hashPassword).toHaveBeenCalledWith('TestPassword123');
        });

        it('should compare passwords correctly', async () => {
            comparePassword.mockResolvedValue(true);

            const isMatch = await comparePassword('TestPassword123', 'hashed-password');

            expect(isMatch).toBe(true);
        });
    });
});
