#!/usr/bin/env node

/**
 * 简单的SQLite测试脚本
 * 演示如何执行SQLite SQL查询
 */

import path from "path";
import Database from "better-sqlite3";

// 连接到数据库
const dbPath = path.join(process.cwd(), "questionbank.db");
const db = new Database(dbPath);

console.log("=== SQLite SQL查询测试 ===\n");

// 1. 查看数据库中的表
console.log("1. 数据库中的表:");
const tables = db
  .prepare("SELECT name FROM sqlite_master WHERE type='table'")
  .all();
tables.forEach((table, index) => {
  console.log(`   ${index + 1}. ${table.name}`);
});

console.log("\n2. 各表的数据统计:");
tables.forEach((table) => {
  const countResult = db
    .prepare(`SELECT COUNT(*) as count FROM ${table.name}`)
    .get();
  console.log(`   ${table.name}: ${countResult.count} 条记录`);
});

// 2. 执行SELECT查询示例
console.log("\n3. 用户表示例数据:");
const users = db
  .prepare("SELECT id, username, role, created_at FROM users LIMIT 3")
  .all();
users.forEach((user) => {
  console.log(
    `   ID: ${user.id}, 用户名: ${user.username}, 角色: ${user.role}, 创建时间: ${user.created_at}`
  );
});

// 3. 执行INSERT示例（如果test用户不存在）
console.log("\n4. INSERT操作示例:");
try {
  const insertStmt = db.prepare(
    "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
  );
  const insertResult = insertStmt.run(
    "test_user_" + Date.now(),
    "test_password",
    "user"
  );
  console.log(`   插入成功，新用户ID: ${insertResult.lastInsertRowid}`);
} catch (error) {
  console.log(`   插入失败（可能用户名已存在）: ${error.message}`);
}

// 4. 执行UPDATE示例
console.log("\n5. UPDATE操作示例:");
const updateStmt = db.prepare(
  "UPDATE users SET role = ? WHERE username LIKE ?"
);
const updateResult = updateStmt.run("user", "test_user_%");
console.log(`   更新了 ${updateResult.changes} 条记录`);

// 5. 执行DELETE示例
console.log("\n6. DELETE操作示例:");
const deleteStmt = db.prepare("DELETE FROM users WHERE username LIKE ?");
const deleteResult = deleteStmt.run("test_user_%");
console.log(`   删除了 ${deleteResult.changes} 条测试记录`);

// 6. 复杂查询示例
console.log("\n7. 复杂查询示例 - 题目类型统计:");
const stats = db
  .prepare(
    `
  SELECT 
    type,
    COUNT(*) as count,
    MIN(LENGTH(content)) as min_length,
    MAX(LENGTH(content)) as max_length,
    AVG(LENGTH(content)) as avg_length
  FROM questions
  GROUP BY type
`
  )
  .all();

stats.forEach((stat) => {
  console.log(
    `   ${stat.type}类型: ${stat.count} 题, 内容长度: ${Math.round(
      stat.avg_length
    )} 字符(平均)`
  );
});

// 7. 事务示例
console.log("\n8. 事务操作示例:");
const transaction = db.transaction((operations) => {
  for (const op of operations) {
    if (op.type === "insert") {
      db.prepare(
        "INSERT INTO questions (type, content, correct_answer) VALUES (?, ?, ?)"
      ).run(op.questionType, op.content, op.answer);
    }
  }
});

try {
  transaction([
    {
      type: "insert",
      questionType: "single",
      content: "事务测试题目 - " + Date.now(),
      answer: "A",
    },
  ]);
  console.log("   事务执行成功");
} catch (error) {
  console.log(`   事务执行失败: ${error.message}`);
}

// 8. 清理测试数据
console.log("\n9. 清理测试数据:");
const cleanupStmt = db.prepare(
  "DELETE FROM questions WHERE content LIKE '事务测试题目%'"
);
const cleanupResult = cleanupStmt.run();
console.log(`   清理了 ${cleanupResult.changes} 条测试题目`);

console.log("\n=== 测试完成 ===");
console.log("\n更多信息请查看:");
console.log("  - examples/sqlite_example.ts - 完整的TypeScript示例");
console.log("  - examples/SQLITE_USAGE_README.md - 详细使用文档");

// 关闭数据库连接
db.close();
