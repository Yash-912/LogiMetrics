# Database Schema Guide: PostgreSQL vs MongoDB

## Overview

LogiMetrics uses a hybrid database approach:

- **PostgreSQL**: Operational data, transactions, master records
- **MongoDB**: Event logs, real-time tracking, analytics, audit trails

---

## PostgreSQL Database Structure

### Primary Database: `logi_matrix_postgresql_db`

**Host**: Neon.tech (ep-raspy-morning-ahcjg5vl-pooler.c-3.us-east-1.aws.neon.tech)

### Core Tables

#### 1. **Users & Authentication**

```sql
TABLE: users
├── id (UUID)
├── company_id (UUID, FK)
├── email (VARCHAR, UNIQUE)
├── password (VARCHAR, hashed)
├── first_name, last_name (VARCHAR)
├── phone (VARCHAR)
├── role (VARCHAR) - super_admin, admin, manager, dispatcher, driver, customer
├── status (ENUM) - active, inactive, suspended
├── is_email_verified (BOOLEAN)
├── timezone, language (VARCHAR)
├── preferences (JSON)
├── metadata (JSON)
├── created_at, updated_at (TIMESTAMP)

TABLE: roles
├── id (UUID)
├── name (VARCHAR) - super_admin, admin, manager, dispatcher, driver, customer
├── display_name (VARCHAR)
├── description (TEXT)
├── is_system (BOOLEAN)
├── level (INTEGER) - 100 super_admin, 80 admin, 60 manager, 40 dispatcher, 20 driver, 10 customer

TABLE: permissions
├── id (UUID)
├── resource (VARCHAR) - user, company, shipment, vehicle, driver, route, invoice, payment, etc.
├── action (VARCHAR) - create, read, update, delete, manage
├── description (TEXT)

TABLE: user_roles
├── id (UUID)
├── user_id (UUID, FK)
├── role_id (UUID, FK)
├── created_at (TIMESTAMP)
```

#### 2. **Company Management**

```sql
TABLE: companies
├── id (UUID)
├── name (VARCHAR)
├── email (VARCHAR)
├── phone (VARCHAR)
├── website (VARCHAR)
├── address, city, state, country, postal_code (VARCHAR)
├── tax_id, gstin (VARCHAR)
├── industry (VARCHAR)
├── size (ENUM) - small, medium, large, enterprise
├── subscription_plan (VARCHAR) - free, starter, professional, enterprise
├── subscription_status (VARCHAR) - active, inactive, expired
├── subscription_expires_at (TIMESTAMP)
├── status (VARCHAR) - active, inactive, suspended
├── settings (JSON)
├── created_at, updated_at (TIMESTAMP)

TABLE: company_settings
├── id (UUID)
├── company_id (UUID, FK)
├── timezone, currency (VARCHAR)
├── date_format, distance_unit, weight_unit (VARCHAR)
├── notifications, branding, invoice_settings (JSON)
├── created_at, updated_at (TIMESTAMP)
```

#### 3. **Fleet Management**

```sql
TABLE: vehicles
├── id (UUID)
├── company_id (UUID, FK)
├── registration_number (VARCHAR, UNIQUE)
├── vehicle_type (VARCHAR) - truck, van, car, bike, trailer
├── make, model, year (VARCHAR)
├── capacity (DECIMAL) - max weight
├── fuel_type (VARCHAR) - petrol, diesel, electric, hybrid
├── status (VARCHAR) - active, inactive, maintenance, retired
├── current_location (POINT/GEOMETRY)
├── tracking_device_id (VARCHAR)
├── insurance_expiry (DATE)
├── registration_expiry (DATE)
├── purchase_date (DATE)
├── metadata (JSON)
├── created_at, updated_at (TIMESTAMP)

TABLE: drivers
├── id (UUID)
├── company_id (UUID, FK)
├── user_id (UUID, FK)
├── license_number (VARCHAR, UNIQUE)
├── license_expiry (DATE)
├── date_of_birth (DATE)
├── phone (VARCHAR)
├── address (TEXT)
├── status (VARCHAR) - active, inactive, on_leave, suspended
├── assigned_vehicle_id (UUID, FK)
├── current_location (POINT/GEOMETRY)
├── total_trips (INTEGER)
├── total_distance (DECIMAL)
├── rating (DECIMAL 0-5)
├── metadata (JSON)
├── created_at, updated_at (TIMESTAMP)
```

