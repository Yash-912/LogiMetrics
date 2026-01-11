# LogiMatrix Stakeholder Flow Optimization

## Overview
This document summarizes the role-based dashboard routing and stakeholder flows implemented in the LogiMatrix platform.

---

## Stakeholder Mapping

| Stakeholder | Backend Role | Frontend Dashboard | Key Pages |
|-------------|--------------|-------------------|-----------|
| **Platform Admin** | `super_admin`, `admin` | AdminDashboard | All management pages, Audit Logs, Settings |
| **Business/Shipper** | `manager`, `shipper`, `user` | BusinessDashboard | Create Shipment, My Shipments, Invoices, Track |
| **Transporter/Fleet Owner** | `dispatcher`, `transporter` | TransporterDashboard | Vehicles, Drivers, Routes, Live Tracking, Earnings |
| **Driver** | `driver` | DriverPortalPage | Assigned Trips, Update Status, POD Upload |
| **Customer (End User)** | `customer` (or no login) | TrackingPage | Track Order, Pay Invoice |

---

## Role-Based Routing

When a user logs in, they are automatically redirected to their role-specific dashboard:

```javascript
// In App.jsx - RoleBasedDashboard component
switch (role) {
    case 'super_admin':
    case 'admin':
        return <AdminDashboard />;
    
    case 'dispatcher':
    case 'transporter':
        return <TransporterDashboard />;
    
    case 'driver':
        return <DriverPortalPage />;
    
    case 'manager':
    case 'shipper':
    case 'user':
    case 'customer':
    default:
        return <BusinessDashboard />;
}
```

---

## New Dashboard Routes

| Route | Component | Access |
|-------|-----------|--------|
| `/dashboard` | RoleBasedDashboard | Authenticated (routes by role) |
| `/business` | BusinessDashboard | Direct access for shippers |
| `/transporter` | TransporterDashboard | Direct access for fleet owners |
| `/driver-portal` | DriverPortalPage | Direct access for drivers |
| `/track` | TrackingPage | Public (no login required) |

---

## Registration Flow

During registration, users select their profile type:

1. **Business / Shipper** - Companies that want to ship products
2. **Transporter / Fleet Owner** - Owns vehicles & drivers
3. **Driver** - Executes deliveries
4. **Customer** - Tracks personal orders

Registration redirects users to their appropriate dashboard after success.

---

## Page-to-Stakeholder Mapping

### Public Pages (No Login)
- `/` - LandingPage
- `/movers-packers` - MoversPackers info
- `/truck-partners` - TruckPartners info
- `/enterprise` - Enterprise info
- `/track` - TrackingPage (with payment)
- `/login`, `/register`, `/forgot-password` - Auth pages

### Business/Shipper Pages
- `/business` - BusinessDashboard
- `/shipments/new` - CreateShipmentPage
- `/shipments` - ShipmentManagementPage
- `/invoices` - InvoiceManagementPage
- `/transactions` - TransactionsPage

### Transporter/Fleet Owner Pages
- `/transporter` - TransporterDashboard
- `/vehicles` - VehicleManagementPage
- `/drivers` - DriverManagementPage
- `/routes` - RouteManagementPage
- `/tracking/live` - LiveTrackingPage

### Driver Pages
- `/driver-portal` - DriverPortalPage

### Admin Pages (Full Access)
- `/dashboard` - AdminDashboard
- All management pages
- `/audit-logs` - AuditLogsPage
- `/settings` - CompanySettingsPage
- `/locations` - LocationManagementPage
- `/accidents` - AccidentHeatmap

---

## Files Modified/Created

### New Files
- `src/pages/BusinessDashboard.jsx` - Shipper-focused dashboard
- `src/pages/TransporterDashboard.jsx` - Fleet owner-focused dashboard

### Modified Files
- `src/App.jsx` - Added role-based routing
- `backend/src/models/mongodb/User.js` - Added shipper/transporter roles

---

## End-to-End Flows

### Flow 1: Business Creates Shipment
1. Business registers (role: shipper) → BusinessDashboard
2. Clicks "Create Shipment" → CreateShipmentPage
3. Fills pickup/delivery details
4. System generates tracking number
5. Shipment visible in "My Shipments"

### Flow 2: Transporter Assigns Driver
1. Transporter registers (role: transporter) → TransporterDashboard
2. Views pending shipments
3. Assigns vehicle + driver
4. Driver gets notification

### Flow 3: Driver Executes Delivery
1. Driver logs in → DriverPortalPage
2. Sees assigned trips
3. Starts trip → GPS tracking
4. Updates status (picked up → in transit → delivered)
5. Uploads POD

### Flow 4: Customer Tracks & Pays
1. Customer visits /track (no login)
2. Enters tracking number
3. Sees live status + ETA
4. When arrived → Pays via Stripe
5. Delivery confirmed

---

## Next Steps (Future Enhancements)

1. ~~**Connect Landing Pages to Registration**~~ ✅ **COMPLETED**
   - MoversPackers → Register as Shipper
   - TruckPartners → Register as Transporter/Driver
   - Enterprise → Contact form + Register

2. **Notifications System** (TODO)
   - Driver assignment notifications
   - Status update notifications
   - Payment confirmations

3. **Analytics Dashboards** (TODO)
   - Business: Delivery success rate
   - Transporter: Fleet utilization
   - Admin: Platform performance

---

## Landing Page → Registration Flow

| Landing Page | Primary CTA | Redirects To |
|--------------|-------------|--------------|
| `/movers-packers` | "Get Started as Business" | `/register?role=shipper` |
| `/truck-partners` | "Join as Fleet Owner" | `/register?role=transporter` |
| `/truck-partners` | "Join as Driver" | `/register?role=driver` |
| `/enterprise` | "Schedule Demo" | Contact Form Modal |
| `/enterprise` | "Get Started Now" | `/register?role=shipper` |

The registration page automatically reads the `?role=` query parameter and pre-selects the appropriate user type.

---

## Summary of Changes Made

### Phase 1: Role-Based Dashboard Routing ✅
- Created `RoleBasedDashboard` component in App.jsx
- Routes users to appropriate dashboard based on their role

### Phase 2: Business/Shipper Portal ✅
- Created `BusinessDashboard.jsx`
- Focused on: Create Shipment, Track Orders, View Invoices

### Phase 3: Transporter/Fleet Owner Portal ✅
- Created `TransporterDashboard.jsx`
- Focused on: Vehicle Management, Driver Management, Earnings

### Phase 4: Connect Landing Pages ✅
- Updated `MoversPackers.jsx` - Links to shipper registration
- Updated `TruckPartners.jsx` - Links to transporter/driver registration
- Updated `Enterprise.jsx` - Added contact form + registration link
- Updated `RegisterPage.jsx` - Reads role from URL query parameter
