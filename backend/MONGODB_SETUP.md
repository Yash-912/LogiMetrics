# MongoDB Setup Guide for LogiMetrics

## Overview

LogiMetrics uses MongoDB for storing audit logs, tracking data, and vehicle telemetry. This guide helps you set up MongoDB for local development.

## Current Issue

The MongoDB Atlas connection is failing due to network/DNS issues. You can resolve this by using one of the following options:

## Option 1: Local MongoDB (Recommended for Development)

### Windows

1. **Download MongoDB Community Edition**

   - Go to https://www.mongodb.com/try/download/community
   - Download the Windows installer
   - Run the installer and follow the setup wizard
   - Select "Install MongoD as a Service"

2. **Verify Installation**

   ```powershell
   mongod --version
   ```

3. **Start MongoDB**

   ```powershell
   # If installed as service
   net start MongoDB

   # Or manually
   mongod
   ```

4. **Update `.env`**

   ```
   MONGODB_URI=mongodb://localhost:27017/logi_matrix
   ```

5. **Seed Database**
   ```bash
   npm run test:mongodb
   ```

### macOS

```bash
# Install via Homebrew
brew install mongodb-community

# Start MongoDB service
brew services start mongodb-community

# Verify
mongosh
```

Then update `.env`:

```
MONGODB_URI=mongodb://localhost:27017/logi_matrix
```

### Linux (Ubuntu)

```bash
# Install MongoDB
sudo apt-get install -y mongodb

# Start service
sudo systemctl start mongod

# Verify
mongosh
```

Then update `.env`:

```
MONGODB_URI=mongodb://localhost:27017/logi_matrix
```

## Option 2: Docker (Fastest Setup)

### Prerequisites

- Install Docker Desktop from https://www.docker.com/products/docker-desktop

### Setup

1. **Run MongoDB Container**

   ```bash
   # Simple setup (no auth)
   docker run -d \
     --name logimetrics-mongodb \
     -p 27017:27017 \
     mongo:latest

   # With authentication
   docker run -d \
     --name logimetrics-mongodb \
     -p 27017:27017 \
     -e MONGO_INITDB_ROOT_USERNAME=admin \
     -e MONGO_INITDB_ROOT_PASSWORD=password \
     mongo:latest
   ```

2. **Using Docker Compose (Recommended)**

   ```bash
   cd backend
   docker-compose -f docker-compose.mongodb.yml up -d
   ```

   This also starts MongoDB Express for GUI management at `http://localhost:8081`

3. **Update `.env`**

   - Without auth: `MONGODB_URI=mongodb://localhost:27017/logi_matrix`
   - With auth: `MONGODB_URI=mongodb://admin:password@localhost:27017/logi_matrix?authSource=admin`

4. **Seed Database**
   ```bash
   npm run test:mongodb
   ```

## Option 3: MongoDB Atlas (Cloud)

If you want to use the cloud version but it's not connecting:

### Fix Network Issues

1. **Whitelist Your IP**

   - Go to MongoDB Atlas Dashboard
   - Click "Network Access"
   - Add your current IP address
   - Or add `0.0.0.0/0` for development (not recommended for production)

2. **Verify Connection String**

   - Get the correct connection string from Atlas
   - Format: `mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority`
   - Update `.env`:
     ```
     MONGODB_URI=mongodb+srv://sagacitychess_db_user:pOU7R8EwhrsErudP@logimatrix.fwvtwz8.mongodb.net/logi_matrix?retryWrites=true&w=majority
     ```

3. **Test Connection**
   ```bash
   npm run test:mongodb
   ```

## Verify MongoDB is Running

### Using mongosh (MongoDB Shell)

```bash
mongosh
# Once connected, you should see: test>
# Type: exit
```

### Using MongoDB Compass (GUI)

1. Download from https://www.mongodb.com/products/compass
2. Connect to `mongodb://localhost:27017`
3. Browse your database

### Check from Node.js

```bash
node scripts/test-and-seed-mongodb.js
```

## Seed Sample Data

Once MongoDB is running:

```bash
npm run test:mongodb
```

This will:

1. Test the connection
2. Create collections:
   - `audit_logs` - System audit logs
   - `live_tracking` - Real-time vehicle tracking
   - `shipment_events` - Shipment status events
   - `vehicle_telemetry` - Vehicle sensor data
3. Insert sample data
4. Verify everything is working

## Available Commands

```bash
# Test connection and seed data
npm run test:mongodb

# Start backend (uses MongoDB)
npm run dev

# Complete DB setup (PostgreSQL + MongoDB)
npm run db:setup
```

## Troubleshooting

### Error: "querySrv EREFUSED"

- MongoDB Atlas DNS not reachable
- Solutions:
  - Check internet connection
  - Use local MongoDB instead
  - Whitelist IP in MongoDB Atlas

### Error: "ECONNREFUSED"

- MongoDB not running locally
- Solutions:
  - Start MongoDB service
  - Use Docker
  - Check port 27017 is not blocked

### Error: "Connection timeout"

- MongoDB taking too long to respond
- Solutions:
  - Increase timeout in connection string
  - Check network connectivity
  - Restart MongoDB service

### Error: "Authentication failed"

- Wrong username/password
- Solutions:
  - Verify credentials in .env
  - Reset MongoDB password in Atlas
  - Check `?authSource=admin` parameter if using auth

## Next Steps

1. Choose and setup MongoDB (Option 1, 2, or 3)
2. Run `npm run test:mongodb` to verify
3. Start backend: `npm run dev`
4. Frontend should now work with MongoDB data

## Monitoring Data

Once setup, you can monitor data:

### Using MongoDB Compass

1. Connect to your MongoDB instance
2. Navigate to `logi_matrix` database
3. Browse collections in real-time

### Using MongoDB Express (Docker only)

- Access at http://localhost:8081
- Default credentials: admin/pass

## Production Notes

For production:

- Always use MongoDB Atlas with IP whitelisting
- Use strong, unique passwords
- Enable authentication
- Set up regular backups
- Monitor connection metrics
