'use strict';

/**
 * Migration: Create Shipments and Routes Tables
 * Core logistics tables for shipment tracking and route management
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        // Create routes table first (shipments reference routes)
        await queryInterface.createTable('routes', {
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
            start_address: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            start_latitude: {
                type: Sequelize.DECIMAL(10, 8),
                allowNull: false
            },
            start_longitude: {
                type: Sequelize.DECIMAL(11, 8),
                allowNull: false
            },
            end_address: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            end_latitude: {
                type: Sequelize.DECIMAL(10, 8),
                allowNull: false
            },
            end_longitude: {
                type: Sequelize.DECIMAL(11, 8),
                allowNull: false
            },
            distance: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'in km'
            },
            estimated_duration: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'in minutes'
            },
            polyline: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            driver_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'drivers',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            vehicle_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'vehicles',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            scheduled_start_time: {
                type: Sequelize.DATE,
                allowNull: true
            },
            scheduled_end_time: {
                type: Sequelize.DATE,
                allowNull: true
            },
            actual_start_time: {
                type: Sequelize.DATE,
                allowNull: true
            },
            actual_end_time: {
                type: Sequelize.DATE,
                allowNull: true
            },
            type: {
                type: Sequelize.ENUM('delivery', 'pickup', 'mixed'),
                defaultValue: 'delivery'
            },
            priority: {
                type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
                defaultValue: 'normal'
            },
            status: {
                type: Sequelize.ENUM('planned', 'active', 'completed', 'cancelled', 'deleted'),
                defaultValue: 'planned'
            },
            optimized_at: {
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

        // Create waypoints table
        await queryInterface.createTable('waypoints', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            route_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'routes',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            sequence: {
                type: Sequelize.INTEGER,
                allowNull: false
            },
            address: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            latitude: {
                type: Sequelize.DECIMAL(10, 8),
                allowNull: false
            },
            longitude: {
                type: Sequelize.DECIMAL(11, 8),
                allowNull: false
            },
            estimated_arrival: {
                type: Sequelize.DATE,
                allowNull: true
            },
            actual_arrival: {
                type: Sequelize.DATE,
                allowNull: true
            },
            type: {
                type: Sequelize.ENUM('pickup', 'delivery', 'stop'),
                defaultValue: 'delivery'
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('pending', 'arrived', 'completed', 'skipped'),
                defaultValue: 'pending'
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

        // Create shipments table
        await queryInterface.createTable('shipments', {
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
            tracking_id: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true
            },
            reference_number: {
                type: Sequelize.STRING(100),
                allowNull: true
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
            driver_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'drivers',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            vehicle_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'vehicles',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            route_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'routes',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            origin_address: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            origin_latitude: {
                type: Sequelize.DECIMAL(10, 8),
                allowNull: true
            },
            origin_longitude: {
                type: Sequelize.DECIMAL(11, 8),
                allowNull: true
            },
            origin_contact: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            origin_phone: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            destination_address: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            destination_latitude: {
                type: Sequelize.DECIMAL(10, 8),
                allowNull: true
            },
            destination_longitude: {
                type: Sequelize.DECIMAL(11, 8),
                allowNull: true
            },
            destination_contact: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            destination_phone: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            scheduled_pickup_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            scheduled_delivery_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            estimated_delivery_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            actual_pickup_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            actual_delivery_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            distance: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
            },
            weight: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'in kg'
            },
            volume: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'in cubic meters'
            },
            priority: {
                type: Sequelize.ENUM('low', 'normal', 'high', 'urgent'),
                defaultValue: 'normal'
            },
            service_type: {
                type: Sequelize.ENUM('standard', 'express', 'same_day', 'scheduled'),
                defaultValue: 'standard'
            },
            status: {
                type: Sequelize.ENUM('pending', 'confirmed', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed_delivery', 'returned', 'cancelled', 'delayed'),
                defaultValue: 'pending'
            },
            proof_of_delivery: {
                type: Sequelize.JSONB,
                allowNull: true
            },
            pod_captured_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            special_instructions: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            cancellation_reason: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            cancelled_at: {
                type: Sequelize.DATE,
                allowNull: true
            },
            price: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: true
            },
            currency: {
                type: Sequelize.STRING(3),
                defaultValue: 'INR'
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

        // Create shipment_items table
        await queryInterface.createTable('shipment_items', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            shipment_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'shipments',
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
                type: Sequelize.INTEGER,
                defaultValue: 1
            },
            weight: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
            },
            dimensions: {
                type: Sequelize.JSONB,
                allowNull: true
            },
            value: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: true
            },
            sku: {
                type: Sequelize.STRING(100),
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

        // Create geofences table
        await queryInterface.createTable('geofences', {
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
                type: Sequelize.ENUM('circle', 'polygon'),
                defaultValue: 'circle'
            },
            center: {
                type: Sequelize.GEOMETRY('POINT'),
                allowNull: true
            },
            radius: {
                type: Sequelize.INTEGER,
                allowNull: true,
                comment: 'in meters'
            },
            polygon: {
                type: Sequelize.GEOMETRY('POLYGON'),
                allowNull: true
            },
            alert_on_entry: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            alert_on_exit: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
            },
            is_active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true
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
        await queryInterface.addIndex('routes', ['company_id']);
        await queryInterface.addIndex('routes', ['status']);
        await queryInterface.addIndex('routes', ['driver_id']);
        await queryInterface.addIndex('waypoints', ['route_id']);
        await queryInterface.addIndex('shipments', ['company_id']);
        await queryInterface.addIndex('shipments', ['tracking_id']);
        await queryInterface.addIndex('shipments', ['status']);
        await queryInterface.addIndex('shipments', ['driver_id']);
        await queryInterface.addIndex('shipments', ['customer_id']);
        await queryInterface.addIndex('shipments', ['created_at']);
        await queryInterface.addIndex('shipment_items', ['shipment_id']);
        await queryInterface.addIndex('geofences', ['company_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('geofences');
        await queryInterface.dropTable('shipment_items');
        await queryInterface.dropTable('shipments');
        await queryInterface.dropTable('waypoints');
        await queryInterface.dropTable('routes');
    }
};
