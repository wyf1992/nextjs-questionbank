# 终端直接执行 SQLite SQL 语句指南

本文档介绍如何在终端中直接执行 SQLite SQL 语句，适用于当前 Next.js 项目。

## 前提条件

确保系统已安装 sqlite3 命令行工具：

```bash
sqlite3 --version
```

如果未安装，可以使用以下命令安装：

- macOS: `brew install sqlite3`
- Ubuntu/Debian: `sudo apt-get install sqlite3`
- CentOS/RHEL: `sudo yum install sqlite3`

## 数据库文件位置

当前项目的 SQLite 数据库文件位于：

```
/Users/yifu.wang/Desktop/wyf/nextjs-questionbank/questionbank.db
```

## 在终端中执行 SQL 的几种方法

### 方法 1: 直接在命令行中执行单条 SQL 语句

```bash
# 基本语法
sqlite3 questionbank.db "SQL语句"

# 示例：查询用户表
sqlite3 questionbank.db "SELECT id, username, role FROM users;"

# 示例：查看所有表
sqlite3 questionbank.db ".tables"

# 示例：查看表结构
sqlite3 questionbank.db ".schema users"

# 示例：统计题目数量
sqlite3 questionbank.db "SELECT type, COUNT(*) as count FROM questions GROUP BY type;"
```

### 方法 2: 进入交互式 SQLite shell

```bash
# 进入交互式环境
sqlite3 questionbank.db

# 在交互式环境中执行SQL
sqlite> .tables
sqlite> SELECT * FROM users LIMIT 3;
sqlite> .schema questions
sqlite> .quit  # 退出
```

### 方法 3: 使用输入重定向执行 SQL 文件

```bash
# 创建SQL文件
cat > query.sql << 'EOF'
SELECT id, username, role FROM users;
SELECT type, COUNT(*) as count FROM questions GROUP BY type;
EOF

# 执行SQL文件
sqlite3 questionbank.db < query.sql

# 或者直接使用现有文件
sqlite3 questionbank.db < examples/terminal_sql_examples.sql
```

### 方法 4: 使用管道传递 SQL 语句

```bash
# 通过echo传递SQL
echo "SELECT * FROM users LIMIT 2;" | sqlite3 questionbank.db

# 通过cat传递多行SQL
cat << 'EOF' | sqlite3 questionbank.db
.tables
SELECT COUNT(*) as total_users FROM users;
SELECT COUNT(*) as total_questions FROM questions;
EOF
```

### 方法 5: 使用 heredoc 执行多行 SQL

```bash
sqlite3 questionbank.db << 'SQL'
.tables
SELECT id, username FROM users;
SELECT type, COUNT(*) FROM questions GROUP BY type;
.quit
SQL
```

## 常用 SQLite 命令行命令

### 数据库信息命令

```bash
# 查看所有表
.tables

# 查看特定表的结构
.schema table_name

# 查看所有表的结构
.schema

# 查看数据库信息
.databases

# 查看索引
.indices table_name
```

### 输出格式控制

```bash
# 设置为列模式（默认）
.mode column

# 设置为列表模式
.mode list

# 设置为CSV格式
.mode csv

# 设置为HTML表格
.mode html

# 设置列标题显示
.headers on

# 设置列分隔符
.separator ","

# 设置输出到文件
.output results.txt
SELECT * FROM users;
.output stdout  # 恢复标准输出
```

### 数据导入导出

```bash
# 导出整个数据库为SQL文件
sqlite3 questionbank.db .dump > backup.sql

# 导出特定表
sqlite3 questionbank.db ".dump users" > users_backup.sql

# 导出查询结果为CSV
sqlite3 questionbank.db << 'EOF'
.headers on
.mode csv
.output users.csv
SELECT * FROM users;
.output stdout
EOF

# 导入SQL文件
sqlite3 newdb.db < backup.sql
```

## 实用 SQL 查询示例

### 1. 基本查询

```sql
-- 查看前5个用户
SELECT * FROM users LIMIT 5;

-- 查看题目类型分布
SELECT type, COUNT(*) as count FROM questions GROUP BY type;

-- 查看最新的考试记录
SELECT e.id, u.username, e.score, e.created_at
FROM exam_records e
JOIN users u ON e.user_id = u.id
ORDER BY e.created_at DESC
LIMIT 5;
```

### 2. 数据统计

```sql
-- 各表数据量统计
SELECT 'users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'questions', COUNT(*) FROM questions
UNION ALL
SELECT 'exam_records', COUNT(*) FROM exam_records
UNION ALL
SELECT 'practice_records', COUNT(*) FROM practice_records;

-- 题目内容长度统计
SELECT
  type,
  COUNT(*) as count,
  MIN(LENGTH(content)) as min_len,
  MAX(LENGTH(content)) as max_len,
  AVG(LENGTH(content)) as avg_len
FROM questions
GROUP BY type;
```

