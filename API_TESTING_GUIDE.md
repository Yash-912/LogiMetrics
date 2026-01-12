# API Testing & Frontend Integration Guide

## Quick Start - Run Both Services

### Terminal 1: Backend Server

```bash
cd c:\Users\Archana\final_one\LogiMetrics\backend
npm run dev
```

**Expected Output:**

```
Step 1: PostgreSQL connected successfully
Step 2: MongoDB connected successfully
Step 4: Server running on port 3000 in development mode
Step 5: Socket.io initialized
Step 6: Cron jobs started
```

### Terminal 2: Frontend Server

```bash
cd c:\Users\Archana\final_one\LogiMetrics\frontend\logimatrix-app
npm run dev
```

**Expected Output:**

```
VITE v... ready in ... ms

➜  Local:   http://localhost:5173/
```

---

## Method 1: Browser Testing (Easiest)

### 1. Open Application

```
http://localhost:5173
```

### 2. You Should See:

- Login page (dark theme)
- Email & Password input fields
- "Sign In" button

### 3. Login with Credentials:

```
Email: admin@logimetrics.com
Password: Admin@123456
```

### 4. Check Browser Console (F12 → Console tab)

Look for:

- ✅ No red errors
- ✅ Token stored in localStorage
- ✅ API calls are being made

### 5. After Login

- Should redirect to dashboard
- Should show data from PostgreSQL
- Should see shipment list, vehicles, drivers, etc.

---

## Method 2: API Testing with Postman/Insomnia

### Step 1: Get JWT Token

**POST** `http://localhost:3000/api/auth/login`

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "email": "admin@logimetrics.com",
  "password": "Admin@123456"
}
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "admin@logimetrics.com",
      "role": "super_admin",
      "first_name": "Super",
      "last_name": "Admin"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  },
  "message": "Login successful"
}
```

### Step 2: Copy the Access Token

From the response, copy the `accessToken` value.

### Step 3: Test Protected API Endpoints

**GET** `http://localhost:3000/api/shipments`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**Expected Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "tracking_id": "TRACK-001",
      "order_number": "ORD-001",
      "status": "pending",
      "weight": 50,
      "created_at": "2026-01-10T..."
    },
    ...
  ],
  "message": "Shipments retrieved successfully"
}
```

---

## Method 3: Browser Network Tab Testing

### 1. Open Developer Tools

- Press `F12` in the browser
- Go to **Network** tab
- Keep the browser console open

### 2. Perform Actions in Frontend

- Login
- Click on shipments
- Click on vehicles
- Click on drivers
- Create new shipment (if button exists)

### 3. Analyze Network Requests

For each action:

- ✅ API request should appear in Network tab
- ✅ Check response status (200, 201 = good; 4xx, 5xx = bad)
- ✅ Response should have data

### 4. Common Network Issues to Check:

- **CORS Error** → Backend needs to allow frontend origin
- **401 Unauthorized** → Token missing or expired
- **404 Not Found** → API endpoint doesn't exist
- **500 Server Error** → Backend error

---

## Method 4: curl Commands (Terminal Testing)

### 1. Get Token

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@logimetrics.com",
    "password": "Admin@123456"
  }' | jq
```

### 2. Use Token to Access Protected Endpoint

```bash
# Save token to variable (Windows PowerShell)
$TOKEN = "paste_token_here"

# Test API
curl -X GET http://localhost:3000/api/shipments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq
```

### 3. Common Endpoints to Test

```bash
# Get all shipments
GET /api/shipments

# Get single shipment
GET /api/shipments/{id}

# Get all vehicles
GET /api/vehicles

# Get all drivers
GET /api/drivers

# Get companies
GET /api/companies

# Get users
GET /api/users

# Get analytics/dashboard data
GET /api/analytics/dashboard
```

---

## API Endpoints Reference

### Authentication Endpoints

```
POST   /api/auth/login              - Login user
POST   /api/auth/register           - Register user
POST   /api/auth/logout             - Logout user
POST   /api/auth/refresh-token      - Refresh token
POST   /api/auth/forgot-password    - Request password reset
```

