#!/usr/bin/env node

/**
 * Bulk Data Import Utility
 * Import data from CSV/JSON files into the database
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { parse } = require('csv-parse');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Sequelize, Op } = require('sequelize');

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Database connection
let sequelize;

async function connectDatabase() {
    sequelize = new Sequelize(
        process.env.DB_NAME || 'logimetrics',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'password',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: false
        }
    );

    await sequelize.authenticate();
    log('✅ Database connected', 'green');
}

/**
 * Parse CSV file and return array of objects
 */
async function parseCSV(filePath) {
    return new Promise((resolve, reject) => {
        const records = [];

        fs.createReadStream(filePath)
            .pipe(parse({
                columns: true,
                skip_empty_lines: true,
                trim: true
            }))
            .on('data', (record) => records.push(record))
            .on('end', () => resolve(records))
            .on('error', reject);
    });
}

/**
 * Parse JSON file
 */
function parseJSON(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
}

/**
 * Import companies
 */
async function importCompanies(data, companyId) {
    log('\n📁 Importing Companies...', 'cyan');

    let imported = 0;
    let skipped = 0;

    for (const row of data) {
        try {
            const [existing] = await sequelize.query(
                `SELECT id FROM companies WHERE email = :email`,
                { replacements: { email: row.email }, type: Sequelize.QueryTypes.SELECT }
            );

            if (existing) {
                skipped++;
                continue;
            }

            await sequelize.query(
                `INSERT INTO companies (id, name, email, phone, address, city, state, country, postal_code, status, created_at, updated_at)
         VALUES (:id, :name, :email, :phone, :address, :city, :state, :country, :postal_code, 'active', NOW(), NOW())`,
                {
                    replacements: {
                        id: uuidv4(),
                        name: row.name,
                        email: row.email,
                        phone: row.phone || null,
                        address: row.address || null,
                        city: row.city || null,
                        state: row.state || null,
                        country: row.country || 'India',
                        postal_code: row.postal_code || null
                    }
                }
            );
            imported++;
        } catch (error) {
            log(`  ❌ Error: ${error.message}`, 'red');
        }
    }

    log(`  ✅ Imported: ${imported}, Skipped: ${skipped}`, 'green');
    return imported;
}

/**
 * Import drivers
 */
async function importDrivers(data, companyId) {
    log('\n👤 Importing Drivers...', 'cyan');

    let imported = 0;
    let skipped = 0;

    for (const row of data) {
        try {
            const [existing] = await sequelize.query(
                `SELECT id FROM drivers WHERE license_number = :license`,
                { replacements: { license: row.license_number }, type: Sequelize.QueryTypes.SELECT }
            );

            if (existing) {
                skipped++;
                continue;
            }

            await sequelize.query(
                `INSERT INTO drivers (id, company_id, first_name, last_name, email, phone, license_number, license_type, license_expiry, status, created_at, updated_at)
         VALUES (:id, :companyId, :firstName, :lastName, :email, :phone, :license, :licenseType, :licenseExpiry, 'active', NOW(), NOW())`,
                {
                    replacements: {
                        id: uuidv4(),
                        companyId,
                        firstName: row.first_name,
                        lastName: row.last_name || '',
                        email: row.email || null,
                        phone: row.phone,
                        license: row.license_number,
                        licenseType: row.license_type || 'LMV',
                        licenseExpiry: row.license_expiry || null
                    }
                }
            );
            imported++;
        } catch (error) {
            log(`  ❌ Error: ${error.message}`, 'red');
        }
    }

    log(`  ✅ Imported: ${imported}, Skipped: ${skipped}`, 'green');
    return imported;
}

/**
 * Import vehicles
 */
