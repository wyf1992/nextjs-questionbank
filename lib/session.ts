import { randomBytes } from "crypto";
import db from "./db";

export interface SessionData {
  id: string;
  user_id: number;
  user_data: {
    id: number;
    username: string;
    role: string;
  };
  expires_at: Date;
  created_at: Date;
}

/**
 * 创建新的用户会话
 */
export async function createSession(
  userId: number,
  userData: { id: number; username: string; role: string },
  maxAge: number = 60 * 60 * 24 * 7 // 默认7天
): Promise<string> {
  // 生成随机会话ID
  const sessionId = randomBytes(32).toString("hex");

  // 计算过期时间
  const expiresAt = new Date(Date.now() + maxAge * 1000);

  // 存储会话到数据库
  db.prepare(
    "INSERT INTO sessions (id, user_id, user_data, expires_at) VALUES (?, ?, ?, ?)"
  ).run(sessionId, userId, JSON.stringify(userData), expiresAt.toISOString());

  return sessionId;
}

/**
 * 验证并获取会话数据
 */
export function getSession(sessionId: string): SessionData | null {
  try {
    // 清理过期会话
    db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run();

    // 查询会话
    const session = db
      .prepare("SELECT * FROM sessions WHERE id = ?")
      .get(sessionId) as
      | {
          id: string;
          user_id: number;
          user_data: string;
          expires_at: string;
          created_at: string;
        }
      | undefined;

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      user_id: session.user_id,
      user_data: JSON.parse(session.user_data),
      expires_at: new Date(session.expires_at),
      created_at: new Date(session.created_at),
    };
  } catch (error) {
    console.error("获取会话失败:", error);
    return null;
  }
}

/**
 * 删除会话
 */
export function deleteSession(sessionId: string): void {
  try {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(sessionId);
  } catch (error) {
    console.error("删除会话失败:", error);
  }
}

/**
 * 删除用户的所有会话
 */
export function deleteUserSessions(userId: number): void {
  try {
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
  } catch (error) {
    console.error("删除用户会话失败:", error);
  }
}

/**
 * 更新会话过期时间
 */
export function refreshSession(
  sessionId: string,
  maxAge: number = 60 * 60 * 24 * 7
): boolean {
  try {
    const expiresAt = new Date(Date.now() + maxAge * 1000);

    const result = db
      .prepare("UPDATE sessions SET expires_at = ? WHERE id = ?")
      .run(expiresAt.toISOString(), sessionId);

    return result.changes > 0;
  } catch (error) {
    console.error("更新会话失败:", error);
    return false;
  }
}
