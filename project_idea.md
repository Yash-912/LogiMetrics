# LogiMetrics - Next-Gen Logistics Platform

## Project Overview

A comprehensive logistics and fleet management platform with real-time tracking, payment processing, route optimization, and ML-powered predictions. Built with a modern tech stack supporting multi-tenant architecture.

---

## Tech Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **ORM**: Sequelize (PostgreSQL), Mongoose (MongoDB)
- **Databases**: PostgreSQL (relational), MongoDB (tracking/logs), Redis (caching)
- **Authentication**: JWT (access + refresh tokens), bcrypt
- **Real-time**: Socket.io
- **Payments**: Razorpay, Stripe
- **Email/SMS**: SendGrid, Twilio
- **Maps**: Google Maps API, Mapbox
- **Storage**: AWS S3
- **Testing**: Jest, Supertest

### ML Service
- **Runtime**: Python 3.10+
- **Framework**: Flask
- **ML Libraries**: scikit-learn, pandas, numpy, joblib

### Frontend
- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS
- **State**: Redux Toolkit, React Query
- **Maps**: React-Leaflet, Mapbox GL
- **Charts**: Recharts
- **Forms**: React Hook Form, Zod

---

## Directory Structure

```
D:\LogiMetrics\
├── backend/
│   ├── migrations/
│   ├── scripts/
│   ├── seeders/
│   └── src/
│       ├── config/
│       ├── controllers/
│       ├── jobs/
│       ├── middleware/
│       ├── models/
│       │   ├── mongodb/
│       │   └── postgres/
│       ├── routes/
│       ├── services/
│       ├── sockets/
│       ├── tests/
│       │   ├── fixtures/
│       │   ├── integration/
│       │   └── unit/
│       ├── utils/
│       └── validators/
├── frontend/
│   └── public/
├── ml-service/
│   ├── data/
│   │   ├── test/
│   │   └── training/
│   ├── models/
│   ├── notebooks/
│   ├── services/
│   ├── tests/
│   └── utils/
├── deployment/
│   ├── kubernetes/
│   ├── scripts/
│   └── terraform/
├── docs/
└── logistics-platform/
```

---

## COMPLETED FILES ✅

### Root Configuration
| File | Description |
|------|-------------|
| `logistics-platform/README.md` | Project documentation and setup instructions |
| `logistics-platform/.gitignore` | Git ignore rules for all services |
| `logistics-platform/docker-compose.yml` | Multi-container Docker orchestration |
| `logistics-platform/.env.example` | Environment variables template |

### Backend Configuration
| File | Description |
|------|-------------|
| `backend/package.json` | Node.js dependencies and scripts |
| `backend/.env.example` | Backend environment variables template |
| `backend/nodemon.json` | Development server configuration |
| `backend/jest.config.js` | Jest testing configuration |
| `backend/Dockerfile` | Docker container configuration |
| `backend/.dockerignore` | Docker ignore rules |

### Backend Entry Points
| File | Description |
|------|-------------|
| `backend/src/index.js` | Main entry point with graceful shutdown, DB initialization |
| `backend/src/app.js` | Express app with helmet, CORS, compression, morgan |

### Backend Config Files (`backend/src/config/`)
| File | Description |
|------|-------------|
| `database.js` | PostgreSQL Sequelize connection configuration |
| `mongodb.js` | MongoDB Mongoose connection configuration |
| `redis.js` | Redis client configuration with pub/sub |
| `socket.js` | Socket.io server configuration with room management |
| `aws.js` | AWS S3 client configuration |
| `payment.js` | Razorpay and Stripe SDK configuration |
| `email.js` | SendGrid email service configuration |
| `sms.js` | Twilio SMS service configuration |
| `maps.js` | Google Maps and Mapbox API configuration |

### Backend Utilities (`backend/src/utils/`)
| File | Description |
|------|-------------|
| `logger.util.js` | Winston logger with file rotation |
| `jwt.util.js` | JWT token generation and verification |
| `bcrypt.util.js` | Password hashing and comparison |
| `response.util.js` | Standardized API response helpers |
| `validation.util.js` | Custom validation helpers |
| `dateTime.util.js` | Date/time formatting and calculations |
| `calculations.util.js` | Distance, pricing, ETA calculations |
| `fileUpload.util.js` | S3 upload/delete utilities |

