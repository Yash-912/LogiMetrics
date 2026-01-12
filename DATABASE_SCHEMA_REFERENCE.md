# Database Schema & Relationships - Complete Reference

## PostgreSQL Schema Overview

### 1. Users & Authentication Tables

```
┌─────────────────────────────────────────────────────┐
│                     users                           │
├─────────────────────────────────────────────────────┤
│ id (PK)                                             │
│ email (UNIQUE)                                      │
│ password_hash                                       │
│ first_name                                          │
│ last_name                                           │
│ phone                                               │
│ avatar_url                                          │
│ is_active (boolean)                                 │
│ last_login_at (timestamp)                           │
│ created_at (timestamp)                              │
│ updated_at (timestamp)                              │
│ deleted_at (timestamp - soft delete)                │
│ role_id (FK) ──┐                                    │
│ company_id (FK) ├──────────────────────────────┐   │
└─────────────────────────────────────────────────┼───┘
                                                  │
           ┌──────────────────────────────────────┘
           │
        ┌──▼────────────────────────────────────┐
        │             roles                     │
        ├───────────────────────────────────────┤
        │ id (PK)                               │
        │ name (super_admin, admin, etc)        │
        │ description                           │
        │ created_at                            │
        │ updated_at                            │
        └───────────────────────────────────────┘
           ▲
           │ (many-to-many via user_roles)
           │
        ┌──┴────────────────────────────────────┐
        │          user_roles                   │
        ├───────────────────────────────────────┤
        │ user_id (FK) → users.id               │
        │ role_id (FK) → roles.id               │
        │ assigned_at (timestamp)               │
        └───────────────────────────────────────┘
           ▲
           │ (many-to-many via role_permissions)
           │
        ┌──┴────────────────────────────────────┐
        │         permissions                   │
        ├───────────────────────────────────────┤
        │ id (PK)                               │
        │ resource (shipment, vehicle, etc)     │
        │ action (create, read, update, delete) │
        │ description                           │
        └───────────────────────────────────────┘


┌─────────────────────────────────────────────────────┐
│               role_permissions                      │
├─────────────────────────────────────────────────────┤
│ role_id (FK) → roles.id                             │
│ permission_id (FK) → permissions.id                 │
│ granted_at (timestamp)                              │
│ granted_by_user_id (FK) → users.id                  │
└─────────────────────────────────────────────────────┘
```

**Sample Data**:

```
Users:
├── ID: 1, Email: admin@logimetrics.com, Role: super_admin, Company: 1
├── ID: 2, Email: manager@logimetrics.com, Role: admin, Company: 1
├── ID: 3, Email: dispatcher@logimetrics.com, Role: dispatcher, Company: 1
└── ID: 4, Email: driver@logimetrics.com, Role: driver, Company: 1

Roles (7 total):
├── super_admin (all permissions)
├── admin (company-level management)
├── manager (team management)
├── dispatcher (shipment assignment)
├── driver (shipment tracking)
├── customer (view own shipments)
└── user (basic access)

Permissions (77 total):
├── shipments.create
├── shipments.read
├── shipments.update
├── shipments.delete
├── vehicles.create
├── vehicles.read
├── ... (continued for all resources)
```

---

### 2. Company & Organization Tables

```
┌──────────────────────────────────────┐
│          companies                   │
├──────────────────────────────────────┤
│ id (PK)                              │
│ name                                 │
│ tax_id                               │
│ registration_number                  │
│ phone                                │
│ email                                │
│ address                              │
│ city                                 │
│ state                                │
│ country                              │
│ postal_code                          │
│ website                              │
│ industry                             │
│ employee_count                       │
│ annual_revenue (DECIMAL)             │
│ status (active, inactive)            │
│ logo_url                             │
│ settings (JSON)                      │
│ created_at                           │
│ updated_at                           │
│ deleted_at                           │
└──────────────────────────────────────┘
        ▲
        │ (1:N relationship)
        │
        └─────────────────────┐
                              │
┌─────────────────────────────▼──────┐
│        company_settings            │
├────────────────────────────────────┤
│ id (PK)                            │
│ company_id (FK)                    │
│ setting_key                        │
│ setting_value                      │
│ data_type (string, number, bool)   │
│ updated_at                         │
└────────────────────────────────────┘

Sample Data:
Company: LogiMetrics Demo Company
├── ID: 1
├── Email: info@logimetrics.com
├── Phone: +91-9876543210
├── Address: 123 Logistics Street, Mumbai
├── Status: active
└── Settings:
    ├── currency: "INR"
    ├── timezone: "Asia/Kolkata"
    ├── max_shipments_per_day: 100
    └── auto_invoice_enabled: true
```

