# LogiMetrics - System Architecture Diagrams

## 1. Complete System Architecture

```
┌────────────────────────────────────────────────────────────────────────────┐
│                           LOGIMETRICS SYSTEM                               │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER (FRONTEND)                            │
│                                                                            │
│  Browser: http://localhost:5173                                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │  React + Vite + TailwindCSS                                     │   │
│  │  ├─ LoginPage (NEW) - JWT Authentication                       │   │
│  │  ├─ AdminDashboard - Main application                          │   │
│  │  ├─ LandingPage - Public landing page                          │   │
│  │  └─ Other Pages - Business information                         │   │
│  │                                                                  │   │
│  │  State Management:                                             │   │
│  │  ├─ AuthContext (user, isAuthenticated)                        │   │
│  │  ├─ localStorage (access_token, refresh_token, user)           │   │
│  │  └─ Real-time Socket.io (vehicle tracking)                     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────────┘
        │
        │ HTTP REST + WebSocket
        │ JWT Authentication Header
        │
        ▼
┌────────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER (BACKEND)                           │
│                                                                            │
│  Server: http://localhost:3000                                            │
│  Node.js + Express + Socket.io                                            │
│                                                                            │
│  ┌─ API Routes (50+ endpoints)                                            │
│  │   ├─ /api/auth/*              (Authentication)                         │
│  │   ├─ /api/shipments/*         (Shipment Management)                    │
│  │   ├─ /api/vehicles/*          (Fleet Management)                       │
│  │   ├─ /api/drivers/*           (Driver Management)                      │
│  │   ├─ /api/invoices/*          (Billing)                               │
│  │   ├─ /api/tracking/*          (Real-time Tracking)                     │
│  │   └─ /api/analytics/*         (Data Analytics)                         │
│  │                                                                          │
│  ├─ Middleware                                                             │
│  │   ├─ Authentication (JWT verification)                                 │
│  │   ├─ Logging (Winston)                                                 │
│  │   ├─ Error Handling                                                    │
│  │   ├─ CORS (Cross-Origin)                                              │
│  │   └─ Body Parser (JSON)                                                │
│  │                                                                          │
│  ├─ Controllers (Business Logic)                                           │
│  │   ├─ auth.controller.js       (Login, token generation)                │
│  │   ├─ shipment.controller.js   (CRUD shipments)                         │
│  │   ├─ vehicle.controller.js    (CRUD vehicles)                          │
│  │   ├─ driver.controller.js     (CRUD drivers)                           │
│  │   ├─ tracking.controller.js   (GPS updates)                            │
│  │   └─ analytics.controller.js  (Audit logs, stats)                      │
│  │                                                                          │
│  ├─ Services (Database Operations)                                         │
│  │   ├─ auth.service.js          (User authentication)                    │
│  │   ├─ shipment.service.js      (Shipment logic)                         │
│  │   ├─ tracking.service.js      (GPS tracking)                           │
│  │   └─ audit.service.js         (Event logging)                          │
│  │                                                                          │
│  └─ Socket.io (Real-time Events)                                          │
│      ├─ vehicle_updated          (GPS location change)                    │
│      ├─ shipment_updated         (Status change)                          │
│      └─ audit_logged             (User action)                            │
└────────────────────────────────────────────────────────────────────────────┘
        │
        ├────────────────────────┬─────────────────────────┐
        │                        │                         │
        ▼                        ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  POSTGRESQL DB   │    │   MONGODB DB     │    │  EXTERNAL SVCS   │
│ (Relational)     │    │  (Document)      │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

---

## 2. Database Layer - PostgreSQL vs MongoDB

```
┌────────────────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────┐  ┌────────────────────────────────┐│
│  │    POSTGRESQL (Master Data)        │  │    MONGODB (Event Data)        ││
│  │  ep-raspy-morning-ahcjg5vl...      │  │  logimatrix.fwvtwz8...        ││
│  │                                    │  │                                ││
│  │  PERMANENT DATA:                   │  │  TEMPORARY DATA (TTL):         ││
│  │  ├─ users (4)                      │  │  ├─ audit_logs (20)            ││
│  │  ├─ roles (7)                      │  │  │  └─ TTL: 90 days            ││
│  │  ├─ permissions (77)               │  │  ├─ shipment_events (18)       ││
│  │  ├─ companies (1)                  │  │  │  └─ TTL: 30 days            ││
│  │  ├─ vehicles (3)                   │  │  ├─ live_tracking (15)         ││
│  │  ├─ drivers (3)                    │  │  │  └─ TTL: 30 days            ││
│  │  ├─ shipments (5)                  │  │  └─ vehicle_telemetry (21)     ││
│  │  ├─ invoices (10)                  │  │     └─ TTL: 90 days            ││
│  │  ├─ pricing_rules (13)             │  │                                ││
│  │  └─ ... (+10 more tables)          │  │  Features:                     ││
│  │                                    │  │  ├─ Auto-cleanup (TTL)         ││
│  │  Use Cases:                        │  │  ├─ Geospatial queries         ││
│  │  ├─ Business operations           │  │  ├─ High-frequency writes      ││
│  │  ├─ Billing & invoicing           │  │  ├─ Flexible schema            ││
│  │  ├─ Compliance & audit trail      │  │  └─ Time-series analytics      ││
│  │  ├─ User management & auth        │  │                                ││
│  │  ├─ Fleet management              │  │  Performance:                  ││
│  │  └─ Reporting & analytics         │  │  ├─ Writes: Fast               ││
│  │                                    │  │  ├─ Storage: Efficient (TTL)   ││
│  │  Performance:                      │  │  ├─ Queries: Simple            ││
│  │  ├─ ACID Transactions             │  │  └─ Indexes: Optimized         ││
│  │  ├─ Complex Joins                 │  │                                ││
│  │  ├─ Data Integrity                │  │  Retention Policy:             ││
│  │  └─ Relational Constraints        │  │  ├─ Audit logs: 90 days        ││
│  │                                    │  │  ├─ Events: 30 days (post-del) ││
│  │  Data Retention: PERMANENT        │  │  ├─ Tracking: 30 days          ││
│  │                                    │  │  └─ Telemetry: 90 days        ││
│  └────────────────────────────────────┘  └────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Authentication Flow