### PostgreSQL Models (`backend/src/models/postgres/`)
| File | Description |
|------|-------------|
| `index.js` | Sequelize instance and model associations |
| `User.js` | User model with roles, auth, profile |
| `Company.js` | Multi-tenant company model |
| `Role.js` | Role-based access control roles |
| `Permission.js` | Granular permissions model |
| `Shipment.js` | Shipment/order management model |
| `Vehicle.js` | Fleet vehicle model |
| `Driver.js` | Driver profile and license model |
| `Route.js` | Route planning and optimization model |
| `Invoice.js` | Billing and invoice model |
| `Transaction.js` | Payment transaction model |
| `PricingRule.js` | Dynamic pricing rules model |
| `Document.js` | Document/file management model |
| `Notification.js` | User notification model |

### MongoDB Models (`backend/src/models/mongodb/`)
| File | Description |
|------|-------------|
| `index.js` | Mongoose connection and model exports |
| `LiveTracking.js` | Real-time GPS tracking with GeoJSON |
| `ShipmentEvent.js` | Shipment status event history |
| `VehicleTelemetry.js` | Vehicle sensor/diagnostic data |
| `AuditLog.js` | System audit trail with TTL |

### Backend Middleware (`backend/src/middleware/`)
| File | Description |
|------|-------------|
| `auth.middleware.js` | JWT authentication, User lookup |
| `rbac.middleware.js` | Role-based access control with hierarchy |
| `validation.middleware.js` | Express-validator integration |
| `error.middleware.js` | Global error handler, AppError class |
| `rateLimit.middleware.js` | Rate limiting for various endpoints |
| `upload.middleware.js` | Multer file upload configuration |

### Backend Validators (`backend/src/validators/`)
| File | Description |
|------|-------------|
| `auth.validator.js` | Login, register, password reset, refresh token validation rules |
| `user.validator.js` | User CRUD validation - create, update, profile, password change |
| `company.validator.js` | Company registration, update, settings validation |
| `shipment.validator.js` | Shipment create, update, status change, bulk operations validation |
| `vehicle.validator.js` | Vehicle registration, update, maintenance, status validation |
| `driver.validator.js` | Driver onboarding, license, availability, assignment validation |
| `route.validator.js` | Route creation, waypoints, optimization request validation |
| `payment.validator.js` | Payment initiation, refund, invoice validation |
| `document.validator.js` | Document upload, type, metadata validation |
| `notification.validator.js` | Notification preferences, mark read validation |
| `analytics.validator.js` | Report date ranges, filters, export validation |
| `index.js` | Export all validators |

### Backend Controllers (`backend/src/controllers/`)
| File | Description |
|------|-------------|
| `auth.controller.js` | Register, login, logout, refresh tokens, password reset, verify email |
| `user.controller.js` | CRUD users, profile management, avatar upload, activity log |
| `company.controller.js` | Company CRUD, settings, subscription, team management |
| `shipment.controller.js` | Create/update shipments, status updates, tracking, POD upload |
| `vehicle.controller.js` | Vehicle CRUD, maintenance records, fuel logs, status management |
| `driver.controller.js` | Driver CRUD, license management, availability, performance metrics |
| `route.controller.js` | Route CRUD, optimization requests, waypoint management |
| `tracking.controller.js` | Real-time location updates, geofence events, history retrieval |
| `payment.controller.js` | Payment initiation, webhook handlers, refunds, transaction history |
| `invoice.controller.js` | Invoice generation, PDF export, payment status, recurring invoices |
| `notification.controller.js` | Get notifications, mark read, preferences, push subscriptions |
| `analytics.controller.js` | Dashboard stats, reports, exports, KPI calculations |
| `document.controller.js` | Upload, download, delete documents, document types, versioning, sharing |
| `pricing.controller.js` | Pricing rules CRUD, rate calculation, quotes, zones |
| `admin.controller.js` | System settings, user management, logs, maintenance mode, impersonation |
| `webhook.controller.js` | Handle webhooks from Razorpay, Stripe, SMS providers, endpoint management |
| `index.js` | Export all controllers |

