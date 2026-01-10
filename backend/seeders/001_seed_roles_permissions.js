'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seeder: Default Roles and Permissions
 * Creates system roles and their associated permissions
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // Define roles
        const roles = [
            {
                id: uuidv4(),
                name: 'super_admin',
                display_name: 'Super Administrator',
                description: 'Full system access with all permissions',
                is_system: true,
                level: 100,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                name: 'admin',
                display_name: 'Administrator',
                description: 'Company administrator with full company access',
                is_system: true,
                level: 80,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                name: 'manager',
                display_name: 'Manager',
                description: 'Operations manager with fleet and shipment management access',
                is_system: true,
                level: 60,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                name: 'dispatcher',
                display_name: 'Dispatcher',
                description: 'Dispatch operations and driver coordination',
                is_system: true,
                level: 40,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                name: 'driver',
                display_name: 'Driver',
                description: 'Driver with mobile app access',
                is_system: true,
                level: 20,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                name: 'customer',
                display_name: 'Customer',
                description: 'Customer with tracking and order access',
                is_system: true,
                level: 10,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                name: 'user',
                display_name: 'User',
                description: 'Basic user with limited access',
                is_system: true,
                level: 5,
                created_at: now,
                updated_at: now
            }
        ];

        // Define permissions with CRUD operations for each resource
        const resources = [
            'user', 'company', 'shipment', 'vehicle', 'driver', 'route',
            'invoice', 'payment', 'document', 'notification', 'analytics',
            'pricing', 'settings', 'admin'
        ];

        const actions = ['create', 'read', 'update', 'delete', 'manage'];

        const permissions = [];
        for (const resource of resources) {
            for (const action of actions) {
                permissions.push({
                    id: uuidv4(),
                    name: `${resource}:${action}`,
                    display_name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource.charAt(0).toUpperCase() + resource.slice(1)}s`,
                    description: `Permission to ${action} ${resource} resources`,
                    resource,
                    action,
                    created_at: now,
                    updated_at: now
                });
            }
        }

        // Add special permissions
        const specialPermissions = [
            { name: 'tracking:view', display_name: 'View Tracking', resource: 'tracking', action: 'view' },
            { name: 'tracking:update', display_name: 'Update Tracking', resource: 'tracking', action: 'update' },
            { name: 'reports:view', display_name: 'View Reports', resource: 'reports', action: 'view' },
            { name: 'reports:export', display_name: 'Export Reports', resource: 'reports', action: 'export' },
            { name: 'system:maintenance', display_name: 'System Maintenance', resource: 'system', action: 'maintenance' },
            { name: 'system:impersonate', display_name: 'Impersonate Users', resource: 'system', action: 'impersonate' },
            { name: 'billing:manage', display_name: 'Manage Billing', resource: 'billing', action: 'manage' }
        ];

        for (const perm of specialPermissions) {
            permissions.push({
                id: uuidv4(),
                name: perm.name,
                display_name: perm.display_name,
                description: `Permission for ${perm.display_name}`,
                resource: perm.resource,
                action: perm.action,
                created_at: now,
                updated_at: now
            });
        }

        // Insert roles and permissions
        await queryInterface.bulkInsert('roles', roles);
        await queryInterface.bulkInsert('permissions', permissions);

        // Create role-permission mappings
        const rolePermissions = [];

        // Helper to find role and permission IDs
        const findRoleId = (name) => roles.find(r => r.name === name)?.id;
        const findPermissionId = (name) => permissions.find(p => p.name === name)?.id;

        // Super Admin gets all permissions
        const superAdminId = findRoleId('super_admin');
        for (const perm of permissions) {
            rolePermissions.push({
                id: uuidv4(),
                role_id: superAdminId,
                permission_id: perm.id,
                created_at: now
            });
        }

        // Admin permissions (most permissions except system-level)
        const adminId = findRoleId('admin');
        const adminPermissions = permissions.filter(p =>
            !p.name.startsWith('system:') && p.name !== 'admin:delete'
        );
        for (const perm of adminPermissions) {
            rolePermissions.push({
                id: uuidv4(),
                role_id: adminId,
                permission_id: perm.id,
                created_at: now
            });
        }

        // Manager permissions
        const managerId = findRoleId('manager');
        const managerResources = ['shipment', 'vehicle', 'driver', 'route', 'document', 'notification', 'analytics'];
        const managerPerms = permissions.filter(p =>
            managerResources.includes(p.resource) ||
            p.name === 'tracking:view' ||
            p.name === 'tracking:update' ||
            p.name === 'reports:view'
        );
        for (const perm of managerPerms) {
            rolePermissions.push({
                id: uuidv4(),
                role_id: managerId,
                permission_id: perm.id,
                created_at: now
            });
        }

        // Dispatcher permissions
        const dispatcherId = findRoleId('dispatcher');
        const dispatcherPerms = permissions.filter(p =>
            ['shipment', 'route', 'driver', 'vehicle'].includes(p.resource) &&
            ['read', 'update'].includes(p.action) ||
            p.name === 'tracking:view' ||
            p.name === 'tracking:update'
        );
        for (const perm of dispatcherPerms) {
            rolePermissions.push({
                id: uuidv4(),
                role_id: dispatcherId,
                permission_id: perm.id,
                created_at: now
            });
        }

        // Driver permissions
        const driverId = findRoleId('driver');
        const driverPerms = [
            'shipment:read', 'shipment:update', 'route:read',
            'document:read', 'document:create', 'tracking:update'
        ];
        for (const permName of driverPerms) {
            const permId = findPermissionId(permName);
            if (permId) {
                rolePermissions.push({
                    id: uuidv4(),
                    role_id: driverId,
                    permission_id: permId,
                    created_at: now
                });
            }
        }

        // Customer permissions
        const customerId = findRoleId('customer');
        const customerPerms = ['shipment:read', 'shipment:create', 'tracking:view', 'invoice:read', 'payment:create'];
        for (const permName of customerPerms) {
            const permId = findPermissionId(permName);
            if (permId) {
                rolePermissions.push({
                    id: uuidv4(),
                    role_id: customerId,
                    permission_id: permId,
                    created_at: now
                });
            }
        }

        await queryInterface.bulkInsert('role_permissions', rolePermissions);

        console.log(`✅ Seeded ${roles.length} roles and ${permissions.length} permissions`);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('role_permissions', null, {});
        await queryInterface.bulkDelete('permissions', null, {});
        await queryInterface.bulkDelete('roles', null, {});
    }
};
