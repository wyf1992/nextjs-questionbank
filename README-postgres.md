# 从 SQLite 迁移到 PostgreSQL 指南

本文档指导您如何将项目从 SQLite 迁移到 PostgreSQL。

## 1. 安装 PostgreSQL

### Windows

1. 下载并安装 PostgreSQL: https://www.postgresql.org/download/windows/
2. 安装时记住设置的密码
3. 确保 PostgreSQL 服务正在运行

### macOS

```bash
brew install postgresql
brew services start postgresql
```

### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

## 2. 创建数据库

```sql
-- 连接到PostgreSQL
psql -U postgres

-- 创建数据库
CREATE DATABASE questionbank;

-- 创建用户（可选）
CREATE USER questionbank_user WITH PASSWORD 'your_password';

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE questionbank TO questionbank_user;
```

## 3. 配置环境变量

更新 `.env.local` 文件：

```env
# PostgreSQL Database Configuration
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/questionbank

# 或者使用单独的参数
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=questionbank
# DB_USER=postgres
# DB_PASSWORD=yourpassword
```

## 4. 运行数据迁移

### 安装依赖

```bash
npm install
```

### 运行迁移脚本

```bash
npx tsx scripts/migrate-to-postgres.ts
```

迁移脚本将：

1. 连接到现有的 SQLite 数据库 (`questionbank.db`)
2. 连接到 PostgreSQL 数据库
3. 将所有数据迁移到 PostgreSQL
4. 更新序列（自增 ID）

## 5. 测试连接

启动开发服务器测试连接：

```bash
npm run dev
```

访问 http://localhost:3000 确保应用正常工作。

## 6. 验证数据

迁移后，请验证：

1. 所有题目数据是否完整
2. 试卷记录是否正确
3. 错题记录是否完整
4. 练习记录是否迁移成功

## 7. 故障排除

### 连接问题

1. 确保 PostgreSQL 服务正在运行
2. 检查 `.env.local` 中的连接字符串
3. 验证用户名和密码

### 迁移问题

1. 确保 SQLite 数据库文件 (`questionbank.db`) 存在
2. 检查 PostgreSQL 数据库是否已创建
3. 查看迁移脚本的输出日志

### 应用问题

1. 检查控制台错误信息
2. 验证 API 端点是否正常工作
3. 检查数据库表结构是否正确创建

## 8. 回滚到 SQLite（如果需要）

如果需要回滚到 SQLite：

1. 停止应用
2. 恢复 `lib/db.ts` 文件的原始 SQLite 版本
3. 卸载 `pg` 包：`npm uninstall pg @types/pg`
4. 重新安装 `better-sqlite3`：`npm install better-sqlite3`
5. 重启应用

## 9. 生产环境部署

在生产环境中：

1. 使用安全的数据库连接字符串
2. 配置连接池参数
3. 设置适当的 SSL 配置
4. 定期备份数据库

## 优势

迁移到 PostgreSQL 带来的优势：

1. **更好的并发性能** - 支持更多并发连接
2. **高级功能** - JSON 支持、全文搜索、GIS 等
3. **数据完整性** - 更强大的约束和事务支持
4. **扩展性** - 更容易水平扩展
5. **生产就绪** - 更适合生产环境部署
