-- 终端SQL语句示例文件
-- 可以在sqlite3命令行中直接执行这些语句

-- 1. 查看所有表
.tables

-- 2. 查看表结构
.schema users
.schema questions

-- 3. 查询数据
SELECT * FROM users LIMIT 5;

SELECT id, username, role FROM users;

-- 4. 条件查询
SELECT * FROM questions WHERE type = 'single' LIMIT 3;

SELECT type, COUNT(*) as count FROM questions GROUP BY type;

-- 5. 插入数据
INSERT INTO users (username, password, role) 
VALUES ('terminal_user', 'hashed_pass', 'user');

-- 6. 更新数据
UPDATE users SET role = 'user' WHERE username = 'terminal_user';

-- 7. 删除数据
DELETE FROM users WHERE username = 'terminal_user';

-- 8. 创建临时表
CREATE TABLE IF NOT EXISTS temp_test (
  id INTEGER PRIMARY KEY,
  name TEXT,
  value INTEGER
);

-- 9. 插入测试数据到临时表
INSERT INTO temp_test (name, value) VALUES ('test1', 100);
INSERT INTO temp_test (name, value) VALUES ('test2', 200);

-- 10. 查询临时表
SELECT * FROM temp_test;

-- 11. 删除临时表
DROP TABLE temp_test;

-- 12. 退出sqlite3
.quit