```
USER LOGIN FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. FRONTEND (LoginPage)
   ┌─────────────────────────────────┐
   │ User enters credentials:        │
   │ • Email: admin@logimetrics.com  │
   │ • Password: Admin@123456        │
   └──────────────┬──────────────────┘
                  │
                  │ axios.post(${API_BASE_URL}/api/auth/login)
                  ▼

2. BACKEND (auth.controller.js)
   ┌─────────────────────────────────────────┐
   │ POST /api/auth/login                    │
   │ ├─ Body: { email, password }            │
   │ ├─ Find user in PostgreSQL              │
   │ ├─ Compare password hash                │
   │ ├─ Verify user is active                │
   │ ├─ Load user roles & permissions        │
   │ ├─ Generate JWT tokens:                 │
   │ │  ├─ accessToken (15 min expiry)       │
   │ │  └─ refreshToken (7 day expiry)       │
   │ ├─ Log action to MongoDB audit_logs     │
   │ └─ Return tokens + user data            │
   └──────────────┬──────────────────────────┘
                  │
                  │ Response: {
                  │   success: true,
                  │   data: {
                  │     user: {...},
                  │     tokens: {
                  │       accessToken: "eyJh...",
                  │       refreshToken: "eyJh..."
                  │     }
                  │   }
                  │ }
                  ▼

3. FRONTEND (LoginPage)
   ┌────────────────────────────────────────┐
   │ Store tokens in localStorage           │
   │ ├─ localStorage.setItem(                │
   │ │   'access_token',                     │
   │ │   response.data.tokens.accessToken    │
   │ │ )                                     │
   │ ├─ localStorage.setItem(                │
   │ │   'refresh_token',                    │
   │ │   response.data.tokens.refreshToken   │
   │ │ )                                     │
   │ └─ localStorage.setItem(                │
   │     'user',                             │
   │     JSON.stringify(userData)            │
   │   )                                     │
   │                                        │
   │ Update AuthContext:                    │
   │ ├─ setUser(userData)                   │
   │ └─ setIsAuthenticated(true)            │
   │                                        │
   │ Navigate to /dashboard                 │
   └────────────────────────────────────────┘
                  │
                  ▼

4. FRONTEND (Dashboard)
   ┌────────────────────────────────────────┐
   │ Dashboard loads                        │
   │ ├─ Header shows user name              │
   │ ├─ Fetch shipments API                 │
   │ ├─ Fetch vehicles API                  │
   │ ├─ Fetch drivers API                   │
   │ ├─ Connect to Socket.io                │
   │ └─ Display data                        │
   │                                        │
   │ All API calls include JWT:             │
   │ Authorization: Bearer ${access_token}  │
   └────────────────────────────────────────┘

JWT USAGE IN SUBSEQUENT REQUESTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend API call:
┌─────────────────────────────────────┐
│ axios.get('/api/shipments', {       │
│   headers: {                        │
│     Authorization:                  │
│       `Bearer ${access_token}`      │
│   }                                 │
│ })                                  │
└──────────────┬──────────────────────┘
               │
               ▼

Backend auth middleware:
┌────────────────────────────────────────┐
│ verify JWT from header                 │
│ ├─ Extract token                       │
│ ├─ Decode & verify signature           │
│ ├─ Check expiry                        │
│ ├─ Attach user to request              │
│ └─ Call next() if valid                │
│    else return 401 Unauthorized        │
└────────────────────────────────────────┘

TOKEN REFRESH FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When access token expires (15 min):
┌─────────────────────────────────────┐
│ Frontend detects 401 response        │
│ ├─ Check if refresh_token exists     │
│ ├─ POST /api/auth/refresh            │
│ │  └─ Body: { refreshToken }         │
│ ├─ Backend validates refresh token   │
│ ├─ Generate new access token         │
│ ├─ Return new token                  │
│ ├─ Update localStorage               │
│ └─ Retry original request            │
└─────────────────────────────────────┘

```

