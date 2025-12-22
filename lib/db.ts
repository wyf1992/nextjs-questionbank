// 导出PostgreSQL数据库连接
// 为了向后兼容，我们保留这个文件，但实际使用PostgreSQL
import pool, { initDatabase, query, transaction } from "./db-pg";

// 重新导出所有功能
export { initDatabase, query, transaction };

// 为了向后兼容，提供一个默认导出
// 注意：这不再是一个SQLite数据库对象，而是PostgreSQL连接池
const db = {
  // 模拟SQLite的prepare方法
  prepare: (sql: string) => {
    // 将SQLite的?占位符转换为PostgreSQL的$1, $2等
    const convertSql = (sql: string): string => {
      let paramIndex = 1;
      return sql.replace(/\?/g, () => `$${paramIndex++}`);
    };

    const convertedSql = convertSql(sql);

    return {
      all: async (...params: unknown[]) => {
        const result = await query(convertedSql, params);
        return result.rows;
      },
      get: async (...params: unknown[]) => {
        const result = await query(convertedSql, params);
        return result.rows[0] || null;
      },
      run: async (...params: unknown[]) => {
        const result = await query(convertedSql, params);
        // 对于INSERT语句，返回包含id和changes的对象
        if (
          convertedSql.toUpperCase().includes("INSERT") &&
          convertedSql.toUpperCase().includes("RETURNING")
        ) {
          return result.rows[0] || { changes: result.rowCount || 0 };
        }
        return { changes: result.rowCount || 0 };
      },
    };
  },
  // 模拟SQLite的exec方法
  exec: async (sql: string) => {
    await query(sql);
  },
  // 模拟SQLite的transaction方法
  transaction: <T>(
    callback: (statements: {
      run: (sql: string, ...params: unknown[]) => Promise<unknown>;
    }) => Promise<T> | T
  ) => {
    return async (...args: unknown[]): Promise<T> => {
      return await transaction(async (client) => {
        // 创建一个包装器来模拟SQLite的事务API
        const txWrapper = {
          run: (sql: string, ...params: unknown[]) => {
            // 将SQLite的?占位符转换为PostgreSQL的$1, $2等
            const convertSql = (sql: string): string => {
              let paramIndex = 1;
              return sql.replace(/\?/g, () => `$${paramIndex++}`);
            };
            const convertedSql = convertSql(sql);
            return client.query(convertedSql, params);
          },
        };
        return await callback(txWrapper);
      });
    };
  },
};

// 初始化数据库（异步）
initDatabase().catch((error) => {
  console.error("Failed to initialize PostgreSQL database:", error);
});

export default db;
