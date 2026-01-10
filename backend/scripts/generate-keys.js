#!/usr/bin/env node

/**
 * JWT Key Generation Script
 * Generates secure JWT key pairs for authentication
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

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

/**
 * Generate a secure random string
 */
function generateSecret(length = 64) {
    return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, length);
}

/**
 * Generate RSA key pair
 */
function generateRSAKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    return { publicKey, privateKey };
}

/**
 * Generate all required secrets
 */
function generateAllSecrets() {
    log('\n╔════════════════════════════════════════════════════════╗', 'blue');
    log('║           JWT Key Generation Script                    ║', 'blue');
    log('╚════════════════════════════════════════════════════════╝\n', 'blue');

    const secrets = {
        JWT_SECRET: generateSecret(64),
        JWT_REFRESH_SECRET: generateSecret(64),
        SESSION_SECRET: generateSecret(32),
        ENCRYPTION_KEY: generateSecret(32),
        API_KEY: `lm_${generateSecret(32)}`
    };

    log('Generated Secrets:', 'cyan');
    console.log('='.repeat(60));

    // Display secrets
    for (const [key, value] of Object.entries(secrets)) {
        log(`\n${key}:`, 'yellow');
        console.log(`  ${value}`);
    }

    return secrets;
}

/**
 * Generate and save keys to files
 */
function generateKeyFiles() {
    const keysDir = path.join(__dirname, '../keys');

    // Create keys directory if it doesn't exist
    if (!fs.existsSync(keysDir)) {
        fs.mkdirSync(keysDir, { recursive: true });
        log(`\nCreated keys directory: ${keysDir}`, 'green');
    }

    // Generate RSA key pair for JWT RS256
    log('\nGenerating RSA Key Pair...', 'cyan');
    const { publicKey, privateKey } = generateRSAKeyPair();

    // Save keys
    const privateKeyPath = path.join(keysDir, 'private.key');
    const publicKeyPath = path.join(keysDir, 'public.key');

    fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
    fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

    log(`✅ Private key saved: ${privateKeyPath}`, 'green');
    log(`✅ Public key saved: ${publicKeyPath}`, 'green');

    return { privateKeyPath, publicKeyPath };
}

/**
 * Update or create .env file with new secrets
 */
function updateEnvFile(secrets, options = {}) {
    const envPath = path.join(__dirname, '../.env');
    const envExamplePath = path.join(__dirname, '../.env.example');

    let envContent = '';

    // Read existing .env file if it exists
    if (fs.existsSync(envPath) && !options.overwrite) {
        envContent = fs.readFileSync(envPath, 'utf8');
        log('\nUpdating existing .env file...', 'yellow');

        // Only update if key doesn't exist
        for (const [key, value] of Object.entries(secrets)) {
            const regex = new RegExp(`^${key}=.*$`, 'm');
            if (!regex.test(envContent)) {
                envContent += `\n${key}=${value}`;
                log(`  Added: ${key}`, 'green');
            } else {
                log(`  Skipped (exists): ${key}`, 'yellow');
            }
        }
    } else {
        // Create new .env content
        log('\nCreating new .env file...', 'cyan');

        const envTemplate = `# LogiMetrics Environment Configuration
# Generated on ${new Date().toISOString()}

# Server Configuration
NODE_ENV=development
PORT=3000
API_VERSION=v1

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=logimetrics
DB_USER=postgres
DB_PASSWORD=your_password_here

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/logimetrics

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=${secrets.JWT_SECRET}
JWT_REFRESH_SECRET=${secrets.JWT_REFRESH_SECRET}
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Session Configuration
SESSION_SECRET=${secrets.SESSION_SECRET}

# Encryption
ENCRYPTION_KEY=${secrets.ENCRYPTION_KEY}

# API Key
API_KEY=${secrets.API_KEY}

# Email Configuration (SendGrid)
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@logimetrics.com

# SMS Configuration (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Payment Configuration (Razorpay)
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret

# Payment Configuration (Stripe)
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# Maps Configuration
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
MAPBOX_ACCESS_TOKEN=your_mapbox_token

# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=ap-south-1
AWS_S3_BUCKET=logimetrics-uploads

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Admin Credentials
ADMIN_EMAIL=admin@logimetrics.com
ADMIN_PASSWORD=Admin@123456
`;

        envContent = envTemplate;
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n');
    log(`\n✅ .env file saved: ${envPath}`, 'green');

    // Also update .env.example (without actual secrets)
    if (options.updateExample) {
        const exampleContent = envContent.replace(
            new RegExp(`(JWT_SECRET|JWT_REFRESH_SECRET|SESSION_SECRET|ENCRYPTION_KEY|API_KEY)=.+`, 'g'),
            '$1=your_secure_secret_here'
        );
        fs.writeFileSync(envExamplePath, exampleContent);
        log(`✅ .env.example file saved: ${envExamplePath}`, 'green');
    }
}

/**
 * Display usage instructions
 */
function showUsage() {
    console.log(`
  Usage: node generate-keys.js [options]

  Options:
    --generate       Generate and display new secrets
    --save           Generate secrets and save to .env file
    --overwrite      Overwrite existing .env file
    --rsa            Generate RSA key pair files
    --help           Show this help message

  Examples:
    node generate-keys.js --generate
    node generate-keys.js --save
    node generate-keys.js --save --overwrite
    node generate-keys.js --rsa
  `);
}

/**
 * Main entry point
 */
function main() {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.length === 0) {
        showUsage();
        process.exit(0);
    }

    if (args.includes('--generate') || args.includes('--save')) {
        const secrets = generateAllSecrets();

        if (args.includes('--save')) {
            updateEnvFile(secrets, {
                overwrite: args.includes('--overwrite'),
                updateExample: true
            });
        }
    }

    if (args.includes('--rsa')) {
        generateKeyFiles();
    }

    log('\n✨ Key generation complete!\n', 'green');
}

main();
