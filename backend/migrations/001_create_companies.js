'use strict';

/**
 * Migration: Create Companies Table
 * Core company/tenant table for multi-tenant architecture
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('companies', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            email: {
                type: Sequelize.STRING(255),
                allowNull: false,
                unique: true
            },
            phone: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            website: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            logo: {
                type: Sequelize.STRING(500),
                allowNull: true
            },
            address: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            city: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            state: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            country: {
                type: Sequelize.STRING(100),
                allowNull: true,
                defaultValue: 'India'
            },
            postal_code: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            tax_id: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            gstin: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            industry: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            size: {
                type: Sequelize.ENUM('small', 'medium', 'large', 'enterprise'),
                defaultValue: 'small'
            },
            subscription_plan: {
                type: Sequelize.ENUM('free', 'starter', 'professional', 'enterprise'),
                defaultValue: 'free'
            },
            subscription_status: {
                type: Sequelize.ENUM('active', 'trialing', 'past_due', 'cancelled', 'expired'),
                defaultValue: 'active'
            },
            subscription_expires_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive', 'suspended', 'pending', 'deleted'),
                defaultValue: 'pending'
            },
            status_reason: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            settings: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            billing_info: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            metadata: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            created_by: {
                type: Sequelize.UUID,
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            },
            deleted_at: {
                type: Sequelize.DATE,
                allowNull: true
            }
        });

        // Create indexes
        await queryInterface.addIndex('companies', ['email']);
        await queryInterface.addIndex('companies', ['status']);
        await queryInterface.addIndex('companies', ['subscription_plan']);
        await queryInterface.addIndex('companies', ['created_at']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('companies');
    }
};