#### 4. **Shipment & Routing**

```sql
TABLE: shipments
├── id (UUID)
├── company_id (UUID, FK)
├── tracking_id (VARCHAR, UNIQUE)
├── order_number (VARCHAR)
├── customer_id (UUID, FK)
├── sender_address (TEXT)
├── receiver_address (TEXT)
├── pickup_date (TIMESTAMP)
├── delivery_date (TIMESTAMP)
├── status (VARCHAR) - pending, confirmed, picked_up, in_transit, delivered, cancelled
├── weight (DECIMAL)
├── dimensions (JSON) - length, width, height
├── items_count (INTEGER)
├── special_handling (VARCHAR)
├── metadata (JSON)
├── created_at, updated_at (TIMESTAMP)

TABLE: routes
├── id (UUID)
├── company_id (UUID, FK)
├── name (VARCHAR)
├── vehicle_id (UUID, FK)
├── driver_id (UUID, FK)
├── start_location (POINT/GEOMETRY)
├── end_location (POINT/GEOMETRY)
├── planned_distance (DECIMAL)
├── actual_distance (DECIMAL)
├── estimated_duration (INTEGER) - minutes
├── actual_duration (INTEGER) - minutes
├── status (VARCHAR) - planned, in_progress, completed, cancelled
├── scheduled_date (DATE)
├── completed_date (DATE)
├── waypoints (JSON)
├── metadata (JSON)
├── created_at, updated_at (TIMESTAMP)
```

#### 5. **Billing & Payments**

```sql
TABLE: invoices
├── id (UUID)
├── company_id (UUID, FK)
├── invoice_number (VARCHAR, UNIQUE)
├── customer_id (UUID, FK)
├── total_amount (DECIMAL)
├── tax_amount (DECIMAL)
├── net_amount (DECIMAL)
├── currency (VARCHAR)
├── issue_date (DATE)
├── due_date (DATE)
├── paid_date (DATE)
├── status (VARCHAR) - draft, issued, partial, paid, overdue, cancelled
├── payment_terms (VARCHAR)
├── metadata (JSON)
├── created_at, updated_at (TIMESTAMP)

TABLE: payments
├── id (UUID)
├── invoice_id (UUID, FK)
├── company_id (UUID, FK)
├── amount (DECIMAL)
├── currency (VARCHAR)
├── payment_method (VARCHAR) - card, bank_transfer, cash, cheque, upi
├── transaction_id (VARCHAR)
├── status (VARCHAR) - pending, success, failed, refunded
├── payment_date (TIMESTAMP)
├── gateway (VARCHAR) - razorpay, stripe, custom
├── metadata (JSON)
├── created_at, updated_at (TIMESTAMP)
```

#### 6. **Documents & Notifications**

```sql
TABLE: documents
├── id (UUID)
├── company_id (UUID, FK)
├── document_type (VARCHAR) - invoice, receipt, po, manifest, waybill
├── shipment_id (UUID, FK)
├── file_path (VARCHAR)
├── file_size (INTEGER)
├── mime_type (VARCHAR)
├── status (VARCHAR) - draft, published, archived
├── metadata (JSON)
├── created_at, updated_at (TIMESTAMP)

TABLE: notifications
├── id (UUID)
├── user_id (UUID, FK)
├── company_id (UUID, FK)
├── type (VARCHAR) - shipment, payment, system, alert
├── title, message (VARCHAR, TEXT)
├── is_read (BOOLEAN)
├── read_at (TIMESTAMP)
├── action_url (VARCHAR)
├── created_at, updated_at (TIMESTAMP)
```

---

