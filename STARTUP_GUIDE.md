# LogiMetrics - Complete Startup & Testing Guide

## ✅ Database Status

### PostgreSQL (`logi_matrix_postgresql_db`)

- **Status**: ✅ Connected & Seeded
- **Connection**: Neon.tech cloud database
- **Records Seeded**:
  - 1 super_admin user (admin@logimetrics.com / Admin@123456)
  - 7 roles, 77 permissions
  - 1 demo company (LogiMetrics Demo Company)
  - 3 vehicles, 3 drivers
  - 5 shipments with waypoints
  - 10 invoices
  - 13 pricing rules

### MongoDB (`logi_matrix`)

- **Status**: ✅ Connected & Seeded
- **Connection**: MongoDB Atlas cloud
- **Records Seeded** (74 total):
  - 20 audit logs (login, CRUD operations)
  - 18 shipment events (status timeline: created→confirmed→delivered)
  - 15 live tracking records (GPS, speed, battery)
  - 21 vehicle telemetry records (fuel, RPM, temperature, tire pressure)

---

## 🚀 Step-by-Step Startup

### 1️⃣ Start Backend Server

```bash
cd LogiMetrics/backend
npm install      # If not already installed
npm run dev      # Starts on port 3000
```

**Expected Output**:

```
✅ Database connection successful
✅ PostgreSQL initialized
✅ MongoDB connected
✅ Server running on http://localhost:3000
✅ Socket.io listening for real-time updates
```

**Verify Backend**:

```bash
curl http://localhost:3000/api/health
# Response: { "status": "ok", "timestamp": "..." }
```

---

### 2️⃣ Start Frontend Development Server

```bash
cd LogiMetrics/frontend/logimatrix-app
npm install      # If not already installed
npm run dev      # Starts on port 5173
```

**Expected Output**:

```
VITE v5.x.x  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  press h + enter to show help
```

---

### 3️⃣ Open Application

Navigate to: **http://localhost:5173**

You should see the **LoginPage** with:

- Email field pre-filled: `admin@logimetrics.com`
- Password field pre-filled: `Admin@123456`
- "Remember me" checkbox
- "Log In" button

---

## 🔐 Login Flow

### Step 1: Enter Credentials

```
Email:    admin@logimetrics.com
Password: Admin@123456
Click:    "Log In" button
```

### Step 2: Backend Authentication

```
POST http://localhost:3000/api/auth/login
{
  "email": "admin@logimetrics.com",
  "password": "Admin@123456"
}
```

**What happens**:

1. Backend queries PostgreSQL `users` table
2. Verifies password hash
3. Checks user role & permissions
4. Generates JWT tokens (15 min access, 7 day refresh)
5. Logs login action to MongoDB `audit_logs`
6. Returns tokens + user data

### Step 3: Frontend Token Storage

```javascript
localStorage.setItem("access_token", "eyJhbGciOiJIUzI1NiIs...");
localStorage.setItem("refresh_token", "eyJhbGciOiJIUzI1NiIs...");
localStorage.setItem(
  "user",
  JSON.stringify({ id: 1, email: "...", role: "..." })
);
```

### Step 4: Dashboard Access

- User is redirected to `/dashboard`
- Admin Dashboard loads and fetches data from APIs
- All subsequent API calls include JWT token in headers

---

## 📊 Dashboard Overview

After login, you'll see the **AdminDashboard** with:

### 1. **Shipment Management**

- **Source**: PostgreSQL `shipments` table
- **Display**: List of all 5 seeded shipments
- **Status**: pending, confirmed, in_transit, delivered
- **Actions**: View timeline, update status, assign driver/vehicle

**Data Flow**:

```
Dashboard → GET /api/shipments
  → PostgreSQL shipments table
  → MongoDB shipment_events (timeline)
  → Display with status progression
```

---

### 2. **Vehicle Fleet**

- **Source**: PostgreSQL `vehicles` table
- **Display**: 3 vehicles (truck, van, car)
- **Status**: active, maintenance status
- **Real-time**: Live location from MongoDB `live_tracking`

**Data Flow**:

```
Dashboard → GET /api/vehicles
  → PostgreSQL vehicles table
  → MongoDB live_tracking (current location)
  → Display on interactive map
```

---

### 3. **Driver Management**

- **Source**: PostgreSQL `drivers` table
- **Display**: 3 drivers with assignment status
- **Connected To**: Vehicles, shipments
- **Status**: available, on_duty, off_duty

