const { MongoClient } = require("mongodb");

// Your SRV connection string
const uri =
  "mongodb+srv://sagacitychess_db_user:pOU7R8EwhrsErudP@logimatrix.fwvtwz8.mongodb.net/logi_matrix?retryWrites=true&w=majority";

const client = new MongoClient(uri);

async function run() {
  try {
    console.log("⏳ Connecting to MongoDB Atlas...");
    await client.connect();
    console.log("✅ Connected successfully.");

    // Select the database defined in the URI string ('logi_matrix')
    // If you leave .db() empty, it uses the one from the connection string.
    const db = client.db();

    console.log(`🎯 Targeted Database: ${db.databaseName}`);

    // databases in MongoDB are lazy; they are created when data is written.
    // Let's insert a test document to force the creation of 'logi_matrix'.
    const collection = db.collection("init_test");
    const result = await collection.insertOne({
      message: "Hello World",
      createdAt: new Date(),
    });

    console.log(`✨ Success! Database '${db.databaseName}' is active.`);
    console.log(`   Inserted document ID: ${result.insertedId}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
  } finally {
    await client.close();
  }
}

run();
