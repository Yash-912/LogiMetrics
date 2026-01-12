# Database Usage Guide - LogiMetrics

## Architecture Overview

LogiMetrics uses a **hybrid database strategy** combining PostgreSQL (relational) and MongoDB (document-based) to handle different types of data efficiently.

```
┌─────────────────────────────────────────────────────────────────┐
│                    API Request (Frontend)                        │
└────────────────────┬────────────────────────────────────────────┘
                     │
        ┌────────────┴─────────────┐
        │                          │
   ┌────▼─────────┐          ┌────▼──────────┐
   │ PostgreSQL   │          │   MongoDB     │
   │ (Relational) │          │  (Documents)  │
   └──────────────┘          └───────────────┘
```

---

## PostgreSQL Database (`logi_matrix_postgresql_db`)

**Purpose**: Store all permanent, relational business data

### ✅ What is stored in PostgreSQL?

#### 1. **User Management**

```
users
├── id (PK)
├── email
├── password_hash
├── first_name, last_name
├── role_id (FK)
├── company_id (FK)
└── timestamps (created_at, updated_at)

roles
├── id (PK)
├── name (super_admin, admin, manager, dispatcher, driver, customer, user)
└── description

permissions
├── id (PK)
├── resource (users, companies, vehicles, shipments, etc.)
├── action (create, read, update, delete)
└── description

user_roles
├── user_id (FK)
└── role_id (FK)
```

**Used by**:

- `POST /api/auth/login` - Authenticate users, return JWT tokens
- `GET /api/auth/profile` - Get current user details
- `GET /api/users` - List all users

---

#### 2. **Organization Management**

```
companies
├── id (PK)
├── name (LogiMetrics Demo Company)
├── tax_id
├── registration_number
├── phone
├── email
├── address
└── settings (JSON)

company_settings
├── company_id (FK)
├── setting_key
└── setting_value
```

**Used by**:

- `GET /api/companies/:id` - Get company details
- `GET /api/companies/:id/settings` - Get company configuration
- `PUT /api/companies/:id` - Update company details

---

#### 3. **Fleet Management**

```
vehicles
├── id (PK)
├── company_id (FK)
├── license_plate
├── vehicle_type (truck, van, car)
├── capacity (weight, volume)
├── status (active, maintenance, retired)
├── purchase_date
├── last_service_date
└── metadata (JSON: color, odometer, etc.)

drivers
├── id (PK)
├── company_id (FK)
├── user_id (FK)
├── license_number
├── license_expiry
├── phone
├── current_vehicle_id (FK)
└── status (available, on_duty, off_duty)

routes
├── id (PK)
├── company_id (FK)
├── name
├── source_location
├── destination_location
├── distance
├── estimated_duration
└── stops (JSON array)
```

**Used by**:

- `GET /api/vehicles` - List all vehicles
- `POST /api/vehicles` - Create new vehicle
- `GET /api/drivers/:id` - Get driver details
- `PUT /api/drivers/:id/assign-vehicle` - Assign vehicle to driver
- `GET /api/routes` - List all routes

---

#### 4. **Shipment & Logistics**

```
shipments
├── id (PK)
├── company_id (FK)
├── shipment_number
├── status (pending, confirmed, in_transit, delivered, cancelled)
├── source_location
├── destination_location
├── route_id (FK)
├── vehicle_id (FK)
├── driver_id (FK)
├── pickup_time
├── delivery_time
└── special_instructions (TEXT)

waypoints
├── id (PK)
├── shipment_id (FK)
├── location
├── sequence_number
├── arrival_time
└── departure_time

locations
├── id (PK)
├── name
├── type (pickup, delivery, hub)
├── latitude, longitude
├── address
└── contact_info
```

**Used by**:

- `GET /api/shipments` - List all shipments
- `POST /api/shipments` - Create new shipment
- `PUT /api/shipments/:id` - Update shipment status
- `GET /api/shipments/:id/waypoints` - Get waypoints for shipment

---

#### 5. **Billing & Payments**

