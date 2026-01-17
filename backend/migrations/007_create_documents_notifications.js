'use strict';

/**
 * Migration: Create Documents and Notifications Tables
 * Supporting tables for document management and notification system
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        // Create documents table
        await queryInterface.createTable('documents', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            company_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'companies',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            entity_type: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: 'user, driver, vehicle, shipment, company, etc.'
            },
            entity_id: {
                type: Sequelize.UUID,
                allowNull: true
            },
            document_type: {
                type: Sequelize.STRING(50),
                allowNull: false,
                comment: 'license, insurance, registration, invoice, contract, etc.'
            },
            name: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            file_name: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            file_url: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            file_type: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            file_size: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            version: {
                type: Sequelize.INTEGER,
                defaultValue: 1
            },
            is_public: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            expiry_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            verified_by: {
                type: Sequelize.UUID,
                allowNull: true
            },
            verified_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            tags: {
                type: Sequelize.ARRAY(Sequelize.STRING),
                defaultValue: []
            },
            metadata: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            uploaded_by: {
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

        // Create document_versions table (for version history)
        await queryInterface.createTable('document_versions', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            document_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'documents',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            version: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            file_name: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            file_url: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            file_size: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            uploaded_by: {
                type: Sequelize.UUID,
                allowNull: true
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
            }
        });

        // Create document_shares table
        await queryInterface.createTable('document_shares', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            document_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'documents',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            share_token: {
                type: Sequelize.STRING(100),
                allowNull: false,
                unique: true
            },
            shared_with_email: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            shared_with_user_id: {
                type: Sequelize.UUID,
                allowNull: true
            },
            permission: {
                type: Sequelize.ENUM('view', 'download', 'edit'),
                defaultValue: 'view'
            },
            expires_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            password_hash: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            access_count: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
            max_access_count: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            shared_by: {
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
            }
        });

        // Create driver_documents table
        await queryInterface.createTable('driver_documents', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            driver_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'drivers',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            document_type: {
                type: Sequelize.STRING(50),
                allowNull: false
            },
            document_number: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            url: {
                type: Sequelize.STRING(500),
                allowNull: false
            },
            expiry_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            uploaded_by: {
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
            }
        });

        // Create notification_preferences table
        await queryInterface.createTable('notification_preferences', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            email_enabled: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            sms_enabled: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            push_enabled: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            in_app_enabled: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            shipment_updates: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            payment_updates: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            marketing: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            weekly_digest: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            quiet_hours: {
                type: Sequelize.JSONB,
                defaultValue: {}
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
            }
        });

        // Create push_subscriptions table
        await queryInterface.createTable('push_subscriptions', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            user_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            endpoint: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            keys: {
                type: Sequelize.JSONB,
                allowNull: false
            },
            device_type: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            device_name: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            last_used_at: {
                type: Sequelize.DATE,
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
            }
        });

        // Create company_settings table
        await queryInterface.createTable('company_settings', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            company_id: {
                type: Sequelize.UUID,
                allowNull: false,
                unique: true,
                references: {
                    model: 'companies',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            timezone: {
                type: Sequelize.STRING(50),
                defaultValue: 'Asia/Kolkata'
            },
            currency: {
                type: Sequelize.STRING(3),
                defaultValue: 'INR'
            },
            date_format: {
                type: Sequelize.STRING(20),
                defaultValue: 'DD/MM/YYYY'
            },
            distance_unit: {
                type: Sequelize.ENUM('km', 'miles'),
                defaultValue: 'km'
            },
            weight_unit: {
                type: Sequelize.ENUM('kg', 'lb'),
                defaultValue: 'kg'
            },
            notifications: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            branding: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            invoice_settings: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            tracking_settings: {
                type: Sequelize.JSONB,
                defaultValue: {}
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
            }
        });

        // Create subscriptions table
        await queryInterface.createTable('subscriptions', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            company_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'companies',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            plan: {
                type: Sequelize.ENUM('free', 'starter', 'professional', 'enterprise'),
                allowNull: false
            },
            billing_cycle: {
                type: Sequelize.ENUM('monthly', 'yearly'),
                defaultValue: 'monthly'
            },
            status: {
                type: Sequelize.ENUM('active', 'trialing', 'past_due', 'cancelled', 'expired'),
                defaultValue: 'active'
            },
            start_date: {
                type: Sequelize.DATE,
                allowNull: false
            },
            current_period_start: {
                type: Sequelize.DATE,
                allowNull: true
            },
            current_period_end: {
                type: Sequelize.DATE,
                allowNull: true
            },
            cancelled_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            cancel_at_period_end: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            cancellation_reason: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            payment_method_id: {
                type: Sequelize.UUID,
                allowNull: true
            },
            metadata: {
                type: Sequelize.JSONB,
                defaultValue: {}
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
            }
        });

        // Create indexes
        await queryInterface.addIndex('documents', ['company_id']);
        await queryInterface.addIndex('documents', ['entity_type', 'entity_id']);
        await queryInterface.addIndex('documents', ['document_type']);
        await queryInterface.addIndex('document_versions', ['document_id']);
        await queryInterface.addIndex('document_shares', ['document_id']);
        await queryInterface.addIndex('document_shares', ['share_token']);
        await queryInterface.addIndex('driver_documents', ['driver_id']);
        await queryInterface.addIndex('push_subscriptions', ['user_id']);
        await queryInterface.addIndex('subscriptions', ['company_id']);
        await queryInterface.addIndex('subscriptions', ['status']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('subscriptions');
        await queryInterface.dropTable('company_settings');
        await queryInterface.dropTable('push_subscriptions');
        await queryInterface.dropTable('notification_preferences');
        await queryInterface.dropTable('driver_documents');
        await queryInterface.dropTable('document_shares');
        await queryInterface.dropTable('document_versions');
        await queryInterface.dropTable('documents');
    }
};
