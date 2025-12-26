import { NextRequest, NextResponse } from "next/server";

// 用户类型定义
interface User {
  id: number;
  username: string;
  role: string;
}

// 公开路径（不需要登录即可访问）
const publicPaths = [
  "/login",
  "/register",
  "/api/auth/login",
  "/api/users", // 注册API
];

// 检查路径是否为公开路径
function isPublicPath(pathname: string): boolean {
  return publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

// 从请求中获取用户信息
function getUserFromRequest(request: NextRequest): {
  isAuthenticated: boolean;
  user?: User;
} {
  // 从 cookie 中获取用户信息
  const userCookie = request.cookies.get("user");

  if (userCookie) {
    try {
      const user: User = JSON.parse(userCookie.value);
      return { isAuthenticated: true, user };
    } catch (error) {
      console.error("解析用户cookie失败:", error);
    }
  }

  // 从 localStorage 无法在服务端访问，所以主要依赖 cookie
  // 如果 cookie 中没有，则认为未登录
  return { isAuthenticated: false };
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否为公开路径
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // 检查用户是否已登录
  const { isAuthenticated } = getUserFromRequest(request);
  if (!isAuthenticated) {
    // 重定向到登录页面
    const loginUrl = new URL("/login", request.url);
    // 添加重定向来源参数
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// 配置匹配路径
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了：
     * 1. _next/static (静态文件)
     * 2. _next/image (图片优化)
     * 3. favicon.ico (网站图标)
     * 4. 公开文件
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
