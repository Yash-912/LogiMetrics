require('dotenv').config();

console.log('=== STARTUP TEST ===\n');

// Test 1: Environment variables
console.log('1. Checking required environment variables...');
const requiredVars = ['DATABASE_URL', 'MONGODB_URI', 'JWT_SECRET'];
const missingVars = requiredVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
    console.log('   MISSING:', missingVars.join(', '));
} else {
    console.log('   OK: All required env vars present');
}

// Test 2: PostgreSQL connection
console.log('\n2. Testing PostgreSQL connection...');
const { Sequelize } = require('sequelize');
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: { require: true, rejectUnauthorized: false }
    },
    logging: false
});

sequelize.authenticate()
    .then(() => {
        console.log('   OK: PostgreSQL connected successfully');

        // Test 3: MongoDB connection
        console.log('\n3. Testing MongoDB connection...');
        const mongoose = require('mongoose');
        return mongoose.connect(process.env.MONGODB_URI);
    })
    .then(() => {
        console.log('   OK: MongoDB connected successfully');
        console.log('\n=== ALL TESTS PASSED ===');
        console.log('\nYou can now run: npm run dev');
        process.exit(0);
    })
    .catch(err => {
        console.error('   ERROR:', err.message);
        process.exit(1);
    });
