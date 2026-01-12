# PostgreSQL vs MongoDB - Complete Explanation

## 🎯 Direct Answer: Where Each Database is Used

### PostgreSQL (`logi_matrix_postgresql_db`)

**Used for**: All permanent, relational business data that needs to be structured and queryable

#### ✅ Tables in PostgreSQL:

```
1. users              - User accounts, login credentials
2. roles             - Permission levels (admin, dispatcher, driver)
3. permissions       - 77 specific actions (create, read, update, delete)
4. user_roles        - User-to-role assignments
5. role_permissions  - Role-to-permission assignments
6. companies         - Organization profiles
7. company_settings  - Configuration values
8. vehicles          - Fleet inventory (trucks, vans, cars)
9. drivers           - Driver profiles and assignments
10. shipments        - Order/delivery records
11. waypoints        - Stop points in shipments
12. locations        - Pickup/delivery addresses
13. routes           - Pre-defined delivery paths
14. invoices         - Billing documents
15. invoice_items    - Line items in invoices
16. transactions     - Payment records
17. documents        - Uploaded files (licenses, certificates)
18. certificates     - Expiry tracking (insurance, licenses)
19. pricing_rules    - Rate configurations
20. + More system tables
```

---

### MongoDB (`logi_matrix`)

**Used for**: Temporary, event-based data that needs to be logged/tracked but not queried like a traditional table

#### ✅ Collections in MongoDB:

```
1. audit_logs         - User activity log (who did what, when)
2. shipment_events    - Status changes (created→confirmed→delivered)
3. live_tracking      - Real-time GPS coordinates (auto-deletes after 30 days)
4. vehicle_telemetry  - Sensor readings (fuel, temp, pressure) (auto-deletes after 90 days)
```

---

## 🔑 Key Difference

| Aspect             | PostgreSQL                           | MongoDB                             |
| ------------------ | ------------------------------------ | ----------------------------------- |
| **Data Type**      | Relational (structured)              | Document (flexible)                 |
| **Query Style**    | SQL (tables & joins)                 | JSON (flexible queries)             |
| **Retention**      | Permanent                            | Temporary (TTL)                     |
| **Use Case**       | Business records                     | Event trails                        |
| **Example Data**   | "John is assigned to Vehicle ABC123" | "John logged in at 10:30 AM"        |
| **Access Pattern** | "Get all shipments for user X"       | "Get activity feed for last 7 days" |

---

## 📊 PostgreSQL Tables - Detailed Explanation

### 1. Authentication & Authorization

```
users table:
├── admin@logimetrics.com
├── manager@logimetrics.com
├── dispatcher@logimetrics.com
└── driver@logimetrics.com

roles table:
├── super_admin (full access)
├── admin (company management)
├── manager (team management)
├── dispatcher (shipment assignment)
├── driver (shipment tracking)
├── customer (view own shipments)
└── user (basic access)

permissions table (77 total):
├── shipments.create
├── shipments.read
├── shipments.update
├── shipments.delete
├── vehicles.create
├── vehicles.read
├── vehicles.update
├── vehicles.delete
└── ... (69 more permissions)
```

**Why PostgreSQL?** - Permissions are structured, queryable, and permanent

---

### 2. Company & Organization

```
companies table:
└── LogiMetrics Demo Company
    ├── Tax ID
    ├── Registration Number
    ├── Email: info@logimetrics.com
    ├── Phone: +91-9876543210
    └── Address: 123 Logistics Street, Mumbai

company_settings table:
├── currency: "INR"
├── timezone: "Asia/Kolkata"
├── max_shipments_per_day: 100
├── auto_invoice_enabled: true
└── notification_email: "notifications@..."
```

**Why PostgreSQL?** - Static data, requires joins with users/vehicles

---

### 3. Fleet Management

```
vehicles table (3 records):
├── Vehicle 1
│   ├── License Plate: ABC123
│   ├── Type: truck
│   ├── Capacity: 5000 kg
│   ├── Status: active
│   ├── Purchase Date: 2023-01-15
│   └── Last Service: 2024-01-10
├── Vehicle 2
│   ├── License Plate: XYZ789
│   ├── Type: van
│   └── ...
└── Vehicle 3 (car)

drivers table (3 records):
├── Driver 1: John Driver
│   ├── License: DL-001
│   ├── Phone: 9876543210
│   ├── Current Vehicle: ABC123 (FK)
│   └── Status: available
├── Driver 2: Jane Driver (on_duty)
└── Driver 3: Bob Courier (available)
```

