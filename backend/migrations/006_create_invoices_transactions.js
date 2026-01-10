'use strict';

/**
 * Migration: Create Invoices and Transactions Tables
 * Financial and payment processing tables
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        // Create invoices table
        await queryInterface.createTable('invoices', {
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
            invoice_number: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true
            },
            customer_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            shipment_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'shipments',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            issue_date: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            due_date: {
                type: Sequelize.DATEONLY,
                allowNull: false
            },
            subtotal: {
                type: Sequelize.DECIMAL(14, 2),
                allowNull: false,
                defaultValue: 0
            },
            discount: {
                type: Sequelize.DECIMAL(14, 2),
                defaultValue: 0
            },
            discount_type: {
                type: Sequelize.ENUM('fixed', 'percentage'),
                defaultValue: 'fixed'
            },
            tax_amount: {
                type: Sequelize.DECIMAL(14, 2),
                defaultValue: 0
            },
            tax_rate: {
                type: Sequelize.DECIMAL(5, 2),
                defaultValue: 0
            },
            total: {
                type: Sequelize.DECIMAL(14, 2),
                allowNull: false,
                defaultValue: 0
            },
            amount_paid: {
                type: Sequelize.DECIMAL(14, 2),
                defaultValue: 0
            },
            balance_due: {
                type: Sequelize.DECIMAL(14, 2),
                defaultValue: 0
            },
            currency: {
                type: Sequelize.STRING(3),
                defaultValue: 'INR'
            },
            status: {
                type: Sequelize.ENUM('draft', 'pending', 'sent', 'paid', 'partially_paid', 'overdue', 'cancelled', 'refunded'),
                defaultValue: 'draft'
            },
            billing_address: {
                type: Sequelize.JSONB,
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            terms: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            pdf_url: {
                type: Sequelize.STRING(500),
                allowNull: true
            },
            sent_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            paid_at: {
                type: Sequelize.DATE,
                allowNull: true
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

        // Create invoice_items table
        await queryInterface.createTable('invoice_items', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            invoice_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'invoices',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            quantity: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 1
            },
            unit_price: {
                type: Sequelize.DECIMAL(14, 2),
                allowNull: false
            },
            discount: {
                type: Sequelize.DECIMAL(14, 2),
                defaultValue: 0
            },
            tax_rate: {
                type: Sequelize.DECIMAL(5, 2),
                defaultValue: 0
            },
            total: {
                type: Sequelize.DECIMAL(14, 2),
                allowNull: false
            },
            shipment_id: {
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

        // Create transactions table
        await queryInterface.createTable('transactions', {
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
            customer_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            invoice_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'invoices',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            shipment_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'shipments',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            amount: {
                type: Sequelize.DECIMAL(14, 2),
                allowNull: false
            },
            currency: {
                type: Sequelize.STRING(3),
                defaultValue: 'INR'
            },
            payment_gateway: {
                type: Sequelize.ENUM('razorpay', 'stripe', 'bank_transfer', 'cash', 'other'),
                allowNull: false
            },
            gateway_order_id: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            gateway_payment_id: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            gateway_response: {
                type: Sequelize.JSONB,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'partially_refunded', 'cancelled'),
                defaultValue: 'pending'
            },
            error_message: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            completed_at: {
                type: Sequelize.DATE,
                allowNull: true
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
            }
        });

        // Create refunds table
        await queryInterface.createTable('refunds', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            transaction_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'transactions',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            amount: {
                type: Sequelize.DECIMAL(14, 2),
                allowNull: false
            },
            reason: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            gateway_refund_id: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            gateway_response: {
                type: Sequelize.JSONB,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed'),
                defaultValue: 'pending'
            },
            error_message: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            completed_at: {
                type: Sequelize.DATE,
                allowNull: true
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
            }
        });

        // Create payment_methods table
        await queryInterface.createTable('payment_methods', {
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
            type: {
                type: Sequelize.ENUM('card', 'bank_account', 'upi', 'wallet'),
                allowNull: false
            },
            card_brand: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            last_four_digits: {
                type: Sequelize.STRING(4),
                allowNull: true
            },
            masked_number: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            expiry_month: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            expiry_year: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            cardholder_name: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            bank_name: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            upi_id: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            is_default: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            gateway_token: {
                type: Sequelize.STRING(255),
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

        // Create pricing_rules table
        await queryInterface.createTable('pricing_rules', {
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
            name: {
                type: Sequelize.STRING(255),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            type: {
                type: Sequelize.ENUM('base', 'distance', 'weight', 'volume', 'zone', 'service', 'surcharge'),
                allowNull: false
            },
            vehicle_type: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            service_type: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            base_price: {
                type: Sequelize.DECIMAL(12, 2),
                defaultValue: 0
            },
            price_per_km: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            },
            price_per_kg: {
                type: Sequelize.DECIMAL(10, 2),
                defaultValue: 0
            },
            min_charge: {
                type: Sequelize.DECIMAL(12, 2),
                defaultValue: 0
            },
            max_charge: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: true
            },
            conditions: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            priority: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            valid_from: {
                type: Sequelize.DATE,
                allowNull: true
            },
            valid_until: {
                type: Sequelize.DATE,
                allowNull: true
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
            }
        });

        // Create indexes
        await queryInterface.addIndex('invoices', ['company_id']);
        await queryInterface.addIndex('invoices', ['invoice_number']);
        await queryInterface.addIndex('invoices', ['status']);
        await queryInterface.addIndex('invoices', ['customer_id']);
        await queryInterface.addIndex('invoice_items', ['invoice_id']);
        await queryInterface.addIndex('transactions', ['company_id']);
        await queryInterface.addIndex('transactions', ['invoice_id']);
        await queryInterface.addIndex('transactions', ['status']);
        await queryInterface.addIndex('transactions', ['gateway_payment_id']);
        await queryInterface.addIndex('refunds', ['transaction_id']);
        await queryInterface.addIndex('payment_methods', ['user_id']);
        await queryInterface.addIndex('pricing_rules', ['company_id']);
        await queryInterface.addIndex('pricing_rules', ['type']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('pricing_rules');
        await queryInterface.dropTable('payment_methods');
        await queryInterface.dropTable('refunds');
        await queryInterface.dropTable('transactions');
        await queryInterface.dropTable('invoice_items');
        await queryInterface.dropTable('invoices');
    }
};