### Backend Routes (`backend/src/routes/`)
| File | Description |
|------|-------------|
| `auth.routes.js` | POST /login, /register, /logout, /refresh, /forgot-password, /reset-password, /verify-email, /change-password, /me |
| `user.routes.js` | GET/POST/PUT/DELETE /users, /users/:id, /users/me/profile, /users/me/avatar, /users/me/activity, /users/:id/status, /users/bulk |
| `company.routes.js` | GET/POST/PUT/DELETE /companies, /companies/:id, /companies/:id/settings, /companies/:id/logo, /companies/:id/subscription, /companies/:id/team |
| `shipment.routes.js` | CRUD /shipments, /shipments/:id/status, /shipments/:id/track, /shipments/:id/events, /shipments/:id/assign, /shipments/:id/pod, /shipments/:id/cancel, /shipments/bulk |
| `vehicle.routes.js` | CRUD /vehicles, /vehicles/:id/status, /vehicles/:id/assign-driver, /vehicles/:id/maintenance, /vehicles/:id/fuel, /vehicles/:id/telemetry, /vehicles/:id/documents |
| `driver.routes.js` | CRUD /drivers, /drivers/:id/availability, /drivers/:id/license, /drivers/:id/performance, /drivers/:id/documents, /drivers/:id/photo |
| `route.routes.js` | CRUD /routes, /routes/optimize, /routes/:id/waypoints, /routes/:id/directions, /routes/:id/clone |
| `tracking.routes.js` | POST /tracking/location, GET /tracking/vehicle/:id/location, /tracking/shipment/:id/history, /tracking/geofences, /tracking/telemetry |
| `payment.routes.js` | POST /payments/process, /payments/verify, /payments/refund, GET /payments/transactions, /payments/methods, /payments/summary |
| `invoice.routes.js` | CRUD /invoices, GET /invoices/:id/pdf, POST /invoices/:id/send, /invoices/generate, /invoices/:id/items |
| `notification.routes.js` | GET /notifications, PUT /notifications/preferences, DELETE /notifications/:id, POST /notifications/push/subscribe |
| `analytics.routes.js` | GET /analytics/dashboard, /analytics/shipments, /analytics/revenue, /analytics/fleet, /analytics/kpis, POST /analytics/export |
| `document.routes.js` | POST /documents/upload, GET /documents/:id, /documents/:id/download, DELETE /documents/:id, /documents/:id/share, /documents/:id/versions |
| `pricing.routes.js` | CRUD /pricing/rules, GET /pricing/zones, POST /pricing/calculate, /pricing/quotes, /pricing/quotes/:id/convert |
| `admin.routes.js` | GET /admin/users, /admin/companies, /admin/settings, /admin/audit-logs, /admin/health, POST /admin/maintenance, /admin/broadcast |
| `webhook.routes.js` | POST /webhooks/stripe, /webhooks/twilio, CRUD /webhooks/endpoints, GET /webhooks/deliveries, /webhooks/events |
| `index.js` | Main router combining all route modules with health check and API info endpoints |

---

### Backend Services - COMPLETED (`backend/src/services/`) ✅

| File | Description |
|------|-------------|
| `auth.service.js` | Token generation, validation, password reset, login/logout, email verification |
| `user.service.js` | User business logic, profile management, bulk operations, activity logs |
| `company.service.js` | Company operations, subscription handling, team management, settings |
| `shipment.service.js` | Shipment lifecycle, status transitions, POD upload, bulk operations |
| `vehicle.service.js` | Vehicle management, maintenance scheduling, fuel logs, telemetry |
| `driver.service.js` | Driver assignment, availability, performance metrics, license verification |
| `route.service.js` | Route calculation, optimization with Maps APIs, waypoint management |
| `tracking.service.js` | GPS processing, geofencing, telemetry alerts, ETA calculation |
| `payment.service.js` | Razorpay/Stripe integration, transaction processing, refunds, webhooks |
| `invoice.service.js` | Invoice generation, PDF creation, email delivery |
| `notification.service.js` | Multi-channel notifications (email, SMS, push, in-app) |
| `analytics.service.js` | KPI calculations, report generation, data aggregation |
| `pricing.service.js` | Dynamic pricing calculation, quote generation |
| `email.service.js` | Email template rendering, SendGrid integration |
| `sms.service.js` | SMS sending, OTP generation, Twilio integration |
| `maps.service.js` | Geocoding, distance matrix, route optimization |
| `ml.service.js` | ML microservice integration for predictions |
| `cache.service.js` | Redis caching operations |
| `queue.service.js` | Background job queue management |
| `index.js` | Export all services |