## MongoDB Database Structure

### Primary Database: `logi_matrix`

### Collections (Event & Analytics Data)

#### 1. **AuditLog Collection**

```javascript
{
  _id: ObjectId,
  userId: String,
  userEmail: String,
  userRole: String,
  companyId: String,
  action: String, // login, logout, create, update, delete, etc.
  resource: String, // user, shipment, vehicle, etc.
  resourceId: String,
  description: String,
  previousValue: Mixed,
  newValue: Mixed,
  changes: [
    { field: String, oldValue: Mixed, newValue: Mixed }
  ],
  ipAddress: String,
  userAgent: String,
  requestMethod: String, // GET, POST, PUT, DELETE
  requestPath: String,
  statusCode: Number,
  responseTime: Number, // milliseconds
  success: Boolean,
  errorMessage: String,
  metadata: Object,
  timestamp: Date, // indexed for queries
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - { userId: 1, timestamp: -1 }
// - { companyId: 1, timestamp: -1 }
// - { action: 1, timestamp: -1 }
// - { resource: 1, resourceId: 1, timestamp: -1 }
```

#### 2. **LiveTracking Collection**

```javascript
{
  _id: ObjectId,
  vehicleId: String, // indexed
  driverId: String, // indexed
  shipmentId: String, // indexed
  coordinates: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  speed: Number, // km/h
  heading: Number, // 0-360 degrees
  accuracy: Number, // meters
  altitude: Number,
  address: String,
  batteryLevel: Number, // 0-100
  isMoving: Boolean,
  ignitionStatus: String, // on, off, unknown
  metadata: Object,
  timestamp: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - { vehicleId: 1, timestamp: -1 }
// - { shipmentId: 1, timestamp: -1 }
// - { coordinates: "2dsphere" } // geospatial
// - { timestamp: 1 } with TTL (30 days expiration)
```

#### 3. **ShipmentEvent Collection**

```javascript
{
  _id: ObjectId,
  shipmentId: String, // indexed
  trackingId: String, // indexed
  eventType: String, // created, picked_up, in_transit, delivered, etc.
  status: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude],
    address: String,
    city: String,
    state: String
  },
  description: String,
  notes: String,
  performedBy: {
    userId: String,
    name: String,
    role: String
  },
  attachments: [
    {
      type: String, // image, document, signature
      url: String,
      name: String
    }
  ],
  metadata: Object,
  isPublic: Boolean, // visible to customers
  timestamp: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - { shipmentId: 1, timestamp: -1 }
// - { trackingId: 1, timestamp: -1 }
// - { eventType: 1, timestamp: -1 }
```

#### 4. **VehicleTelemetry Collection**

```javascript
{
  _id: ObjectId,
  vehicleId: String, // indexed
  driverId: String,
  telemetryType: String, // fuel_level, speed, rpm, temperature, etc.
  value: Mixed,
  unit: String,
  location: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  isAlert: Boolean,
  alertType: String, // warning, critical
  alertMessage: String,
  metadata: Object,
  timestamp: Date,
  createdAt: Date,
  updatedAt: Date
}

// Indexes:
// - { vehicleId: 1, telemetryType: 1, timestamp: -1 }
// - { isAlert: 1, timestamp: -1 }
// - { timestamp: 1 } with TTL (90 days expiration)
```

#### 5. **init_test Collection** (Created during setup)

```javascript
{
  _id: ObjectId,
  message: "Hello World",
  createdAt: Date
}
```

---

## Data Distribution

### What Goes in PostgreSQL (Operational Data)

✅ **Master Records** - Users, Vehicles, Drivers, Companies
✅ **Transactions** - Shipments, Routes, Invoices, Payments
✅ **Configuration** - Roles, Permissions, Settings
✅ **Documents** - Files, PDFs, Certificates
✅ **Structured Queries** - Complex joins, reports

### What Goes in MongoDB (Event/Analytics Data)

