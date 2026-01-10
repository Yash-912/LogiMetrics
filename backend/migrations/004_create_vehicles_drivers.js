'use strict';

/**
 * Migration: Create Vehicles and Drivers Tables
 * Fleet management tables
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        // Create vehicles table
        await queryInterface.createTable('vehicles', {
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
            registration_number: {
                type: Sequelize.STRING(20),
                allowNull: false,
                unique: true
            },
            type: {
                type: Sequelize.ENUM('truck', 'van', 'bike', 'car', 'mini_truck', 'container', 'trailer'),
                allowNull: false
            },
            make: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            model: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            year: {
                type: Sequelize.INTEGER,
                allowNull: true
            },
            color: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            vin: {
                type: Sequelize.STRING(50),
                allowNull: true
            },
            fuel_type: {
                type: Sequelize.ENUM('petrol', 'diesel', 'cng', 'electric', 'hybrid'),
                defaultValue: 'diesel'
            },
            fuel_capacity: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true
            },
            current_fuel_level: {
                type: Sequelize.DECIMAL(5, 2),
                allowNull: true
            },
            load_capacity: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'in kg'
            },
            volume_capacity: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: true,
                comment: 'in cubic meters'
            },
            current_odometer: {
                type: Sequelize.DECIMAL(12, 2),
                defaultValue: 0
            },
            insurance_number: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            insurance_expiry: {
                type: Sequelize.DATE,
                allowNull: true
            },
            registration_expiry: {
                type: Sequelize.DATE,
                allowNull: true
            },
            fitness_expiry: {
                type: Sequelize.DATE,
                allowNull: true
            },
            permit_expiry: {
                type: Sequelize.DATE,
                allowNull: true
            },
            puc_expiry: {
                type: Sequelize.DATE,
                allowNull: true
            },
            next_maintenance_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive', 'maintenance', 'out_of_service', 'deleted'),
                defaultValue: 'active'
            },
            status_notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            current_driver_id: {
                type: Sequelize.UUID,
                allowNull: true
            },
            gps_device_id: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            documents: {
                type: Sequelize.JSONB,
                defaultValue: []
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

        // Create drivers table
        await queryInterface.createTable('drivers', {
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
            user_id: {
                type: Sequelize.UUID,
                allowNull: true,
                references: {
                    model: 'users',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'SET NULL'
            },
            first_name: {
                type: Sequelize.STRING(100),
                allowNull: false
            },
            last_name: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            email: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            phone: {
                type: Sequelize.STRING(20),
                allowNull: false
            },
            photo: {
                type: Sequelize.STRING(500),
                allowNull: true
            },
            date_of_birth: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            license_number: {
                type: Sequelize.STRING(50),
                allowNull: false,
                unique: true
            },
            license_type: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            license_expiry: {
                type: Sequelize.DATE,
                allowNull: true
            },
            license_verified: {
                type: Sequelize.BOOLEAN,
                defaultValue: false
            },
            license_verified_at: {
                type: Sequelize.DATE,
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
                defaultValue: 'India'
            },
            postal_code: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            emergency_contact: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            emergency_phone: {
                type: Sequelize.STRING(20),
                allowNull: true
            },
            employment_type: {
                type: Sequelize.ENUM('full_time', 'part_time', 'contract', 'freelance'),
                defaultValue: 'full_time'
            },
            joining_date: {
                type: Sequelize.DATEONLY,
                allowNull: true
            },
            salary: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: true
            },
            bank_account: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            status: {
                type: Sequelize.ENUM('active', 'inactive', 'on_leave', 'suspended', 'deleted'),
                defaultValue: 'active'
            },
            status_notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            current_vehicle_id: {
                type: Sequelize.UUID,
                allowNull: true
            },
            availability: {
                type: Sequelize.JSONB,
                defaultValue: {}
            },
            average_rating: {
                type: Sequelize.DECIMAL(3, 2),
                defaultValue: 0
            },
            total_ratings: {
                type: Sequelize.INTEGER,
                defaultValue: 0
            },
            total_deliveries: {
                type: Sequelize.INTEGER,
                defaultValue: 0
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

        // Create maintenance_records table
        await queryInterface.createTable('maintenance_records', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            vehicle_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'vehicles',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
            },
            type: {
                type: Sequelize.ENUM('scheduled', 'repair', 'inspection', 'emergency'),
                allowNull: false
            },
            description: {
                type: Sequelize.TEXT,
                allowNull: false
            },
            scheduled_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            completed_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            cost: {
                type: Sequelize.DECIMAL(12, 2),
                defaultValue: 0
            },
            odometer_reading: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: true
            },
            service_provider: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
                allowNull: true
            },
            documents: {
                type: Sequelize.JSONB,
                defaultValue: []
            },
            next_maintenance_date: {
                type: Sequelize.DATE,
                allowNull: true
            },
            status: {
                type: Sequelize.ENUM('scheduled', 'in_progress', 'completed', 'cancelled'),
                defaultValue: 'scheduled'
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

        // Create fuel_logs table
        await queryInterface.createTable('fuel_logs', {
            id: {
                type: Sequelize.UUID,
                defaultValue: Sequelize.UUIDV4,
                primaryKey: true
            },
            vehicle_id: {
                type: Sequelize.UUID,
                allowNull: false,
                references: {
                    model: 'vehicles',
                    key: 'id'
                },
                onUpdate: 'CASCADE',
                onDelete: 'CASCADE'
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
            date: {
                type: Sequelize.DATE,
                allowNull: false
            },
            fuel_type: {
                type: Sequelize.STRING(20),
                allowNull: false
            },
            quantity: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false,
                comment: 'in liters'
            },
            price_per_unit: {
                type: Sequelize.DECIMAL(10, 2),
                allowNull: false
            },
            total_cost: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: false
            },
            odometer: {
                type: Sequelize.DECIMAL(12, 2),
                allowNull: true
            },
            fuel_station: {
                type: Sequelize.STRING(255),
                allowNull: true
            },
            receipt_number: {
                type: Sequelize.STRING(100),
                allowNull: true
            },
            notes: {
                type: Sequelize.TEXT,
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

        // Add foreign key for current_driver_id in vehicles
        await queryInterface.addConstraint('vehicles', {
            fields: ['current_driver_id'],
            type: 'foreign key',
            name: 'vehicles_current_driver_fk',
            references: {
                table: 'drivers',
                field: 'id'
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });

        // Add foreign key for current_vehicle_id in drivers
        await queryInterface.addConstraint('drivers', {
            fields: ['current_vehicle_id'],
            type: 'foreign key',
            name: 'drivers_current_vehicle_fk',
            references: {
                table: 'vehicles',
                field: 'id'
            },
            onDelete: 'SET NULL',
            onUpdate: 'CASCADE'
        });

        // Create indexes
        await queryInterface.addIndex('vehicles', ['company_id']);
        await queryInterface.addIndex('vehicles', ['status']);
        await queryInterface.addIndex('vehicles', ['type']);
        await queryInterface.addIndex('drivers', ['company_id']);
        await queryInterface.addIndex('drivers', ['status']);
        await queryInterface.addIndex('drivers', ['license_number']);
        await queryInterface.addIndex('maintenance_records', ['vehicle_id']);
        await queryInterface.addIndex('fuel_logs', ['vehicle_id']);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.removeConstraint('drivers', 'drivers_current_vehicle_fk');
        await queryInterface.removeConstraint('vehicles', 'vehicles_current_driver_fk');
        await queryInterface.dropTable('fuel_logs');
        await queryInterface.dropTable('maintenance_records');
        await queryInterface.dropTable('drivers');
        await queryInterface.dropTable('vehicles');
    }
};