### Backend Jobs (`backend/src/jobs/`)

| File | Description |
|------|-------------|
| `index.js` | Job scheduler initialization (node-cron) |
| `invoice.job.js` | Auto-generate recurring invoices, send reminders |
| `notification.job.js` | Process notification queue, cleanup old notifications |
| `tracking.job.js` | Archive old tracking data, cleanup stale sessions |
| `analytics.job.js` | Generate daily/weekly/monthly reports |
| `maintenance.job.js` | Vehicle maintenance reminders, license expiry alerts |
| `cleanup.job.js` | Database cleanup, log rotation, temp file removal |
| `sync.job.js` | External system synchronization, data reconciliation |

### Backend Sockets - COMPLETED (`backend/src/sockets/`) ✅

| File | Description |
|------|-------------|
| `index.js` | Socket.io event handlers initialization, namespace creation |
| `tracking.socket.js` | Real-time GPS updates, location broadcasting, telemetry, geofence events |
| `notification.socket.js` | Live notification delivery, read status, typed notifications |
| `shipment.socket.js` | Shipment status change events, POD submission, ETA updates |
| `chat.socket.js` | Driver-dispatcher communication, typing indicators, location sharing |
| `dashboard.socket.js` | Live dashboard metrics updates, fleet status, alerts |

### Backend Tests - COMPLETED ✅

#### Unit Tests (`backend/src/tests/unit/`)
| File | Description |
|------|-------------|
| `auth.test.js` | Authentication logic tests |
| `user.test.js` | User service tests |
| `shipment.test.js` | Shipment service tests |
| `pricing.test.js` | Pricing calculation tests |
| `utils.test.js` | Utility function tests |

#### Integration Tests (`backend/src/tests/integration/`)
| File | Description |
|------|-------------|
| `auth.integration.test.js` | Auth API endpoint tests |
| `shipment.integration.test.js` | Shipment API endpoint tests |
| `payment.integration.test.js` | Payment flow tests |
| `tracking.integration.test.js` | Tracking API tests |

#### Test Fixtures (`backend/src/tests/fixtures/`)
| File | Description |
|------|-------------|
| `users.fixture.js` | Mock user data |
| `shipments.fixture.js` | Mock shipment data |
| `companies.fixture.js` | Mock company data |

### Backend Migrations - COMPLETED (`backend/migrations/`) ✅
| File | Description |
|------|-------------|
| `001_create_companies.js` | Companies table with multi-tenant support, subscriptions, billing |
| `002_create_users.js` | Users table with authentication, profile, security fields |
| `003_create_roles_permissions.js` | RBAC tables: roles, permissions, role_permissions, user_roles |
| `004_create_vehicles_drivers.js` | Fleet tables: vehicles, drivers, maintenance_records, fuel_logs |
| `005_create_shipments_routes.js` | Shipments, routes, waypoints, shipment_items, geofences |
| `006_create_invoices_transactions.js` | Invoices, invoice_items, transactions, refunds, payment_methods, pricing_rules |
| `007_create_documents_notifications.js` | Documents, document_versions, shares, driver_documents, notification_preferences, push_subscriptions, company_settings, subscriptions |

### Backend Seeders - COMPLETED (`backend/seeders/`) ✅
| File | Description |
|------|-------------|
| `001_seed_roles_permissions.js` | Default roles (super_admin, admin, manager, dispatcher, driver, customer, user) and CRUD permissions |
| `002_seed_admin_user.js` | Super admin user with configurable credentials from environment variables |
| `003_seed_demo_company.js` | Demo company with 3 users, 3 drivers, 3 vehicles, 5 sample shipments |
| `004_seed_pricing_rules.js` | Default pricing rules: base rates, service surcharges, distance/weight rates, zones, GST |

