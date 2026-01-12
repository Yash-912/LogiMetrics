# LogiMetrics - Quick Reference Summary

## 📋 What You've Set Up

### ✅ Complete Database Infrastructure

- **PostgreSQL**: Cloud-hosted on Neon.tech with 8 data tables
- **MongoDB**: Cloud-hosted on MongoDB Atlas with 4 event collections
- **Seeded Data**: 60+ PostgreSQL records + 74 MongoDB records

### ✅ Fully Functional Backend

- Node.js + Express server on port 3000
- REST API with 50+ endpoints
- JWT authentication (15 min access, 7 day refresh)
- Socket.io for real-time updates

### ✅ Complete Frontend

- React + Vite + TailwindCSS on port 5173
- **NEW**: LoginPage with backend integration
- Dashboard with data visualization
- Real-time map tracking

---

## 🎯 System Architecture at a Glance

```
┌────────────────────────────────────────────────┐
│         Frontend (React + Vite)                │
│       http://localhost:5173                    │
│                                                │
│  ┌──────────────┐      ┌──────────────┐      │
│  │  LoginPage   │  →   │  Dashboard   │      │
│  └──────────────┘      └──────────────┘      │
│      (NEW)                                    │
└────────────────────────────────────────────────┘
                         │
                    REST API
                   JWT + Axios
                         │
        ┌────────────────┴────────────────┐
        │                                 │
    ┌───▼────┐                     ┌──────▼─────┐
    │ Node.js│                     │  Socket.io │
    │Express │◄────────────────────┤ Real-time  │
    │ Server │  (events)           │ Updates    │
    │:3000   │                     └────────────┘
    └───┬────┘
        │
        └────────────┬────────────────┐
                     │                │
            ┌────────▼──────┐    ┌────▼──────────┐
            │  PostgreSQL   │    │   MongoDB     │
            │ (Master Data) │    │  (Event Logs) │
            │               │    │               │
            │ • Users       │    │ • Audit Logs  │
            │ • Shipments   │    │ • Tracking    │
            │ • Vehicles    │    │ • Events      │
            │ • Invoices    │    │ • Telemetry   │
            └───────────────┘    └───────────────┘
```

---

## 💾 PostgreSQL Database (`logi_matrix_postgresql_db`)

### Master Records - 60+ Entries

| Table         | Count | Purpose                                                         |
| ------------- | ----- | --------------------------------------------------------------- |
| users         | 4     | Admin, Manager, Dispatcher, Driver                              |
| roles         | 7     | super_admin, admin, manager, dispatcher, driver, customer, user |
| permissions   | 77    | CRUD operations on all resources                                |
| companies     | 1     | LogiMetrics Demo Company                                        |
| vehicles      | 3     | Trucks, vans, cars                                              |
| drivers       | 3     | Assigned to vehicles                                            |
| shipments     | 5     | Various statuses (pending→delivered)                            |
| invoices      | 10    | Billing documents                                               |
| pricing_rules | 13    | Rate configurations                                             |

### Default Credentials

```
Email:    admin@logimetrics.com
Password: Admin@123456
Role:     super_admin
Company:  LogiMetrics Demo Company
```

---

## 📊 MongoDB Database (`logi_matrix`)

### Event & Time-Series Data - 74 Entries

| Collection        | Count | Purpose                             | TTL     |
| ----------------- | ----- | ----------------------------------- | ------- |
| audit_logs        | 20    | User actions, login history         | 90 days |
| shipment_events   | 18    | Status timeline (created→delivered) | 30 days |
| live_tracking     | 15    | GPS, speed, battery (real-time)     | 30 days |
| vehicle_telemetry | 21    | Fuel, temp, tire pressure, RPM      | 90 days |

### Auto-Cleanup

- Live tracking: Deleted after 30 days
- Telemetry data: Deleted after 90 days
- Audit logs: Deleted after 90 days
- Shipment events: Retained for 30 days post-delivery

---

## 🔐 Authentication Flow