```
invoices
├── id (PK)
├── company_id (FK)
├── invoice_number
├── total_amount
├── status (draft, sent, paid, overdue, cancelled)
├── issue_date
├── due_date
└── items (JSON array)

transactions
├── id (PK)
├── invoice_id (FK)
├── amount
├── payment_method (bank_transfer, credit_card, cash)
├── status (pending, completed, failed)
└── transaction_date

pricing_rules
├── id (PK)
├── company_id (FK)
├── rule_type (distance, weight, vehicle_type)
├── base_rate
├── multiplier
└── conditions (JSON)
```

**Used by**:

- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/:id` - Get invoice details
- `POST /api/payments` - Record payment
- `GET /api/pricing-rules` - Get pricing configuration

---

#### 6. **Document Management**

```
documents
├── id (PK)
├── company_id (FK)
├── name
├── document_type (contract, license, insurance, etc.)
├── file_url (S3)
├── uploaded_date
└── expiry_date

files
├── id (PK)
├── document_id (FK)
├── file_key (S3 key)
├── file_size
└── mime_type

certificates
├── id (PK)
├── user_id/vehicle_id/company_id (FK)
├── certificate_type
├── issue_date
├── expiry_date
└── certificate_number
```

**Used by**:

- `GET /api/documents` - List documents
- `POST /api/documents/upload` - Upload document to S3
- `GET /api/certificates/:id` - Verify certificate validity

---

## MongoDB Database (`logi_matrix`)

**Purpose**: Store event logs, audit trails, and time-series data (auto-cleanup policies)

### ✅ What is stored in MongoDB?

#### 1. **Audit Logs** (20 records)

```
Collections: audit_logs

Document Structure:
{
  _id: ObjectId,
  userId: ObjectId (ref to postgres users.id),
  action: "LOGIN" | "CREATE" | "UPDATE" | "DELETE",
  resourceType: "user" | "shipment" | "vehicle" | etc,
  resourceId: string,
  oldValues: { ... },
  newValues: { ... },
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  statusCode: 200,
  createdAt: ISODate,
  ttl: 90 days (auto-delete)
}

Example:
{
  _id: ObjectId("..."),
  userId: 1,
  action: "LOGIN",
  resourceType: "user",
  oldValues: null,
  newValues: { email: "admin@logimetrics.com" },
  statusCode: 200,
  createdAt: ISODate("2024-01-15T10:30:00Z")
}
```

**Used by**:

- `GET /api/analytics/audit-logs` - Get user activity history
- `GET /api/analytics/audit-logs?userId=1` - Get user's specific actions
- Dashboard: "Recent Activities" widget

**Access Pattern**:

```javascript
// Backend
const logs = await AuditLog.find({ userId: req.user.id })
  .sort({ createdAt: -1 })
  .limit(20);
```

---

#### 2. **Shipment Events** (18 records)

```
Collection: shipment_events

Document Structure:
{
  _id: ObjectId,
  shipmentId: integer (ref to postgres shipments.id),
  status: "CREATED" | "CONFIRMED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED",
  previousStatus: string,
  location: {
    latitude: number,
    longitude: number,
    address: string,
    country: string,
    city: string
  },
  driver: {
    driverId: integer,
    name: string,
    phone: string
  },
  vehicle: {
    vehicleId: integer,
    licensePlate: string
  },
  notes: string,
  photos: [ { url: string, timestamp: ISODate } ],
  signatureUrl: string,
  createdAt: ISODate,
  updatedAt: ISODate,
  ttl: 30 days (auto-delete)
}

Example:
{
  _id: ObjectId("..."),
  shipmentId: 1,
  status: "PICKED_UP",
  previousStatus: "CONFIRMED",
  location: { latitude: 40.7128, longitude: -74.0060, address: "NYC" },
  driver: { driverId: 1, name: "John", phone: "9876543210" },
  createdAt: ISODate("2024-01-15T14:30:00Z")
}
```

**Used by**:

- `GET /api/shipments/:id/timeline` - Get shipment status history
- `POST /api/shipments/:id/status-update` - Record status change
- Dashboard: "Shipment Status Timeline" widget
- Customer Portal: Real-time shipment tracking

**Access Pattern**:

```javascript
// Backend
const events = await ShipmentEvent.find({
  shipmentId: req.params.shipmentId,
}).sort({ createdAt: -1 });

// Frontend
const response = await api.get(`/api/shipments/${shipmentId}/timeline`);
```

---

#### 3. **Live Tracking** (15 records)

```
Collection: live_tracking