**Why PostgreSQL?** - Fleet inventory needs structured storage, relationships with shipments

---

### 4. Shipments & Routing

```
shipments table (5 records):
├── SHP-001
│   ├── Status: in_transit
│   ├── Source: Mumbai (location_id: 1)
│   ├── Destination: Bangalore (location_id: 2)
│   ├── Driver: John (driver_id: 1)
│   ├── Vehicle: ABC123 (vehicle_id: 1)
│   └── Created: 2024-01-14
├── SHP-002 (pending - unassigned)
├── SHP-003 (confirmed)
├── SHP-004 (delivered)
└── SHP-005 (cancelled)

locations table:
├── Mumbai Hub (40.7128°N, -74.0060°W)
├── Bangalore Hub (34.0522°N, -118.2437°W)
└── Chennai Hub (41.8781°N, -87.6298°W)

routes table:
├── Mumbai→Bangalore: 400km, 5 hours
├── Bangalore→Chennai: 300km, 4 hours
└── Chennai→Mumbai: 350km, 4.5 hours

waypoints table (for each shipment):
├── SHP-001 Stop 1: Delhi (arrival: 12:00, departure: 12:30)
├── SHP-001 Stop 2: Agra (arrival: 14:00, departure: 14:30)
└── SHP-001 Stop 3: Bangalore (arrival: 18:00)
```

**Why PostgreSQL?** - Shipment records are permanent, need relationships with drivers/vehicles/locations

---

### 5. Invoicing & Payments

```
invoices table (10 records):
├── INV-001
│   ├── Amount: ₹5,000
│   ├── Status: paid
│   ├── Due Date: 2024-01-25
│   └── Associated Shipment: SHP-001
├── INV-002 (paid)
├── INV-003 (pending)
├── INV-004 (overdue)
└── ... (6 more)

invoice_items table:
├── INV-001 Item 1: "Freight Charges" ₹5,000
└── INV-002 Item 1: "Handling" ₹2,000

transactions table:
├── TXN-001: INV-001 paid ₹5,000
├── TXN-002: INV-002 paid ₹8,500
└── ... (records payment details)

pricing_rules table (13 rules):
├── Distance-based: ₹10/km
├── Weight-based: ₹5/kg
├── Truck surcharge: +20%
├── Van surcharge: +10%
└── ... (9 more rules)
```

**Why PostgreSQL?** - Billing is permanent, requires audit trail, needs calculations

---

## 📝 MongoDB Collections - Detailed Explanation

### 1. Audit Logs (20 records)

```javascript
// Purpose: Track user actions for compliance/debugging
// Retention: 90 days (auto-delete)

Sample records:
[
  {
    userId: 1,
    action: "LOGIN",
    resourceType: "user",
    timestamp: "2024-01-15T10:30:00Z",
    ipAddress: "192.168.1.100",
    statusCode: 200
  },
  {
    userId: 1,
    action: "CREATE",
    resourceType: "shipment",
    resourceId: "1",
    oldValues: null,
    newValues: { status: "pending" },
    timestamp: "2024-01-15T10:35:00Z",
    statusCode: 201
  },
  {
    userId: 1,
    action: "UPDATE",
    resourceType: "shipment",
    resourceId: "1",
    oldValues: { status: "pending" },
    newValues: { status: "confirmed" },
    timestamp: "2024-01-15T10:40:00Z",
    statusCode: 200
  },
  ... 17 more records
]

// Used by:
// - Dashboard "Recent Activities" widget
// - Admin: "View user activity"
// - Compliance: "Export audit log for last 90 days"
// - Security: "Detect suspicious login activity"
```

**Why MongoDB?**

- ✅ Flexible schema (different action types)
- ✅ Fast writes (user actions logged on every request)
- ✅ Easy to query with regex (search activity by date/user)
- ✅ Auto-cleanup after 90 days (TTL index)
- ❌ No need for ACID transactions
- ❌ Not queried with complex joins

---

### 2. Shipment Events (18 records)

