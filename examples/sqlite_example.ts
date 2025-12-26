import db from "@/lib/db";

/**
 * 执行SQLite SQL查询的几种方法示例
 *
 * 这个文件展示了在当前Next.js项目中执行SQLite SQL查询的不同方法
 */

// 示例1: 执行简单的SELECT查询
export function exampleSelectQuery() {
  console.log("=== 示例1: 执行简单的SELECT查询 ===");

  // 方法1: 使用prepare()和all()获取所有行
  const stmt1 = db.prepare("SELECT * FROM users LIMIT 5");
  const users = stmt1.all();
  console.log("用户列表:", users);

  // 方法2: 使用prepare()和get()获取单行
  const stmt2 = db.prepare("SELECT COUNT(*) as count FROM users");
  const result = stmt2.get() as { count: number };
  console.log("用户总数:", result.count);

  // 方法3: 带参数的查询
  const stmt3 = db.prepare("SELECT * FROM users WHERE role = ?");
  const admins = stmt3.all("admin");
  console.log("管理员用户:", admins);
}

// 示例2: 执行INSERT、UPDATE、DELETE操作
export function exampleDMLQueries() {
  console.log("\n=== 示例2: 执行INSERT、UPDATE、DELETE操作 ===");

  // INSERT示例
  try {
    const insertStmt = db.prepare(
      "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
    );
    const insertResult = insertStmt.run("testuser", "hashed_password", "user");
    console.log("插入成功，ID:", insertResult.lastInsertRowid);
  } catch (error) {
    const err = error as Error;
    console.log("插入失败（可能是用户名已存在）:", err.message);
  }

  // UPDATE示例
  const updateStmt = db.prepare("UPDATE users SET role = ? WHERE username = ?");
  const updateResult = updateStmt.run("user", "testuser");
  console.log("更新影响的行数:", updateResult.changes);

  // DELETE示例
  const deleteStmt = db.prepare("DELETE FROM users WHERE username = ?");
  const deleteResult = deleteStmt.run("testuser");
  console.log("删除影响的行数:", deleteResult.changes);
}

// 示例3: 使用事务
export function exampleTransaction() {
  console.log("\n=== 示例3: 使用事务 ===");

  const transaction = db.transaction(
    (
      operations: Array<{
        type: string;
        content?: string;
        answer?: string;
        newContent?: string;
        id?: number;
      }>
    ) => {
      for (const op of operations) {
        if (op.type === "insert") {
          db.prepare(
            "INSERT INTO questions (type, content, correct_answer) VALUES (?, ?, ?)"
          ).run(op.type, op.content, op.answer);
        } else if (op.type === "update") {
          db.prepare("UPDATE questions SET content = ? WHERE id = ?").run(
            op.newContent,
            op.id
          );
        }
      }
    }
  );

  // 执行事务
  try {
    transaction([
      {
        type: "insert",
        content: "事务测试题目1",
        answer: "A",
      },
      {
        type: "insert",
        content: "事务测试题目2",
        answer: "B",
      },
    ]);
    console.log("事务执行成功");
  } catch (error) {
    const err = error as Error;
    console.log("事务执行失败:", err.message);
  }
}

// 示例4: 执行DDL语句（创建表等）
export function exampleDDLQueries() {
  console.log("\n=== 示例4: 执行DDL语句 ===");

  // 创建临时表
  db.exec(`
    CREATE TABLE IF NOT EXISTS temp_table (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value INTEGER
    )
  `);
  console.log("临时表创建成功");

  // 删除临时表
  db.exec("DROP TABLE IF EXISTS temp_table");
  console.log("临时表删除成功");
}

// 示例5: 复杂查询示例
export function exampleComplexQueries() {
  console.log("\n=== 示例5: 复杂查询示例 ===");

  // 连接查询
  const joinQuery = `
    SELECT 
      e.id as exam_id,
      u.username,
      e.score,
      e.created_at
    FROM exam_records e
    JOIN users u ON e.user_id = u.id
    ORDER BY e.created_at DESC
    LIMIT 5
  `;

  const stmt = db.prepare(joinQuery);
  const examRecords = stmt.all();
  console.log("最近的考试记录:", examRecords);

  // 聚合查询
  const aggregateQuery = `
    SELECT 
      type,
      COUNT(*) as count,
      AVG(LENGTH(content)) as avg_content_length
    FROM questions
    GROUP BY type
  `;

  const stmt2 = db.prepare(aggregateQuery);
  const stats = stmt2.all();
  console.log("题目统计:", stats);
}

// 示例6: 在API路由中使用SQL查询
export async function exampleAPIUsage() {
  console.log("\n=== 示例6: 在API路由中使用SQL查询 ===");

  // 模拟API路由中的查询
  const searchParams = new URLSearchParams();
  searchParams.set("page", "1");
  searchParams.set("limit", "10");

  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const offset = (page - 1) * limit;

  // 分页查询
  const query = "SELECT * FROM questions ORDER BY id LIMIT ? OFFSET ?";
  const stmt = db.prepare(query);
  const questions = stmt.all(limit, offset);

  // 获取总数
  const countStmt = db.prepare("SELECT COUNT(*) as total FROM questions");
  const totalResult = countStmt.get() as { total: number };

  console.log("分页查询结果:", {
    questions: questions.length,
    page,
    limit,
    total: totalResult.total,
  });
}

// 运行所有示例
export function runAllExamples() {
  console.log("开始执行SQLite SQL查询示例...\n");

  exampleSelectQuery();
  exampleDMLQueries();
  exampleTransaction();
  exampleDDLQueries();
  exampleComplexQueries();

  // 注意：exampleAPIUsage是异步的，需要特殊处理
  console.log("\n提示：exampleAPIUsage()是异步函数，需要在异步上下文中调用");

  console.log("\n所有示例演示完成！");
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出所有函数
export default {
  exampleSelectQuery,
  exampleDMLQueries,
  exampleTransaction,
  exampleDDLQueries,
  exampleComplexQueries,
  exampleAPIUsage,
  runAllExamples,
};