Document Structure:
{
  _id: ObjectId,
  vehicleId: integer (ref to postgres vehicles.id),
  driverId: integer (ref to postgres drivers.id),
  shipmentId: integer (optional),
  location: {
    type: "Point",
    coordinates: [longitude, latitude]  // GeoJSON format
  },
  address: string,
  speed: number (km/h),
  heading: number (0-360 degrees),
  altitude: number (meters),
  accuracy: number (GPS accuracy in meters),
  battery: number (0-100 %),
  ignition: boolean,
  odometer: number (km),
  createdAt: ISODate,
  ttl: 30 days (auto-delete)
}

Example:
{
  _id: ObjectId("..."),
  vehicleId: 1,
  driverId: 1,
  shipmentId: 1,
  location: { type: "Point", coordinates: [-74.0060, 40.7128] },
  address: "5th Avenue, NYC",
  speed: 45.5,
  heading: 180,
  battery: 87,
  ignition: true,
  createdAt: ISODate("2024-01-15T15:45:23Z")
}
```

**Used by**:

- `GET /api/tracking/live/:vehicleId` - Get real-time vehicle location
- `GET /api/tracking/history/:vehicleId` - Get historical route
- `POST /api/tracking/update` - Receive GPS update from mobile app
- Dashboard: Real-time vehicle map
- Fleet Manager: "Vehicle Locations" map view

**Geographic Queries**:

```javascript
// Find all vehicles within 5km
await LiveTracking.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-74.006, 40.7128] },
      $maxDistance: 5000, // meters
    },
  },
});
```

---

#### 4. **Vehicle Telemetry** (21 records)

```
Collection: vehicle_telemetry

Document Structure:
{
  _id: ObjectId,
  vehicleId: integer (ref to postgres vehicles.id),
  driverId: integer (optional),
  fuel: {
    level: number (0-100 %),
    consumption: number (L/100km)
  },
  engine: {
    rpm: number,
    temperature: number (°C),
    pressure: number (bar)
  },
  battery: {
    voltage: number (V),
    current: number (A),
    soc: number (0-100 %)  // State of Charge
  },
  tires: {
    frontLeft: { pressure: number, temperature: number },
    frontRight: { pressure: number, temperature: number },
    rearLeft: { pressure: number, temperature: number },
    rearRight: { pressure: number, temperature: number }
  },
  diagnostics: {
    checkEngineLamp: boolean,
    faultCodes: [ string ],
    lastServiceKm: number
  },
  createdAt: ISODate,
  ttl: 90 days (auto-delete)
}

Example:
{
  _id: ObjectId("..."),
  vehicleId: 1,
  fuel: { level: 75, consumption: 8.5 },
  engine: { rpm: 2100, temperature: 87 },
  battery: { voltage: 13.8, soc: 95 },
  tires: {
    frontLeft: { pressure: 32.5, temperature: 45 }
  },
  createdAt: ISODate("2024-01-15T15:45:23Z")
}
```

**Used by**:

- `GET /api/vehicles/:id/telemetry` - Get vehicle sensor data
- `GET /api/vehicles/:id/diagnostics` - Check vehicle health
- Dashboard: "Vehicle Health" widget
- Maintenance: Predictive maintenance alerts (fuel, tire pressure, engine temp)

**Access Pattern**:

```javascript
// Get latest telemetry for a vehicle
const latest = await VehicleTelemetry.findOne({
  vehicleId: req.params.vehicleId,
}).sort({ createdAt: -1 });

// Get historical telemetry (last 7 days)
const history = await VehicleTelemetry.find({
  vehicleId: req.params.vehicleId,
  createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
});
```

---

## Database Interaction Flow

### 1. **Login Flow** (PostgreSQL only)

```
Frontend (LoginPage.jsx)
  │
  ├─ POST /api/auth/login
  │   │ email: "admin@logimetrics.com"
  │   └─ password: "Admin@123456"
  │
  └─→ Backend (auth.controller.js)
      │
      └─→ Query PostgreSQL (users table)
          ├─ Hash password & compare
          ├─ Verify user exists & active
          ├─ Check role & permissions
          └─ Generate JWT (access + refresh token)

      └─→ Log action to MongoDB (audit_logs collection)
          └─ { userId: 1, action: "LOGIN", status: 200 }

      └─→ Response: { access_token, refresh_token, user: {...} }
          └─ Frontend stores tokens in localStorage