---

### 3. Fleet Management Tables

```
┌───────────────────────────────────────────┐
│            vehicles                       │
├───────────────────────────────────────────┤
│ id (PK)                                   │
│ company_id (FK) → companies.id            │
│ license_plate (UNIQUE)                    │
│ vehicle_type (truck, van, car)            │
│ make                                      │
│ model                                     │
│ year                                      │
│ color                                     │
│ vin (Vehicle Identification Number)       │
│ registration_number                       │
│ capacity_weight (kg)                      │
│ capacity_volume (m³)                      │
│ status (active, maintenance, retired)     │
│ purchase_date                             │
│ last_service_date                         │
│ next_service_date                         │
│ odometer_reading (km)                     │
│ gps_device_id                             │
│ metadata (JSON)                           │
│ created_at                                │
│ updated_at                                │
│ deleted_at                                │
└───────────────────────────────────────────┘
        ▲
        │ (1:N)
        │
        └──────────────────────┐
                               │
┌──────────────────────────────▼──────────┐
│             drivers                     │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ company_id (FK)                         │
│ user_id (FK) → users.id                 │
│ license_number                          │
│ license_type (LMV, HMV)                 │
│ license_expiry                          │
│ date_of_birth                           │
│ phone                                   │
│ address                                 │
│ aadhar_number                           │
│ pan_number                              │
│ current_vehicle_id (FK) ──┐             │
│ status (available, on_duty) │           │
│ hire_date                   │           │
│ experience_years            │           │
│ emergency_contact           │           │
│ created_at                  │           │
│ updated_at                  │           │
│ deleted_at                  │           │
└─────────────────────────────┼───────────┘
                              │
                    ┌─────────┘
                    │
        ┌───────────▼──────────────┐
        │   Vehicle-Driver Link    │
        │   (Many-to-Many with     │
        │    time period)          │
        └────────────────────────┬─┘
                                  │
Sample Data:
Vehicles (3 total):
├── ID: 1, Plate: ABC123, Type: truck, Capacity: 5000kg, Status: active
├── ID: 2, Plate: XYZ789, Type: van, Capacity: 2000kg, Status: active
└── ID: 3, Plate: PQR456, Type: car, Capacity: 500kg, Status: active

Drivers (3 total):
├── ID: 1, Name: John Driver, License: DL-001, Vehicle: ABC123, Status: available
├── ID: 2, Name: Jane Driver, License: DL-002, Vehicle: XYZ789, Status: on_duty
└── ID: 3, Name: Bob Courier, License: DL-003, Vehicle: PQR456, Status: available
```

---

### 4. Routes & Locations

```
┌───────────────────────────────────┐
│          locations                │
├───────────────────────────────────┤
│ id (PK)                           │
│ company_id (FK)                   │
│ name                              │
│ type (pickup, delivery, hub)      │
│ latitude (DECIMAL 10,8)           │
│ longitude (DECIMAL 11,8)          │
│ address                           │
│ city                              │
│ state                             │
│ country                           │
│ postal_code                       │
│ contact_name                      │
│ contact_phone                     │
│ contact_email                     │
│ operating_hours (JSON)            │
│ created_at                        │
│ updated_at                        │
└───────────────────────────────────┘
        ▲
        │ (1:N)
        │
        └──────────────────────┐
                               │
┌──────────────────────────────▼──────────┐
│            routes                       │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ company_id (FK)                         │
│ name                                    │
│ source_location_id (FK) ────────┐       │
│ destination_location_id (FK) ───┼─┐    │
│ distance (km)                   │ │    │
│ estimated_duration (minutes)    │ │    │
│ frequency (daily, weekly)       │ │    │
│ stops (JSON array)              │ │    │
│ optimal_path (GeoJSON)          │ │    │
│ created_at                      │ │    │
│ updated_at                      │ │    │
└─────────────────────────────────┼─┼────┘
                                  │ │
                                  └─┴──── references locations

Sample Data:
Locations:
├── Hub A: 40.7128°N, -74.0060°W (NYC)
├── Hub B: 34.0522°N, -118.2437°W (LA)
└── Hub C: 41.8781°N, -87.6298°W (Chicago)

Routes:
├── NYC → LA: 4000km, 45 hours
├── LA → Chicago: 2000km, 24 hours
└── Chicago → NYC: 1000km, 12 hours
```

