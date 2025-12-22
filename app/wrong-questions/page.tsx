"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WrongQuestion {
  id: number;
  question_id: number;
  user_answer: string;
  wrong_count: number;
  last_wrong_at: string;
  type: "single" | "multiple" | "judge";
  content: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export default function WrongQuestionsPage() {
  const [questions, setQuestions] = useState<WrongQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const loadWrongQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/wrong-questions");
      const data = await response.json();

      if (data.questions) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error("加载错题失败:", error);
      setMessage("加载错题失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWrongQuestions();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这条错题记录吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/wrong-questions?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setQuestions(questions.filter((q) => q.id !== id));
        setMessage("删除成功");
      } else {
        setMessage(data.error || "删除失败");
      }
    } catch (error) {
      console.error("删除错题失败:", error);
      setMessage("删除失败");
    }
  };

  const handlePracticeAgain = async (questionId: number) => {
    // 这里可以跳转到练习页面，或者直接在当前页面练习
    alert(`开始练习题目 ${questionId}，功能待完善`);
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "single":
        return "单选题";
      case "multiple":
        return "多选题";
      case "judge":
        return "判断题";
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString("zh-CN") +
      " " +
      date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-6">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← 返回首页
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-gray-600">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← 返回首页
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">我的错题本</h1>
            <div className="text-sm text-gray-600">
              共 {questions.length} 道错题
            </div>
          </div>

          {message && (
            <div
              className={`mb-4 p-3 rounded-lg ${
                message.includes("成功")
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {message}
            </div>
          )}

          {questions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                暂无错题记录
              </h3>
              <p className="text-gray-600">
                继续保持，或者去{" "}
                <Link
                  href="/practice"
                  className="text-blue-600 hover:underline"
                >
                  练习页面
                </Link>{" "}
                挑战更多题目
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className="border border-gray-200 rounded-lg p-6 hover:border-red-300 transition-colors"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          q.type === "single"
                            ? "bg-blue-100 text-blue-800"
                            : q.type === "multiple"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {getTypeLabel(q.type)}
                      </span>
                      <span className="text-sm text-gray-600">
                        错题次数：{q.wrong_count}
                      </span>
                      <span className="text-sm text-gray-600">
                        上次出错：{formatDate(q.last_wrong_at)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePracticeAgain(q.question_id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        重新练习
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        删除记录
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-gray-800 text-lg">{q.content}</p>

                    {q.options && (
                      <div className="space-y-2 ml-4">
                        {q.options.map((opt, index) => {
                          const optionLabel = String.fromCharCode(65 + index);
                          const isCorrect =
                            q.correct_answer.includes(optionLabel);
                          const isUserAnswer =
                            q.user_answer.includes(optionLabel);

                          return (
                            <div
                              key={index}
                              className={`text-gray-700 ${
                                isCorrect
                                  ? "text-green-600 font-medium"
                                  : isUserAnswer && !isCorrect
                                  ? "text-red-600 font-medium"
                                  : ""
                              }`}
                            >
                              <span className="font-medium">
                                {optionLabel}.
                              </span>{" "}
                              {opt}
                              {isCorrect && " ✓"}
                              {isUserAnswer && !isCorrect && " ✗"}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-4 text-sm">
                      <span className="text-green-600 font-medium">
                        正确答案：{q.correct_answer}
                      </span>
                      <span className="text-red-600 font-medium">
                        你的答案：{q.user_answer}
                      </span>
                    </div>

                    {q.explanation && (
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <span className="text-sm text-gray-600">
                          解析：{q.explanation}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
