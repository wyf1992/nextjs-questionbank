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
    {
      title: "题库管理",
      description: "查看、编辑、删除题目，管理题库内容，支持分类筛选",
      href: "/questions",
      icon: "📚",
      color: "hover:border-yellow-500",
      available: true,
    },
  ];

  const adminCards = [
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
                  className="hidden bg-white rounded-lg shadow-lg p-8 border-2 border-transparent opacity-75"
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
      </div>
    </div>
  );
}