```javascript
// Purpose: Track shipment status progression
// Retention: 30 days after delivery
// Use Case: Show customer "where is my shipment?"

Sample timeline for SHP-001:
[
  {
    shipmentId: 1,
    status: "CREATED",
    timestamp: "2024-01-14T10:00:00Z",
    location: { lat: 40.7128, lng: -74.0060, address: "Warehouse A" },
    notes: "Shipment created"
  },
  {
    shipmentId: 1,
    status: "CONFIRMED",
    timestamp: "2024-01-14T11:00:00Z",
    driver: { id: 1, name: "John Driver" },
    notes: "Confirmed by dispatcher"
  },
  {
    shipmentId: 1,
    status: "PICKED_UP",
    timestamp: "2024-01-15T09:00:00Z",
    location: { lat: 40.7130, lng: -74.0055, address: "Warehouse A" },
    vehicle: { id: 1, plate: "ABC123" },
    odometer: 25430,
    notes: "Package picked up"
  },
  {
    shipmentId: 1,
    status: "IN_TRANSIT",
    timestamp: "2024-01-15T14:30:00Z",
    location: { lat: 40.7500, lng: -73.9900, address: "Bronx" },
    driver: { id: 1, name: "John Driver" },
    speed: 45,
    notes: "En route to delivery location"
  },
  {
    shipmentId: 1,
    status: "DELIVERED",
    timestamp: "2024-01-15T18:00:00Z",
    location: { lat: 40.8000, lng: -73.9500, address: "Delivery location" },
    recipientName: "John Smith",
    signatureUrl: "https://s3.amazonaws.com/...",
    notes: "Delivered to recipient"
  }
]

// Used by:
// - Customer portal: "Track my shipment"
// - Driver app: "Update shipment status"
// - Dashboard: "Shipment timeline widget"
// - API: GET /api/shipments/1/timeline
```

**Why MongoDB?**

- ✅ Fast writes (status update every few minutes)
- ✅ Flexible schema (different event types have different fields)
- ✅ Ordered timeline (natural sort by timestamp)
- ✅ Easy to query: find({ shipmentId: 1 }).sort({ timestamp: 1 })
- ✅ Auto-delete after 30 days (TTL index)
- ❌ Doesn't need relational joins

---

### 3. Live Tracking (15 records)

```javascript
// Purpose: Real-time vehicle location updates
// Retention: 30 days (auto-delete)
// Update Frequency: Every 5 seconds from vehicle GPS
// Use Case: Show vehicle on map RIGHT NOW

Sample records (Vehicle ABC123 tracking):
[
  // 3:45:20 PM
  {
    vehicleId: 1,
    driverId: 1,
    location: {
      type: "Point",
      coordinates: [-74.0060, 40.7128]  // Long, Lat
    },
    address: "5th Avenue, NYC",
    speed: 0,           // km/h (stopped)
    heading: 0,         // degrees
    battery: 87,        // %
    ignition: false,    // engine off
    odometer: 25430,    // km
    timestamp: "2024-01-15T15:45:20Z"
  },

  // 3:45:25 PM (5 seconds later)
  {
    vehicleId: 1,
    location: { coordinates: [-74.0055, 40.7125] },
    address: "5th Avenue, NYC",
    speed: 15,          // started moving
    heading: 180,       // heading south
    battery: 87,
    ignition: true,     // engine on
    timestamp: "2024-01-15T15:45:25Z"
  },

  // 3:45:30 PM
  {
    vehicleId: 1,
    location: { coordinates: [-74.0050, 40.7100] },
    speed: 45,
    heading: 180,
    battery: 86,
    timestamp: "2024-01-15T15:45:30Z"
  },

  ... (12 more updates, one every 5 seconds)
]

// Vehicle XYZ789 (5 records)
// Vehicle PQR456 (1 record)

// Used by:
// - Dashboard: Interactive map showing 3 vehicles
// - Socket.io: Real-time broadcasts every 5 seconds
// - Customer: "Where is my shipment?"
// - Driver: "See nearby vehicles"
// - Geospatial queries: "Find vehicles within 5km of location X"
```

**Why MongoDB?**

- ✅ High-frequency writes (5 sec updates × 3 vehicles = 10,800 records/hour)
- ✅ Geospatial indexing (2dsphere) for "vehicles near me"
- ✅ Time-series data (naturally ordered by timestamp)
- ✅ Auto-delete after 30 days (TTL index)
- ✅ Flexible schema (can add fields like "temperature" for cold chain)
- ❌ PostgreSQL would slow down with 10k+ inserts/hour
- ❌ No need to join with other tables for real-time display

---

### 4. Vehicle Telemetry (21 records)

