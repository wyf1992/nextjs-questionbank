/**
 * 通用的API请求工具，自动添加用户认证信息
 */

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

/**
 * 获取当前用户信息（从localStorage）
 */
export function getCurrentUser(): {
  id: number;
  username: string;
  role: string;
} | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) {
      return null;
    }
    const user = JSON.parse(userStr);
    if (user && user.id && user.username) {
      return user;
    }
    return null;
  } catch (error) {
    console.error("获取用户信息失败:", error);
    return null;
  }
}

/**
 * 带认证的fetch请求
 */
export async function authFetch(url: string, options: ApiOptions = {}) {
  const user = getCurrentUser();

  // 准备请求头
  const headers = new Headers(options.headers || {});

  // 添加用户信息到请求头
  if (user) {
    headers.set("x-user", JSON.stringify(user));
  }

  // 添加内容类型头（如果是POST/PUT请求）
  if (
    options.method &&
    ["POST", "PUT", "PATCH"].includes(options.method.toUpperCase())
  ) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  // 合并选项
  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, fetchOptions);

  // 检查是否需要重定向到登录页
  if (response.status === 401 && options.requireAuth !== false) {
    // 清除用户信息
    localStorage.removeItem("user");
    // 触发用户变更事件
    window.dispatchEvent(
      new CustomEvent("user-changed", { detail: { user: null } })
    );
    // 重定向到登录页
    window.location.href = "/login";
    throw new Error("未登录，请重新登录");
  }

  return response;
}

/**
 * 带认证的GET请求
 */
export async function authGet(url: string, options: ApiOptions = {}) {
  return authFetch(url, {
    ...options,
    method: "GET",
  });
}

/**
 * 带认证的POST请求
 */
export async function authPost<T = unknown>(
  url: string,
  data: T,
  options: ApiOptions = {}
) {
  return authFetch(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * 带认证的PUT请求
 */
export async function authPut<T = unknown>(
  url: string,
  data: T,
  options: ApiOptions = {}
) {
  return authFetch(url, {
    ...options,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * 带认证的DELETE请求
 */
export async function authDelete(url: string, options: ApiOptions = {}) {
  return authFetch(url, {
    ...options,
    method: "DELETE",
  });
}