---

### 5. Shipment & Logistics Tables

```
┌──────────────────────────────────────────┐
│           shipments                      │
├──────────────────────────────────────────┤
│ id (PK)                                  │
│ company_id (FK) → companies.id           │
│ shipment_number (UNIQUE)                 │
│ status (pending, confirmed, in_transit,  │
│         delivered, cancelled)            │
│ source_location_id (FK) ─────┐          │
│ destination_location_id (FK) ├──┐       │
│ route_id (FK) → routes.id    │  │       │
│ vehicle_id (FK) → vehicles.id│  │       │
│ driver_id (FK) → drivers.id  │  │       │
│ pickup_time                  │  │       │
│ delivery_time                │  │       │
│ actual_delivery_time         │  │       │
│ total_weight (kg)            │  │       │
│ total_volume (m³)            │  │       │
│ cost (DECIMAL)               │  │       │
│ special_instructions (TEXT)  │  │       │
│ reference_number             │  │       │
│ customer_id                  │  │       │
│ created_at                   │  │       │
│ updated_at                   │  │       │
│ deleted_at                   │  │       │
└──────────────────────────────┼──┼───────┘
                               │  │
                       ┌───────┴──┴─────────┐
                       │                   │
    ┌──────────────────▼─┐    ┌───────────▼──────┐
    │   waypoints        │    │   locations      │
    ├────────────────────┤    ├──────────────────┤
    │ id (PK)            │    │ (already shown)  │
    │ shipment_id (FK)   │    └──────────────────┘
    │ location_id (FK) ──┘
    │ sequence_number    │
    │ arrival_time       │
    │ departure_time     │
    │ status             │
    │ notes              │
    │ created_at         │
    └────────────────────┘

Sample Data:
Shipments (5 total):
├── SHP-001: Mumbai → Bangalore, Status: in_transit, Driver: John, Vehicle: ABC123
├── SHP-002: Bangalore → Chennai, Status: pending, Unassigned
├── SHP-003: Chennai → Hyderabad, Status: confirmed, Driver: Jane, Vehicle: XYZ789
├── SHP-004: Hyderabad → Mumbai, Status: delivered, Driver: Bob, Vehicle: PQR456
└── SHP-005: Mumbai → Pune, Status: cancelled

Waypoints:
├── SHP-001 Waypoint 1: Delhi (arrival: 12:00, departure: 12:30)
├── SHP-001 Waypoint 2: Agra (arrival: 14:00, departure: 14:30)
└── SHP-001 Waypoint 3: Bangalore (arrival: 18:00)
```

---

### 6. Invoicing & Payments

