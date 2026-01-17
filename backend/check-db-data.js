const { sequelize } = require("./src/config/database");

async function checkDatabaseData() {
  try {
    await sequelize.authenticate();
    console.log("\n📊 PostgreSQL Data Summary:\n");

    const tables = [
      "users",
      "roles",
      "companies",
      "vehicles",
      "drivers",
      "shipments",
      "invoices",
      "routes",
    ];

    for (const table of tables) {
      const result = await sequelize.query(
        `SELECT COUNT(*) as count FROM "${table}"`,
        { type: sequelize.QueryTypes.SELECT }
      );
      const count = result[0].count;
      console.log(`   ✓ ${table.padEnd(15)} : ${count} records`);
    }

    // Get sample users
    const users = await sequelize.query(
      `SELECT id, email, role FROM users LIMIT 5`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log("\n👥 Sample Users:");
    users.forEach((user) => {
      console.log(`   • ${user.email} (${user.role})`);
    });

    console.log("\n✅ PostgreSQL is ready with seed data!");
    await sequelize.close();
  } catch (e) {
    console.error("❌ Error:", e.message);
    process.exit(1);
  }
}

checkDatabaseData();
