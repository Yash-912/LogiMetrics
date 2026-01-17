#!/usr/bin/env node

/**
 * MongoDB Local Setup Script
 * Instructions for setting up local MongoDB for development
 */

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

logSection("🍃 MongoDB Setup Instructions");

log("\n📌 Current Configuration:", "blue");
log("MongoDB URI: " + (process.env.MONGODB_URI || "Not set"), "yellow");

logSection("Option 1: Use MongoDB Atlas (Cloud)");
log("✅ Current setup (requires working internet and Atlas account)", "cyan");
log("   • MongoDB Atlas URL is configured in .env", "cyan");
log(
  "   • Connection: mongodb+srv://user:pass@cluster.mongodb.net/database",
  "cyan"
);
log("   • Make sure your IP is whitelisted in MongoDB Atlas", "cyan");

logSection("Option 2: Use Local MongoDB");
log("Install MongoDB locally:", "blue");
log(
  "   Windows: Download from https://www.mongodb.com/try/download/community",
  "cyan"
);
log("   Mac: brew install mongodb-community", "cyan");
log("   Linux: sudo apt-get install -y mongodb", "cyan");

log("\nStart MongoDB locally:", "blue");
log(
  '   Windows: mongod --config "C:\\Program Files\\MongoDB\\Server\\<version>\\mongod.cfg"',
  "cyan"
);
log("   Mac: brew services start mongodb-community", "cyan");
log("   Linux: sudo systemctl start mongod", "cyan");

log("\nUpdate .env file:", "blue");
log("   MONGODB_URI=mongodb://localhost:27017/logi_matrix", "cyan");

logSection("Option 3: Use MongoDB Docker Container");
log("Install Docker if not already installed", "blue");
log("   Download from: https://www.docker.com/products/docker-desktop", "cyan");

log("\nRun MongoDB in Docker:", "blue");
log(
  `   docker run -d \\
     --name mongodb \\
     -p 27017:27017 \\
     -e MONGO_INITDB_ROOT_USERNAME=admin \\
     -e MONGO_INITDB_ROOT_PASSWORD=password \\
     mongo:latest`,
  "cyan"
);

log("\nUpdate .env file:", "blue");
log(
  "   MONGODB_URI=mongodb://admin:password@localhost:27017/logi_matrix?authSource=admin",
  "cyan"
);

logSection("Troubleshooting");
log("❌ DNS Error (querySrv EREFUSED):", "red");
log("   • Check your internet connection", "cyan");
log("   • Verify MongoDB Atlas credentials are correct", "cyan");
log(
  "   • Check if MongoDB Atlas IP whitelist includes your current IP",
  "cyan"
);
log("   • Try switching to local MongoDB", "cyan");

log("\n❌ Connection Refused (ECONNREFUSED):", "red");
log("   • MongoDB service is not running", "cyan");
log("   • Wrong host/port configuration", "cyan");
log("   • Local MongoDB not installed", "cyan");

logSection("Next Steps");
log("1. Fix MongoDB connectivity (choose Option 1, 2, or 3)", "green");
log("2. Run: npm run seed:mongodb", "green");
log("3. Verify data in MongoDB Compass or mongosh", "green");
log("4. Start backend: npm run dev", "green");

logSection("");