### Backend Scripts - COMPLETED (`backend/scripts/`) ✅
| File | Description |
|------|-------------|
| `setup-db.js` | Database initialization: PostgreSQL setup, extensions, migrations, seeders, Redis/MongoDB checks |
| `generate-keys.js` | JWT key generation: secure secrets, RSA key pairs, .env file creation |
| `import-data.js` | Bulk data import: CSV/JSON support for drivers, vehicles, customers, pricing rules |

---

## REMAINING FILES TO BUILD 📋

## ML SERVICE (`ml-service/`)

### Core Files
| File | Description |
|------|-------------|
| `app.py` | Flask application entry point |
| `config.py` | ML service configuration |
| `requirements.txt` | Python dependencies |
| `Dockerfile` | ML service container configuration |

### Services (`ml-service/services/`)
| File | Description |
|------|-------------|
| `eta_predictor.py` | Delivery time prediction using historical data |
| `demand_forecaster.py` | Demand forecasting for capacity planning |
| `route_optimizer.py` | AI-powered route optimization |
| `anomaly_detector.py` | Fraud/anomaly detection in transactions |
| `price_optimizer.py` | Dynamic pricing recommendations |

### Models (`ml-service/models/`)
| File | Description |
|------|-------------|
| `eta_model.pkl` | Trained ETA prediction model |
| `demand_model.pkl` | Demand forecasting model |
| `anomaly_model.pkl` | Anomaly detection model |

### Utils (`ml-service/utils/`)
| File | Description |
|------|-------------|
| `data_processor.py` | Data preprocessing utilities |
| `feature_engineering.py` | Feature extraction for ML models |
| `model_utils.py` | Model loading, saving, evaluation |

### Tests (`ml-service/tests/`)
| File | Description |
|------|-------------|
| `test_eta.py` | ETA predictor tests |
| `test_demand.py` | Demand forecaster tests |
| `test_routes.py` | Route optimizer tests |

### Notebooks (`ml-service/notebooks/`)
| File | Description |
|------|-------------|
| `eta_analysis.ipynb` | ETA model development notebook |
| `demand_analysis.ipynb` | Demand forecasting analysis |
| `route_optimization.ipynb` | Route optimization experiments |

---

## FRONTEND (`frontend/`)

### Configuration Files
| File | Description |
|------|-------------|
| `package.json` | React dependencies and scripts |
| `vite.config.js` | Vite bundler configuration |
| `tailwind.config.js` | Tailwind CSS configuration |
| `postcss.config.js` | PostCSS configuration |
| `tsconfig.json` | TypeScript configuration |
| `.env.example` | Frontend environment variables |
| `index.html` | HTML entry point |

### Source Entry (`frontend/src/`)
| File | Description |
|------|-------------|
| `main.jsx` | React entry point |
| `App.jsx` | Root application component with routing |
| `index.css` | Global styles and Tailwind imports |

### Store (`frontend/src/store/`)
| File | Description |
|------|-------------|
| `index.js` | Redux store configuration |
| `authSlice.js` | Authentication state management |
| `userSlice.js` | User data state |
| `shipmentSlice.js` | Shipment state management |
| `vehicleSlice.js` | Vehicle/fleet state |
| `notificationSlice.js` | Notification state |
| `uiSlice.js` | UI state (modals, sidebars, theme) |

### API (`frontend/src/api/`)
| File | Description |
|------|-------------|
| `axios.js` | Axios instance with interceptors |
| `auth.api.js` | Authentication API calls |
| `user.api.js` | User API calls |
| `shipment.api.js` | Shipment API calls |
| `vehicle.api.js` | Vehicle API calls |
| `driver.api.js` | Driver API calls |
| `payment.api.js` | Payment API calls |
| `analytics.api.js` | Analytics API calls |