async function importVehicles(data, companyId) {
    log('\n🚛 Importing Vehicles...', 'cyan');

    let imported = 0;
    let skipped = 0;

    for (const row of data) {
        try {
            const [existing] = await sequelize.query(
                `SELECT id FROM vehicles WHERE registration_number = :reg`,
                { replacements: { reg: row.registration_number }, type: Sequelize.QueryTypes.SELECT }
            );

            if (existing) {
                skipped++;
                continue;
            }

            await sequelize.query(
                `INSERT INTO vehicles (id, company_id, registration_number, type, make, model, year, fuel_type, load_capacity, status, created_at, updated_at)
         VALUES (:id, :companyId, :regNumber, :type, :make, :model, :year, :fuelType, :loadCapacity, 'active', NOW(), NOW())`,
                {
                    replacements: {
                        id: uuidv4(),
                        companyId,
                        regNumber: row.registration_number,
                        type: row.type || 'truck',
                        make: row.make || null,
                        model: row.model || null,
                        year: row.year || null,
                        fuelType: row.fuel_type || 'diesel',
                        loadCapacity: row.load_capacity || null
                    }
                }
            );
            imported++;
        } catch (error) {
            log(`  ❌ Error: ${error.message}`, 'red');
        }
    }

    log(`  ✅ Imported: ${imported}, Skipped: ${skipped}`, 'green');
    return imported;
}

/**
 * Import customers/users
 */
async function importCustomers(data, companyId) {
    log('\n👥 Importing Customers...', 'cyan');

    let imported = 0;
    let skipped = 0;
    const bcrypt = require('bcryptjs');
    const defaultPassword = await bcrypt.hash('Customer@123', 12);

    for (const row of data) {
        try {
            const [existing] = await sequelize.query(
                `SELECT id FROM users WHERE email = :email`,
                { replacements: { email: row.email }, type: Sequelize.QueryTypes.SELECT }
            );

            if (existing) {
                skipped++;
                continue;
            }

            await sequelize.query(
                `INSERT INTO users (id, company_id, email, password, first_name, last_name, phone, role, status, is_email_verified, created_at, updated_at)
         VALUES (:id, :companyId, :email, :password, :firstName, :lastName, :phone, 'customer', 'active', true, NOW(), NOW())`,
                {
                    replacements: {
                        id: uuidv4(),
                        companyId,
                        email: row.email,
                        password: defaultPassword,
                        firstName: row.first_name || row.name?.split(' ')[0] || 'Customer',
                        lastName: row.last_name || row.name?.split(' ').slice(1).join(' ') || '',
                        phone: row.phone || null
                    }
                }
            );
            imported++;
        } catch (error) {
            log(`  ❌ Error: ${error.message}`, 'red');
        }
    }

    log(`  ✅ Imported: ${imported}, Skipped: ${skipped}`, 'green');
    return imported;
}

/**
 * Import pricing rules
 */
async function importPricingRules(data, companyId) {
    log('\n💰 Importing Pricing Rules...', 'cyan');

    let imported = 0;

    for (const row of data) {
        try {
            await sequelize.query(
                `INSERT INTO pricing_rules (id, company_id, name, description, type, vehicle_type, base_price, price_per_km, price_per_kg, min_charge, is_active, created_at, updated_at)
         VALUES (:id, :companyId, :name, :description, :type, :vehicleType, :basePrice, :pricePerKm, :pricePerKg, :minCharge, true, NOW(), NOW())`,
                {
                    replacements: {
                        id: uuidv4(),
                        companyId,
                        name: row.name,
                        description: row.description || null,
                        type: row.type || 'base',
                        vehicleType: row.vehicle_type || null,
                        basePrice: row.base_price || 0,
                        pricePerKm: row.price_per_km || 0,
                        pricePerKg: row.price_per_kg || 0,
                        minCharge: row.min_charge || 0
                    }
                }
            );
            imported++;
        } catch (error) {
            log(`  ❌ Error: ${error.message}`, 'red');
        }
    }

    log(`  ✅ Imported: ${imported}`, 'green');
    return imported;
}

/**
 * Main import function
 */
