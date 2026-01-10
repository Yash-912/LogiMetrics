'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * Seeder: Super Admin User
 * Creates the initial super admin user for system access
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // Hash the default password
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', salt);

        const superAdminId = uuidv4();

        // Create super admin user
        await queryInterface.bulkInsert('users', [
            {
                id: superAdminId,
                company_id: null,
                email: process.env.ADMIN_EMAIL || 'admin@logimetrics.com',
                password: hashedPassword,
                first_name: 'Super',
                last_name: 'Admin',
                phone: '+919999999999',
                role: 'super_admin',
                status: 'active',
                is_email_verified: true,
                timezone: 'Asia/Kolkata',
                language: 'en',
                preferences: JSON.stringify({
                    theme: 'dark',
                    dashboardLayout: 'default',
                    notifications: {
                        email: true,
                        push: true,
                        sms: false
                    }
                }),
                metadata: JSON.stringify({
                    isSystemUser: true,
                    createdBy: 'system'
                }),
                created_at: now,
                updated_at: now
            }
        ]);

        // Get super_admin role ID
        const [roles] = await queryInterface.sequelize.query(
            `SELECT id FROM roles WHERE name = 'super_admin' LIMIT 1`
        );

        if (roles.length > 0) {
            // Assign super_admin role to the user
            await queryInterface.bulkInsert('user_roles', [
                {
                    id: uuidv4(),
                    user_id: superAdminId,
                    role_id: roles[0].id,
                    created_at: now
                }
            ]);
        }

        console.log('✅ Super Admin user created');
        console.log(`   Email: ${process.env.ADMIN_EMAIL || 'admin@logimetrics.com'}`);
        console.log(`   Password: ${process.env.ADMIN_PASSWORD ? '(from env)' : 'Admin@123456'}`);
    },

    async down(queryInterface, Sequelize) {
        // Delete user_roles first due to foreign key
        await queryInterface.sequelize.query(
            `DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email = 'admin@logimetrics.com')`
        );
        await queryInterface.bulkDelete('users', { email: 'admin@logimetrics.com' }, {});
    }
};
