#!/usr/bin/env node

/**
 * Database Setup Script
 * Initializes the database, runs migrations, and optionally seeds data
 */

const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'cyan');
    console.log('='.repeat(60));
}

async function checkDatabaseConnection() {
    logSection('🔌 Checking Database Connection');

    const sequelize = new Sequelize(
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

    try {
        await sequelize.authenticate();
        log('✅ Database connection successful', 'green');
        await sequelize.close();
        return true;
    } catch (error) {
        log(`❌ Database connection failed: ${error.message}`, 'red');
        return false;
    }
}

async function createDatabase() {
    logSection('📁 Creating Database');

    const dbName = process.env.DB_NAME || 'logimetrics';
    const sequelize = new Sequelize(
        'postgres',
        process.env.DB_USER || 'postgres',
        process.env.DB_PASSWORD || 'password',
        {
            host: process.env.DB_HOST || 'localhost',
            port: process.env.DB_PORT || 5432,
            dialect: 'postgres',
            logging: false
        }
    );

    try {
        const [results] = await sequelize.query(
            `SELECT 1 FROM pg_database WHERE datname = '${dbName}'`
        );

        if (results.length === 0) {
            await sequelize.query(`CREATE DATABASE "${dbName}"`);
            log(`✅ Database '${dbName}' created`, 'green');
        } else {
            log(`⚠️ Database '${dbName}' already exists`, 'yellow');
        }

        await sequelize.close();
        return true;
    } catch (error) {
        log(`❌ Failed to create database: ${error.message}`, 'red');
        await sequelize.close();
        return false;
    }
}

async function enableExtensions() {
    logSection('🔧 Enabling PostgreSQL Extensions');

    const sequelize = new Sequelize(
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

    try {
        // Enable UUID extension
        await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
        log('✅ uuid-ossp extension enabled', 'green');

        // Enable PostGIS for geospatial queries (optional)
        try {
            await sequelize.query('CREATE EXTENSION IF NOT EXISTS "postgis"');
            log('✅ PostGIS extension enabled', 'green');
        } catch (e) {
            log('⚠️ PostGIS extension not available (optional)', 'yellow');
        }

        await sequelize.close();
        return true;
    } catch (error) {
        log(`❌ Failed to enable extensions: ${error.message}`, 'red');
        await sequelize.close();
        return false;
    }
}

function runMigrations(undo = false) {
    logSection(undo ? '⏪ Undoing Migrations' : '📊 Running Migrations');

    try {
        const cmd = undo
            ? 'npx sequelize-cli db:migrate:undo:all'
            : 'npx sequelize-cli db:migrate';

        execSync(cmd, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        log(undo ? '✅ Migrations undone' : '✅ Migrations completed', 'green');
        return true;
    } catch (error) {
        log(`❌ Migration failed: ${error.message}`, 'red');
        return false;
    }
}

function runSeeders(undo = false) {
    logSection(undo ? '⏪ Undoing Seeders' : '🌱 Running Seeders');

    try {
        const cmd = undo
            ? 'npx sequelize-cli db:seed:undo:all'
            : 'npx sequelize-cli db:seed:all';

        execSync(cmd, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
        log(undo ? '✅ Seeders undone' : '✅ Seeders completed', 'green');
        return true;
    } catch (error) {
        log(`❌ Seeder failed: ${error.message}`, 'red');
        return false;
    }
}

async function setupRedis() {
    logSection('🔴 Checking Redis Connection');

    try {
        const Redis = require('ioredis');
        const redis = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: 1
        });

        await redis.ping();
        log('✅ Redis connection successful', 'green');
        await redis.quit();
        return true;
    } catch (error) {
        log(`⚠️ Redis not available: ${error.message}`, 'yellow');
        log('   Redis is optional but recommended for caching', 'yellow');
        return false;
    }
}

async function setupMongoDB() {
    logSection('🍃 Checking MongoDB Connection');

    try {
        const mongoose = require('mongoose');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logimetrics', {
            serverSelectionTimeoutMS: 5000
        });
        log('✅ MongoDB connection successful', 'green');
        await mongoose.disconnect();
        return true;
    } catch (error) {
        log(`⚠️ MongoDB not available: ${error.message}`, 'yellow');
        log('   MongoDB is required for tracking and analytics data', 'yellow');
        return false;
    }
}

function printSummary(results) {
    logSection('📋 Setup Summary');

    const statusIcon = (success) => success ? '✅' : '❌';

    console.log(`
  ${statusIcon(results.database)} PostgreSQL Database
  ${statusIcon(results.extensions)} Database Extensions
  ${statusIcon(results.migrations)} Migrations
  ${statusIcon(results.seeders)} Seeders
  ${statusIcon(results.redis)} Redis (optional)
  ${statusIcon(results.mongodb)} MongoDB
  `);

    if (Object.values(results).every(r => r)) {
        log('🎉 Database setup completed successfully!', 'green');
        console.log(`
  You can now start the application with:
    npm run dev

  Default credentials:
    Super Admin: admin@logimetrics.com / Admin@123456
    Demo Admin:  admin@demo.logimetrics.com / Demo@123456
    `);
    } else {
        log('⚠️ Setup completed with some warnings', 'yellow');
        log('   Please check the issues above', 'yellow');
    }
}

async function main() {
    const args = process.argv.slice(2);
    const fresh = args.includes('--fresh');
    const seedOnly = args.includes('--seed-only');
    const migrateOnly = args.includes('--migrate-only');

    console.log('\n');
    log('╔════════════════════════════════════════════════════════╗', 'blue');
    log('║           LogiMetrics Database Setup Script            ║', 'blue');
    log('╚════════════════════════════════════════════════════════╝', 'blue');

    if (args.includes('--help')) {
        console.log(`
  Usage: node setup-db.js [options]

  Options:
    --fresh        Drop and recreate all tables
    --seed-only    Only run seeders (skip migrations)
    --migrate-only Only run migrations (skip seeders)
    --help         Show this help message
    `);
        process.exit(0);
    }

    const results = {
        database: false,
        extensions: false,
        migrations: false,
        seeders: false,
        redis: false,
        mongodb: false
    };

    // Create database if needed
    results.database = await createDatabase();
    if (!results.database) {
        log('Cannot proceed without database', 'red');
        process.exit(1);
    }

    // Check connection
    const connected = await checkDatabaseConnection();
    if (!connected) {
        process.exit(1);
    }

    // Enable extensions
    results.extensions = await enableExtensions();

    // Run migrations
    if (!seedOnly) {
        if (fresh) {
            runMigrations(true); // Undo first
        }
        results.migrations = runMigrations();
    } else {
        results.migrations = true;
    }

    // Run seeders
    if (!migrateOnly && results.migrations) {
        if (fresh) {
            runSeeders(true); // Undo first
        }
        results.seeders = runSeeders();
    } else {
        results.seeders = migrateOnly ? true : false;
    }

    // Check optional services
    results.redis = await setupRedis();
    results.mongodb = await setupMongoDB();

    // Print summary
    printSummary(results);
}

main().catch(error => {
    log(`\n❌ Setup failed: ${error.message}`, 'red');
    process.exit(1);
});