**Data Flow**:

```
Dashboard → GET /api/drivers
  → PostgreSQL drivers table
  → Show assigned vehicles & shipments
```

---

### 4. **Real-time Tracking Map**

- **Source**: MongoDB `live_tracking` collection
- **Updates**: Every 5 seconds via Socket.io
- **Shows**: Vehicle location, speed, heading, battery level

**Data Flow**:

```
Mobile App → POST /api/tracking/update
  → MongoDB live_tracking insert
  → Socket.io broadcast to dashboard
  → Map updates in real-time
```

---

### 5. **Audit Activity**

- **Source**: MongoDB `audit_logs` collection
- **Shows**: User actions, login history, CRUD operations
- **Retention**: 90 days (auto-delete)

**Data Flow**:

```
GET /api/analytics/audit-logs
  → MongoDB audit_logs collection
  → Show recent activity feed
```

---

### 6. **Vehicle Health**

- **Source**: MongoDB `vehicle_telemetry` collection
- **Shows**: Fuel level, engine temp, tire pressure, battery voltage
- **Alerts**: Low fuel, high temp, low tire pressure

**Data Flow**:

```
GET /api/vehicles/{id}/telemetry
  → MongoDB vehicle_telemetry collection
  → Display latest sensor readings
  → Generate maintenance alerts
```

---

## 🧪 Testing API Endpoints

### Authentication Endpoints

#### 1. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@logimetrics.com",
    "password": "Admin@123456"
  }'
```

**Response** (PostgreSQL):

```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "email": "admin@logimetrics.com",
      "firstName": "Admin",
      "lastName": "User",
      "role": "super_admin",
      "company": { "id": 1, "name": "LogiMetrics Demo Company" }
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

#### 2. Get Current User Profile

```bash
JWT_TOKEN="<paste_access_token_here>"

curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response** (PostgreSQL):

```json
{
  "success": true,
  "data": {
    "id": 1,
    "email": "admin@logimetrics.com",
    "firstName": "Admin",
    "role": "super_admin"
  }
}
```

---

### Shipment Endpoints

#### 3. List All Shipments

```bash
curl -X GET http://localhost:3000/api/shipments \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response** (PostgreSQL + MongoDB):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "shipmentNumber": "SHP-001",
      "status": "in_transit",
      "sourceLocation": "Warehouse A",
      "destinationLocation": "Customer B",
      "driver": { "id": 1, "name": "John Driver" },
      "vehicle": { "id": 1, "licensePlate": "ABC123" },
      "timeline": [
        { "status": "CREATED", "timestamp": "2024-01-14T10:00:00Z" },
        { "status": "CONFIRMED", "timestamp": "2024-01-14T11:00:00Z" },
        { "status": "PICKED_UP", "timestamp": "2024-01-15T09:00:00Z" },
        { "status": "IN_TRANSIT", "timestamp": "2024-01-15T14:30:00Z" }
      ]
    }
  ]
}
```

---

#### 4. Get Shipment Timeline (MongoDB)

```bash
curl -X GET http://localhost:3000/api/shipments/1/timeline \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response** (MongoDB `shipment_events`):

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "shipmentId": 1,
      "status": "IN_TRANSIT",
      "previousStatus": "PICKED_UP",
      "location": {
        "latitude": 40.7128,
        "longitude": -74.006,
        "address": "5th Avenue, NYC"
      },
      "driver": {
        "name": "John Driver",
        "phone": "9876543210"
      },
      "vehicle": {
        "licensePlate": "ABC123"
      },
      "createdAt": "2024-01-15T14:30:00Z"
    }
  ]
}
```

---

### Vehicle Endpoints

#### 5. List All Vehicles

```bash
curl -X GET http://localhost:3000/api/vehicles \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response** (PostgreSQL):

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "licensePlate": "ABC123",
      "vehicleType": "truck",
      "capacity": { "weight": 5000, "volume": 25 },
      "status": "active",
      "purchaseDate": "2023-01-15",
      "currentDriver": { "id": 1, "name": "John" },
      "lastServiceDate": "2024-01-10"
    }
  ]
}
```

---

#### 6. Get Real-time Vehicle Location (MongoDB)

```bash
curl -X GET http://localhost:3000/api/tracking/live/1 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response** (MongoDB `live_tracking`):

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "vehicleId": 1,
    "driverId": 1,
    "location": {
      "latitude": 40.7128,
      "longitude": -74.006,
      "address": "5th Avenue, NYC"
    },
    "speed": 45.5,
    "heading": 180,
    "battery": 87,
    "ignition": true,
    "odometer": 25430,
    "timestamp": "2024-01-15T15:45:23Z"
  }
}
```

---

#### 7. Get Vehicle Telemetry (MongoDB)

```bash
curl -X GET http://localhost:3000/api/vehicles/1/telemetry \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response** (MongoDB `vehicle_telemetry`):

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439013",
    "vehicleId": 1,
    "fuel": {
      "level": 75,
      "consumption": 8.5
    },
    "engine": {
      "rpm": 2100,
      "temperature": 87,
      "pressure": 4.2
    },
    "battery": {
      "voltage": 13.8,
      "current": 25.4,
      "soc": 95
    },
    "tires": {
      "frontLeft": { "pressure": 32.5, "temperature": 45 },
      "frontRight": { "pressure": 32.5, "temperature": 45 },
      "rearLeft": { "pressure": 33.0, "temperature": 46 },
      "rearRight": { "pressure": 33.0, "temperature": 46 }
    },
    "diagnostics": {
      "checkEngineLamp": false,
      "faultCodes": [],
      "lastServiceKm": 25000
    },
    "timestamp": "2024-01-15T15:45:23Z"
  }
}
```

---

### Analytics Endpoints

#### 8. Get Audit Logs (MongoDB)

```bash
curl -X GET http://localhost:3000/api/analytics/audit-logs \
  -H "Authorization: Bearer $JWT_TOKEN"