async function importData(filePath, dataType, companyId) {
    const ext = path.extname(filePath).toLowerCase();

    let data;
    if (ext === '.csv') {
        data = await parseCSV(filePath);
    } else if (ext === '.json') {
        data = parseJSON(filePath);
    } else {
        throw new Error('Unsupported file format. Use .csv or .json');
    }

    log(`\n📄 Loaded ${data.length} records from ${path.basename(filePath)}`, 'cyan');

    switch (dataType) {
        case 'companies':
            return importCompanies(data, companyId);
        case 'drivers':
            return importDrivers(data, companyId);
        case 'vehicles':
            return importVehicles(data, companyId);
        case 'customers':
            return importCustomers(data, companyId);
        case 'pricing':
            return importPricingRules(data, companyId);
        default:
            throw new Error(`Unknown data type: ${dataType}`);
    }
}

/**
 * Interactive mode
 */
async function interactiveMode() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

    console.log('\n');
    log('╔════════════════════════════════════════════════════════╗', 'blue');
    log('║           LogiMetrics Data Import Utility              ║', 'blue');
    log('╚════════════════════════════════════════════════════════╝\n', 'blue');

    // Get company ID if needed
    log('Available companies:', 'cyan');
    const [companies] = await sequelize.query(
        `SELECT id, name, email FROM companies WHERE status = 'active' ORDER BY name`,
        { type: Sequelize.QueryTypes.SELECT }
    );

    if (companies.length === 0) {
        log('No companies found. Please run seeders first.', 'red');
        rl.close();
        return;
    }

    companies.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (${c.email})`));

    const companyChoice = await question('\nSelect company number: ');
    const selectedCompany = companies[parseInt(companyChoice) - 1];

    if (!selectedCompany) {
        log('Invalid selection', 'red');
        rl.close();
        return;
    }

    log(`\nSelected: ${selectedCompany.name}`, 'green');

    // Get data type
    log('\nData types:', 'cyan');
    console.log('  1. drivers');
    console.log('  2. vehicles');
    console.log('  3. customers');
    console.log('  4. pricing');

    const typeChoice = await question('\nSelect data type number: ');
    const dataTypes = ['drivers', 'vehicles', 'customers', 'pricing'];
    const dataType = dataTypes[parseInt(typeChoice) - 1];

    if (!dataType) {
        log('Invalid selection', 'red');
        rl.close();
        return;
    }

    // Get file path
    const filePath = await question('\nEnter file path (CSV or JSON): ');

    if (!fs.existsSync(filePath)) {
        log('File not found', 'red');
        rl.close();
        return;
    }

    rl.close();

    // Run import
    await importData(filePath, dataType, selectedCompany.id);
}

/**
 * Show usage
 */
function showUsage() {
    console.log(`
  Usage: node import-data.js [options]

  Options:
    --interactive       Run in interactive mode
    --file <path>       Path to CSV/JSON file
    --type <type>       Data type: drivers, vehicles, customers, pricing
    --company <id>      Company ID (UUID)
    --help              Show this help message

  Examples:
    node import-data.js --interactive
    node import-data.js --file ./data/drivers.csv --type drivers --company abc-123
  `);
}

/**
 * Main entry point
 */
async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.length === 0) {
        showUsage();
        process.exit(0);
    }

    await connectDatabase();

    if (args.includes('--interactive')) {
        await interactiveMode();
    } else {
        const fileIndex = args.indexOf('--file');
        const typeIndex = args.indexOf('--type');
        const companyIndex = args.indexOf('--company');

        if (fileIndex === -1 || typeIndex === -1 || companyIndex === -1) {
            log('Missing required arguments. Use --help for usage.', 'red');
            process.exit(1);
        }

        const filePath = args[fileIndex + 1];
        const dataType = args[typeIndex + 1];
        const companyId = args[companyIndex + 1];

        await importData(filePath, dataType, companyId);
    }

    await sequelize.close();
    log('\n✨ Import complete!\n', 'green');
}

main().catch(error => {
    log(`\n❌ Import failed: ${error.message}`, 'red');
    process.exit(1);
});
