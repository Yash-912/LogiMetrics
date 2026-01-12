# Quick Reference - LogiMetrics Setup & Run

## 🚀 TL;DR - Get Running in 5 Steps

### 1. Start MongoDB

```bash
# Docker (easiest)
cd backend
docker-compose -f docker-compose.mongodb.yml up -d

# Or local: mongod
# Or Atlas: ensure IP is whitelisted
```

### 2. Setup Databases

```bash
cd backend
npm run migrate    # PostgreSQL
npm run seed       # PostgreSQL
npm run test:mongodb # MongoDB test & seed
```

### 3. Start Backend

```bash
cd backend
npm run dev
# ✓ Running on http://localhost:3000
```

### 4. Start Frontend

```bash
cd frontend/logimatrix-app
npm run dev
# ✓ Running on http://localhost:5173
```

### 5. Login

- Go to http://localhost:5173
- Email: `admin@logimetrics.com`
- Password: `Admin@123456`

---

## 📚 Important Files

| File                           | Purpose                |
| ------------------------------ | ---------------------- |
| `backend/.env`                 | Backend configuration  |
| `frontend/logimatrix-app/.env` | Frontend configuration |
| `backend/MONGODB_SETUP.md`     | MongoDB setup guide    |
| `IMPLEMENTATION_GUIDE.md`      | Full documentation     |
| `SETUP_COMPLETE.md`            | What was implemented   |

---

## 🐛 Common Issues

### "MongoDB Connection Failed"

```bash
# Use Docker (fastest solution)
cd backend
docker-compose -f docker-compose.mongodb.yml up -d
npm run test:mongodb
```

### "Backend Won't Start"

```bash
# Check backend is running on port 3000
curl http://localhost:3000/health

# Restart
npm run dev
```

### "Login Not Working"

```bash
# Verify user exists
npm run seed

# Check backend logs for errors
# Check JWT_SECRET in .env
```

### "Frontend Can't Connect to API"

```bash
# Verify API_URL in frontend .env
# Default: http://localhost:3000/api/v1

# Check backend is running
curl http://localhost:3000/health
```

---

## 🔍 Testing API

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@logimetrics.com","password":"Admin@123456"}'
```

### Get Users (requires token from login response)

```bash
curl -H "Authorization: Bearer {ACCESS_TOKEN}" \
  http://localhost:3000/api/v1/users
```

---

## 📊 Database Connections

**PostgreSQL**:

- Already configured
- Host: ep-raspy-morning-ahcjg5vl-pooler.c-3.us-east-1.aws.neon.tech
- Database: logi_matrix_postgresql_db
- Tables: users, companies, shipments, vehicles, drivers, etc.

**MongoDB**:

- Local: `mongodb://localhost:27017/logi_matrix`
- Docker: `mongodb://localhost:27017/logi_matrix`
- Atlas: Check `.env`
- Collections: audit_logs, live_tracking, shipment_events, vehicle_telemetry

---

## 🛠️ Useful Commands

```bash
# Run all setups
cd backend && npm run db:setup

# Just test MongoDB
npm run test:mongodb

# Backend only
npm run dev

# Frontend only
npm run dev

# List MongoDB collections
mongosh
> use logi_matrix
> show collections
```

---

## 📋 Checklist Before Coding

- [ ] MongoDB running (Docker/Local/Atlas)
- [ ] `npm run migrate` completed
- [ ] `npm run seed` completed
- [ ] `npm run test:mongodb` successful
- [ ] Backend starts: `npm run dev`
- [ ] Frontend starts: `npm run dev`
- [ ] Login works with demo credentials
- [ ] Dashboard shows data

---

## 🎯 Key URLs

| URL                                     | Purpose                           |
| --------------------------------------- | --------------------------------- |
| http://localhost:5173                   | Frontend App                      |
| http://localhost:5173/login             | Login Page                        |
| http://localhost:5173/dashboard         | Dashboard                         |
| http://localhost:3000/health            | Backend Health Check              |
| http://localhost:3000/api/v1/auth/login | Login API                         |
| http://localhost:8081                   | MongoDB Express (if using Docker) |

---

## 📞 Support

1. Check `IMPLEMENTATION_GUIDE.md` for detailed info
2. Check `backend/MONGODB_SETUP.md` for database issues
3. Check `SETUP_COMPLETE.md` for what was implemented
4. Check component files for code details

---

## ✅ All Done!

Everything is set up and ready to go. Start MongoDB, run the setup commands, and you're ready to develop!

```
Happy Coding! 🎉
```