✅ **Event Timeline** - Shipment events, driver actions, user activities
✅ **Real-time Tracking** - Live vehicle locations, GPS coordinates
✅ **Telemetry** - Vehicle metrics, temperature, fuel, speed
✅ **Audit Trail** - Complete audit log of all system actions
✅ **Time-series Data** - Data with automatic expiration (TTL)
✅ **Flexible Schemas** - Logs that may vary in structure

---

## Current Data Status

### PostgreSQL Status: ✅ **Ready for Seeding**

Empty tables with schema in place. Need to run seeders:

```bash
npm run migrate    # Create tables
npm run seed       # Populate seed data
```

### MongoDB Status: ⚠️ **Collections Created, Empty**

Collections exist with proper indexes, but no data yet. Will be populated when:

1. **AuditLog**: User login/actions occur
2. **LiveTracking**: Drivers start deliveries and enable tracking
3. **ShipmentEvent**: Shipments are created and status changes
4. **VehicleTelemetry**: Vehicles send telemetry data

---

## Data Population Strategy

### Phase 1: PostgreSQL Seed Data (Run Once)

```bash
cd backend
npm run seed
```

This creates:

- **Roles & Permissions** - 7 roles with 65 permissions
- **Super Admin User** - email: admin@logimetrics.com
- **Demo Company** - LogiMetrics Demo Company
- **Demo Users** - admin, manager, dispatcher, drivers, customers
- **Demo Vehicles** - 5 vehicles with different types
- **Demo Drivers** - 8 drivers with assignments
- **Demo Routes** - 5 sample routes
- **Demo Shipments** - 20 sample shipments with statuses
- **Demo Invoices** - 10 invoices with various statuses
- **Pricing Rules** - Configurable pricing

### Phase 2: MongoDB Real-time Data (Auto-generated)

MongoDB collections auto-populate when:

1. Users perform actions → **AuditLog**
2. Drivers enable tracking → **LiveTracking**
3. Shipment status changes → **ShipmentEvent**
4. Vehicles send data → **VehicleTelemetry**

### Phase 3: Manual API Testing (Optional)

```bash
POST /api/auth/login
  { "email": "admin@logimetrics.com", "password": "Admin@123456" }

GET /api/shipments
  → Creates audit log in MongoDB

PATCH /api/shipments/:id
  { "status": "in_transit" }
  → Creates shipment event in MongoDB
```

---

## Environment Configuration

### .env Settings

```env
# PostgreSQL
DATABASE_URL=postgresql://neondb_owner:npg_YI7VfsdAbOx4@...

# MongoDB (Atlas)
MONGODB_URI=mongodb+srv://sagacitychess_db_user:pOU7R8EwhrsErudP@...

# Admin Credentials
ADMIN_EMAIL=admin@logimetrics.com
ADMIN_PASSWORD=Admin@123456
```

---

## Quick Start

1. **Verify Connections**

   ```bash
   npm run dev
   # Check: "Step 1: PostgreSQL connected"
   # Check: "Step 2: MongoDB connected"
   ```

2. **Populate PostgreSQL**

   ```bash
   npm run migrate
   npm run seed
   ```

3. **Verify Data**

   ```bash
   # PostgreSQL: Check users, companies, vehicles
   # MongoDB: Will auto-populate on API usage
   ```

4. **Login & Test**
   ```
   Email: admin@logimetrics.com
   Password: Admin@123456
   ```

---

## Summary

| Aspect               | PostgreSQL                 | MongoDB                          |
| -------------------- | -------------------------- | -------------------------------- |
| **Purpose**          | Operational Data           | Event/Analytics                  |
| **Data Type**        | Structured, Transactional  | Time-series, Event-based         |
| **Current State**    | Ready for seeding          | Empty, auto-populates            |
| **Seeding**          | Manual (npm run seed)      | Automatic (on API usage)         |
| **Query Complexity** | Complex joins, reports     | Simple lookups, time-range       |
| **Data Retention**   | Indefinite                 | TTL (30-90 days)                 |
| **Examples**         | Users, Shipments, Invoices | Audit logs, GPS tracking, Events |
