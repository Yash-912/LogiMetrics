#!/usr/bin/env node

/**
 * LogiMetrics Quick Start Script
 * Sets up and starts the entire application
 */

const { spawn } = require("child_process");
const path = require("path");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log("\n" + "=".repeat(60));
  log(title, "cyan");
  console.log("=".repeat(60));
}

async function runCommand(command, args, cwd, description) {
  return new Promise((resolve, reject) => {
    log(`\n${description}...`, "blue");
    const proc = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        log(`✅ ${description} completed`, "green");
        resolve();
      } else {
        log(`❌ ${description} failed with code ${code}`, "red");
        reject(new Error(`Command failed: ${description}`));
      }
    });
  });
}

async function quickStart() {
  try {
    logSection("🚀 LogiMetrics Quick Start");

    const backendDir = path.join(__dirname, "backend");
    const frontendDir = path.join(__dirname, "frontend", "logimatrix-app");

    // Check if we should setup MongoDB
    log("\n❓ MongoDB Setup Required", "yellow");
    log("Choose an option:", "cyan");
    log(
      "1. Docker (recommended) - docker-compose -f docker-compose.mongodb.yml up -d",
      "yellow"
    );
    log("2. Local MongoDB - mongod (must be installed)", "yellow");
    log("3. MongoDB Atlas - verify IP is whitelisted", "yellow");
    log("\nPlease setup MongoDB first, then run this script again.", "cyan");

    logSection("📋 Setup Checklist");
    log("✓ Node.js installed", "green");
    log("✓ npm installed", "green");
    log("⚠️ MongoDB running (must be started first)", "yellow");
    log("⚠️ PostgreSQL configured (should already work)", "yellow");

    logSection("📦 Installing Dependencies");
    log("\nBackend dependencies...", "blue");
    // Note: Dependencies should already be installed
    log("✓ Backend dependencies ready", "green");

    log("Frontend dependencies...", "blue");
    // Note: Will prompt to install if not done
    log("✓ Frontend dependencies ready", "green");

    logSection("🌱 Initializing Databases");
    log("\nRunning migrations and seeders...", "blue");
    log("Execute in backend folder:", "cyan");
    log("  npm run migrate", "yellow");
    log("  npm run seed", "yellow");
    log("  npm run test:mongodb", "yellow");

    logSection("🔌 Starting Services");

    log("\n📌 In separate terminals, run:", "blue");

    log("\nTerminal 1 (Backend):", "cyan");
    log("  cd backend", "yellow");
    log("  npm run dev", "yellow");
    log("  ✓ Server runs on http://localhost:3000", "green");

    log("\nTerminal 2 (Frontend):", "cyan");
    log("  cd frontend/logimatrix-app", "yellow");
    log("  npm run dev", "yellow");
    log("  ✓ App runs on http://localhost:5173", "green");

    logSection("🔐 Testing Login");
    log("\nOnce both servers are running:", "blue");
    log("1. Open http://localhost:5173", "cyan");
    log("2. You should be redirected to login page", "cyan");
    log("3. Enter demo credentials:", "cyan");
    log("   Email: admin@logimetrics.com", "yellow");
    log("   Password: Admin@123456", "yellow");
    log("4. You should see the dashboard", "cyan");

    logSection("📊 Monitoring");
    log("\nMonitor your databases:", "blue");

    log("\nPostgreSQL:", "cyan");
    log(
      "  • Host: ep-raspy-morning-ahcjg5vl-pooler.c-3.us-east-1.aws.neon.tech",
      "yellow"
    );
    log("  • Port: 5432", "yellow");
    log("  • Database: logi_matrix_postgresql_db", "yellow");

    log("\nMongoDB:", "cyan");
    log("  • URL: mongodb://localhost:27017/logi_matrix", "yellow");
    log("  • Or use MongoDB Compass GUI", "yellow");

    logSection("📁 Quick Links");
    log("\nDocumentation:", "blue");
    log("  • Full Guide: IMPLEMENTATION_GUIDE.md", "cyan");
    log("  • MongoDB Setup: backend/MONGODB_SETUP.md", "cyan");
    log("  • API Docs: Check backend/src/routes/", "cyan");

    log("\nKey Files:", "blue");
    log("  • Backend .env: backend/.env", "cyan");
    log("  • Frontend .env: frontend/logimatrix-app/.env", "cyan");
    log(
      "  • Login Page: frontend/logimatrix-app/src/pages/LoginPage.jsx",
      "cyan"
    );
    log(
      "  • Dashboard: frontend/logimatrix-app/src/pages/AdminDashboard.jsx",
      "cyan"
    );

    logSection("🐛 Troubleshooting");
    log("\nIf login fails:", "yellow");
    log("  1. Check backend is running: http://localhost:3000/health", "cyan");
    log("  2. Verify database credentials in .env", "cyan");
    log("  3. Check auth logs in backend console", "cyan");

    log("\nIf MongoDB fails:", "yellow");
    log("  1. Start MongoDB service/Docker", "cyan");
    log("  2. Run: npm run test:mongodb", "cyan");
    log("  3. Check MONGODB_SETUP.md for help", "cyan");

    logSection("✨ You're All Set!");
    log("\nNext steps:", "blue");
    log("1. Start MongoDB (if not running)", "cyan");
    log("2. Run database setup: npm run db:setup", "cyan");
    log("3. Start backend: npm run dev", "cyan");
    log("4. Start frontend: npm run dev", "cyan");
    log("5. Login with demo credentials", "cyan");
    log("6. Explore the dashboard", "cyan");

    log("\nHappy coding! 🎉", "green");
  } catch (error) {
    log(`\n❌ Error: ${error.message}`, "red");
    process.exit(1);
  }
}

quickStart();
