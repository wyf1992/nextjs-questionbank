"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface User {
  id: number;
  username: string;
  role: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 只在客户端执行
    const initializeUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch (error) {
          console.error("解析用户信息失败:", error);
        }
      }
      return null;
    };

    // 使用 requestAnimationFrame 或 setTimeout 来避免同步更新
    const timer = setTimeout(() => {
      setUser(initializeUser());
      setLoading(false);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-xl text-gray-600">加载中...</div>
      </div>
    );
  }

  const userCards = [
    {
      title: "开始刷题",
      description: "随机抽取题目进行练习，支持按题型筛选，实时反馈答题结果",
      href: "/practice",
      icon: "✍️",
      color: "hover:border-green-500",
      available: true,
    },
    {
      title: "模拟考试",
      description: "生成模拟试卷，可配置题目数量，完整的考试体验",
      href: "/exam",
      icon: "📋",
      color: "hover:border-purple-500",
      available: true,
    },
    {
      title: "我的错题",
      description: "查看历史错题记录，重点复习薄弱环节，提高答题准确率",
      href: "/wrong-questions",
      icon: "❌",
      color: "hover:border-red-500",
      available: true,
    },
    {
      title: "考试记录",
      description: "查看历史考试记录，分析答题情况，追踪学习进度",
      href: "/exam-history",
      icon: "📊",
      color: "hover:border-indigo-500",
      available: true,
    },
  ];

  const adminCards = [
    {
      title: "题库管理",
      description: "查看、编辑、删除题目，管理题库内容，支持分类筛选",
      href: "/questions",
      icon: "📚",
      color: "hover:border-yellow-500",
      available: user?.role === "admin",
    },
    {
      title: "导入题库",
      description: "上传 Word 文档，自动解析题目，支持预览和编辑后入库",
      href: "/import",
      icon: "📝",
      color: "hover:border-blue-500",
      available: user?.role === "admin",
    },
    {
      title: "用户管理",
      description: "管理用户账户，设置用户权限，查看用户活动",
      href: "/admin/users",
      icon: "👥",
      color: "hover:border-pink-500",
      available: user?.role === "admin",
    },
  ];

  const allCards = [...userCards, ...adminCards];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            在线刷题系统
          </h1>
          <p className="text-xl text-gray-600">
            支持单选、多选、判断题，Word 导入题库，智能错题本
          </p>

          {user ? (
            <div className="mt-6 inline-flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold mr-3">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="font-medium text-gray-800">{user.username}</div>
                <div className="text-sm text-gray-500">
                  {user.role === "admin" ? "管理员" : "普通用户"}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6">
              <p className="text-gray-600 mb-4">请先登录以使用完整功能</p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/login"
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  登录
                </Link>
                <Link
                  href="/register"
                  className="px-6 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
                >
                  注册
                </Link>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {allCards.map((card, index) => {
            if (!card.available && !user) {
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-lg p-8 border-2 border-transparent opacity-75"
                >
                  <div className="text-4xl mb-4">{card.icon}</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {card.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{card.description}</p>
                  <div className="text-sm text-gray-500 italic">
                    请先登录以使用此功能
                  </div>
                </div>
              );
            }

            if (!card.available && user) {
              return (
                <div
                  key={index}
                  className="bg-white rounded-lg shadow-lg p-8 border-2 border-transparent opacity-75"
                >
                  <div className="text-4xl mb-4">{card.icon}</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {card.title}
                  </h2>
                  <p className="text-gray-600 mb-4">{card.description}</p>
                  <div className="text-sm text-gray-500 italic">
                    仅管理员可用
                  </div>
                </div>
              );
            }

            return (
              <Link href={card.href} key={index}>
                <div
                  className={`bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent ${card.color}`}
                >
                  <div className="text-4xl mb-4">{card.icon}</div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    {card.title}
                  </h2>
                  <p className="text-gray-600">{card.description}</p>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p className="text-sm">
            💡 提示：
            {user
              ? "普通用户只能查看自己的数据，管理员可以查看所有数据"
              : "首次使用请先注册登录"}
          </p>
          {user && user.role === "user" && (
            <p className="text-sm mt-2">
              您当前是普通用户，只能访问：开始刷题、模拟考试、错题本、考试记录
            </p>
          )}
          {user && user.role === "admin" && (
            <p className="text-sm mt-2">您当前是管理员，可以访问所有功能模块</p>
          )}
        </div>
      </div>
    </div>
  );
}