### Hooks (`frontend/src/hooks/`)
| File | Description |
|------|-------------|
| `useAuth.js` | Authentication hook |
| `useSocket.js` | Socket.io connection hook |
| `useGeolocation.js` | Browser geolocation hook |
| `useDebounce.js` | Debounce utility hook |
| `usePagination.js` | Pagination logic hook |
| `useLocalStorage.js` | Local storage hook |

### Context (`frontend/src/context/`)
| File | Description |
|------|-------------|
| `AuthContext.jsx` | Authentication context provider |
| `SocketContext.jsx` | Socket.io context provider |
| `ThemeContext.jsx` | Theme/dark mode context |

### Components

#### Layout (`frontend/src/components/layout/`)
| File | Description |
|------|-------------|
| `MainLayout.jsx` | Main app layout with sidebar |
| `AuthLayout.jsx` | Authentication pages layout |
| `Sidebar.jsx` | Navigation sidebar |
| `Header.jsx` | Top navigation header |
| `Footer.jsx` | App footer |
| `Breadcrumb.jsx` | Breadcrumb navigation |

#### Common (`frontend/src/components/common/`)
| File | Description |
|------|-------------|
| `Button.jsx` | Reusable button component |
| `Input.jsx` | Form input component |
| `Select.jsx` | Dropdown select component |
| `Modal.jsx` | Modal dialog component |
| `Table.jsx` | Data table with sorting/pagination |
| `Card.jsx` | Card container component |
| `Badge.jsx` | Status badge component |
| `Avatar.jsx` | User avatar component |
| `Spinner.jsx` | Loading spinner |
| `Alert.jsx` | Alert/notification component |
| `Tooltip.jsx` | Tooltip component |
| `Dropdown.jsx` | Dropdown menu component |
| `Tabs.jsx` | Tab navigation component |
| `Pagination.jsx` | Pagination component |
| `FileUpload.jsx` | File upload component |
| `DatePicker.jsx` | Date picker component |
| `SearchInput.jsx` | Search input with autocomplete |
| `EmptyState.jsx` | Empty state placeholder |
| `ErrorBoundary.jsx` | Error boundary component |
| `ConfirmDialog.jsx` | Confirmation dialog |

#### Dashboard (`frontend/src/components/dashboard/`)
| File | Description |
|------|-------------|
| `DashboardStats.jsx` | KPI stat cards |
| `RevenueChart.jsx` | Revenue line/bar chart |
| `ShipmentChart.jsx` | Shipment volume chart |
| `FleetStatus.jsx` | Fleet status overview |
| `RecentActivity.jsx` | Recent activity feed |
| `MapOverview.jsx` | Live map with vehicle positions |
| `TopRoutes.jsx` | Top performing routes |
| `DriverPerformance.jsx` | Driver metrics |

#### Shipments (`frontend/src/components/shipments/`)
| File | Description |
|------|-------------|
| `ShipmentList.jsx` | Shipment listing with filters |
| `ShipmentCard.jsx` | Individual shipment card |
| `ShipmentForm.jsx` | Create/edit shipment form |
| `ShipmentDetails.jsx` | Shipment detail view |
| `ShipmentTimeline.jsx` | Status timeline |
| `ShipmentTracking.jsx` | Live tracking map |
| `PODUpload.jsx` | Proof of delivery upload |
| `ShipmentFilters.jsx` | Advanced filters |

#### Vehicles (`frontend/src/components/vehicles/`)
| File | Description |
|------|-------------|
| `VehicleList.jsx` | Vehicle fleet listing |
| `VehicleCard.jsx` | Individual vehicle card |
| `VehicleForm.jsx` | Add/edit vehicle form |
| `VehicleDetails.jsx` | Vehicle detail view |
| `MaintenanceHistory.jsx` | Maintenance records |
| `FuelLog.jsx` | Fuel consumption log |
| `VehicleTracking.jsx` | Single vehicle tracking |

#### Drivers (`frontend/src/components/drivers/`)
| File | Description |
|------|-------------|
| `DriverList.jsx` | Driver listing |
| `DriverCard.jsx` | Driver profile card |
| `DriverForm.jsx` | Add/edit driver form |
| `DriverDetails.jsx` | Driver detail view |
| `DriverSchedule.jsx` | Driver availability calendar |
| `DriverPerformance.jsx` | Performance metrics |
| `LicenseManager.jsx` | License document management |

