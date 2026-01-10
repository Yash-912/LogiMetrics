'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * Seeder: Demo Company with Sample Data
 * Creates a demo company with users, vehicles, drivers, and sample shipments
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash('Demo@123456', salt);

        // Create demo company
        const companyId = uuidv4();
        await queryInterface.bulkInsert('companies', [
            {
                id: companyId,
                name: 'LogiMetrics Demo Company',
                email: 'demo@logimetrics.com',
                phone: '+919876543210',
                website: 'https://demo.logimetrics.com',
                address: '123 Demo Street, Tech Park',
                city: 'Bangalore',
                state: 'Karnataka',
                country: 'India',
                postal_code: '560001',
                tax_id: 'DEMO1234567',
                gstin: '29DEMO12345K1ZX',
                industry: 'Logistics',
                size: 'medium',
                subscription_plan: 'professional',
                subscription_status: 'active',
                subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                status: 'active',
                settings: JSON.stringify({
                    timezone: 'Asia/Kolkata',
                    currency: 'INR',
                    distanceUnit: 'km'
                }),
                created_at: now,
                updated_at: now
            }
        ]);

        // Create company settings
        await queryInterface.bulkInsert('company_settings', [
            {
                id: uuidv4(),
                company_id: companyId,
                timezone: 'Asia/Kolkata',
                currency: 'INR',
                date_format: 'DD/MM/YYYY',
                distance_unit: 'km',
                weight_unit: 'kg',
                notifications: JSON.stringify({ email: true, sms: true, push: true }),
                branding: JSON.stringify({ primaryColor: '#2563eb', secondaryColor: '#1e40af' }),
                invoice_settings: JSON.stringify({ prefix: 'INV', nextNumber: 1001 }),
                created_at: now,
                updated_at: now
            }
        ]);

        // Create demo users
        const adminId = uuidv4();
        const managerId = uuidv4();
        const dispatcherId = uuidv4();

        await queryInterface.bulkInsert('users', [
            {
                id: adminId,
                company_id: companyId,
                email: 'admin@demo.logimetrics.com',
                password: hashedPassword,
                first_name: 'Demo',
                last_name: 'Admin',
                phone: '+919876543211',
                role: 'admin',
                status: 'active',
                is_email_verified: true,
                timezone: 'Asia/Kolkata',
                created_at: now,
                updated_at: now
            },
            {
                id: managerId,
                company_id: companyId,
                email: 'manager@demo.logimetrics.com',
                password: hashedPassword,
                first_name: 'Demo',
                last_name: 'Manager',
                phone: '+919876543212',
                role: 'manager',
                status: 'active',
                is_email_verified: true,
                timezone: 'Asia/Kolkata',
                created_at: now,
                updated_at: now
            },
            {
                id: dispatcherId,
                company_id: companyId,
                email: 'dispatcher@demo.logimetrics.com',
                password: hashedPassword,
                first_name: 'Demo',
                last_name: 'Dispatcher',
                phone: '+919876543213',
                role: 'dispatcher',
                status: 'active',
                is_email_verified: true,
                timezone: 'Asia/Kolkata',
                created_at: now,
                updated_at: now
            }
        ]);

        // Create demo drivers
        const driverIds = [uuidv4(), uuidv4(), uuidv4()];
        const driverNames = [
            { first: 'Rajesh', last: 'Kumar' },
            { first: 'Amit', last: 'Singh' },
            { first: 'Pradeep', last: 'Sharma' }
        ];

        await queryInterface.bulkInsert('drivers', driverIds.map((id, index) => ({
            id,
            company_id: companyId,
            first_name: driverNames[index].first,
            last_name: driverNames[index].last,
            email: `driver${index + 1}@demo.logimetrics.com`,
            phone: `+91987654321${4 + index}`,
            license_number: `KA${String(index + 1).padStart(2, '0')}20210012${index}45`,
            license_type: 'LMV',
            license_expiry: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
            license_verified: true,
            city: 'Bangalore',
            state: 'Karnataka',
            country: 'India',
            employment_type: 'full_time',
            joining_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            status: 'active',
            average_rating: 4.5 + (index * 0.1),
            total_ratings: 50 + (index * 10),
            total_deliveries: 200 + (index * 50),
            created_at: now,
            updated_at: now
        })));

        // Create demo vehicles
        const vehicleIds = [uuidv4(), uuidv4(), uuidv4()];
        const vehicleData = [
            { reg: 'KA01AB1234', type: 'truck', make: 'Tata', model: 'Ace' },
            { reg: 'KA01CD5678', type: 'van', make: 'Mahindra', model: 'Bolero' },
            { reg: 'KA01EF9012', type: 'mini_truck', make: 'Ashok Leyland', model: 'Dost' }
        ];

        await queryInterface.bulkInsert('vehicles', vehicleIds.map((id, index) => ({
            id,
            company_id: companyId,
            registration_number: vehicleData[index].reg,
            type: vehicleData[index].type,
            make: vehicleData[index].make,
            model: vehicleData[index].model,
            year: 2022,
            color: ['White', 'Blue', 'Red'][index],
            fuel_type: 'diesel',
            fuel_capacity: 50,
            load_capacity: [1000, 800, 600][index],
            current_odometer: 25000 + (index * 5000),
            insurance_expiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            registration_expiry: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
            status: 'active',
            current_driver_id: driverIds[index],
            created_at: now,
            updated_at: now
        })));

        // Update drivers with current vehicle
        for (let i = 0; i < driverIds.length; i++) {
            await queryInterface.sequelize.query(
                `UPDATE drivers SET current_vehicle_id = '${vehicleIds[i]}' WHERE id = '${driverIds[i]}'`
            );
        }

        // Create demo shipments
        const shipmentStatuses = ['pending', 'confirmed', 'in_transit', 'delivered', 'delivered'];
        const shipmentIds = [];

        for (let i = 0; i < 5; i++) {
            const shipmentId = uuidv4();
            shipmentIds.push(shipmentId);

            await queryInterface.bulkInsert('shipments', [
                {
                    id: shipmentId,
                    company_id: companyId,
                    tracking_id: `LMDEMO${String(i + 1).padStart(6, '0')}`,
                    customer_id: adminId,
                    driver_id: driverIds[i % 3],
                    vehicle_id: vehicleIds[i % 3],
                    origin_address: '123 Pickup Point, MG Road, Bangalore',
                    origin_latitude: 12.9716 + (i * 0.01),
                    origin_longitude: 77.5946 + (i * 0.01),
                    origin_contact: 'Sender Name',
                    origin_phone: '+919876500001',
                    destination_address: `${i + 100} Delivery Point, Whitefield, Bangalore`,
                    destination_latitude: 12.9698 + (i * 0.01),
                    destination_longitude: 77.7500 + (i * 0.01),
                    destination_contact: 'Receiver Name',
                    destination_phone: '+919876500002',
                    scheduled_pickup_date: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000),
                    scheduled_delivery_date: new Date(Date.now() - (4 - i) * 24 * 60 * 60 * 1000),
                    distance: 15 + (i * 2),
                    weight: 50 + (i * 10),
                    priority: ['normal', 'high', 'normal', 'urgent', 'normal'][i],
                    service_type: 'standard',
                    status: shipmentStatuses[i],
                    price: 500 + (i * 100),
                    currency: 'INR',
                    created_by: adminId,
                    created_at: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000),
                    updated_at: now
                }
            ]);
        }

        console.log('✅ Demo company created with sample data');
        console.log(`   Company: LogiMetrics Demo Company`);
        console.log(`   Users: 3 (admin, manager, dispatcher)`);
        console.log(`   Drivers: 3`);
        console.log(`   Vehicles: 3`);
        console.log(`   Shipments: 5`);
        console.log(`   Login: admin@demo.logimetrics.com / Demo@123456`);
    },

    async down(queryInterface, Sequelize) {
        // Delete in reverse order due to foreign keys
        await queryInterface.bulkDelete('shipments', { tracking_id: { [Sequelize.Op.like]: 'LMDEMO%' } }, {});
        await queryInterface.sequelize.query(`UPDATE drivers SET current_vehicle_id = NULL WHERE company_id IN (SELECT id FROM companies WHERE email = 'demo@logimetrics.com')`);
        await queryInterface.sequelize.query(`UPDATE vehicles SET current_driver_id = NULL WHERE company_id IN (SELECT id FROM companies WHERE email = 'demo@logimetrics.com')`);
        await queryInterface.bulkDelete('vehicles', {}, {
            where: { company_id: { [Sequelize.Op.in]: queryInterface.sequelize.literal(`(SELECT id FROM companies WHERE email = 'demo@logimetrics.com')`) } }
        });
        await queryInterface.bulkDelete('drivers', {}, {});
        await queryInterface.bulkDelete('company_settings', {}, {});
        await queryInterface.bulkDelete('users', { email: { [Sequelize.Op.like]: '%@demo.logimetrics.com' } }, {});
        await queryInterface.bulkDelete('companies', { email: 'demo@logimetrics.com' }, {});
    }
};
