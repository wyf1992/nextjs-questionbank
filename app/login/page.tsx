"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // 保存用户信息到 localStorage（客户端使用）
        localStorage.setItem("user", JSON.stringify(data.user));

        // 设置 cookie（服务端使用）
        document.cookie = `user=${JSON.stringify(
          data.user
        )}; path=/; max-age=86400`; // 24小时

        // 触发自定义事件，通知 Navbar 和其他组件用户信息已更新
        window.dispatchEvent(
          new CustomEvent("user-changed", { detail: { user: data.user } })
        );

        // 跳转到首页或重定向来源页面
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get("redirect") || "/";

        // 使用setTimeout确保导航在下一个事件循环中执行
        // 避免与user-changed事件处理产生竞态条件
        // 生产环境中可能需要更长的延迟
        setTimeout(() => {
          router.replace(redirect);

          // 备选方案：如果router.replace没有生效，使用window.location
          setTimeout(() => {
            // 检查是否还在登录页面
            if (window.location.pathname === "/login") {
              window.location.href = redirect;
            }
          }, 100);
        }, 0);
      } else {
        setError(data.error || "登录失败");
      }
    } catch (err) {
      console.error("登录请求失败:", err);
      setError("网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">用户登录</h1>
          <p className="text-gray-600 mt-2">请输入您的用户名和密码</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              用户名
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入密码"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            还没有账号？{" "}
            <Link
              href="/register"
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              立即注册
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p>默认管理员账号：admin / admin123</p>
            <p className="mt-1">普通用户请先注册</p>
          </div>
        </div>
      </div>
    </div>
  );
}
