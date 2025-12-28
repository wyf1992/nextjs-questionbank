import { useState, useEffect } from "react";

interface User {
  id: string | number;
  username: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          // 检查是否过期（7天）
          const now = Date.now();
          const loginTime = parsedUser.loginTime || 0;
          const sevenDays = 7 * 24 * 60 * 60 * 1000; // 7天

          if (now - loginTime > sevenDays) {
            // 已过期，清除数据
            localStorage.removeItem("user");
            setUser(null);
          } else if (parsedUser && parsedUser.id && parsedUser.username) {
            setUser(parsedUser);
          }
        } catch (error) {
          console.error("解析用户信息失败:", error);
          localStorage.removeItem("user"); // 清理无效数据
        }
      }
      setLoading(false);
    };

    // 使用 setTimeout 避免同步更新
    const timer = setTimeout(initializeUser, 0);
    return () => clearTimeout(timer);
  }, []);

  const isLoggedIn = !!user;
  const isAdmin = user?.role === "admin";

  return {
    user,
    isLoggedIn,
    isAdmin,
    loading,
  };
}