```
┌──────────────────────────────────────────┐
│           invoices                       │
├──────────────────────────────────────────┤
│ id (PK)                                  │
│ company_id (FK)                          │
│ invoice_number (UNIQUE)                  │
│ shipment_id (FK) → shipments.id          │
│ customer_id (FK) → users.id              │
│ issued_to_name                           │
│ issued_to_email                          │
│ subtotal (DECIMAL)                       │
│ tax_amount (DECIMAL)                     │
│ discount_amount (DECIMAL)                │
│ total_amount (DECIMAL)                   │
│ status (draft, sent, paid, overdue)      │
│ issue_date                               │
│ due_date                                 │
│ paid_date                                │
│ payment_terms (net30, net60)             │
│ notes (TEXT)                             │
│ attachment_url                           │
│ created_at                               │
│ updated_at                               │
│ deleted_at                               │
└──────────────────────────────────────────┘
        ▲
        │ (1:N)
        │
        └──────────────────────┐
                               │
┌──────────────────────────────▼──────────┐
│           invoice_items                 │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ invoice_id (FK)                         │
│ description                             │
│ quantity                                │
│ unit_price (DECIMAL)                    │
│ total_price (DECIMAL)                   │
│ tax_rate (%)                            │
│ created_at                              │
│ updated_at                              │
└─────────────────────────────────────────┘
        ▲
        │
        │
┌───────┴─────────────────────────────────┐
│          transactions                   │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ invoice_id (FK)                         │
│ amount (DECIMAL)                        │
│ payment_method (bank, card, cash)       │
│ status (pending, completed, failed)     │
│ transaction_id (external payment gateway)
│ notes                                   │
│ transaction_date                        │
│ created_at                              │
│ updated_at                              │
└─────────────────────────────────────────┘

Sample Data:
Invoices (10 total):
├── INV-001: Amount: ₹5,000, Status: paid, Date: 2024-01-10
├── INV-002: Amount: ₹8,500, Status: paid, Date: 2024-01-11
├── INV-003: Amount: ₹3,200, Status: pending, Date: 2024-01-12
├── INV-004: Amount: ₹6,800, Status: overdue, Date: 2024-01-05
└── ... (5 more)

Pricing Rules (13 total):
├── Distance-based: ₹10/km
├── Weight-based: ₹5/kg
├── Volume-based: ₹100/m³
├── Truck surcharge: +20%
├── Van surcharge: +10%
└── ... (8 more)
```

---

### 7. Documents & Files

```
┌──────────────────────────────────────────┐
│          documents                       │
├──────────────────────────────────────────┤
│ id (PK)                                  │
│ company_id (FK)                          │
│ name                                     │
│ document_type (contract, license, etc)   │
│ file_url (S3 path)                       │
│ file_size (bytes)                        │
│ mime_type (pdf, docx, etc)               │
│ uploaded_by_user_id (FK) → users.id      │
│ uploaded_date                            │
│ expiry_date                              │
│ status (active, expired, archived)       │
│ metadata (JSON)                          │
│ created_at                               │
│ updated_at                               │
│ deleted_at                               │
└──────────────────────────────────────────┘
        ▲
        │ (1:N)
        │
        └──────────────────────┐
                               │
┌──────────────────────────────▼──────────┐
│            certificates                 │
├─────────────────────────────────────────┤
│ id (PK)                                 │
│ certificate_type (insurance, license)   │
│ issue_date                              │
│ expiry_date                             │
│ certificate_number                      │
│ issued_by                               │
│ document_id (FK)                        │
│ created_at                              │
│ updated_at                              │
└─────────────────────────────────────────┘

Sample Data:
Documents:
├── Vehicle Insurance: ABC123, Valid until 2025-01-15
├── Driver License: John, Valid until 2026-12-31
├── Company Registration: Valid until 2025-06-30
└── ... (more)

Certificates:
├── Vehicle ABC123: Insurance cert, Valid until 2025-01-15
├── Driver John: License cert, Valid until 2026-12-31
└── Company: Reg cert, Valid until 2025-06-30
```

---

## MongoDB Collections Overview

### 1. Audit Logs Collection

```javascript
// Collection: audit_logs
// TTL: 90 days

{
  _id: ObjectId("507f1f77bcf86cd799439011"),

  // User Info
  userId: 1,
  userEmail: "admin@logimetrics.com",
  userName: "Admin User",

  // Action Details
  action: "LOGIN" | "CREATE" | "UPDATE" | "DELETE" | "READ",
  resourceType: "user" | "shipment" | "vehicle" | "driver" | "invoice",
  resourceId: "1", // e.g., user_id, shipment_id
  resourceName: "SHP-001",

  // Data Changes
  oldValues: {
    status: "pending"
  },
  newValues: {
    status: "confirmed"
  },

  // Request Context
  ipAddress: "192.168.1.100",
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  httpMethod: "POST" | "GET" | "PUT" | "DELETE",
  endpoint: "/api/shipments/1/status",
  statusCode: 200 | 400 | 401 | 500,
  responseTime: 234, // milliseconds

  // Timestamps
  createdAt: ISODate("2024-01-15T10:30:00Z"),
  expiresAt: ISODate("2024-04-15T10:30:00Z") // TTL field
}
```

**Sample Records (20 total)**:

```javascript
[
  {
    action: "LOGIN",
    userId: 1,
    statusCode: 200,
    createdAt: "2024-01-15T10:30:00Z",
  },
  {
    action: "CREATE",
    resourceType: "shipment",
    resourceId: "1",
    statusCode: 201,
  },
  {
    action: "UPDATE",
    resourceType: "shipment",
    resourceId: "1",
    statusCode: 200,
  },
  { action: "READ", resourceType: "shipments", statusCode: 200 },
  // ... 16 more records
];
```

---

### 2. Shipment Events Collection

```javascript
// Collection: shipment_events
// TTL: 30 days (after delivery + 30 days)

{
  _id: ObjectId("507f1f77bcf86cd799439012"),

  // Shipment Reference
  shipmentId: 1,
  shipmentNumber: "SHP-001",
  companyId: 1,

  // Event Details
  status: "CREATED" | "CONFIRMED" | "PICKED_UP" | "IN_TRANSIT" | "DELIVERED" | "FAILED" | "CANCELLED",
  previousStatus: "PENDING",

  // Location
  location: {
    latitude: 40.7128,
    longitude: -74.0060,
    address: "123 Main Street, New York, NY 10001",
    city: "New York",
    state: "NY",
    country: "USA",
    postalCode: "10001",
    placeId: "ChIJ..." // Google Maps place ID
  },

  // Driver & Vehicle
  driver: {
    driverId: 1,
    name: "John Driver",
    phone: "9876543210",
    licenseNumber: "DL-001"
  },
  vehicle: {
    vehicleId: 1,
    licensePlate: "ABC123",
    type: "truck",
    model: "Tata 2518"
  },

  // Event Details
  notes: "Picked up from warehouse",
  temperature: 25, // °C, for cold chain tracking
  humidity: 60, // %, for sensitive goods
  photos: [
    {
      url: "https://s3.amazonaws.com/...",
      caption: "Pick up completed",
      timestamp: ISODate("2024-01-15T09:00:00Z")
    }
  ],
  signatureUrl: "https://s3.amazonaws.com/...",
  recipientName: "John Smith",

  // Metadata
  duration: 45, // minutes since last event
  distanceTraveled: 25, // km since last event

  // Timestamps
  createdAt: ISODate("2024-01-15T09:00:00Z"),
  updatedAt: ISODate("2024-01-15T09:00:00Z"),
  expiresAt: ISODate("2024-02-14T09:00:00Z") // TTL field
}
```

**Event Timeline Example (SHP-001)**:

```javascript
[
  {
    status: "CREATED",
    timestamp: "2024-01-14T10:00:00Z",
    location: "Warehouse A",
  },
  { status: "CONFIRMED", timestamp: "2024-01-14T11:00:00Z", driver: "John" },
  { status: "PICKED_UP", timestamp: "2024-01-15T09:00:00Z", vehicle: "ABC123" },
  { status: "IN_TRANSIT", timestamp: "2024-01-15T14:30:00Z", location: "NYC" },
  {
    status: "DELIVERED",
    timestamp: "2024-01-15T18:00:00Z",
    location: "Customer",
  },
];
```

---

### 3. Live Tracking Collection

```javascript
// Collection: live_tracking
// TTL: 30 days
// Indexes: { location: "2dsphere" } for geospatial queries

{
  _id: ObjectId("507f1f77bcf86cd799439013"),

  // References
  vehicleId: 1,
  driverId: 1,
  shipmentId: 1,
  companyId: 1,

  // Location (GeoJSON format for geospatial queries)
  location: {
    type: "Point",
    coordinates: [-74.0060, 40.7128] // [longitude, latitude]
  },
  address: "5th Avenue, New York",
  city: "New York",
  state: "NY",
  country: "USA",

  // Movement Data
  speed: 45.5, // km/h
  heading: 180, // degrees (0-360), 180 = South
  altitude: 25, // meters above sea level
  accuracy: 8, // GPS accuracy in meters (lower is better)

  // Vehicle Status
  battery: 87, // percentage
  ignition: true, // engine on/off
  odometer: 25430, // total kilometers
  rpm: 2100, // engine rotations per minute
  fuelLevel: 75, // percentage

  // Connectivity
  gpsSignal: "strong", // "strong" | "medium" | "weak" | "no_signal"
  cellSignal: -95, // dBm (lower is weaker)
  lastUpdateTime: ISODate("2024-01-15T15:45:23Z"),

  // Timestamps
  createdAt: ISODate("2024-01-15T15:45:23Z"),
  expiresAt: ISODate("2024-02-14T15:45:23Z") // TTL field (30 days)
}
```