### Shipment Endpoints

```
GET    /api/shipments               - Get all shipments
GET    /api/shipments/{id}          - Get single shipment
POST   /api/shipments               - Create shipment
PUT    /api/shipments/{id}          - Update shipment
DELETE /api/shipments/{id}          - Delete shipment
GET    /api/shipments/{id}/events   - Get shipment events (MongoDB)
GET    /api/shipments/track/{trackingId} - Track shipment
```

### Vehicle Endpoints

```
GET    /api/vehicles                - Get all vehicles
GET    /api/vehicles/{id}           - Get single vehicle
POST   /api/vehicles                - Create vehicle
PUT    /api/vehicles/{id}           - Update vehicle
DELETE /api/vehicles/{id}           - Delete vehicle
```

### Driver Endpoints

```
GET    /api/drivers                 - Get all drivers
GET    /api/drivers/{id}            - Get single driver
POST   /api/drivers                 - Create driver
PUT    /api/drivers/{id}            - Update driver
DELETE /api/drivers/{id}            - Delete driver
```

### Tracking Endpoints

```
GET    /api/tracking/live/{vehicleId}     - Get live location
GET    /api/tracking/history/{vehicleId}  - Get location history
GET    /api/tracking/nearby                - Get nearby vehicles
```

### Analytics Endpoints

```
GET    /api/analytics/dashboard     - Dashboard data
GET    /api/analytics/shipments     - Shipment analytics
GET    /api/analytics/vehicles      - Vehicle analytics
GET    /api/analytics/revenue       - Revenue analytics
```

---

## What to Check in Frontend

### 1. Login Page ✅

- [ ] Page loads without errors
- [ ] Email & password fields visible
- [ ] "Sign In" button clickable
- [ ] No console errors

### 2. After Login ✅

- [ ] Dashboard loads
- [ ] URL changes to `/dashboard` or similar
- [ ] Data appears on page (shipments, vehicles, etc.)
- [ ] Token stored in localStorage

### 3. Data Display ✅

- [ ] Shipment list showing sample data
- [ ] Vehicle list showing 3 vehicles
- [ ] Driver list showing drivers
- [ ] Company info visible

### 4. API Calls ✅

Open DevTools (F12) → Network tab:

- [ ] Login API call returns 200
- [ ] All subsequent API calls have Authorization header
- [ ] Response status 200 for all requests
- [ ] Response data matches what's displayed

### 5. Console Warnings ✅

Should NOT see:

- ❌ "Failed to fetch"
- ❌ "CORS error"
- ❌ "401 Unauthorized"
- ❌ "Invalid token"
- ❌ "Network error"

---

## Troubleshooting

### Issue: Login Page Shows but Can't Login

**Check Backend:**

```bash
cd backend
npm run dev
# Should see all steps 1-6 completed
```

**Check CORS in App.jsx:**

```javascript
// Should have backend URL configured
const API_BASE_URL = "http://localhost:3000";
```

**Check .env:**

```env
VITE_API_BASE_URL=http://localhost:3000
# or
VITE_BACKEND_URL=http://localhost:3000
```

**Solution:**

```bash
# Rebuild frontend
cd frontend/logimatrix-app
npm install
npm run dev
```

### Issue: "Failed to fetch" Error

**Cause:** Backend not running or wrong port

**Solution:**

```bash
# Make sure backend is running on port 3000
cd backend
npm run dev
```

### Issue: "401 Unauthorized" After Login

**Cause:** Token not being sent in headers

**Check:** Browser Console → Application → LocalStorage

- [ ] Should have `access_token` key
- [ ] Should have `refresh_token` key
- [ ] Should have `user` JSON data

**In frontend api.js:**

```javascript
// Should add token to headers
if (token) {
  config.headers.Authorization = `Bearer ${token}`;
}
```

### Issue: Dashboard Shows but No Data

**Possible Causes:**

1. PostgreSQL not populated → Run `npm run seed`
2. MongoDB not populated → Run `node seed-mongodb.js`
3. API endpoint not returning data → Check backend logs
4. Frontend not calling API → Check Network tab

**Solution:**