```javascript
// Purpose: Monitor vehicle health & diagnostics
// Retention: 90 days (auto-delete)
// Update Frequency: Every 5-10 seconds from vehicle
// Use Case: Predictive maintenance, alerts

Sample records (Vehicle ABC123):
[
  {
    vehicleId: 1,
    fuel: {
      level: 75,        // % (normal)
      consumption: 8.5  // L/100km
    },
    engine: {
      rpm: 2100,        // rotations per minute
      temperature: 87,  // °C (normal: 85-95)
      pressure: 4.2     // bar (normal: 4.0-5.0)
    },
    battery: {
      voltage: 13.8,    // V (normal: 13.5-14.5)
      current: 25.4,    // A
      soc: 95           // State of Charge %
    },
    tires: {
      frontLeft: {
        pressure: 32.5,    // PSI (normal: 32-35)
        temperature: 45,   // °C
        wear: 60           // % (0=new, 100=worn out)
      },
      frontRight: { pressure: 32.5, temperature: 45, wear: 60 },
      rearLeft: { pressure: 33.0, temperature: 46, wear: 58 },
      rearRight: { pressure: 33.0, temperature: 46, wear: 58 }
    },
    diagnostics: {
      checkEngineLamp: false,
      faultCodes: [],  // e.g., "P0128" = Coolant regulation
      lastServiceKm: 25000,
      nextServiceKm: 30000
    },
    timestamp: "2024-01-15T15:45:23Z"
  },

  // Next reading (few seconds later)
  {
    vehicleId: 1,
    fuel: { level: 74 },  // Decreased by 1%
    engine: { rpm: 2150, temperature: 88 },
    battery: { voltage: 13.7 },
    // ... rest of data
    timestamp: "2024-01-15T15:45:30Z"
  },

  ... (more readings over time)
]

// Used by:
// - Dashboard: "Vehicle Health" widget
// - Maintenance: Alerts when fuel < 10% or temp > 100°C
// - Compliance: "Download last 90 days telemetry"
// - Predictive maintenance: Trends analysis
```

**Why MongoDB?**

- ✅ High-frequency writes (every 5-10 seconds)
- ✅ Flexible schema (can add sensor types without migration)
- ✅ Natural time-series data (MongoDB specifically designed for this)
- ✅ Auto-cleanup after 90 days (TTL index)
- ✅ Easy aggregation: avg fuel consumption, max temperature
- ✅ Not used for queries that need vehicle.make/model (those in PostgreSQL)

---

## 🔄 Data Flow Examples

### Scenario 1: User Logs In

```
Frontend (LoginPage)
  ↓
POST /api/auth/login
  ↓
Backend auth.controller.js
  ├─→ Query PostgreSQL users table
  │   └─ Verify credentials
  │
  ├─→ Generate JWT tokens
  │
  └─→ Insert into MongoDB audit_logs
      └─ { userId: 1, action: "LOGIN", statusCode: 200, timestamp: now }

  ↓
Return to frontend
  ├─ access_token (stored in localStorage)
  ├─ refresh_token (stored in localStorage)
  └─ user data (stored in localStorage)

// PostgreSQL: PERMANENT record of user
// MongoDB: TEMPORARY log of login action (deleted after 90 days)
```

---

### Scenario 2: Create a Shipment

```
Frontend (Dashboard)
  ↓
POST /api/shipments { source, destination, driverId, vehicleId }
  ↓
Backend shipment.controller.js
  ├─→ Insert into PostgreSQL shipments table
  │   └─ SHP-006 { status: "pending", driver_id: 1, ... }
  │
  ├─→ Insert into MongoDB shipment_events
  │   └─ { shipmentId: 6, status: "CREATED", timestamp: now }
  │
  ├─→ Insert into MongoDB audit_logs
  │   └─ { userId: 1, action: "CREATE", resourceType: "shipment", resourceId: "6" }
  │
  └─→ Broadcast via Socket.io "shipment_created"

  ↓
Return to frontend
  ├─ Success message
  └─ Refresh shipment list

// PostgreSQL: PERMANENT shipment record (billing, tracking, etc)
// MongoDB: TEMPORARY events (timeline for customer, then deleted)
// MongoDB: TEMPORARY audit (compliance, then deleted)
```

---

### Scenario 3: Update Shipment Status