```
1. User enters credentials on LoginPage
   Email: admin@logimetrics.com
   Password: Admin@123456

2. Frontend sends: POST /api/auth/login

3. Backend:
   ✓ Queries PostgreSQL users table
   ✓ Verifies password hash
   ✓ Checks role & permissions
   ✓ Generates JWT tokens
   ✓ Logs action to MongoDB audit_logs
   ✓ Returns tokens + user data

4. Frontend stores tokens in localStorage:
   - access_token (15 minutes)
   - refresh_token (7 days)

5. Dashboard loads with user data
   ✓ Shows shipments from PostgreSQL
   ✓ Shows tracking from MongoDB
   ✓ Displays permissions based on role
```

---

## 📱 Frontend Components

### LoginPage (NEW)

- **Location**: `frontend/logimatrix-app/src/pages/LoginPage.jsx`
- **Purpose**: User authentication
- **Features**:
  - Pre-filled demo credentials
  - Error handling
  - Loading states
  - JWT token storage
  - Remember me option
  - Beautiful dark UI with gradients

### AdminDashboard

- **Location**: `frontend/logimatrix-app/src/pages/AdminDashboard.jsx`
- **Purpose**: Main application interface
- **Displays**:
  - List of shipments (PostgreSQL)
  - Vehicle tracking (MongoDB + PostgreSQL)
  - Driver assignments (PostgreSQL)
  - Real-time map (MongoDB)
  - Audit activity (MongoDB)
  - Vehicle health (MongoDB)

### App.jsx Routing

```javascript
/                    → LandingPage (public)
/login               → LoginPage (new, authenticated)
/dashboard           → AdminDashboard (protected)
/movers-packers      → Business page
/truck-partners      → Business page
/enterprise          → Business page
```

---

## 🔌 API Endpoints (50+)

### Authentication

```
POST   /api/auth/login          → Authenticate user
GET    /api/auth/profile        → Get current user
POST   /api/auth/refresh        → Refresh access token
POST   /api/auth/logout         → Logout user
```

### Shipments (PostgreSQL + MongoDB)

```
GET    /api/shipments           → List all shipments
POST   /api/shipments           → Create shipment
GET    /api/shipments/:id       → Get shipment details
PUT    /api/shipments/:id       → Update shipment
GET    /api/shipments/:id/timeline    → Get status history (MongoDB)
POST   /api/shipments/:id/status-update → Update status (create event)
```

### Vehicles (PostgreSQL + MongoDB)

```
GET    /api/vehicles            → List all vehicles
POST   /api/vehicles            → Create vehicle
GET    /api/vehicles/:id        → Get vehicle details
PUT    /api/vehicles/:id        → Update vehicle
GET    /api/vehicles/:id/telemetry    → Get sensor data (MongoDB)
GET    /api/tracking/live/:vehicleId  → Get current location (MongoDB)
GET    /api/tracking/history/:vehicleId → Get location history
```

### Drivers (PostgreSQL)

```
GET    /api/drivers             → List all drivers
POST   /api/drivers             → Create driver
GET    /api/drivers/:id         → Get driver details
PUT    /api/drivers/:id         → Update driver
PUT    /api/drivers/:id/assign-vehicle → Assign vehicle
```

### Analytics (MongoDB)

```
GET    /api/analytics/audit-logs         → Get user activity
GET    /api/analytics/shipment-trends    → Get shipment statistics
GET    /api/analytics/vehicle-stats      → Get vehicle metrics
GET    /api/analytics/revenue            → Get billing data
```

### Invoices (PostgreSQL)

```
GET    /api/invoices            → List invoices
POST   /api/invoices            → Create invoice
GET    /api/invoices/:id        → Get invoice details
POST   /api/payments            → Record payment
```

---

## 🚀 Quick Start

### Step 1: Start Backend

```bash
cd LogiMetrics/backend
npm run dev
# Runs on http://localhost:3000
```

### Step 2: Start Frontend

```bash
cd LogiMetrics/frontend/logimatrix-app
npm run dev
# Runs on http://localhost:5173
```

### Step 3: Login

Navigate to `http://localhost:5173`

**You should see**: LoginPage with pre-filled credentials

```
Email:    admin@logimetrics.com
Password: Admin@123456
```

Click "Log In" → Dashboard loads with data

---

## 📊 What Data Flows Where?

### PostgreSQL (Relational - Master Records)