#### Routes (`frontend/src/components/routes/`)
| File | Description |
|------|-------------|
| `RouteList.jsx` | Route listing |
| `RouteForm.jsx` | Create/edit route form |
| `RouteMap.jsx` | Route visualization on map |
| `RouteOptimizer.jsx` | AI route optimization interface |
| `WaypointManager.jsx` | Waypoint drag-drop management |

#### Payments (`frontend/src/components/payments/`)
| File | Description |
|------|-------------|
| `PaymentHistory.jsx` | Transaction history |
| `PaymentForm.jsx` | Payment initiation form |
| `InvoiceList.jsx` | Invoice listing |
| `InvoiceView.jsx` | Invoice detail/PDF view |
| `PaymentMethods.jsx` | Saved payment methods |

#### Analytics (`frontend/src/components/analytics/`)
| File | Description |
|------|-------------|
| `AnalyticsDashboard.jsx` | Analytics overview |
| `ReportBuilder.jsx` | Custom report builder |
| `ChartWidget.jsx` | Reusable chart widget |
| `DateRangePicker.jsx` | Report date range selector |
| `ExportButton.jsx` | Report export functionality |

#### Settings (`frontend/src/components/settings/`)
| File | Description |
|------|-------------|
| `ProfileSettings.jsx` | User profile settings |
| `CompanySettings.jsx` | Company configuration |
| `NotificationSettings.jsx` | Notification preferences |
| `SecuritySettings.jsx` | Password, 2FA settings |
| `BillingSettings.jsx` | Subscription/billing |
| `TeamSettings.jsx` | Team member management |
| `IntegrationSettings.jsx` | Third-party integrations |

#### Auth (`frontend/src/components/auth/`)
| File | Description |
|------|-------------|
| `LoginForm.jsx` | Login form |
| `RegisterForm.jsx` | Registration form |
| `ForgotPasswordForm.jsx` | Password reset request |
| `ResetPasswordForm.jsx` | Password reset form |
| `VerifyEmail.jsx` | Email verification |

#### Maps (`frontend/src/components/maps/`)
| File | Description |
|------|-------------|
| `MapContainer.jsx` | Base map container |
| `VehicleMarker.jsx` | Vehicle map marker |
| `ShipmentRoute.jsx` | Shipment route polyline |
| `Geofence.jsx` | Geofence visualization |
| `HeatmapLayer.jsx` | Delivery density heatmap |

### Pages (`frontend/src/pages/`)
| File | Description |
|------|-------------|
| `Dashboard.jsx` | Main dashboard page |
| `Login.jsx` | Login page |
| `Register.jsx` | Registration page |
| `ForgotPassword.jsx` | Forgot password page |
| `ResetPassword.jsx` | Reset password page |
| `Shipments.jsx` | Shipments list page |
| `ShipmentDetail.jsx` | Single shipment page |
| `CreateShipment.jsx` | New shipment page |
| `Vehicles.jsx` | Vehicles list page |
| `VehicleDetail.jsx` | Single vehicle page |
| `Drivers.jsx` | Drivers list page |
| `DriverDetail.jsx` | Single driver page |
| `Routes.jsx` | Routes management page |
| `RouteDetail.jsx` | Single route page |
| `LiveTracking.jsx` | Live tracking map page |
| `Payments.jsx` | Payments/invoices page |
| `Analytics.jsx` | Analytics/reports page |
| `Settings.jsx` | Settings page |
| `Profile.jsx` | User profile page |
| `Notifications.jsx` | Notifications page |
| `NotFound.jsx` | 404 page |

### Utils (`frontend/src/utils/`)
| File | Description |
|------|-------------|
| `constants.js` | App constants |
| `helpers.js` | Helper functions |
| `formatters.js` | Date, currency, number formatters |
| `validators.js` | Form validation helpers |
| `storage.js` | Local storage utilities |