```
Frontend (Dashboard)
  ↓
PUT /api/shipments/1/status { status: "in_transit" }
  ↓
Backend shipment.controller.js
  ├─→ Update PostgreSQL shipments table
  │   └─ SET status = "in_transit" WHERE id = 1
  │
  ├─→ Insert into MongoDB shipment_events
  │   └─ { shipmentId: 1, status: "IN_TRANSIT", location: {...}, timestamp: now }
  │
  ├─→ Insert into MongoDB audit_logs
  │   └─ { userId: 1, action: "UPDATE", resourceType: "shipment",
  │       oldValues: { status: "confirmed" },
  │       newValues: { status: "in_transit" } }
  │
  └─→ Broadcast via Socket.io "shipment_updated"

// PostgreSQL: Updated status (used for future shipments, billing, analytics)
// MongoDB: Event logged (customer can see status history)
// MongoDB: Action audited (compliance)
```

---

### Scenario 4: Real-time Vehicle Tracking

```
Mobile App (Every 5 seconds)
  ↓
POST /api/tracking/update
{
  vehicleId: 1,
  location: { lat: 40.7128, lng: -74.0060 },
  speed: 45,
  battery: 87
}
  ↓
Backend tracking.controller.js
  ├─→ NO change to PostgreSQL (vehicle record already exists)
  │
  ├─→ Insert into MongoDB live_tracking
  │   └─ NEW document (not update, INSERT)
  │
  └─→ Broadcast via Socket.io "vehicle_updated"
      └─ All dashboard clients receive update automatically

  ↓
Dashboard WebSocket
  ├─ Receive "vehicle_updated" event
  └─ Update vehicle marker on map
     └─ Animation from old position to new position

// PostgreSQL: No change (vehicle record is static)
// MongoDB: NEW record inserted (3 vehicles × 12 updates/min = 36 inserts/min)
// TTL: Live tracking records auto-delete after 30 days
```

---

## 📊 Comparison Table

### When to Use PostgreSQL

| Need                       | Why PostgreSQL                           |
| -------------------------- | ---------------------------------------- |
| Permanent business records | ACID transactions, data integrity        |
| Complex relationships      | Foreign keys, joins, constraints         |
| Structured data            | Users, vehicles, shipments, invoices     |
| Reporting & analytics      | SQL aggregations, GROUP BY, HAVING       |
| Billing/compliance         | Permanent audit trail, immutable records |
| User management            | Permissions, roles, authentication       |

### When to Use MongoDB

| Need                 | Why MongoDB                                 |
| -------------------- | ------------------------------------------- |
| Event logging        | High-volume writes, flexible schema         |
| Time-series data     | Natural ordering by timestamp               |
| Real-time tracking   | Geospatial indexes for "nearby" queries     |
| Audit trails         | Auto-cleanup with TTL, immutable documents  |
| Flexible schema      | Different event types have different fields |
| Read-heavy analytics | Fast aggregation, pre-computed summaries    |

---

## 🎯 Summary Table

```
┌─────────────────────────────────────────────────────────────────┐
│                     POSTGRESQL vs MONGODB                       │
├─────────────────────┬─────────────────────────────────────────┤
│   POSTGRESQL        │         MONGODB                         │
├─────────────────────┼─────────────────────────────────────────┤
│ User Accounts       │ User Activity Logs                      │
│ Vehicles (master)   │ Vehicle Telemetry (sensor data)        │
│ Drivers (master)    │ Live Tracking (GPS updates)            │
│ Shipments (master)  │ Shipment Events (status history)       │
│ Invoices            │ Audit Logs (action trail)              │
│ Payments            │ (None directly)                        │
│ Routes              │ (None directly)                        │
│ Locations           │ (None directly)                        │
│ Pricing Rules       │ (None directly)                        │
│ Documents           │ (None directly)                        │
├─────────────────────┼─────────────────────────────────────────┤
│ Permanent data      │ Temporary data                         │
│ ACID transactions   │ Eventually consistent                  │
│ Structured tables   │ Flexible documents                     │
│ Slow writes         │ Fast writes (high volume)              │
│ Complex queries     │ Simple queries                         │
│ Joins across tables │ Single collection queries              │
│ Data integrity      │ Audit trail & compliance               │
└─────────────────────┴─────────────────────────────────────────┘
```

---

## 🔗 Example: A Single Shipment Journey

