const { Pool } = require("pg");
require("dotenv").config({ path: ".env.local" });

async function testDatabaseReadWrite() {
  console.log("Testing PostgreSQL database read/write operations...");

  // 优先使用POSTGRES_URL（Vercel PostgreSQL），然后是DATABASE_URL
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "POSTGRES_URL or DATABASE_URL environment variable is not set."
    );
    console.error("Please set the connection string in .env.local file.");
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

  const client = await pool.connect();

  try {
    // 测试1: 读取数据
    console.log("\n1. Testing READ operation...");
    const readResult = await client.query(
      "SELECT COUNT(*) as count FROM questions"
    );
    console.log(`   ✓ Questions table has ${readResult.rows[0].count} records`);

    // 测试2: 写入数据
    console.log("\n2. Testing WRITE operation...");
    const testQuestion = {
      type: "single",
      content: "测试题目: 1 + 1 = ?",
      options: JSON.stringify(["1", "2", "3", "4"]),
      correct_answer: "2",
      explanation: "基础数学题",
    };

    const insertResult = await client.query(
      `INSERT INTO questions (type, content, options, correct_answer, explanation)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [
        testQuestion.type,
        testQuestion.content,
        testQuestion.options,
        testQuestion.correct_answer,
        testQuestion.explanation,
      ]
    );

    const newId = insertResult.rows[0].id;
    console.log(`   ✓ Inserted new question with ID: ${newId}`);

    // 测试3: 验证写入的数据
    console.log("\n3. Verifying inserted data...");
    const verifyResult = await client.query(
      "SELECT * FROM questions WHERE id = $1",
      [newId]
    );

    if (verifyResult.rows.length > 0) {
      const question = verifyResult.rows[0];
      console.log(`   ✓ Found inserted question: ${question.content}`);
      console.log(`   ✓ Correct answer: ${question.correct_answer}`);
    } else {
      console.log("   ✗ Failed to find inserted question");
      return false;
    }

    // 测试4: 删除测试数据
    console.log("\n4. Cleaning up test data...");
    await client.query("DELETE FROM questions WHERE id = $1", [newId]);
    console.log(`   ✓ Deleted test question with ID: ${newId}`);

    // 测试5: 验证删除
    const finalCount = await client.query(
      "SELECT COUNT(*) as count FROM questions"
    );
    console.log(`   ✓ Final questions count: ${finalCount.rows[0].count}`);

    console.log("\n✅ All database read/write tests PASSED");
    return true;
  } catch (error) {
    console.error("\n❌ Database test failed:", error.message);
    console.error("Error details:", error);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行测试
testDatabaseReadWrite().then((success) => {
  if (success) {
    console.log("\n🎉 Database read/write operations are working correctly!");
    process.exit(0);
  } else {
    console.log("\n💥 Database read/write operations have issues.");
    process.exit(1);
  }
});
