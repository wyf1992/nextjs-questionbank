const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function testConnection() {
  console.log("Testing PostgreSQL connection...");

  // 优先使用POSTGRES_URL，然后是DATABASE_URL
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "No PostgreSQL connection string found in environment variables"
    );
    console.log("Please set POSTGRES_URL or DATABASE_URL in .env.local");
    return false;
  }

  console.log(
    "Using connection string:",
    connectionString.replace(/:[^:]*@/, ":****@")
  );

  const pool = new Pool({
    connectionString: connectionString,
    ssl:
      connectionString.includes("neon.tech") ||
      connectionString.includes("vercel-storage.com")
        ? { rejectUnauthorized: false }
        : undefined,
  });

  try {
    const client = await pool.connect();
    console.log("✓ PostgreSQL connected successfully");

    // 测试查询
    const result = await client.query("SELECT NOW() as current_time");
    console.log("✓ Query executed successfully");
    console.log("  Current time:", result.rows[0].current_time);

    client.release();
    console.log("✓ Connection released");

    await pool.end();
    console.log("✓ Pool ended successfully");

    return true;
  } catch (error) {
    console.error("✗ Connection failed:", error.message);
    return false;
  }
}

// 运行测试
testConnection().then((success) => {
  if (success) {
    console.log("\n✅ PostgreSQL connection test PASSED");
    process.exit(0);
  } else {
    console.log("\n❌ PostgreSQL connection test FAILED");
    process.exit(1);
  }
});
