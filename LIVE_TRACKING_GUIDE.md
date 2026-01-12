# Live Accident Zone Tracking System - Testing Guide

## Overview

The live accident zone tracking system monitors vehicle locations in real-time and alerts drivers when they enter accident-prone zones. The system consists of:

1. **Backend Services**: Accident zone detection and alerting
2. **WebSocket Integration**: Real-time location broadcasting
3. **Frontend Visualization**: Live heatmap with vehicle markers and alerts
4. **Testing Simulator**: Vehicle tracking simulator for development/testing

---

## System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Vehicle (Driver App)                     │
│                                                            │
│  - Sends GPS location every 2 seconds via WebSocket       │
│  - Receives real-time accident zone alerts               │
└────────────────────┬────────────────────────────────────┘
                     │ WebSocket
                     │ tracking:location:update
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend Server                           │
│                                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Tracking Socket Handler                           │  │
│  │  - Receives location updates                       │  │
│  │  - Stores in MongoDB & Redis                       │  │
│  │  - Triggers accident zone checks                   │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                      │
│                   ▼                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  AccidentZoneAlerting Service                       │  │
│  │  - Checks proximity to accident zones              │  │
│  │  - Calculates distance & severity                  │  │
│  │  - Logs alerts to DB                               │  │
│  │  - Prevents duplicate alerts (1min buffer)         │  │
│  └────────────────┬─────────────────────────────────┘  │
│                   │                                      │
│                   ▼                                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Broadcasting (WebSocket)                           │  │
│  │  - Send alerts to driver                            │  │
│  │  - Send to fleet managers                           │  │
│  │  - Send to dashboard                                │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬──────────────────────────────────────┘
                     │
    ┌────────────────┴────────────┐
    │                             │
    ▼                             ▼
┌──────────────────┐      ┌──────────────────┐
│  MongoDB         │      │  Fleet Manager   │
│                  │      │  Dashboard       │
│ - LiveTracking   │      │                  │
│ - LiveTrackingAlert     │  Sees real-time  │
│ - AccidentZone   │      │  vehicles & alerts
└──────────────────┘      └──────────────────┘
```

---

## Database Models

### 1. AccidentZone

Stores accident-prone areas with severity and frequency data.

```javascript
{
  location: { type: "Point", coordinates: [lng, lat] },
  severity: "low|medium|high",
  accidentCount: Number,
  lastUpdated: Date
}
```

### 2. LiveTracking

Stores real-time vehicle location updates (30-day TTL).

```javascript
{
  vehicleId: String,
  driverId: String,
  shipmentId: String,
  coordinates: { type: "Point", coordinates: [lng, lat] },
  speed: Number,          // km/h
  heading: Number,        // 0-360 degrees
  accuracy: Number,       // meters
  altitude: Number,       // meters
  timestamp: Date,
  isMoving: Boolean,
  ignitionStatus: String
}
```

### 3. LiveTrackingAlert

Logs all accident zone alerts (90-day TTL).

```javascript
{
  vehicleId: String,
  driverId: String,
  shipmentId: String,
  accidentZoneId: ObjectId,
  distance: Number,       // meters
  severity: "low|medium|high",
  accidentCount: Number,
  zoneLocation: Point,
  vehicleLocation: Point,
  status: "active|acknowledged|resolved",
  acknowledgedAt: Date,
  metadata: Mixed
}
```

---

## Quick Start

### 1. Ensure Database Seeding

First, seed accident zones into the database:

```bash
cd LogiMetrics/backend
npm run seed
# or if seed script doesn't exist:
node scripts/seed-accident-zones.js
```

### 2. Start Backend Server

```bash
cd LogiMetrics/backend
npm start
# or
node src/index.js
```

Expected output:

```
Step 1: MongoDB connected successfully
Step 2: Server running on port 3000
Step 3: Socket.io initialized
Step 4: Cron jobs started
```

### 3. Start Frontend

```bash
cd LogiMetrics/frontend/logimatrix-app
npm run dev
```

Navigate to: `http://localhost:5173/accidents`

### 4. Start Vehicle Simulator

In a new terminal:

```bash
cd LogiMetrics/backend
node scripts/tracking-simulator.js --vehicle=TRUCK001 --speed=60
```

---

## Testing Scenarios

### Scenario 1: Basic Live Tracking

**Goal**: Verify real-time location updates and vehicle markers on map

**Steps**:

1. Start all services (backend, frontend, simulator)
2. Navigate to `/accidents` page
3. Watch the map for a green vehicle marker
4. Verify marker moves every 2 seconds
5. Click marker to see location details

**Expected Result**:

- Green vehicle marker appears and moves on the map
- Popup shows vehicle ID, speed, heading, and last update time
- Console shows location updates: `📍 [HH:MM:SS] TRUCK001: 18.5204, 73.8567`

---

### Scenario 2: Accident Zone Alert

**Goal**: Verify alerts trigger when vehicle enters accident-prone zone

**Setup**:

```bash
# Check which accident zones exist
curl http://localhost:3000/api/v1/accidents/heatmap
```

**Steps**:

1. Find the coordinates of an accident zone from the heatmap API
2. Start simulator with starting position near that zone:
   ```bash
   node scripts/tracking-simulator.js \
     --vehicle=TEST-TRUCK \
     --lat=18.58 \
     --lng=73.91 \
     --route=downtown_to_airport
   ```
3. Watch the map - vehicle should approach accident zone
4. Look for alert in the bottom panel

**Expected Result**:

- Alert appears in "Active Accident Zone Alerts" panel
- Alert shows: severity, distance, accident count
- Vehicle marker flashes red with warning symbol (⚠)
- Console logs: `🚨🚨🚨 ACCIDENT ZONE ALERT!`
- Alert disappears after 10 seconds (or when vehicle moves away)

---

### Scenario 3: Multiple Vehicles

**Goal**: Test system with multiple vehicles entering different zones

**Steps**:

1. Start first simulator:

   ```bash
   node scripts/tracking-simulator.js \
     --vehicle=TRUCK001 \
     --route=downtown_to_airport
   ```

2. In another terminal, start second simulator:

   ```bash
   node scripts/tracking-simulator.js \
     --vehicle=TRUCK002 \
     --route=highway_route
   ```

3. Watch both vehicles on map
4. Trigger alerts for both

**Expected Result**:

- Both vehicles show as green markers
- Multiple alerts appear in the panel
- Each alert correctly shows its vehicle ID

---

### Scenario 4: Check Alert History

**Goal**: Verify alerts are logged and queryable

**Steps**:

1. Generate some alerts by running simulators
2. Query vehicle alerts:
   ```bash
   curl http://localhost:3000/api/v1/accidents/vehicle/TRUCK001/alerts
   ```
3. Get statistics:
   ```bash
   curl http://localhost:3000/api/v1/accidents/vehicle/TRUCK001/stats
   ```

**Expected Result**:

- Alert list shows all triggered alerts with details
- Statistics show count by severity and by hour
- Top zones list shows which zones had most alerts

---

### Scenario 5: Acknowledge Alert

**Goal**: Test alert acknowledgment workflow

**Steps**:

1. Generate an alert from simulator
2. Get alert ID from the alerts response above
3. Acknowledge the alert:
   ```bash
   curl -X PATCH http://localhost:3000/api/v1/accidents/alerts/{alertId}/acknowledge \
     -H "Content-Type: application/json" \
     -d '{"acknowledgedBy": "driver-001"}'
   ```
4. Verify status changed to "acknowledged"

---

### Scenario 6: Verify Data Persistence

**Goal**: Ensure data is properly stored in MongoDB

**Steps**:

1. Generate some tracking data and alerts
2. Access MongoDB directly:

   ```bash
   # Using mongo shell or MongoDB Compass
   use logimetrics_db

   db.live_tracking.find().limit(5).pretty()
   db.live_tracking_alerts.find().pretty()
   db.accident_zones.findOne()
   ```

**Expected Result**:

- Live tracking records with geospatial coordinates
- Alert records with correct severity and distances
- All timestamps are valid

---

## API Endpoints

### Get Heatmap Data

```
GET /api/v1/accidents/heatmap
Response: { success: true, data: [AccidentZones] }
```

### Get Nearby Zones

```
GET /api/v1/accidents/nearby-zones?lat=18.52&lng=73.85&radius=5000
Response: { success: true, data: { zones: [...], count: N } }
```

### Get Vehicle Alerts

```
GET /api/v1/accidents/vehicle/{vehicleId}/alerts?status=active&hours=24&limit=50
Response: { success: true, data: { alerts: [...], count: N } }
```

### Get Alert Statistics

```
GET /api/v1/accidents/vehicle/{vehicleId}/stats?hours=24
Response: { success: true, data: { vehicleId, stats: {...} } }
```

### Acknowledge Alert

```
PATCH /api/v1/accidents/alerts/{alertId}/acknowledge
Body: { "acknowledgedBy": "driver-001" }
Response: { success: true, data: { ...updatedAlert } }
```

### Get Active Alerts

```
GET /api/v1/accidents/active?limit=100
Response: { success: true, data: { alerts: [...], count: N } }
```

---

## WebSocket Events

### Driver Sends Location

```javascript
socket.emit("tracking:location:update", {
  vehicleId: "TRUCK001",
  driverId: "driver-001",
  shipmentId: "shipment-123",
  latitude: 18.5204,
  longitude: 73.8567,
  speed: 60,
  heading: 45,
  accuracy: 7,
  altitude: 175,
});
```

### Driver Receives Alert

```javascript
socket.on("alert:accident-zone", {
  zones: [
    {
      zoneId: "...",
      zoneName: "Accident Zone (high severity)",
      distance: 342,
      accidentCount: 15,
      severity: "high",
      message: "⚠️ HIGH ACCIDENT ZONE ALERT!...",
      alertId: "...",
      timestamp: Date,
    },
  ],
  location: { latitude: 18.58, longitude: 73.91 },
});
```

### Fleet Manager Receives Alert

```javascript
socket.on('vehicle:accident-zone-alert', {
  vehicleId: 'TRUCK001',
  driverId: 'driver-001',
  zones: [...],
  location: { latitude, longitude },
  timestamp: Date
});
```