### Routes (`frontend/src/routes/`)
| File | Description |
|------|-------------|
| `index.jsx` | Route definitions |
| `PrivateRoute.jsx` | Protected route wrapper |
| `PublicRoute.jsx` | Public route wrapper |
| `RoleRoute.jsx` | Role-based route wrapper |

---

## DEPLOYMENT FILES

### Kubernetes (`deployment/kubernetes/`)
| File | Description |
|------|-------------|
| `namespace.yaml` | Kubernetes namespace |
| `backend-deployment.yaml` | Backend deployment |
| `backend-service.yaml` | Backend service |
| `frontend-deployment.yaml` | Frontend deployment |
| `frontend-service.yaml` | Frontend service |
| `ml-deployment.yaml` | ML service deployment |
| `ml-service.yaml` | ML service |
| `ingress.yaml` | Ingress configuration |
| `configmap.yaml` | Configuration maps |
| `secrets.yaml` | Secrets template |
| `hpa.yaml` | Horizontal pod autoscaler |
| `pvc.yaml` | Persistent volume claims |

### Terraform (`deployment/terraform/`)
| File | Description |
|------|-------------|
| `main.tf` | Main Terraform configuration |
| `variables.tf` | Variable definitions |
| `outputs.tf` | Output definitions |
| `provider.tf` | Provider configuration (AWS/Azure/GCP) |
| `vpc.tf` | VPC/Network configuration |
| `rds.tf` | PostgreSQL RDS |
| `documentdb.tf` | MongoDB DocumentDB |
| `elasticache.tf` | Redis ElastiCache |
| `s3.tf` | S3 buckets |
| `ecs.tf` | ECS cluster and services |
| `alb.tf` | Application load balancer |

### Scripts (`deployment/scripts/`)
| File | Description |
|------|-------------|
| `deploy.sh` | Deployment script |
| `rollback.sh` | Rollback script |
| `health-check.sh` | Health check script |
| `backup-db.sh` | Database backup script |

---

## DOCUMENTATION (`docs/`)

| File | Description |
|------|-------------|
| `API.md` | API documentation |
| `ARCHITECTURE.md` | System architecture |
| `DEPLOYMENT.md` | Deployment guide |
| `CONTRIBUTING.md` | Contribution guidelines |
| `CHANGELOG.md` | Version changelog |

---

## BUILD ORDER (Recommended)

### Phase 1: Backend Completion
1. Validators (all files)
2. Controllers (all files)
3. Routes (all files)
4. Services (all files)
5. Jobs (all files)
6. Sockets (all files)

### Phase 2: Backend Testing & Data
7. Unit tests
8. Integration tests
9. Migrations
10. Seeders

### Phase 3: ML Service
11. Core Flask app
12. ML services (ETA, demand, routes)
13. ML utilities
14. ML tests

### Phase 4: Frontend
15. Configuration files
16. Store/state management
17. API layer
18. Common components
19. Feature components
20. Pages
21. Routes and guards

### Phase 5: Deployment
22. Kubernetes manifests
23. Terraform infrastructure
24. Deployment scripts
25. Documentation

---

## ENVIRONMENT SETUP

### Python Environment
```bash
# Create and activate logi environment
conda create -n logi python=3.10
conda activate logi
pip install flask scikit-learn pandas numpy joblib flask-cors gunicorn
```

### Node.js Setup
```bash
cd backend
npm install
```

### Database Setup
- PostgreSQL 14+
- MongoDB 6+
- Redis 7+

### Environment Variables
Copy `.env.example` to `.env` in each service directory and configure.

---

## NOTES FOR CONTINUATION

- Python virtual environment "logi" has been created with ML dependencies
- Backend structure is partially complete (configs, utils, models, middleware done)
- Follow the build order above for optimal progress
- Each file description above explains its purpose - implement accordingly
- Test after each major section before moving to the next

---

*Last Updated: January 4, 2026*
*Project Status: Backend 100% complete ✅ (All Validators ✅, All Controllers ✅, All Routes ✅ 17/17, All Services ✅ 19/19, All Sockets ✅ 6/6, All Tests ✅ 12/12, All Migrations ✅ 7/7, All Seeders ✅ 4/4, All Scripts ✅ 3/3), ML Service 0%, Frontend 0%*