---

## 4. Data Flow - Create Shipment

```
USER ACTION: Create Shipment
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend (Dashboard):
┌──────────────────────────────────────┐
│ User clicks "Create Shipment"        │
│ Form appears with fields:            │
│ • Source Location                    │
│ • Destination Location               │
│ • Select Driver                      │
│ • Select Vehicle                     │
│ Click "CREATE"                       │
└──────────────┬───────────────────────┘
               │
               │ POST /api/shipments
               │ {
               │   sourceLocationId: 1,
               │   destLocationId: 2,
               │   driverId: 1,
               │   vehicleId: 1
               │ }
               ▼

Backend (shipment.controller.js):
┌─────────────────────────────────────────────────┐
│ 1. Validate input                               │
│    ├─ Check if source exists                    │
│    ├─ Check if destination exists               │
│    └─ Check if driver/vehicle available         │
│                                                 │
│ 2. PostgreSQL INSERT - shipments table          │
│    ├─ CREATE shipment                           │
│    ├─ shipmentNumber: "SHP-006"                 │
│    ├─ status: "pending"                         │
│    ├─ sourceLocationId: 1                       │
│    ├─ destLocationId: 2                         │
│    ├─ driverId: null (unassigned)               │
│    ├─ vehicleId: null (unassigned)              │
│    └─ createdAt: now                            │
│                                                 │
│ 3. MongoDB INSERT - shipment_events collection  │
│    ├─ CREATE event document                     │
│    ├─ shipmentId: 6                             │
│    ├─ status: "CREATED"                         │
│    ├─ timestamp: now                            │
│    ├─ notes: "Shipment created"                 │
│    └─ createdAt: now                            │
│                                                 │
│ 4. MongoDB INSERT - audit_logs collection       │
│    ├─ CREATE audit record                       │
│    ├─ userId: 1                                 │
│    ├─ action: "CREATE"                          │
│    ├─ resourceType: "shipment"                  │
│    ├─ resourceId: "6"                           │
│    ├─ oldValues: null                           │
│    ├─ newValues: { shipmentNumber, status }     │
│    └─ timestamp: now                            │
│                                                 │
│ 5. Socket.io broadcast                          │
│    └─ emit("shipment_created", { shipmentId })  │
│                                                 │
│ 6. Return response                              │
│    └─ 201 Created + shipment data               │
└─────────────┬──────────────────────────────────┘
              │
              │ Response: {
              │   success: true,
              │   data: {
              │     id: 6,
              │     shipmentNumber: "SHP-006",
              │     status: "pending",
              │     sourceLocationId: 1,
              │     destLocationId: 2
              │   }
              │ }
              ▼

Frontend (Dashboard):
┌──────────────────────────────────────┐
│ 1. Receive response                  │
│ 2. Socket.io listener triggered      │
│    └─ Receives "shipment_created"    │
│                                      │
│ 3. Update state                      │
│    ├─ Add new shipment to list       │
│    └─ Close form dialog              │
│                                      │
│ 4. Refresh shipments list            │
│    ├─ GET /api/shipments             │
│    ├─ Show updated list              │
│    └─ SHP-006 appears at top         │
│                                      │
│ 5. Show success toast                │
│    └─ "Shipment SHP-006 created"     │
└──────────────────────────────────────┘

DATA RECORDED:
✅ PostgreSQL shipments table (permanent)
✅ MongoDB shipment_events (30 days)
✅ MongoDB audit_logs (90 days)
✅ Socket.io broadcast (real-time)
```