```

---

### 2. **Get Shipments** (PostgreSQL + MongoDB)

```
Frontend (AdminDashboard.jsx)
  │
  ├─ GET /api/shipments
  │
  └─→ Backend (shipment.controller.js)
      │
      ├─→ PostgreSQL (shipments table)
      │   └─ Get: id, shipment_number, status, driver_id, vehicle_id, etc.
      │
      └─→ MongoDB (shipment_events collection)
          └─ Get latest 3 events for timeline preview

      └─→ Response: [
            {
              id: 1,
              shipment_number: "SHP-001",
              status: "in_transit",
              events: [ { status: "PICKED_UP", createdAt: "..." } ]
            },
            ...
          ]
```

---

### 3. **Real-time Tracking** (MongoDB only)

```
Mobile App (GPS Update)
  │
  ├─ POST /api/tracking/update
  │   │ vehicleId: 1
  │   │ location: { lat: 40.7128, lng: -74.0060 }
  │   │ speed: 45.5, battery: 87
  │   └─ timestamp: "2024-01-15T15:45:23Z"
  │
  └─→ Backend (tracking.controller.js)
      │
      └─→ MongoDB (live_tracking collection)
          └─ Insert: { vehicleId, location, speed, battery, ... }

      └─→ Socket.io broadcast to dashboard
          └─ Emit "vehicle_update" to connected clients

Frontend (Dashboard Map)
  │
  ├─ Socket.io listener: "vehicle_update"
  │
  └─→ Update vehicle marker position on real-time map
```

---

### 4. **Vehicle Health Check** (MongoDB only)

```
Backend Scheduled Job (every 5 minutes)
  │
  └─→ Query MongoDB (vehicle_telemetry)
      │
      ├─ Check fuel level < 10% → Alert
      ├─ Check engine temp > 100°C → Alert
      ├─ Check tire pressure < 28 PSI → Alert
      └─ Check battery voltage < 12V → Alert

      └─→ Store alerts in database / send notifications
```

---

## Quick Reference: Which Database to Query?

### PostgreSQL Queries (Relational Data)

```
✅ User authentication        → users table
✅ User permissions           → roles, permissions tables
✅ Company details            → companies table
✅ Vehicle registry           → vehicles table
✅ Driver information         → drivers table
✅ Shipment master data       → shipments table
✅ Invoice generation         → invoices table
✅ Pricing configuration      → pricing_rules table
✅ Route definition           → routes table
```

### MongoDB Queries (Event Data)

```
✅ User activity audit trail  → audit_logs collection
✅ Shipment status timeline   → shipment_events collection
✅ Real-time vehicle location → live_tracking collection
✅ Vehicle sensor readings    → vehicle_telemetry collection
✅ Historical tracking data   → live_tracking (30-day TTL)
✅ Historical telemetry       → vehicle_telemetry (90-day TTL)
```

---

## Database Connection Details

### PostgreSQL

```
Provider: Neon.tech
Database: logi_matrix_postgresql_db
Connection:
  DATABASE_URL=postgresql://user:password@ep-raspy-morning-ahcjg5vl-pooler.c-3.us-east-1.aws.neon.tech:5432/logi_matrix_postgresql_db?sslmode=require
Dialect: postgres
ORM: Sequelize
Port: 5432
```

### MongoDB

```
Provider: MongoDB Atlas
Cluster: logimatrix
Database: logi_matrix
Connection:
  MONGODB_URI=mongodb+srv://sagacitychess_db_user:pOU7R8EwhrsErudP@logimatrix.fwvtwz8.mongodb.net/logi_matrix?retryWrites=true&w=majority