```
Users & Auth:
  users → login, permissions, company assignment
  roles → 7 different access levels
  permissions → 77 specific actions

Organization:
  companies → 1 demo company profile
  company_settings → currency, timezone, rules

Fleet:
  vehicles → 3 trucks/vans/cars
  drivers → 3 assigned drivers
  routes → delivery routes

Operations:
  shipments → 5 shipments with waypoints
  locations → pickup/delivery points
  invoices → 10 billing documents
  pricing_rules → 13 rate configurations
```

### MongoDB (Document - Event Logs)

```
Audit Trail:
  audit_logs → 20 user actions (login, CRUD, etc)

Shipment Timeline:
  shipment_events → 18 status changes (created→delivered)

Real-time Tracking:
  live_tracking → 15 vehicle locations (GPS updates)

Vehicle Health:
  vehicle_telemetry → 21 sensor readings (fuel, temp, pressure, RPM)
```

---

## 🧪 Testing Quick Commands

### Test Backend Health

```bash
curl http://localhost:3000/api/health
# Response: { "status": "ok" }
```

### Test Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@logimetrics.com",
    "password": "Admin@123456"
  }'
# Response: { "success": true, "data": { "user": {...}, "tokens": {...} } }
```

### Get JWT Token (save for next commands)

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@logimetrics.com","password":"Admin@123456"}' \
  | jq -r '.data.tokens.accessToken')

echo $TOKEN
```

### Test Shipments (PostgreSQL)

```bash
curl -X GET http://localhost:3000/api/shipments \
  -H "Authorization: Bearer $TOKEN"
# Response: [{ id: 1, status: "in_transit", ... }, ...]
```

### Test Tracking (MongoDB)

```bash
curl -X GET http://localhost:3000/api/tracking/live/1 \
  -H "Authorization: Bearer $TOKEN"
# Response: { vehicleId: 1, location: { lat: 40.7128, lng: -74.0060 }, speed: 45.5, ... }
```

### Test Audit Logs (MongoDB)

```bash
curl -X GET http://localhost:3000/api/analytics/audit-logs \
  -H "Authorization: Bearer $TOKEN"
# Response: [{ userId: 1, action: "LOGIN", ... }, ...]
```

---

## 📁 Key File Locations

### Frontend

```
frontend/logimatrix-app/
├── src/
│   ├── App.jsx                 ← Main routing (UPDATED - includes LoginPage)
│   ├── pages/
│   │   ├── LoginPage.jsx       ← Authentication form (NEW)
│   │   ├── AdminDashboard.jsx  ← Main dashboard
│   │   └── LandingPage.jsx     ← Public landing
│   ├── services/
│   │   └── api.js             ← Axios client
│   └── components/            ← UI components
├── .env                        ← Environment variables
└── vite.config.js
```

### Backend

```
backend/
├── src/
│   ├── app.js                 ← Express app setup
│   ├── index.js               ← Server entry point
│   ├── config/
│   │   ├── database.js        ← PostgreSQL connection
│   │   ├── mongodb.js         ← MongoDB connection
│   │   └── ...                ← Other services
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── shipment.controller.js
│   │   ├── vehicle.controller.js
│   │   └── ...
│   ├── models/
│   │   ├── PostgreSQL models (Sequelize)
│   │   └── MongoDB models (Mongoose)
│   ├── routes/                ← API routes
│   ├── middleware/            ← Authentication, logging
│   └── services/              ← Business logic
├── seeders/                   ← PostgreSQL seed data
├── seed-mongodb.js            ← MongoDB seed script
├── .env                       ← Database credentials
├── package.json
└── jest.config.js
```

### Documentation

```
LogiMetrics/
├── DATABASE_USAGE_GUIDE.md         ← Complete database architecture
├── DATABASE_SCHEMA_REFERENCE.md    ← All tables & collections
├── STARTUP_GUIDE.md               ← How to start & test
├── API_TESTING_GUIDE.md           ← All endpoints explained
└── project_idea.md                ← Project overview
```

---

## 🔄 Common Operations

### Create a Shipment

```javascript
// Frontend
POST /api/shipments
{
  "sourceLocation": "Warehouse A",
  "destinationLocation": "Customer B",
  "driverId": 1,
  "vehicleId": 1
}

// Backend creates:
// 1. PostgreSQL shipments record
// 2. MongoDB shipment_events "CREATED" event
// 3. MongoDB audit_logs "CREATE" action
```

