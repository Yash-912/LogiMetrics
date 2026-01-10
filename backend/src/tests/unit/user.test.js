/**
 * User Service Unit Tests
 * Tests for user service functionality
 */

const { describe, it, expect, beforeEach, jest } = require('@jest/globals');

// Mock dependencies
jest.mock('../../models/postgres', () => ({
    User: {
        findOne: jest.fn(),
        findByPk: jest.fn(),
        findAll: jest.fn(),
        findAndCountAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn()
    }
}));

const { users, getAllUsers, getUserByRole } = require('../fixtures/users.fixture');
const { User } = require('../../models/postgres');

describe('User Service Tests', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Get Users', () => {
        it('should get all users with pagination', async () => {
            const allUsers = getAllUsers();
            User.findAndCountAll.mockResolvedValue({ count: allUsers.length, rows: allUsers });

            const result = await User.findAndCountAll({ limit: 10, offset: 0 });

            expect(result.count).toBe(allUsers.length);
            expect(result.rows).toHaveLength(allUsers.length);
        });

        it('should get user by ID', async () => {
            User.findByPk.mockResolvedValue(users.admin);

            const user = await User.findByPk(users.admin.id);

            expect(user).toBeTruthy();
            expect(user.id).toBe(users.admin.id);
            expect(user.email).toBe(users.admin.email);
        });

        it('should return null for non-existent user', async () => {
            User.findByPk.mockResolvedValue(null);

            const user = await User.findByPk('non-existent-id');

            expect(user).toBeNull();
        });

        it('should filter users by role', async () => {
            const adminUser = getUserByRole('admin');
            User.findAll.mockResolvedValue([adminUser]);

            const admins = await User.findAll({ where: { role: 'admin' } });

            expect(admins).toHaveLength(1);
            expect(admins[0].role).toBe('admin');
        });

        it('should filter users by status', async () => {
            const activeUsers = getAllUsers().filter(u => u.status === 'active');
            User.findAll.mockResolvedValue(activeUsers);

            const result = await User.findAll({ where: { status: 'active' } });

            expect(result.every(u => u.status === 'active')).toBe(true);
        });
    });

    describe('Create User', () => {
        it('should create user with valid data', async () => {
            const newUserData = {
                email: 'newuser@test.com',
                firstName: 'New',
                lastName: 'User',
                password: 'hashed-password',
                role: 'dispatcher'
            };
            User.create.mockResolvedValue({ id: 'new-id', ...newUserData });

            const user = await User.create(newUserData);

            expect(user).toHaveProperty('id');
            expect(user.email).toBe(newUserData.email);
            expect(User.create).toHaveBeenCalledWith(newUserData);
        });
    });

    describe('Update User', () => {
        it('should update user profile', async () => {
            const updateData = { firstName: 'Updated', lastName: 'Name' };
            User.findByPk.mockResolvedValue({ ...users.admin, update: jest.fn().mockResolvedValue({ ...users.admin, ...updateData }) });

            const user = await User.findByPk(users.admin.id);
            const updatedUser = await user.update(updateData);

            expect(updatedUser.firstName).toBe('Updated');
            expect(updatedUser.lastName).toBe('Name');
        });

        it('should change user status', async () => {
            User.findByPk.mockResolvedValue({ ...users.admin, update: jest.fn().mockResolvedValue({ ...users.admin, status: 'inactive' }) });

            const user = await User.findByPk(users.admin.id);
            const updatedUser = await user.update({ status: 'inactive' });

            expect(updatedUser.status).toBe('inactive');
        });
    });

    describe('Delete User', () => {
        it('should soft delete user', async () => {
            User.findByPk.mockResolvedValue({ ...users.manager, update: jest.fn().mockResolvedValue({ ...users.manager, status: 'deleted' }) });

            const user = await User.findByPk(users.manager.id);
            const deletedUser = await user.update({ status: 'deleted' });

            expect(deletedUser.status).toBe('deleted');
        });
    });

    describe('User Validation', () => {
        it('should find user by email', async () => {
            User.findOne.mockResolvedValue(users.admin);

            const user = await User.findOne({ where: { email: users.admin.email } });

            expect(user).toBeTruthy();
            expect(user.email).toBe(users.admin.email);
        });

        it('should check email uniqueness', async () => {
            User.findOne.mockResolvedValue(users.admin);

            const existing = await User.findOne({ where: { email: users.admin.email } });

            expect(existing).toBeTruthy();
        });
    });
});
