# 在 Next.js 项目中执行 SQLite SQL 查询

本文档详细介绍了如何在当前 Next.js 项目中执行 SQLite SQL 查询。

## 项目结构

当前项目使用 SQLite 作为数据库，主要文件如下：

- `questionbank.db` - SQLite 数据库文件
- `lib/db.ts` - 数据库连接和初始化配置
- `app/api/` - 包含各种 API 路由，展示了 SQL 查询的实际应用

## 数据库连接

项目使用 `better-sqlite3` 库来操作 SQLite 数据库。数据库连接在 `lib/db.ts` 中初始化：

```typescript
import Database from "better-sqlite3";
import path from "node:path";

const dbPath = path.join(process.cwd(), "questionbank.db");
const db = new Database(dbPath);

export default db;
```

## 执行 SQL 查询的几种方法

### 1. 执行 SELECT 查询

#### 获取所有行

```typescript
import db from "@/lib/db";

const stmt = db.prepare("SELECT * FROM users LIMIT 5");
const users = stmt.all();
console.log(users);
```

#### 获取单行

```typescript
const stmt = db.prepare("SELECT COUNT(*) as count FROM users");
const result = stmt.get() as { count: number };
console.log(result.count);
```

#### 带参数的查询

```typescript
const stmt = db.prepare("SELECT * FROM users WHERE role = ?");
const admins = stmt.all("admin");
console.log(admins);
```

### 2. 执行 INSERT、UPDATE、DELETE 操作

#### INSERT 操作

```typescript
const stmt = db.prepare(
  "INSERT INTO users (username, password, role) VALUES (?, ?, ?)"
);
const result = stmt.run("username", "password", "user");
console.log("插入ID:", result.lastInsertRowid);
console.log("影响行数:", result.changes);
```

#### UPDATE 操作

```typescript
const stmt = db.prepare("UPDATE users SET role = ? WHERE username = ?");
const result = stmt.run("admin", "username");
console.log("影响行数:", result.changes);
```

#### DELETE 操作

```typescript
const stmt = db.prepare("DELETE FROM users WHERE username = ?");
const result = stmt.run("username");
console.log("影响行数:", result.changes);
```

### 3. 使用事务

```typescript
const transaction = db.transaction((operations) => {
  for (const op of operations) {
    if (op.type === "insert") {
      db.prepare(
        "INSERT INTO questions (type, content, correct_answer) VALUES (?, ?, ?)"
      ).run(op.type, op.content, op.answer);
    }
  }
});

try {
  transaction([
    { type: "insert", content: "题目1", answer: "A" },
    { type: "insert", content: "题目2", answer: "B" },
  ]);
  console.log("事务执行成功");
} catch (error) {
  console.log("事务执行失败:", error);
}
```

### 4. 执行 DDL 语句（创建表、修改表结构等）

```typescript
// 创建表
db.exec(`
  CREATE TABLE IF NOT EXISTS temp_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  )
`);

// 删除表
db.exec("DROP TABLE IF EXISTS temp_table");
```

### 5. 复杂查询示例

#### 连接查询

```typescript
const query = `
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

const stmt = db.prepare(query);
const records = stmt.all();
```

#### 聚合查询

```typescript
const query = `
  SELECT 
    type,
    COUNT(*) as count,
    AVG(LENGTH(content)) as avg_length
  FROM questions
  GROUP BY type
`;

const stmt = db.prepare(query);
const stats = stmt.all();
```

## 在 API 路由中使用 SQL 查询

查看现有 API 路由可以了解实际应用：

### 分页查询示例 (`app/api/questions/route.ts`)

```typescript
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  // 分页查询
  const query =
    "SELECT * FROM questions ORDER BY created_at DESC LIMIT ? OFFSET ?";
  const stmt = db.prepare(query);
  const questions = stmt.all(limit, offset);

  // 获取总数
  const countStmt = db.prepare("SELECT COUNT(*) as total FROM questions");
  const totalResult = countStmt.get() as { total: number };

  return NextResponse.json({
    questions,
    total: totalResult.total,
    page,
    limit,
  });
}
```

### 参数化查询示例 (`app/api/users/route.ts`)

```typescript
// 检查用户是否存在
const existingUser = db
  .prepare("SELECT id FROM users WHERE username = ?")
  .get(username);

// 插入新用户
const result = db
  .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
  .run(username, hashedPassword, role);
```

## 数据库表结构

当前数据库包含以下表：

1. **users** - 用户表

   - id, username, password, role, created_at

2. **questions** - 题目表

   - id, type, content, options, correct_answer, explanation, created_at

3. **wrong_questions** - 错题记录表

   - id, user_id, question_id, user_answer, wrong_count, last_wrong_at

4. **exam_configs** - 试卷配置表

   - id, name, single_count, multiple_count, judge_count, created_at

5. **exam_records** - 试卷记录表

   - id, user_id, config_id, questions, answers, score, completed_at, created_at

6. **practice_records** - 练习记录表
   - id, user_id, question_id, user_answer, is_correct, practiced_at

## 运行示例

项目中包含一个完整的示例文件 `examples/sqlite_example.ts`，展示了所有类型的 SQL 查询操作。

要运行示例，可以使用以下命令：

```bash
# 使用Node.js直接运行（需要先编译TypeScript）
npx tsx examples/sqlite_example.ts

# 或者在开发服务器环境中测试
```

## 最佳实践

1. **始终使用参数化查询** - 防止 SQL 注入攻击
2. **合理使用事务** - 确保数据一致性
3. **错误处理** - 妥善处理数据库操作可能出现的错误
4. **资源管理** - 确保数据库连接正确关闭（better-sqlite3 会自动管理）

## 常见问题

### Q: 如何查看数据库内容？

A: 可以使用 SQLite 命令行工具：

```bash
sqlite3 questionbank.db
.tables
SELECT * FROM users;
```

### Q: 如何添加新表？

A: 在 `lib/db.ts` 的 `initDatabase()` 函数中添加 CREATE TABLE 语句。

### Q: 如何修改表结构？

A: 使用 ALTER TABLE 语句，但需要注意数据迁移的问题。

### Q: 数据库文件在哪里？

A: 数据库文件位于项目根目录：`questionbank.db`

## 更多资源

- [better-sqlite3 文档](https://github.com/WiseLibs/better-sqlite3)
- [SQLite 官方文档](https://www.sqlite.org/docs.html)
- [Next.js API 路由文档](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