```bash
cd backend
npm run seed
node seed-mongodb.js
npm run dev
```

### Issue: Console Shows API Errors

**Check Network Tab in DevTools:**

1. Right-click on failed request → Copy as curl
2. Run the curl command in terminal
3. See actual error response
4. Check backend logs for specific error

---

## Testing Checklist

### Backend Testing

- [ ] Backend starts without errors
- [ ] PostgreSQL connects
- [ ] MongoDB connects
- [ ] All 4 MongoDB collections have data (74 records)
- [ ] PostgreSQL has seed data (users, shipments, vehicles, etc.)
- [ ] Socket.io initialized
- [ ] Cron jobs started

### Frontend Testing

- [ ] Frontend starts without errors
- [ ] Can see login page
- [ ] Can login with credentials
- [ ] Dashboard loads after login
- [ ] No CORS errors
- [ ] No token errors
- [ ] All API calls return 200 status

### API Integration Testing

- [ ] Auth endpoints working (login, refresh)
- [ ] Shipment endpoints returning data
- [ ] Vehicle endpoints returning data
- [ ] Driver endpoints returning data
- [ ] Analytics endpoints returning data
- [ ] MongoDB events retrievable

### Data Verification

- [ ] PostgreSQL has 4+ users
- [ ] PostgreSQL has 1+ companies
- [ ] PostgreSQL has 3+ vehicles
- [ ] PostgreSQL has 3+ drivers
- [ ] PostgreSQL has 5+ shipments
- [ ] MongoDB has 74 records total
- [ ] MongoDB has audit logs
- [ ] MongoDB has shipment events
- [ ] MongoDB has tracking data
- [ ] MongoDB has telemetry data

---

## Advanced Testing

### 1. Test Real-time Features (Socket.io)

Open browser console:

```javascript
// Socket.io should connect automatically
console.log("Open DevTools → Network → WS tab");
// Look for: ws://localhost:3000/socket.io/
```

### 2. Test Authentication Flow

1. Login
2. Check token expires in 15 minutes
3. Try making API call after token expires
4. Should automatically refresh token
5. API call should succeed with new token

### 3. Test Error Handling

1. Try login with wrong password
2. Should show error message
3. Try accessing protected route without token
4. Should redirect to login
5. Try accessing non-existent resource
6. Should show 404 error

### 4. Monitor Performance

1. Open DevTools
2. Go to Performance tab
3. Record user actions
4. Check:
   - Page load time
   - API response time (should be <500ms)
   - Memory usage (should be stable)
   - No memory leaks

---

## Sample Test Flow

```
1. Start Backend
   → npm run dev (in backend folder)

2. Start Frontend
   → npm run dev (in frontend folder)

3. Open Browser
   → http://localhost:5173

4. Open DevTools (F12)
   → Network tab + Console tab

5. Login
   → Email: admin@logimetrics.com
   → Password: Admin@123456
   → Click "Sign In"

6. Check Network Tab
   → POST /api/auth/login should return 200
   → Response should have accessToken

7. Verify Data Loads
   → Dashboard should show shipments
   → Network tab should show GET /api/shipments returning 200

8. Check Console
   → Should have no red errors
   → Should have localStorage with token

9. Test Other Pages
   → Click on different menu items
   → Verify each page loads data from API

10. Success Indicators ✅
    → No CORS errors
    → No auth errors
    → All pages load with data
    → No console errors
```

---

## Next Steps

After verifying APIs are working:

1. **Test CRUD Operations**

   - Create new shipment
   - Update shipment status
   - Delete test records

2. **Test Real-time Data**

   - Make API call to update shipment
   - MongoDB should create ShipmentEvent
   - Frontend should show real-time update

3. **Test User Roles**

   - Login with different users
   - Verify role-based access control
   - Some features should be hidden for lower roles

4. **Test Performance**

   - Load large datasets
   - Check API response times
   - Monitor database queries

5. **Test Edge Cases**
   - Invalid data
   - Missing required fields
   - SQL injection attempts
   - XSS attempts

---

**Good Luck! 🚀 All systems should be working correctly now.**
