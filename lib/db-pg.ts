import { Pool } from "pg";

// 从环境变量获取数据库连接配置
// 优先使用POSTGRES_URL（Vercel PostgreSQL），然后是DATABASE_URL
const databaseUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn(
    "POSTGRES_URL or DATABASE_URL environment variable is not set. Using default PostgreSQL connection."
  );
}

// 创建数据库连接池
const pool = new Pool({
  connectionString: databaseUrl,
  // 可以添加其他连接选项
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
  // 对于Vercel/Neon PostgreSQL，建议使用SSL
  ssl:
    databaseUrl?.includes("neon.tech") ||
    databaseUrl?.includes("vercel-storage.com")
      ? {
          rejectUnauthorized: false,
        }
      : undefined,
});

// 测试数据库连接
pool.on("connect", () => {
  console.log("PostgreSQL connected successfully");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client", err);
  process.exit(-1);
});

// 初始化数据库表
export async function initDatabase() {
  const client = await pool.connect();
  try {
    // 题目表
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('single', 'multiple', 'judge')),
        content TEXT NOT NULL,
        options TEXT,
        correct_answer TEXT NOT NULL,
        explanation TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 错题记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS wrong_questions (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL,
        user_answer TEXT,
        wrong_count INTEGER DEFAULT 1,
        last_wrong_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);

    // 试卷配置表
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_configs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        single_count INTEGER DEFAULT 60,
        multiple_count INTEGER DEFAULT 30,
        judge_count INTEGER DEFAULT 10,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 试卷记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_records (
        id SERIAL PRIMARY KEY,
        config_id INTEGER NOT NULL,
        questions TEXT NOT NULL,
        answers TEXT,
        score REAL,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (config_id) REFERENCES exam_configs(id) ON DELETE CASCADE
      )
    `);

    // 练习记录表
    await client.query(`
      CREATE TABLE IF NOT EXISTS practice_records (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL,
        user_answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        practiced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
      )
    `);

    console.log("PostgreSQL tables initialized successfully");
  } catch (error) {
    console.error("Failed to initialize PostgreSQL tables:", error);
    throw error;
  } finally {
    client.release();
  }
}

// 导出查询函数
export async function query(text: string, params?: unknown[]) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log("Executed query", { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    console.error("Query error", { text, error });
    throw error;
  }
}

// 导出事务函数
export async function transaction<T>(
  callback: (client: any) => Promise<T> | T
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

// 导出原始池对象
export default pool;
