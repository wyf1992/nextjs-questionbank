import Database from "better-sqlite3";
import path from "node:path";
import { Pool } from "pg";
import fs from "fs";
import dotenv from "dotenv";

// 加载环境变量
dotenv.config({ path: ".env.local" });

// 定义类型
interface Question {
  id: number;
  type: string;
  content: string;
  options: string | null;
  correct_answer: string;
  explanation: string | null;
  created_at: string;
}

interface ExamConfig {
  id: number;
  name: string;
  single_count: number;
  multiple_count: number;
  judge_count: number;
  created_at: string;
}

interface ExamRecord {
  id: number;
  config_id: number;
  questions: string;
  answers: string | null;
  score: number | null;
  completed_at: string | null;
  created_at: string;
}

interface WrongQuestion {
  id: number;
  question_id: number;
  user_answer: string | null;
  wrong_count: number;
  last_wrong_at: string;
}

interface PracticeRecord {
  id: number;
  question_id: number;
  user_answer: string;
  is_correct: number;
  practiced_at: string;
}

// 创建数据库表函数
async function createTables(client: any) {
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

    console.log("数据库表创建完成");
  } catch (error) {
    console.error("创建表失败:", error);
    throw error;
  }
}

async function migrateToPostgres() {
  console.log("开始从SQLite迁移数据到PostgreSQL...");

  // 连接到SQLite数据库
  const sqlitePath = path.join(process.cwd(), "questionbank.db");
  if (!fs.existsSync(sqlitePath)) {
    console.error(`SQLite数据库文件不存在: ${sqlitePath}`);
    process.exit(1);
  }

  const sqliteDb = new Database(sqlitePath);

  // 连接到PostgreSQL
  // 优先使用POSTGRES_URL（Vercel PostgreSQL），然后是DATABASE_URL
  const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    console.error(
      "POSTGRES_URL or DATABASE_URL environment variable is not set."
    );
    console.error("Please set the connection string in .env.local file.");
    process.exit(1);
  }

  console.log(
    "Using PostgreSQL connection:",
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
    // 开始事务
    await client.query("BEGIN");

    // 首先创建表（如果不存在）
    console.log("创建数据库表...");
    await createTables(client);

    // 1. 迁移questions表
    console.log("迁移questions表...");
    const questions = sqliteDb
      .prepare("SELECT * FROM questions")
      .all() as Question[];
    if (questions.length > 0) {
      for (const question of questions) {
        await client.query(
          `INSERT INTO questions (id, type, content, options, correct_answer, explanation, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            question.id,
            question.type,
            question.content,
            question.options,
            question.correct_answer,
            question.explanation,
            question.created_at,
          ]
        );
      }
      console.log(`迁移了 ${questions.length} 条题目记录`);
    }

    // 2. 迁移exam_configs表
    console.log("迁移exam_configs表...");
    const examConfigs = sqliteDb
      .prepare("SELECT * FROM exam_configs")
      .all() as ExamConfig[];
    if (examConfigs.length > 0) {
      for (const config of examConfigs) {
        await client.query(
          `INSERT INTO exam_configs (id, name, single_count, multiple_count, judge_count, created_at)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            config.id,
            config.name,
            config.single_count,
            config.multiple_count,
            config.judge_count,
            config.created_at,
          ]
        );
      }
      console.log(`迁移了 ${examConfigs.length} 条试卷配置记录`);
    }

    // 3. 迁移exam_records表
    console.log("迁移exam_records表...");
    const examRecords = sqliteDb
      .prepare("SELECT * FROM exam_records")
      .all() as ExamRecord[];
    if (examRecords.length > 0) {
      for (const record of examRecords) {
        await client.query(
          `INSERT INTO exam_records (id, config_id, questions, answers, score, completed_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            record.id,
            record.config_id,
            record.questions,
            record.answers,
            record.score,
            record.completed_at,
            record.created_at,
          ]
        );
      }
      console.log(`迁移了 ${examRecords.length} 条试卷记录`);
    }

    // 4. 迁移wrong_questions表
    console.log("迁移wrong_questions表...");
    const wrongQuestions = sqliteDb
      .prepare("SELECT * FROM wrong_questions")
      .all() as WrongQuestion[];
    if (wrongQuestions.length > 0) {
      for (const wrong of wrongQuestions) {
        await client.query(
          `INSERT INTO wrong_questions (id, question_id, user_answer, wrong_count, last_wrong_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            wrong.id,
            wrong.question_id,
            wrong.user_answer,
            wrong.wrong_count,
            wrong.last_wrong_at,
          ]
        );
      }
      console.log(`迁移了 ${wrongQuestions.length} 条错题记录`);
    }

    // 5. 迁移practice_records表
    console.log("迁移practice_records表...");
    const practiceRecords = sqliteDb
      .prepare("SELECT * FROM practice_records")
      .all() as PracticeRecord[];
    if (practiceRecords.length > 0) {
      for (const practice of practiceRecords) {
        await client.query(
          `INSERT INTO practice_records (id, question_id, user_answer, is_correct, practiced_at)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            practice.id,
            practice.question_id,
            practice.user_answer,
            practice.is_correct === 1, // 转换为布尔值
            practice.practiced_at,
          ]
        );
      }
      console.log(`迁移了 ${practiceRecords.length} 条练习记录`);
    }

    // 提交事务
    await client.query("COMMIT");
    console.log("数据迁移完成！");

    // 更新序列
    console.log("更新序列...");
    await client.query(
      "SELECT setval('questions_id_seq', (SELECT MAX(id) FROM questions))"
    );
    await client.query(
      "SELECT setval('exam_configs_id_seq', (SELECT MAX(id) FROM exam_configs))"
    );
    await client.query(
      "SELECT setval('exam_records_id_seq', (SELECT MAX(id) FROM exam_records))"
    );
    await client.query(
      "SELECT setval('wrong_questions_id_seq', (SELECT MAX(id) FROM wrong_questions))"
    );
    await client.query(
      "SELECT setval('practice_records_id_seq', (SELECT MAX(id) FROM practice_records))"
    );
    console.log("序列更新完成！");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("迁移失败:", error);
    throw error;
  } finally {
    client.release();
    sqliteDb.close();
    await pool.end();
  }
}

// 运行迁移
migrateToPostgres().catch((error) => {
  console.error("迁移过程出错:", error);
  process.exit(1);
});