---

## 5. Real-time Tracking - Vehicle GPS Update

```
REAL-TIME VEHICLE TRACKING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Mobile App (GPS Device on Vehicle):
┌───────────────────────────────────────┐
│ Every 5 seconds:                      │
│ ├─ Get GPS coordinates                │
│ ├─ Get speed                          │
│ ├─ Get heading                        │
│ ├─ Get battery level                  │
│ ├─ Get fuel level                     │
│ └─ Send to backend                    │
└──────────────┬────────────────────────┘
               │
               │ POST /api/tracking/update
               │ {
               │   vehicleId: 1,
               │   location: {
               │     lat: 40.7128,
               │     lng: -74.0060
               │   },
               │   speed: 45.5,
               │   heading: 180,
               │   battery: 87,
               │   fuel: 75,
               │   timestamp: now
               │ }
               ▼

Backend (tracking.controller.js):
┌──────────────────────────────────────┐
│ 1. Validate GPS data                 │
│    └─ Check vehicle exists           │
│                                      │
│ 2. NO PostgreSQL change              │
│    (vehicle record already exists)   │
│                                      │
│ 3. MongoDB INSERT - live_tracking    │
│    ├─ NEW document (not update)      │
│    ├─ vehicleId: 1                   │
│    ├─ location: {                    │
│    │   coordinates: [-74.0060,       │
│    │                 40.7128]        │
│    │ }                               │
│    ├─ speed: 45.5                    │
│    ├─ heading: 180                   │
│    ├─ battery: 87                    │
│    ├─ ignition: true                 │
│    ├─ odometer: 25430                │
│    ├─ createdAt: now                 │
│    └─ TTL: 30 days                   │
│                                      │
│ 4. Socket.io broadcast               │
│    └─ emit("vehicle_updated", {      │
│         vehicleId: 1,                │
│         location,                    │
│         speed,                       │
│         battery                      │
│       })                             │
│                                      │
│ 5. Return 200 OK                     │
└─────────────┬──────────────────────┘
              │
              │ Socket.io broadcasts to ALL
              │ connected dashboard clients
              ▼

Dashboard (Real-time Map):
┌───────────────────────────────────────┐
│ 1. WebSocket listener triggered       │
│    └─ Receives "vehicle_updated"      │
│                                       │
│ 2. Update vehicle marker on map       │
│    ├─ Animate from old position       │
│    ├─ To new position (-74.0060,      │
│    │    40.7128)                      │
│    ├─ Update speed badge (45.5 km/h)  │
│    ├─ Update battery icon (87%)       │
│    └─ Update heading (↓ South)        │
│                                       │
│ 3. NO API call needed                 │
│    (data comes via WebSocket)         │
│                                       │
│ 4. Real-time update complete          │
│    └─ User sees vehicle move on map   │
└───────────────────────────────────────┘

FREQUENCY: Every 5 seconds × 3 vehicles = 60 inserts/minute
RETENTION: 30 days (auto-delete via TTL)
STORAGE: Efficient (time-series data)
REAL-TIME: Sub-second updates via Socket.io
```

---

## 6. Component Hierarchy

```
App.jsx
├── Router
│   ├── AuthProvider (Context)
│   │   └── AppContent
│   │       ├── Navbar (conditional)
│   │       └── Routes
│   │           ├── / → LandingPage (public)
│   │           ├── /login → LoginPage ⭐ NEW
│   │           ├── /movers-packers → MoversPackers
│   │           ├── /truck-partners → TruckPartners
│   │           ├── /enterprise → Enterprise
│   │           ├── /dashboard → AdminDashboard (protected)
│   │           │   ├── ShipmentsTable
│   │           │   ├── VehiclesMap
│   │           │   ├── DriversTable
│   │           │   ├── TrackingChart
│   │           │   └── AuditActivityFeed
│   │           └── /* → Navigate to / (catch-all)

State Management:
├── AuthContext
│   ├── user
│   ├── isAuthenticated
│   ├── login() function
│   └── logout() function
│
├── localStorage
│   ├── access_token (15 min)
│   ├── refresh_token (7 days)
│   └─ user (JSON)
│
└── Socket.io Connection
    ├── vehicle_updated
    ├── shipment_updated
    └── audit_logged
```

