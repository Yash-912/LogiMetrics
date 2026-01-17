'use strict';

/**
 * Migration: Create Users Table
 * User accounts with authentication and profile information
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            company_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'companies',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            email: {
                type: Sequelize.STRING(255),
                allowNull: false,
                unique: true
            },
            password: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            first_name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            last_name: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            phone: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            avatar: {
                type: Sequelize.STRING(500),
                allowNull: true
            },
            role: {
                type: Sequelize.STRING(50),
                allowNull: false,
                defaultValue: 'user'
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive', 'suspended', 'pending', 'deleted'),
                defaultValue: 'pending'
            },
            status_reason: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            is_email_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            email_verification_token: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            email_verification_expiry: {
                type: Sequelize.DATE,
                allowNull: true
            },
            password_reset_token: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            password_reset_expiry: {
                type: Sequelize.DATE,
                allowNull: true
            },
            password_changed_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            failed_login_attempts: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
            lock_until: {
                type: Sequelize.DATE,
                allowNull: true
            },
            last_login: {
                type: Sequelize.DATE,
                allowNull: true
            },
            last_login_ip: {
                type: Sequelize.STRING(45),
                allowNull: true
            },
            timezone: {
                type: Sequelize.STRING(50),
                defaultValue: 'Asia/Kolkata'
            },
            language: {
                type: Sequelize.STRING(10),
                defaultValue: 'en'
            },
            preferences: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            metadata: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            invite_token: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            invite_expiry: {
                type: Sequelize.DATE,
                allowNull: true
            },
            invited_by: {
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
        await queryInterface.addIndex('users', ['email']);
        await queryInterface.addIndex('users', ['company_id']);
        await queryInterface.addIndex('users', ['role']);
        await queryInterface.addIndex('users', ['status']);
        await queryInterface.addIndex('users', ['created_at']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('users');
    }
};