---

## Simulator Commands

### Basic Usage

```bash
node scripts/tracking-simulator.js --vehicle=TRUCK001
```

### With Custom Parameters

```bash
node scripts/tracking-simulator.js \
  --vehicle=TRUCK001 \
  --driver=driver-001 \
  --shipment=shipment-123 \
  --speed=80 \
  --lat=18.55 \
  --lng=73.90
```

### With Predefined Routes

```bash
# Route 1: Downtown to Airport
node scripts/tracking-simulator.js --vehicle=TRUCK001 --route=downtown_to_airport

# Route 2: Airport to Downtown
node scripts/tracking-simulator.js --vehicle=TRUCK002 --route=airport_to_downtown

# Route 3: Highway Route
node scripts/tracking-simulator.js --vehicle=TRUCK003 --route=highway_route
```

### Multiple Simulators at Once

```bash
# Terminal 1
node scripts/tracking-simulator.js --vehicle=TRUCK001 --route=downtown_to_airport &

# Terminal 2
node scripts/tracking-simulator.js --vehicle=TRUCK002 --route=highway_route &

# Terminal 3
node scripts/tracking-simulator.js --vehicle=TRUCK003 --route=airport_to_downtown &

# To stop all:
# Press Ctrl+C in each terminal
```

---

## Performance & Considerations

### Alert Rate Limiting

To prevent alert spam, the system implements a **1-minute buffer per zone**:

- Same vehicle won't get alerted twice for the same zone within 60 seconds
- Can be adjusted in `AccidentZoneAlerting.js`: `BUFFER_TIME_MS`

### Search Radius

- Default alert radius: **1000 meters** (1km)
- Can be adjusted in `AccidentZoneAlerting.js`: `ALERT_RADIUS_METERS`

### Data Retention

- **LiveTracking**: 30 days (TTL index)
- **LiveTrackingAlert**: 90 days (TTL index)

### Real-time Performance

- Location updates every **2 seconds** (configurable in simulator)
- WebSocket broadcasting is instant
- Geospatial queries are indexed for performance

---

## Troubleshooting

### No Alerts Appearing

1. **Check if accident zones exist**:

   ```bash
   curl http://localhost:3000/api/v1/accidents/heatmap
   ```

   If empty, seed data using:

   ```bash
   node scripts/seed-accident-zones.js
   ```

2. **Check WebSocket connection**:

   - Browser console should show: `Connected to tracking server`
   - Check Network tab for WebSocket connections

3. **Verify vehicle position**:
   - Simulator console should show location updates
   - Check if vehicle is actually near an accident zone

### Alerts Not Persisting in Database

1. **Check MongoDB connection**:

   ```bash
   mongo mongodb://localhost:27017/logimetrics_db
   db.live_tracking_alerts.count()
   ```

2. **Verify MongoDB indexes**:
   ```bash
   db.live_tracking_alerts.getIndexes()
   ```

### Performance Issues

1. **Reduce update frequency**:

   ```bash
   node scripts/tracking-simulator.js --vehicle=TRUCK001
   # Modify: const updateInterval = 5000; // 5 seconds
   ```

2. **Limit vehicle markers on map**:
   - Frontend can limit to 20 most recent vehicles
   - Implement clustering for large numbers

---

## Production Deployment

### Essential Steps

1. **Seed production accident zones**:

   - Use real historical accident data
   - Verify locations and counts

2. **Configure environment**:

   ```bash
   # .env
   LOCATION_CACHE_TTL=120
   ACCIDENT_ALERT_RADIUS=1500  # meters
   ALERT_BUFFER_TIME=180000    # 3 minutes instead of 1
   SOCKET_UPDATE_INTERVAL=5000  # 5 seconds for real vehicles
   ```

3. **Set up monitoring**:

   - Monitor WebSocket connection count
   - Alert on high alert rates
   - Track database sizes

4. **Test with real GPS**:
   - Use actual device location APIs
   - Test with real drivers for 1-2 weeks

---

## Files Reference

| File                                              | Purpose             |
| ------------------------------------------------- | ------------------- |
| `backend/src/services/AccidentZoneAlerting.js`    | Core alerting logic |
| `backend/src/models/mongodb/LiveTrackingAlert.js` | Alert data model    |
| `backend/src/sockets/tracking.socket.js`          | WebSocket handler   |
| `backend/src/routes/accident.routes.js`           | REST API endpoints  |
| `backend/scripts/tracking-simulator.js`           | Testing simulator   |
| `frontend/src/components/ui/LeafletHeatmap.jsx`   | Map visualization   |

---

## Next Steps

1. ✅ Implement live tracking system
2. ✅ Add accident zone alerting
3. ✅ Create testing simulator
4. **TODO**: Implement driver mobile app location service
5. **TODO**: Add SMS/Push notifications for alerts
6. **TODO**: Implement routing optimization based on accident zones
7. **TODO**: Add machine learning for predictive alerts

---

**Last Updated**: 2025-01-10  
**System Status**: ✅ Ready for Testing