---

## 7. API Endpoint Categories

```
API ROUTES STRUCTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/api
├── /auth
│   ├─ POST   /login          (public)
│   ├─ GET    /profile        (protected)
│   ├─ POST   /refresh        (protected)
│   └─ POST   /logout         (protected)
│
├── /shipments
│   ├─ GET    /               (PostgreSQL)
│   ├─ POST   /               (PostgreSQL)
│   ├─ GET    /:id            (PostgreSQL)
│   ├─ PUT    /:id            (PostgreSQL)
│   ├─ DELETE /:id            (PostgreSQL)
│   ├─ GET    /:id/timeline   (MongoDB)
│   ├─ POST   /:id/status     (PostgreSQL + MongoDB event)
│   └─ GET    /:id/waypoints  (PostgreSQL)
│
├── /vehicles
│   ├─ GET    /               (PostgreSQL)
│   ├─ POST   /               (PostgreSQL)
│   ├─ GET    /:id            (PostgreSQL)
│   ├─ PUT    /:id            (PostgreSQL)
│   ├─ DELETE /:id            (PostgreSQL)
│   ├─ GET    /:id/telemetry  (MongoDB)
│   └─ PUT    /:id/assign-driver (PostgreSQL)
│
├── /drivers
│   ├─ GET    /               (PostgreSQL)
│   ├─ POST   /               (PostgreSQL)
│   ├─ GET    /:id            (PostgreSQL)
│   ├─ PUT    /:id            (PostgreSQL)
│   ├─ DELETE /:id            (PostgreSQL)
│   └─ PUT    /:id/assign-vehicle (PostgreSQL)
│
├── /tracking
│   ├─ POST   /update         (MongoDB)
│   ├─ GET    /live/:vehicleId (MongoDB)
│   └─ GET    /history/:vehicleId (MongoDB)
│
├── /invoices
│   ├─ GET    /               (PostgreSQL)
│   ├─ POST   /               (PostgreSQL)
│   ├─ GET    /:id            (PostgreSQL)
│   └─ POST   /:id/pay        (PostgreSQL)
│
├── /analytics
│   ├─ GET    /audit-logs     (MongoDB)
│   ├─ GET    /shipment-trends (PostgreSQL + MongoDB)
│   ├─ GET    /vehicle-stats  (PostgreSQL + MongoDB)
│   └─ GET    /revenue        (PostgreSQL)
│
├── /companies
│   ├─ GET    /               (PostgreSQL)
│   ├─ GET    /:id            (PostgreSQL)
│   ├─ GET    /:id/settings   (PostgreSQL)
│   └─ PUT    /:id/settings   (PostgreSQL)
│
└── /health
    └─ GET    /               (server status)

All endpoints except /auth/login and /health require:
  Authorization: Bearer <JWT_TOKEN>
```

---

## 8. Error Handling Flow

```
ERROR HANDLING FLOW
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend API Call
     ↓
Try-Catch Block
     ├─ Success (2xx)
     │   └─ Display data
     │
     └─ Error
        ├─ 400 Bad Request
        │  └─ Show validation error message
        │
        ├─ 401 Unauthorized
        │  ├─ Check if token expired
        │  ├─ Try refresh token
        │  ├─ Retry original request
        │  └─ If refresh fails → Logout & redirect to login
        │
        ├─ 403 Forbidden
        │  └─ Show "Access Denied" message
        │
        ├─ 404 Not Found
        │  └─ Show "Resource not found" message
        │
        ├─ 500 Server Error
        │  ├─ Show error toast
        │  └─ Log to console/monitoring
        │
        └─ Network Error
           ├─ Show "Cannot connect to server"
           └─ Retry button

Backend Error Handling:
├─ Validation errors → 400
├─ Authentication errors → 401
├─ Authorization errors → 403
├─ Not found errors → 404
├─ Database errors → 500
├─ Unexpected errors → 500
└─ All errors logged to file

User Feedback:
├─ Toast messages (top right)
├─ Form error messages
├─ Dialog error modals
└─ Console logging (dev)
```

---

## 9. Data Migration & TTL Strategy