```

**Response** (MongoDB `audit_logs`):

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439014",
      "userId": 1,
      "action": "LOGIN",
      "resourceType": "user",
      "statusCode": 200,
      "ipAddress": "127.0.0.1",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    {
      "_id": "507f1f77bcf86cd799439015",
      "userId": 1,
      "action": "UPDATE",
      "resourceType": "shipment",
      "resourceId": "1",
      "oldValues": { "status": "pending" },
      "newValues": { "status": "confirmed" },
      "statusCode": 200,
      "createdAt": "2024-01-15T11:15:00Z"
    }
  ]
}
```

---

## ❌ Troubleshooting

### Issue: "Cannot connect to backend"

```
Error: axios Error: Network Error / ECONNREFUSED
```

**Solution**:

1. Check if backend is running: `npm run dev` in `/backend` folder
2. Verify port 3000 is not in use: `lsof -i :3000`
3. Check `.env` file has correct DATABASE_URL and MONGODB_URI
4. Check CORS is enabled in backend/src/app.js

```javascript
// backend/src/app.js should have:
const cors = require("cors");
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);
```

---

### Issue: "Login fails with 401 Unauthorized"

```
Error: Invalid credentials
```

**Solution**:

1. Verify credentials are correct:
   - Email: `admin@logimetrics.com`
   - Password: `Admin@123456`
2. Check PostgreSQL is connected:
   ```bash
   npm run test:connections
   ```
3. Check if user exists in database:
   ```bash
   # Backend logs should show: "User found: admin@logimetrics.com"
   ```
4. Verify password hash is correct:
   - Run: `npm run seed:undo && npm run seed` to reset data

---

### Issue: "Dashboard loads but no data appears"

```
Shipments: Empty array
Vehicles: Empty array
```

**Solution**:

1. Check if PostgreSQL data is seeded:
   ```bash
   cd backend
   npm run seed
   ```
2. Check API response:
   ```bash
   curl -X GET http://localhost:3000/api/shipments \
     -H "Authorization: Bearer $JWT_TOKEN"
   # Should return array of 5 shipments
   ```
3. Check MongoDB data:
   ```bash
   npm run seed:mongodb
   # Should create audit logs, shipment events, tracking data
   ```

---

### Issue: "Real-time tracking not updating"

```
Vehicle location is stuck/not changing
```

**Solution**:

1. Check MongoDB connection:
   - Verify MONGODB_URI in .env
   - Check if live_tracking collection exists
2. Check Socket.io connection:
   - Open browser DevTools → Network → WS
   - Should show `socket.io` connection
3. Verify tracking data exists:
   ```bash
   curl -X GET http://localhost:3000/api/tracking/live/1 \
     -H "Authorization: Bearer $JWT_TOKEN"
   # Should return vehicle location with recent timestamp
   ```

---

### Issue: "Audit logs not appearing"

```
GET /api/analytics/audit-logs returns empty array
```

