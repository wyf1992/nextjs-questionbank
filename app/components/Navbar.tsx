"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface User {
  id: number;
  username: string;
  role: string;
}

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const router = useRouter();

  // 从 localStorage 读取用户信息的函数
  const readUserFromStorage = () => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        return JSON.parse(storedUser);
      } catch (error) {
        console.error("解析用户信息失败:", error);
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    // 使用 setTimeout 将状态更新推迟到下一个事件循环，避免同步更新
    const timer = setTimeout(() => {
      setUser(readUserFromStorage());
      setLoading(false);
    }, 16);

    // 监听 storage 事件，当 localStorage 变化时更新用户信息
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "user") {
        if (e.newValue) {
          try {
            setUser(JSON.parse(e.newValue));
          } catch (error) {
            console.error("解析用户信息失败:", error);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    };

    // 监听自定义事件，用于同页面内的状态同步
    const handleUserChange = (e: CustomEvent) => {
      setUser(e.detail.user);
    };

    // 添加事件监听器
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("user-changed", handleUserChange as EventListener);

    // 清理函数
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener(
        "user-changed",
        handleUserChange as EventListener
      );
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    // 清除 cookie
    document.cookie = "user=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    setUser(null);
    // 触发自定义事件，通知其他组件用户已登出
    window.dispatchEvent(
      new CustomEvent("user-changed", { detail: { user: null } })
    );
    router.push("/login");
  };

  if (loading) {
    return (
      <nav className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="text-lg font-bold text-gray-800">刷题系统</div>
            <div className="text-gray-600">加载中...</div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo和汉堡菜单按钮 */}
          <div className="flex items-center space-x-4">
            <Link
              href="/"
              className="text-lg font-bold text-gray-800 hover:text-blue-600"
            >
              刷题系统
            </Link>

            {/* 汉堡菜单按钮 - 仅在小屏幕上显示 */}
            {user && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-blue-600 hover:bg-gray-100"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {isMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>
            )}
          </div>

          {/* 桌面导航链接 - 在中等及以上屏幕显示 */}
          <div className="hidden md:flex items-center space-x-6">
            {user && (
              <>
                <Link
                  href="/practice"
                  className="text-gray-600 hover:text-blue-600"
                >
                  开始刷题
                </Link>
                <Link
                  href="/exam"
                  className="text-gray-600 hover:text-blue-600"
                >
                  模拟考试
                </Link>
                <Link
                  href="/wrong-questions"
                  className="text-gray-600 hover:text-blue-600"
                >
                  错题本
                </Link>
                <Link
                  href="/exam-history"
                  className="text-gray-600 hover:text-blue-600"
                >
                  考试记录
                </Link>
                {user.role === "admin" && (
                  <>
                    <Link
                      href="/questions"
                      className="text-gray-600 hover:text-blue-600"
                    >
                      题库管理
                    </Link>
                    <Link
                      href="/import"
                      className="text-gray-600 hover:text-blue-600"
                    >
                      导入题库
                    </Link>
                    <Link
                      href="/admin/users"
                      className="text-gray-600 hover:text-blue-600"
                    >
                      用户管理
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* 用户操作区域 */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                {/* 用户信息 - 在小屏幕上隐藏文字部分 */}
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-medium text-gray-800">
                      {user.username}
                    </div>
                    <div className="text-xs text-gray-500">
                      {user.role === "admin" ? "管理员" : "普通用户"}
                    </div>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
                >
                  <span className="hidden sm:inline">退出登录</span>
                  <span className="sm:hidden">退出</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  <span className="hidden sm:inline">登录</span>
                  <span className="sm:hidden">登录</span>
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 sm:px-4 sm:py-2 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  <span className="hidden sm:inline">注册</span>
                  <span className="sm:hidden">注册</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* 移动菜单 - 仅在小屏幕上显示 */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-3 border-t border-gray-200 pt-4">
            <div className="flex flex-col space-y-3">
              {user && (
                <>
                  <Link
                    href="/practice"
                    className="text-gray-600 hover:text-blue-600 py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    开始刷题
                  </Link>
                  <Link
                    href="/exam"
                    className="text-gray-600 hover:text-blue-600 py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    模拟考试
                  </Link>
                  <Link
                    href="/wrong-questions"
                    className="text-gray-600 hover:text-blue-600 py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    错题本
                  </Link>
                  <Link
                    href="/exam-history"
                    className="text-gray-600 hover:text-blue-600 py-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    考试记录
                  </Link>
                  {user.role === "admin" && (
                    <>
                      <Link
                        href="/questions"
                        className="text-gray-600 hover:text-blue-600 py-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        题库管理
                      </Link>
                      <Link
                        href="/import"
                        className="text-gray-600 hover:text-blue-600 py-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        导入题库
                      </Link>
                      <Link
                        href="/admin/users"
                        className="text-gray-600 hover:text-blue-600 py-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        用户管理
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