### Update Shipment Status

```javascript
// Frontend
PUT /api/shipments/1/status
{ "status": "in_transit" }

// Backend:
// 1. Updates PostgreSQL shipments table
// 2. Creates MongoDB shipment_events event
// 3. Logs to MongoDB audit_logs
// 4. Broadcasts via Socket.io to dashboard
```

### Track Vehicle in Real-time

```javascript
// Mobile sends every 5 seconds
POST /api/tracking/update
{
  "vehicleId": 1,
  "location": { "lat": 40.7128, "lng": -74.0060 },
  "speed": 45.5,
  "battery": 87
}

// Backend:
// 1. Inserts into MongoDB live_tracking
// 2. Broadcasts via Socket.io
// 3. Dashboard map updates automatically
```

---

## ✅ Verification Checklist

After startup, verify:

- [ ] Backend server starts: `npm run dev` in `/backend`
- [ ] Frontend starts: `npm run dev` in `/frontend`
- [ ] LoginPage displays at http://localhost:5173
- [ ] Can login with admin@logimetrics.com / Admin@123456
- [ ] Dashboard loads with shipments list
- [ ] 3 vehicles appear on map
- [ ] Real-time tracking updates every 5 seconds
- [ ] Audit logs show login activity
- [ ] No errors in browser console
- [ ] No errors in backend terminal

---

## 📚 Documentation Files

| File                                                         | Purpose                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| [DATABASE_USAGE_GUIDE.md](DATABASE_USAGE_GUIDE.md)           | Complete architecture, where PostgreSQL/MongoDB are used   |
| [DATABASE_SCHEMA_REFERENCE.md](DATABASE_SCHEMA_REFERENCE.md) | All table schemas, collections, relationships, sample data |
| [STARTUP_GUIDE.md](STARTUP_GUIDE.md)                         | How to start servers, login, test endpoints                |
| [API_TESTING_GUIDE.md](API_TESTING_GUIDE.md)                 | All 50+ API endpoints with curl examples                   |
| project_idea.md                                              | Original project overview                                  |

---

## 🎓 Architecture Highlights

### Hybrid Database Approach

```
PostgreSQL:  For permanent, relational business data
MongoDB:     For temporary, event-based, time-series data
```

### JWT Authentication

```
- Access token: 15 minutes (frontend requests)
- Refresh token: 7 days (get new access token)
- Stored in localStorage
- Sent in Authorization header for all API calls
```

### Real-time Updates

```
- Socket.io for live data
- Vehicle tracking updates every 5 seconds
- Dashboard receives broadcasts automatically
- No polling needed
```

### Data Consistency

```
- PostgreSQL: Master data source of truth
- MongoDB: Event/audit trail for compliance
- Both kept in sync via API middleware
```

---

## 🚀 Next Steps

1. **Verify Setup**

   - Start both servers
   - Test login with demo credentials
   - Check dashboard displays data

2. **Explore Features**

   - Create new shipments
   - Update shipment status
   - View real-time tracking
   - Check audit logs

3. **Customize**

   - Add more users/roles
   - Configure pricing rules
   - Set up email notifications
   - Customize dashboard

4. **Deploy**
   - Databases already in cloud (Neon.tech + MongoDB Atlas)
   - Deploy frontend to Vercel/Netlify
   - Deploy backend to Railway/Render

---

## 💡 Key Features

✅ **Fully Functional Authentication** - JWT tokens, role-based access
✅ **Real-time Tracking** - Socket.io for live vehicle updates
✅ **Audit Logging** - MongoDB tracks all user actions
✅ **Event Timeline** - Shipment status progression
✅ **Vehicle Diagnostics** - Fuel, temperature, tire pressure monitoring
✅ **Billing System** - Invoices and payment tracking
✅ **Responsive UI** - TailwindCSS dark theme
✅ **Error Handling** - Comprehensive error messages
✅ **CORS Enabled** - Frontend-backend communication
✅ **Cloud Infrastructure** - Neon.tech PostgreSQL, MongoDB Atlas