**Solution**:

1. Seed MongoDB:
   ```bash
   cd backend
   npm run seed:mongodb
   ```
2. Verify audit logs created:
   ```bash
   curl -X GET http://localhost:3000/api/analytics/audit-logs \
     -H "Authorization: Bearer $JWT_TOKEN"
   # Should return 20+ audit log records
   ```
3. Check MongoDB is logging actions:
   - Perform a login/logout
   - Check if new audit log appears

---

## 🔄 Common Workflows

### Workflow 1: Create a New Shipment

```
1. Login with admin credentials
2. Go to Dashboard → Shipments tab
3. Click "Create Shipment" button
4. Fill form:
   - Source: "Warehouse A"
   - Destination: "Customer B"
   - Assign Driver: "John Driver"
   - Assign Vehicle: "ABC123"
5. Click "Create"
6. Backend creates record in PostgreSQL `shipments` table
7. MongoDB auto-creates CREATED event in `shipment_events`
8. Dashboard refreshes and shows new shipment

Data Flow:
  Frontend Form → POST /api/shipments
    → PostgreSQL insert into shipments
    → MongoDB insert into shipment_events
    → Socket.io broadcast
    → Dashboard updates UI
```

---

### Workflow 2: Update Shipment Status

```
1. Dashboard → Select a shipment
2. Click "Update Status" → Select "In Transit"
3. Click "Confirm"
4. Backend updates PostgreSQL `shipments.status`
5. MongoDB creates new event in `shipment_events`
6. Audit log created in MongoDB `audit_logs`
7. All dashboard clients notified via Socket.io

Data Flow:
  Frontend → PUT /api/shipments/1/status
    → PostgreSQL update shipments table
    → MongoDB insert shipment_events
    → MongoDB insert audit_logs
    → Socket.io broadcast "shipment_updated"
    → Dashboard timeline updates
```

---

### Workflow 3: Track Vehicle in Real-time

```
1. Dashboard → Open Tracking Map
2. See all 3 vehicles on map
3. Vehicle location updates every 5 seconds
4. Click on vehicle → See detailed telemetry
   - Fuel: 75%
   - Engine Temp: 87°C
   - Tire Pressure: 32.5 PSI
   - Battery: 13.8V

Data Flow:
  Mobile App (GPS updates)
    → POST /api/tracking/update (every 5 sec)
    → MongoDB insert live_tracking
    → Socket.io broadcast
    → Dashboard map updates marker position

  Dashboard clicks vehicle
    → GET /api/vehicles/1/telemetry
    → MongoDB query vehicle_telemetry
    → Display sensor readings
```

---

## 📋 Data Verification Checklist

After startup, verify all systems:

- [ ] Backend starts without errors: `npm run dev` in `/backend`
- [ ] Frontend starts without errors: `npm run dev` in `/frontend`
- [ ] LoginPage displays with pre-filled credentials
- [ ] Login successful with admin@logimetrics.com / Admin@123456
- [ ] Dashboard loads after login
- [ ] 5 shipments appear in list
- [ ] 3 vehicles appear with locations
- [ ] 3 drivers listed with assignments
- [ ] Real-time tracking map shows vehicle markers
- [ ] Vehicle telemetry shows fuel, temperature, tire pressure
- [ ] Audit logs show login activity
- [ ] No JavaScript errors in browser console
- [ ] No server errors in backend terminal

---

## 🎯 Next Steps

1. **Explore Dashboard Features**

   - Create a new shipment
   - Update shipment status
   - View shipment timeline
   - Check vehicle health

2. **Test API Endpoints**

   - Use provided curl examples
   - Check responses match expected format
   - Verify PostgreSQL + MongoDB data integration

3. **Customize for Your Needs**

   - Add more users
   - Create new vehicle types
   - Configure pricing rules
   - Set up invoice templates

4. **Deploy to Production**
   - Neon.tech PostgreSQL already cloud-hosted
   - MongoDB Atlas already cloud-hosted
   - Frontend can deploy to Vercel/Netlify
   - Backend can deploy to Railway/Render

---

## 📞 Support

For issues or questions:

1. Check [DATABASE_USAGE_GUIDE.md](DATABASE_USAGE_GUIDE.md) for architecture details
2. Review API logs: `backend/logs/` directory
3. Check MongoDB Atlas dashboard for connection/data
4. Verify environment variables in `.env` files
5. Run test commands: `npm run test:connections`