### 3. 数据维护

```sql
-- 备份表
CREATE TABLE users_backup AS SELECT * FROM users;

-- 清理测试数据
DELETE FROM users WHERE username LIKE 'test_%';

-- 更新数据
UPDATE users SET role = 'user' WHERE username = 'testuser';

-- 添加新列（如果需要）
ALTER TABLE users ADD COLUMN email TEXT;
```

### 4. 复杂查询

```sql
-- 查找错题最多的用户
SELECT
  u.username,
  COUNT(wq.id) as wrong_count
FROM wrong_questions wq
JOIN users u ON wq.user_id = u.id
GROUP BY wq.user_id
ORDER BY wrong_count DESC
LIMIT 5;

-- 考试平均分统计
SELECT
  u.username,
  COUNT(e.id) as exam_count,
  AVG(e.score) as avg_score,
  MAX(e.score) as best_score,
  MIN(e.score) as worst_score
FROM exam_records e
JOIN users u ON e.user_id = u.id
GROUP BY e.user_id
HAVING exam_count > 0;
```

## 在终端中调试和测试 SQL

### 创建测试环境

```bash
# 创建测试数据库副本
cp questionbank.db test.db

# 在测试数据库中操作
sqlite3 test.db "DELETE FROM users WHERE username LIKE 'test_%';"
sqlite3 test.db "INSERT INTO users (username, password, role) VALUES ('test1', 'pass', 'user');"
sqlite3 test.db "SELECT * FROM users WHERE username LIKE 'test_%';"

# 清理测试数据库
rm test.db
```

### 使用脚本自动化

```bash
#!/bin/bash
# check_database.sh

DB_PATH="questionbank.db"

echo "=== 数据库健康检查 ==="
echo "1. 表列表:"
sqlite3 "$DB_PATH" ".tables"

echo -e "\n2. 数据统计:"
sqlite3 "$DB_PATH" << 'EOF'
SELECT 'users' as table, COUNT(*) as count FROM users
UNION ALL
SELECT 'questions', COUNT(*) FROM questions
UNION ALL
SELECT 'exam_records', COUNT(*) FROM exam_records;
EOF

echo -e "\n3. 最近活动:"
sqlite3 "$DB_PATH" "SELECT username, MAX(created_at) as last_active FROM users GROUP BY username ORDER BY last_active DESC;"
```

## 注意事项

1. **数据安全**: 在生产环境中直接操作数据库前，请先备份

   ```bash
   cp questionbank.db questionbank_backup_$(date +%Y%m%d_%H%M%S).db
   ```

2. **事务操作**: 对于重要的数据修改，使用事务

   ```sql
   BEGIN TRANSACTION;
   UPDATE users SET role = 'admin' WHERE username = 'someuser';
   -- 检查结果
   SELECT * FROM users WHERE username = 'someuser';
   COMMIT;  -- 或 ROLLBACK; 回滚
   ```

3. **性能考虑**: 对于大量数据操作，考虑在非高峰时段进行

4. **权限管理**: 确保只有授权人员可以访问数据库文件

## 快速参考命令卡

```bash
# 常用命令速查
sqlite3 questionbank.db ".tables"                    # 查看所有表
sqlite3 questionbank.db ".schema users"             # 查看表结构
sqlite3 questionbank.db "SELECT * FROM users LIMIT 3;" # 查询数据
sqlite3 questionbank.db ".dump users" > backup.sql  # 备份表
sqlite3 questionbank.db "VACUUM;"                   # 优化数据库
sqlite3 questionbank.db "ANALYZE;"                  # 更新统计信息
```

## 故障排除

### 常见问题

1. **数据库被锁定**: 确保没有其他进程正在使用数据库
2. **权限错误**: 检查文件读写权限 `ls -la questionbank.db`
3. **SQL 语法错误**: 在交互式环境中逐步测试 SQL 语句
4. **中文显示问题**: 确保终端编码正确，或使用 `.mode list` 避免对齐问题

### 获取帮助

```bash
# 查看sqlite3帮助
sqlite3 --help

# 查看所有点命令
sqlite3 questionbank.db ".help"

# 查看特定命令帮助
sqlite3 questionbank.db ".help .tables"
```

## 结合项目使用

在当前 Next.js 项目中，您可以通过以下方式结合使用：

1. **调试 API 数据**: 当 API 返回异常数据时，直接在终端查询验证
2. **数据迁移**: 执行批量数据更新操作
3. **数据验证**: 验证业务逻辑的正确性
4. **性能分析**: 分析查询性能，优化数据库设计

例如，调试用户认证问题：

```bash
# 查看用户数据
sqlite3 questionbank.db "SELECT id, username, password, role FROM users;"

# 验证特定用户
sqlite3 questionbank.db "SELECT * FROM users WHERE username = 'admin';"
```

通过掌握终端 SQL 操作，您可以更灵活地管理和调试数据库，提高开发效率。
