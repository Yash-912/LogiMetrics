# LogiMetrics - Next-Gen Logistics Platform

A comprehensive logistics management platform featuring real-time tracking, fleet management, predictive analytics, and automated workflows.

## Tech Stack

- **Frontend**: React.js with Tailwind CSS (Vite)
- **Backend**: Node.js with Express.js
- **Database**: PostgreSQL (relational data) + MongoDB (logs, tracking data)
- **Real-time**: Socket.io for live tracking
- **ML/Analytics**: Python microservice (Flask) with scikit-learn
- **Authentication**: JWT-based auth with RBAC

## Project Structure

```
logistics-platform/
├── backend/           # Node.js Express API
├── frontend/          # React.js frontend
├── ml-service/        # Python Flask ML microservice
├── deployment/        # Docker and Kubernetes configs
└── docs/              # Documentation
```

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+
- MongoDB 6+
- Redis (optional, for caching)

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Configure your .env file
npm run migrate
npm run seed
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### ML Service Setup
```bash
cd ml-service
pip install -r requirements.txt
python app.py
```

### Docker Setup
```bash
docker-compose up -d
```

## Features

### Core Features
- 🔐 Role-based authentication (Admin, Fleet Manager, Driver, Customer)
- 📦 Shipment management with tracking
- 🚛 Fleet management (vehicles, drivers)
- 📍 Real-time GPS tracking on maps
- 💳 Payment processing and invoicing
- 📊 Analytics and reporting dashboard
- 📱 Mobile-responsive design
- 📄 Document management (POD, e-way bills)
- 🔔 Email/SMS notifications

### Advanced Features
- 🤖 ML-powered delivery time prediction
- 🔧 Predictive maintenance
- 🗺️ Route optimization
- ⚡ Automated workflows
- 📈 Performance analytics

## API Documentation

API documentation is available at `/api/docs` when running the backend server.

## Environment Variables

See `.env.example` files in each service directory for required environment variables.

## License

MIT License
