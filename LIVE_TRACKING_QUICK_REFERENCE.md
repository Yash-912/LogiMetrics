# Live Accident Zone Tracking - Quick Reference

## 🚀 Quick Start (5 minutes)

```bash
# Terminal 1: Backend
cd LogiMetrics/backend
npm install socket.io  # if not already installed
npm start

# Terminal 2: Seed accident zones
cd LogiMetrics/backend
node scripts/seed-accident-zones.js

# Terminal 3: Frontend
cd LogiMetrics/frontend/logimatrix-app
npm run dev
# Visit: http://localhost:5173/accidents

# Terminal 4: Simulator
cd LogiMetrics/backend
node scripts/tracking-simulator.js --vehicle=TRUCK001 --route=downtown_to_airport
```

---

## 📊 What You'll See

### On the Map

- **Green Markers** 🟢 = Active vehicles in transit
- **Red Flashing Markers** 🔴 = Vehicles in accident zones
- **Heat Layer** 🔥 = Accident-prone zones (red = more accidents)

### Alerts Panel

- Real-time alerts when vehicles enter zones
- Shows distance, severity, and accident count
- Auto-dismisses after 10 seconds

---

## 🔧 Key Features

| Feature                     | Description                                     |
| --------------------------- | ----------------------------------------------- |
| **Real-time Tracking**      | Updates every 2 seconds via WebSocket           |
| **Accident Zone Detection** | Automatically checks geospatial proximity       |
| **Smart Alerting**          | Prevents duplicate alerts (1-min buffer)        |
| **Alert Severity**          | Low, Medium, High based on distance & accidents |
| **Data Logging**            | All alerts saved for analytics                  |
| **Multi-Vehicle**           | Track multiple vehicles simultaneously          |
| **Responsive UI**           | Works on desktop and mobile                     |

---

## 📍 Predefined Routes for Testing

Run these commands to test different scenarios:

```bash
# Route 1: Downtown → Airport (passes through accident zone)
node scripts/tracking-simulator.js --vehicle=TRUCK001 --route=downtown_to_airport

# Route 2: Airport → Downtown
node scripts/tracking-simulator.js --vehicle=TRUCK002 --route=airport_to_downtown

# Route 3: Highway route (scenic route)
node scripts/tracking-simulator.js --vehicle=TRUCK003 --route=highway_route

# Custom location
node scripts/tracking-simulator.js --vehicle=TRUCK004 --lat=18.58 --lng=73.91 --speed=80
```

---

## 🎯 Testing Checklist

- [ ] All services running (backend, frontend, simulator)
- [ ] Heatmap loads with red zones
- [ ] Green vehicle marker appears on map
- [ ] Marker moves every 2 seconds
- [ ] Clicking marker shows vehicle info
- [ ] Simulator logs location updates
- [ ] When vehicle nears zone → red alert appears
- [ ] Alert shows correct distance and severity
- [ ] Vehicle marker turns red and flashes
- [ ] Alert disappears after 10 seconds
- [ ] Multiple vehicles track independently
- [ ] Alerts logged in database

---

## 📡 WebSocket Events

### Driver → Server

```javascript
// Send location (every 2 seconds from driver app)
socket.emit("tracking:location:update", {
  vehicleId: "TRUCK001",
  latitude: 18.5204,
  longitude: 73.8567,
  speed: 60,
  heading: 45,
});
```

### Server → Driver

```javascript
// Receive accident zone alert
socket.on("alert:accident-zone", (alertData) => {
  console.log("⚠️ Alert:", alertData.zones);
});
```

### Server → Fleet Manager Dashboard

```javascript
socket.on("vehicle:accident-zone-alert", (alertData) => {
  // Display alert for fleet managers
});
```

---

## 🗄️ API Endpoints

| Endpoint                                     | Method | Purpose                 |
| -------------------------------------------- | ------ | ----------------------- |
| `/api/v1/accidents/heatmap`                  | GET    | Get all accident zones  |
| `/api/v1/accidents/nearby-zones?lat=X&lng=Y` | GET    | Get zones near location |
| `/api/v1/accidents/vehicle/:id/alerts`       | GET    | Get vehicle alerts      |
| `/api/v1/accidents/vehicle/:id/stats`        | GET    | Get vehicle statistics  |
| `/api/v1/accidents/alerts/:id/acknowledge`   | PATCH  | Acknowledge an alert    |
| `/api/v1/accidents/active`                   | GET    | Get all active alerts   |