```
SHIPMENT SHP-001: Mumbai → Bangalore

DAY 1: Created

  Frontend: Click "Create Shipment"
  ↓
  PostgreSQL INSERT:
  ├─ shipments table
  │  └─ id: 1, number: "SHP-001", status: "pending",
  │     source_location_id: 1, destination_location_id: 2
  │
  MongoDB INSERT:
  ├─ shipment_events
  │  └─ { shipmentId: 1, status: "CREATED", timestamp: "10:00" }
  │
  ├─ audit_logs
  │  └─ { userId: 1, action: "CREATE", resourceType: "shipment" }

DAY 1: Confirmed by Dispatcher

  Frontend: Click "Confirm"
  ↓
  PostgreSQL UPDATE:
  ├─ shipments table
  │  └─ SET status = "confirmed"
  │
  MongoDB INSERT:
  ├─ shipment_events
  │  └─ { shipmentId: 1, status: "CONFIRMED", timestamp: "11:00" }
  │
  ├─ audit_logs
  │  └─ { userId: 2, action: "UPDATE", resourceType: "shipment" }

DAY 2: Picked Up

  Driver arrives at warehouse
  ↓
  Mobile App: Click "Start Trip"
  ↓
  PostgreSQL UPDATE:
  ├─ shipments table
  │  └─ SET status = "picked_up", driver_id: 1, vehicle_id: 1
  │
  MongoDB INSERT:
  ├─ shipment_events
  │  └─ { shipmentId: 1, status: "PICKED_UP", timestamp: "09:00",
  │       location: {lat, lng}, vehicle: "ABC123" }
  │
  ├─ audit_logs
  │  └─ { userId: 3 (driver), action: "UPDATE" }

DAY 2: In Transit (Every 5 seconds for 5 hours)

  GPS Device sends location update every 5 seconds
  ↓
  NO PostgreSQL change
  ↓
  MongoDB INSERT to live_tracking (NOT shipment_events):
  ├─ 3600 records over 5 hours (one per 5 seconds)
  │  └─ { vehicleId: 1, location: {lat, lng}, speed: 45, ... }
  │
  Socket.io broadcasts to dashboard
  └─ Map updates in real-time

  Dashboard shows:
  ├─ vehicle ABC123 moving from Mumbai to Bangalore
  ├─ Speed: 45 km/h
  ├─ ETA: 18:00
  └─ Driver John, 50 km remaining

DAY 2: Delivered

  Driver clicks "Deliver"
  ↓
  PostgreSQL UPDATE:
  ├─ shipments table
  │  └─ SET status = "delivered", actual_delivery_time: "18:00"
  │
  MongoDB INSERT:
  ├─ shipment_events
  │  └─ { shipmentId: 1, status: "DELIVERED", timestamp: "18:00",
  │       recipient: "John Smith", signature_url: "..." }
  │
  ├─ audit_logs
  │  └─ { userId: 3 (driver), action: "UPDATE" }

30+ DAYS LATER: Auto-Cleanup

  MongoDB TTL indexes activate
  ├─ live_tracking records auto-deleted (30 day TTL)
  │  └─ 3600 location records removed
  │
  └─ shipment_events deleted
     └─ 5 status event records removed

90+ DAYS LATER: More Cleanup

  └─ audit_logs auto-deleted (90 day TTL)
     └─ All tracking activity removed

PERMANENT DATA (PostgreSQL):

  shipments table still has:
  ├─ SHP-001 record exists forever
  │  └─ Used for:
  │     ├─ Billing (invoice generation)
  │     ├─ Analytics (shipment trends)
  │     ├─ Customer history (past deliveries)
  │     ├─ Compliance (audit requirements)
  │     └─ Revenue tracking

  invoices table has:
  ├─ INV-001 linked to SHP-001
  │  └─ Permanent billing record

SUMMARY:
├─ PostgreSQL: SHP-001 record exists forever (billing, history, compliance)
├─ MongoDB shipment_events: Deleted after 30 days (customer tracking timeline)
├─ MongoDB live_tracking: Deleted after 30 days (real-time GPS updates)
└─ MongoDB audit_logs: Deleted after 90 days (user activity trail)
```

---

## ✅ Key Takeaway

**PostgreSQL** = Business database (what happened)
**MongoDB** = Activity log database (when it happened, detailed timeline)

Together they provide:

- ✅ Permanent record for billing & compliance (PostgreSQL)
- ✅ Detailed activity trail for customer transparency (MongoDB)
- ✅ Real-time tracking for current shipments (MongoDB)
- ✅ Space-efficient auto-cleanup (MongoDB TTL)
- ✅ Performance under high-volume writes (MongoDB)