**Sample Records (15 total)**:

```javascript
// Vehicle ABC123 tracking history
[
  {
    vehicleId: 1,
    location: { coordinates: [-74.006, 40.7128] },
    speed: 0,
    ignition: false,
  },
  {
    vehicleId: 1,
    location: { coordinates: [-74.005, 40.7125] },
    speed: 15,
    ignition: true,
  },
  {
    vehicleId: 1,
    location: { coordinates: [-74.003, 40.71] },
    speed: 45,
    ignition: true,
  },
  // ... continuing updates
  {
    vehicleId: 2,
    location: { coordinates: [-87.6298, 41.8781] },
    speed: 55,
    ignition: true,
  },
  {
    vehicleId: 3,
    location: { coordinates: [-118.2437, 34.0522] },
    speed: 0,
    ignition: false,
  },
];
```

---

### 4. Vehicle Telemetry Collection

```javascript
// Collection: vehicle_telemetry
// TTL: 90 days

{
  _id: ObjectId("507f1f77bcf86cd799439014"),

  // References
  vehicleId: 1,
  driverId: 1,
  companyId: 1,

  // Fuel System
  fuel: {
    level: 75, // percentage (0-100)
    consumption: 8.5, // liters per 100km
    type: "diesel" // "diesel" | "petrol" | "cng" | "electric"
  },

  // Engine
  engine: {
    rpm: 2100, // revolutions per minute
    temperature: 87, // °C (normal: 85-95)
    pressure: 4.2, // bar (normal: 4.0-5.0)
    load: 45 // percentage
  },

  // Electrical System
  battery: {
    voltage: 13.8, // volts (normal: 13.5-14.5)
    current: 25.4, // amperes
    temperature: 32, // °C
    soc: 95 // State of Charge (for hybrid/electric)
  },

  // Tire Monitoring
  tires: {
    frontLeft: {
      pressure: 32.5, // PSI (normal: 32-35)
      temperature: 45, // °C
      wear: 60 // percentage (0-100, 100 = worn out)
    },
    frontRight: {
      pressure: 32.5,
      temperature: 45,
      wear: 60
    },
    rearLeft: {
      pressure: 33.0,
      temperature: 46,
      wear: 58
    },
    rearRight: {
      pressure: 33.0,
      temperature: 46,
      wear: 58
    }
  },

  // Diagnostic System
  diagnostics: {
    checkEngineLamp: false,
    faultCodes: [
      // "P0128" = Coolant Temp Regulation Malfunction
    ],
    dtcCount: 0,
    lastServiceKm: 25000,
    nextServiceKm: 30000,
    serviceReminder: "5000 km"
  },

  // Environmental
  temperature: 28, // °C outside
  humidity: 55, // % humidity

  // Timestamps
  createdAt: ISODate("2024-01-15T15:45:23Z"),
  expiresAt: ISODate("2024-04-15T15:45:23Z") // TTL field (90 days)
}
```

**Sample Records (21 total)**:

```javascript
[
  // Vehicle ABC123 - 10 records
  {
    vehicleId: 1,
    fuel: { level: 75 },
    engine: { rpm: 2100, temp: 87 },
    battery: { voltage: 13.8 },
  },
  {
    vehicleId: 1,
    fuel: { level: 74 },
    engine: { rpm: 2150, temp: 88 },
    battery: { voltage: 13.7 },
  },
  // ... 8 more records

  // Vehicle XYZ789 - 8 records
  {
    vehicleId: 2,
    fuel: { level: 60 },
    engine: { rpm: 1800, temp: 85 },
    battery: { voltage: 13.9 },
  },
  // ... 7 more records

  // Vehicle PQR456 - 3 records
  {
    vehicleId: 3,
    fuel: { level: 40 },
    engine: { rpm: 0, temp: 22 },
    battery: { voltage: 14.1 },
  },
  // ... 2 more records
];
```

---

## Index Definitions

### PostgreSQL Indexes