ODM: Mongoose
TTL Indexes: 30 days (live_tracking), 90 days (vehicle_telemetry)
```

---

## Data Consistency Strategy

### Write Operations

1. **Create shipment** (PostgreSQL) → Auto-create CREATED event (MongoDB)
2. **Update shipment status** (PostgreSQL) → Create status event (MongoDB) + Audit log
3. **Record GPS update** (MongoDB) → Update vehicle position, no PostgreSQL change

### Read Operations

1. **For dashboards** → Read from PostgreSQL (master data) + MongoDB (events/timeline)
2. **For real-time tracking** → Read from MongoDB only (latest 100 records from live_tracking)
3. **For analytics** → Aggregate MongoDB data (shipment_events, vehicle_telemetry)

### Cleanup Operations

- **Audit logs** → Auto-delete after 90 days (TTL index)
- **Live tracking** → Auto-delete after 30 days (TTL index)
- **Vehicle telemetry** → Auto-delete after 90 days (TTL index)
- **Shipment events** → Manual retention policy (kept for 30 days)

---

## Testing the Databases

### 1. Test Login (PostgreSQL)

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@logimetrics.com",
    "password": "Admin@123456"
  }'
```

**Expected Response** (PostgreSQL data + MongoDB audit log):

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "admin@logimetrics.com",
    "firstName": "Admin",
    "role": "super_admin"
  }
}
```

---

### 2. Test Shipments (PostgreSQL)

```bash
curl -X GET http://localhost:3000/api/shipments \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected Response** (PostgreSQL shipments + MongoDB events):

```json
[
  {
    "id": 1,
    "shipmentNumber": "SHP-001",
    "status": "in_transit",
    "driver": { "id": 1, "name": "John" },
    "events": [
      { "status": "CREATED", "createdAt": "2024-01-14T10:00:00Z" },
      { "status": "CONFIRMED", "createdAt": "2024-01-14T11:00:00Z" },
      { "status": "PICKED_UP", "createdAt": "2024-01-15T09:00:00Z" }
    ]
  }
]
```

---

### 3. Test Tracking (MongoDB)

```bash
curl -X GET http://localhost:3000/api/tracking/live/1 \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected Response** (MongoDB live_tracking):

```json
{
  "vehicleId": 1,
  "location": {
    "latitude": 40.7128,
    "longitude": -74.006,
    "address": "5th Avenue, NYC"
  },
  "speed": 45.5,
  "heading": 180,
  "battery": 87,
  "ignition": true,
  "timestamp": "2024-01-15T15:45:23Z"
}
```

---

### 4. Test Audit Logs (MongoDB)

```bash
curl -X GET http://localhost:3000/api/analytics/audit-logs \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**Expected Response** (MongoDB audit_logs):

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "userId": 1,
    "action": "LOGIN",
    "resourceType": "user",
    "createdAt": "2024-01-15T10:30:00Z",
    "statusCode": 200
  }
]
```

---

## Common Issues & Solutions

| Issue                     | Root Cause                             | Solution                                              |
| ------------------------- | -------------------------------------- | ----------------------------------------------------- |
| Login fails               | PostgreSQL not connected               | Check DATABASE_URL in .env                            |
| Shipment timeline missing | MongoDB not connected                  | Check MONGODB_URI in .env                             |
| Real-time tracking lag    | MongoDB geospatial index missing       | Create 2dsphere index on live_tracking.location       |
| Audit logs not appearing  | MongoDB audit middleware not triggered | Ensure audit.js middleware is imported in controllers |
| TTL indexes not working   | MongoDB capped collections not used    | Verify ttl field exists in documents                  |

---

## Architecture Summary

```
╔════════════════════════════════════════════════════════════════╗
║                    LOGIMETRICS DATABASE ARCHITECTURE            ║
╚════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                           │
│              (React + Vite on port 5173)                        │
│  ├─ LoginPage (Login Form)                                      │
│  ├─ AdminDashboard (Shipments, Vehicles, Drivers)              │
│  └─ Maps (Real-time Tracking from MongoDB)                      │
└────────────────┬──────────────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  REST API      │
         │ :3000/api/*    │
         └───────┬────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼──────────┐      ┌──────▼────────┐
│  PostgreSQL  │      │   MongoDB     │
│ (Relational) │      │  (Document)   │
│              │      │               │
│ • Users      │      │ • Audit Logs  │
│ • Roles      │      │ • Events      │
│ • Companies  │      │ • Tracking    │
│ • Vehicles   │      │ • Telemetry   │
│ • Shipments  │      │               │
│ • Invoices   │      │ TTL: 30-90 d  │
│ • Routes     │      └───────────────┘
│ • Pricing    │
│              │
│ Permanent    │
│ Storage      │
└──────────────┘
```
