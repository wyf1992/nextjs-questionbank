import { NextRequest } from "next/server";
import { cookies } from "next/headers";

export interface User {
  id: number;
  username: string;
  role: string;
}

/**
 * 从请求中获取当前用户
 * 首先尝试从cookie中获取，然后从请求头中获取
 */
export async function getCurrentUser(
  request: NextRequest
): Promise<User | null> {
  try {
    // 从cookie中获取用户信息
    const cookieStore = await cookies();
    const userCookie = cookieStore.get("user");

    if (userCookie) {
      try {
        const user = JSON.parse(userCookie.value);
        if (user && user.id && user.username) {
          return user as User;
        }
      } catch (error) {
        console.error("解析用户cookie失败:", error);
      }
    }

    // 从请求头中获取用户信息（前端通过header传递）
    const userHeader = request.headers.get("x-user");
    if (userHeader) {
      try {
        const user = JSON.parse(userHeader);
        if (user && user.id && user.username) {
          return user as User;
        }
      } catch (error) {
        console.error("解析用户请求头失败:", error);
      }
    }

    // 从Authorization头中获取（备用方案）
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        // 这里可以解析JWT token，但当前系统使用简单的JSON存储
        // 暂时返回null，后续可以扩展
        return null;
      } catch (error) {
        console.error("解析Authorization头失败:", error);
      }
    }

    return null;
  } catch (error) {
    console.error("获取当前用户失败:", error);
    return null;
  }
}

/**
 * 验证用户是否已登录
 */
export async function requireAuth(request: NextRequest): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error("未登录");
  }
  return user;
}

/**
 * 验证用户是否为管理员
 */
export async function requireAdmin(request: NextRequest): Promise<User> {
  const user = await getCurrentUser(request);
  if (!user) {
    throw new Error("未登录");
  }
  if (user.role !== "admin") {
    throw new Error("需要管理员权限");
  }
  return user;
}
