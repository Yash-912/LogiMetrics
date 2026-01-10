'use strict';

const { v4: uuidv4 } = require('uuid');

/**
 * Seeder: Default Pricing Rules
 * Creates basic pricing rules for shipment calculations
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();

        // Get demo company ID
        const [companies] = await queryInterface.sequelize.query(
            `SELECT id FROM companies WHERE email = 'demo@logimetrics.com' LIMIT 1`
        );

        if (companies.length === 0) {
            console.log('⚠️ Demo company not found. Skipping pricing rules seeder.');
            return;
        }

        const companyId = companies[0].id;

        // Define pricing rules
        const pricingRules = [
            // Base rates by vehicle type
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Truck Base Rate',
                description: 'Base rate for truck deliveries',
                type: 'base',
                vehicle_type: 'truck',
                base_price: 500,
                price_per_km: 15,
                price_per_kg: 2,
                min_charge: 500,
                priority: 10,
                is_active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Van Base Rate',
                description: 'Base rate for van deliveries',
                type: 'base',
                vehicle_type: 'van',
                base_price: 300,
                price_per_km: 10,
                price_per_kg: 1.5,
                min_charge: 300,
                priority: 10,
                is_active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Mini Truck Base Rate',
                description: 'Base rate for mini truck deliveries',
                type: 'base',
                vehicle_type: 'mini_truck',
                base_price: 400,
                price_per_km: 12,
                price_per_kg: 1.75,
                min_charge: 400,
                priority: 10,
                is_active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Bike Base Rate',
                description: 'Base rate for bike deliveries',
                type: 'base',
                vehicle_type: 'bike',
                base_price: 50,
                price_per_km: 5,
                price_per_kg: 0,
                min_charge: 50,
                max_charge: 500,
                priority: 10,
                is_active: true,
                created_at: now,
                updated_at: now
            },

            // Service type surcharges
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Express Delivery Surcharge',
                description: '50% surcharge for express delivery',
                type: 'service',
                service_type: 'express',
                base_price: 0,
                conditions: JSON.stringify({ multiplier: 1.5 }),
                priority: 20,
                is_active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Same Day Delivery Surcharge',
                description: '100% surcharge for same day delivery',
                type: 'service',
                service_type: 'same_day',
                base_price: 0,
                conditions: JSON.stringify({ multiplier: 2.0 }),
                priority: 20,
                is_active: true,
                created_at: now,
                updated_at: now
            },

            // Distance-based rates
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Long Distance Rate',
                description: 'Additional rate for distances over 50km',
                type: 'distance',
                base_price: 0,
                price_per_km: 20,
                conditions: JSON.stringify({ minDistance: 50 }),
                priority: 15,
                is_active: true,
                created_at: now,
                updated_at: now
            },

            // Weight-based rates
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Heavy Load Rate',
                description: 'Additional rate for loads over 500kg',
                type: 'weight',
                base_price: 0,
                price_per_kg: 3,
                conditions: JSON.stringify({ minWeight: 500 }),
                priority: 15,
                is_active: true,
                created_at: now,
                updated_at: now
            },

            // Surcharges
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Fuel Surcharge',
                description: '5% fuel surcharge on all deliveries',
                type: 'surcharge',
                base_price: 0,
                conditions: JSON.stringify({ percentageOfTotal: 5 }),
                priority: 30,
                is_active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'GST (18%)',
                description: 'Goods and Services Tax',
                type: 'surcharge',
                base_price: 0,
                conditions: JSON.stringify({ percentageOfTotal: 18, isTax: true }),
                priority: 100,
                is_active: true,
                created_at: now,
                updated_at: now
            },

            // Zone-based pricing
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Intra-City Zone',
                description: 'Within city limits',
                type: 'zone',
                base_price: 0,
                conditions: JSON.stringify({
                    zoneType: 'intra_city',
                    cities: ['Bangalore', 'Mumbai', 'Delhi', 'Chennai', 'Hyderabad']
                }),
                priority: 5,
                is_active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Inter-City Zone',
                description: 'Between cities in same state',
                type: 'zone',
                base_price: 100,
                conditions: JSON.stringify({
                    zoneType: 'inter_city',
                    sameState: true
                }),
                priority: 5,
                is_active: true,
                created_at: now,
                updated_at: now
            },
            {
                id: uuidv4(),
                company_id: companyId,
                name: 'Inter-State Zone',
                description: 'Between different states',
                type: 'zone',
                base_price: 250,
                conditions: JSON.stringify({
                    zoneType: 'inter_state',
                    sameState: false
                }),
                priority: 5,
                is_active: true,
                created_at: now,
                updated_at: now
            }
        ];

        await queryInterface.bulkInsert('pricing_rules', pricingRules);

        console.log(`✅ Seeded ${pricingRules.length} pricing rules`);
    },

    async down(queryInterface, Sequelize) {
        const [companies] = await queryInterface.sequelize.query(
            `SELECT id FROM companies WHERE email = 'demo@logimetrics.com' LIMIT 1`
        );

        if (companies.length > 0) {
            await queryInterface.bulkDelete('pricing_rules', { company_id: companies[0].id }, {});
        }
    }
};