---

## 🔍 Database Queries

```javascript
// Check accident zones
db.accident_zones.find().pretty();

// View recent location updates
db.live_tracking.find().sort({ timestamp: -1 }).limit(5).pretty();

// See all alerts for a vehicle
db.live_tracking_alerts.find({ vehicleId: "TRUCK001" }).pretty();

// Count alerts by severity
db.live_tracking_alerts.aggregate([
  { $group: { _id: "$severity", count: { $sum: 1 } } },
]);
```

---

## 🚨 Alert Severity Guide

| Severity   | Distance  | Accidents | Action                              |
| ---------- | --------- | --------- | ----------------------------------- |
| **HIGH**   | < 300m    | 10+       | ⚠️ Extreme caution, consider detour |
| **MEDIUM** | 300-600m  | 5-9       | ⚠️ Slow down, stay alert            |
| **LOW**    | 600-1000m | < 5       | ℹ️ Be aware                         |

---

## ⚙️ Configuration

Edit these values in `backend/src/services/AccidentZoneAlerting.js`:

```javascript
const EARTH_RADIUS_KM = 6371; // Earth radius for distance calc
const ALERT_RADIUS_METERS = 1000; // Zone detection radius (1km)
const BUFFER_TIME_MS = 60000; // Alert cooldown (1 minute)
```

---

## 🐛 Troubleshooting

### No alerts appearing?

1. Check: `curl http://localhost:3000/api/v1/accidents/heatmap`
2. If empty: `node scripts/seed-accident-zones.js`
3. Verify simulator is near an accident zone

### WebSocket not connecting?

1. Check backend is running on port 3000
2. Check browser console for connection errors
3. Verify CORS is enabled

### Map not loading?

1. Check browser console for errors
2. Verify Leaflet libraries are loaded
3. Check API response: `curl http://localhost:3000/api/v1/accidents/heatmap`

### Alerts not saving to DB?

1. Check MongoDB is running
2. Verify collections are created
3. Check: `db.live_tracking_alerts.count()`

---

## 📊 Performance Tips

- Start with 1-2 simulators first
- Monitor browser DevTools for memory usage
- Clear old alerts: Database has automatic TTL cleanup
- Close browser tabs to reduce memory

---

## 🎓 Learning Resources

### Understanding the System

1. Read: `LIVE_TRACKING_GUIDE.md` (comprehensive guide)
2. Review: `backend/src/services/AccidentZoneAlerting.js` (core logic)
3. Study: `frontend/src/components/ui/LeafletHeatmap.jsx` (UI logic)

### Key Technologies

- **MongoDB** - Data storage with geospatial queries
- **Socket.io** - Real-time WebSocket communication
- **Leaflet** - Map visualization
- **Node.js** - Backend server

---

## 📝 File Reference

```
LogiMetrics/
├── backend/
│   ├── src/
│   │   ├── models/mongodb/
│   │   │   ├── AccidentZone.js          ← Accident zone model
│   │   │   ├── LiveTracking.js          ← Location history
│   │   │   └── LiveTrackingAlert.js     ← Alert logging
│   │   ├── services/
│   │   │   └── AccidentZoneAlerting.js  ← Core alerting service
│   │   ├── sockets/
│   │   │   └── tracking.socket.js       ← WebSocket handler
│   │   └── routes/
│   │       └── accident.routes.js       ← REST API
│   └── scripts/
│       ├── tracking-simulator.js        ← Testing simulator
│       └── seed-accident-zones.js       ← Data seeding
├── frontend/
│   └── src/
│       └── components/ui/
│           └── LeafletHeatmap.jsx       ← Map component
└── LIVE_TRACKING_GUIDE.md              ← Full documentation
```

---

## 🚀 Next Steps

1. **Test locally** with the simulator
2. **Create mobile driver app** with GPS tracking
3. **Implement push notifications** for real drivers
4. **Add routing optimization** to avoid accident zones
5. **Set up production deployment** with real data
6. **Integrate SMS alerts** for critical situations

---

**Last Updated**: 2025-01-10  
**Status**: ✅ Ready for Testing