```sql
-- Users table
CREATE UNIQUE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_company_id ON users(company_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);

-- Shipments table
CREATE UNIQUE INDEX idx_shipments_number ON shipments(shipment_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_vehicle_id ON shipments(vehicle_id);
CREATE INDEX idx_shipments_driver_id ON shipments(driver_id);
CREATE INDEX idx_shipments_company_id ON shipments(company_id);

-- Vehicles table
CREATE UNIQUE INDEX idx_vehicles_license_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_company_id ON vehicles(company_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);

-- Invoices table
CREATE UNIQUE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_company_id ON invoices(company_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Composite indexes
CREATE INDEX idx_shipments_company_status ON shipments(company_id, status);
CREATE INDEX idx_drivers_company_vehicle ON drivers(company_id, current_vehicle_id);
```

### MongoDB Indexes

```javascript
// audit_logs
db.audit_logs.createIndex({ userId: 1, createdAt: -1 });
db.audit_logs.createIndex({ action: 1, createdAt: -1 });
db.audit_logs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
db.audit_logs.createIndex({ resourceType: 1, resourceId: 1, createdAt: -1 });

// shipment_events
db.shipment_events.createIndex({ shipmentId: 1, createdAt: -1 });
db.shipment_events.createIndex({ status: 1, createdAt: -1 });
db.shipment_events.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 2592000 }
); // 30 days TTL

// live_tracking
db.live_tracking.createIndex({ location: "2dsphere" }); // Geospatial index
db.live_tracking.createIndex({ vehicleId: 1, createdAt: -1 });
db.live_tracking.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days TTL

// vehicle_telemetry
db.vehicle_telemetry.createIndex({ vehicleId: 1, createdAt: -1 });
db.vehicle_telemetry.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000 }
); // 90 days TTL
db.vehicle_telemetry.createIndex({ "diagnostics.faultCodes": 1 });
```

---

## Query Examples

### PostgreSQL Queries

```sql
-- Find all shipments for a company with status
SELECT s.*, d.name as driver_name, v.license_plate
FROM shipments s
LEFT JOIN drivers d ON s.driver_id = d.id
LEFT JOIN vehicles v ON s.vehicle_id = v.id
WHERE s.company_id = 1 AND s.status = 'in_transit';

-- Get user permissions
SELECT p.* FROM permissions p
INNER JOIN role_permissions rp ON p.id = rp.permission_id
INNER JOIN user_roles ur ON rp.role_id = ur.role_id
WHERE ur.user_id = 1;

-- Find overdue invoices
SELECT * FROM invoices
WHERE company_id = 1 AND status = 'overdue' AND due_date < NOW();

-- Get vehicle fleet status
SELECT v.*, COUNT(d.id) as drivers_assigned
FROM vehicles v
LEFT JOIN drivers d ON v.id = d.current_vehicle_id
WHERE v.company_id = 1
GROUP BY v.id;
```

### MongoDB Queries

```javascript
// Get user's recent activity
db.audit_logs.find({ userId: 1 }).sort({ createdAt: -1 }).limit(20);

// Get shipment timeline
db.shipment_events.find({ shipmentId: 1 }).sort({ createdAt: 1 });

// Find vehicles near location (geospatial)
db.live_tracking.find({
  location: {
    $near: {
      $geometry: { type: "Point", coordinates: [-74.006, 40.7128] },
      $maxDistance: 5000, // 5km
    },
  },
});

// Get alerts for failed events
db.shipment_events
  .find({
    status: "FAILED",
    createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Last 7 days
  })
  .sort({ createdAt: -1 });

// Get vehicle health warnings
db.vehicle_telemetry
  .find({
    $or: [
      { "fuel.level": { $lt: 10 } },
      { "engine.temperature": { $gt: 100 } },
      { "diagnostics.faultCodes": { $exists: true, $ne: [] } },
    ],
  })
  .sort({ createdAt: -1 });
```

---

## Connection Strings

### PostgreSQL

```
postgresql://user:password@ep-raspy-morning-ahcjg5vl-pooler.c-3.us-east-1.aws.neon.tech:5432/logi_matrix_postgresql_db?sslmode=require
```

### MongoDB

```
mongodb+srv://sagacitychess_db_user:pOU7R8EwhrsErudP@logimatrix.fwvtwz8.mongodb.net/logi_matrix?retryWrites=true&w=majority
```