```
DATA LIFECYCLE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PostgreSQL (PERMANENT):
│
├─ Users
│  └─ Created → Active → Deleted (soft delete)
│
├─ Vehicles
│  └─ Created → Active/Maintenance → Retired
│
├─ Shipments
│  └─ Created → Confirmed → In Transit → Delivered/Cancelled
│     (record stays forever for billing/history)
│
└─ Invoices
   └─ Created → Sent → Paid/Overdue/Cancelled
      (permanent for accounting)

MongoDB (TEMPORARY WITH TTL):
│
├─ audit_logs (90 DAY TTL)
│  └─ Created → Logged → Auto-deleted after 90 days
│     Timeline:
│     Day 0    → Created
│     Day 90   → Eligible for deletion
│     Day 91   → Deleted by MongoDB
│
├─ shipment_events (30 DAY TTL)
│  └─ Created → Tracked → Auto-deleted 30 days after shipment delivery
│     Example: Shipment SHP-001
│     Jan 10   → Created event
│     Jan 15   → Delivered event
│     Feb 14   → Auto-deleted (30 days after delivery)
│
├─ live_tracking (30 DAY TTL)
│  └─ Created → GPS updates → Auto-deleted after 30 days
│     Example: Vehicle ABC123
│     Jan 15 15:00 → Position 1
│     Jan 15 15:05 → Position 2
│     Jan 15 15:10 → Position 3
│     ...
│     Feb 14 15:00 → Auto-deleted (30 days from first record)
│
└─ vehicle_telemetry (90 DAY TTL)
   └─ Created → Sensor readings → Auto-deleted after 90 days
      Example: Vehicle ABC123
      Jan 15 → Fuel: 75%, Temp: 87°C
      Jan 16 → Fuel: 70%, Temp: 88°C
      ...
      Apr 15 → Auto-deleted (90 days from first record)

TTL INDEX CONFIGURATION:
├─ audit_logs
│  └─ db.audit_logs.createIndex(
│      { "createdAt": 1 },
│      { expireAfterSeconds: 7776000 } # 90 days
│    )
│
├─ shipment_events
│  └─ db.shipment_events.createIndex(
│      { "createdAt": 1 },
│      { expireAfterSeconds: 2592000 } # 30 days
│    )
│
├─ live_tracking
│  └─ db.live_tracking.createIndex(
│      { "createdAt": 1 },
│      { expireAfterSeconds: 2592000 } # 30 days
│    )
│
└─ vehicle_telemetry
   └─ db.vehicle_telemetry.createIndex(
      { "createdAt": 1 },
      { expireAfterSeconds: 7776000 } # 90 days
    )

STORAGE IMPLICATIONS:
├─ PostgreSQL → Grows indefinitely (backup strategy needed)
├─ MongoDB → Self-managing (auto-cleanup)
└─ Cost → MongoDB more cost-effective for high-volume data
```

---

## 10. Deployment Architecture

```
PRODUCTION DEPLOYMENT ARCHITECTURE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────────────────────────────┐
│                      CLIENT DEVICES                         │
│  ├─ Web Browsers (http://app.logimetrics.com)              │
│  └─ Mobile Apps (iOS/Android)                              │
└──────────────────────┬──────────────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            │                     │
      ┌─────▼──────┐      ┌──────▼──────┐
      │  Frontend  │      │   Mobile    │
      │ (Vercel)   │      │ Backend     │
      └─────┬──────┘      └──────┬──────┘
            │                    │
            └────────┬───────────┘
                     │
            ┌────────▼────────┐
            │ Load Balancer   │
            │ (API Gateway)   │
            └────────┬────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
   ┌────▼──────┐          ┌──────▼──────┐
   │ Backend   │          │  Backend    │
   │ Instance  │          │  Instance   │
   │ (Railway) │          │  (Railway)  │
   │ :3000     │          │  :3000      │
   └────┬──────┘          └──────┬──────┘
        │                        │
        └───────────┬────────────┘
                    │
        ┌───────────┴──────────┐
        │                      │
   ┌────▼────────┐        ┌───▼─────────┐
   │ PostgreSQL  │        │   MongoDB   │
   │ (Neon.tech) │        │   (Atlas)   │
   └─────────────┘        └─────────────┘

CURRENT STATUS:
├─ PostgreSQL: ✅ Cloud (Neon.tech)
├─ MongoDB: ✅ Cloud (MongoDB Atlas)
├─ Frontend: Ready for Vercel/Netlify
└─ Backend: Ready for Railway/Render
```
