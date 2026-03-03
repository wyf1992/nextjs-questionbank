"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

interface Question {
  id: number;
  type: "single" | "multiple" | "judge";
  content: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
  created_at: string;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [total, setTotal] = useState(0);
  const [questionType, setQuestionType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [message, setMessage] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const { user, isAdmin, loading: authLoading } = useAuth();

  const limit = 20;

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      if (questionType !== "all") {
        params.append("type", questionType);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const response = await fetch(`/api/questions?${params}`);
      const data = await response.json();

      if (data.questions) {
        setQuestions(data.questions);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("加载题目失败:", error);
      setMessage("加载题目失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, [page, questionType]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);
  const handleDelete = async (id: number) => {
    if (!isAdmin) {
      setMessage("权限不足");
      return;
    }

    if (!confirm("确定要删除这道题目吗？")) {
      return;
    }

    try {
      const response = await fetch(`/api/questions?id=${id}`, {
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
      console.error("删除题目失败:", error);
      setMessage("删除失败");
    }
  };

  const handleSaveEdit = async () => {
    if (!isAdmin) {
      setMessage("权限不足");
      return;
    }

    if (!editingQuestion) return;

    try {
      const response = await fetch("/api/questions", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editingQuestion),
      });

      const data = await response.json();

      if (data.success) {
        setQuestions(
          questions.map((q) =>
            q.id === editingQuestion.id ? editingQuestion : q
          )
        );
        setEditingQuestion(null);
        setMessage("更新成功");
      } else {
        setMessage(data.error || "更新失败");
      }
    } catch (error) {
      console.error("更新题目失败:", error);
      setMessage("更新失败");
    }
  };

  const handleClearAll = async () => {
    if (!isAdmin) {
      setMessage("权限不足");
      return;
    }

    if (
      !confirm(
        "警告：这将清除所有题目、错题记录、试卷记录和练习记录！此操作不可恢复。\n\n确定要清除所有题库吗？"
      )
    ) {
      return;
    }

    // 二次确认
    if (
      !confirm(
        "再次确认：您真的要清除所有题库数据吗？这将删除所有题目及相关记录！"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/questions?clearAll=true`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        setQuestions([]);
        setTotal(0);
        setMessage(data.message || "已成功清除所有题库");
      } else {
        setMessage(data.error || "清除失败");
      }
    } catch (error) {
      console.error("清除所有题目失败:", error);
      setMessage("清除失败");
    }
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
    return date.toLocaleDateString("zh-CN");
  };

  const totalPages = Math.ceil(total / limit);

  const handlePageJump = () => {
    const nextPage = Number.parseInt(pageInput, 10);
    if (Number.isNaN(nextPage)) return;
    const clamped = Math.min(totalPages || 1, Math.max(1, nextPage));
    setPage(clamped);
  };

  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const buildWordContent = (items: Question[]) => {
    const questionBlocks = items
      .map((q, index) => {
        const optionsHtml =
          q.options && q.options.length > 0
            ? q.options
                .map(
                  (opt, optIndex) =>
                    `<p>${String.fromCharCode(65 + optIndex)}. ${escapeHtml(
                      opt
                    )}</p>`
                )
                .join("")
            : "";

        const explanationHtml = q.explanation
          ? `<p><strong>解析：</strong>${escapeHtml(q.explanation)}</p>`
          : "";

        return `
          <div class="question-block">
            <p><strong>第 ${index + 1} 题（${getTypeLabel(q.type)}）</strong></p>
            <p>${escapeHtml(q.content)}</p>
            ${optionsHtml}
            <p><strong>正确答案：</strong>${escapeHtml(q.correct_answer)}</p>
            ${explanationHtml}
          </div>
        `;
      })
      .join("");

    return `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word" 
            xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <title>题库导出</title>
        <style>
          body { font-family: "Microsoft YaHei", sans-serif; line-height: 1.6; }
          .question-block { margin-bottom: 20px; }
          p { margin: 6px 0; }
        </style>
      </head>
      <body>
        <h1>题库导出</h1>
        ${questionBlocks}
      </body>
      </html>
    `;
  };

  const handleExportWord = async () => {
    if (total === 0) {
      setMessage("当前没有可导出的题目");
      return;
    }

    setExporting(true);
    setMessage("");

    try {
      const params = new URLSearchParams();
      params.append("page", "1");
      params.append("limit", total.toString());
      if (questionType !== "all") {
        params.append("type", questionType);
      }
      if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }

      const response = await fetch(`/api/questions?${params.toString()}`);
      const data = await response.json();

      if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("导出数据无效");
      }

      const wordContent = buildWordContent(data.questions as Question[]);
      const blob = new Blob([`\ufeff${wordContent}`], {
        type: "application/msword;charset=utf-8",
      });

      const fileName = `题库导出_${new Date().toISOString().slice(0, 10)}.doc`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage(`导出成功，共 ${data.questions.length} 道题目`);
    } catch (error) {
      console.error("导出 Word 失败:", error);
      setMessage("导出失败");
    } finally {
      setExporting(false);
    }
  };

  if (loading && questions.length === 0) {
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
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="container mx-auto px-3 md:px-4 max-w-6xl">
        <div className="mb-4 md:mb-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm md:text-base"
          >
            ← 返回首页
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">题库管理</h1>
            <div className="text-sm text-gray-600">共 {total} 道题目</div>
          </div>

          <div className="flex flex-col md:flex-row gap-2 justify-between items-center mb-6">
            <div className="flex gap-4 items-center">
              <select
                value={questionType}
                onChange={(e) => {
                  setQuestionType(e.target.value);
                  setPage(1);
                }}
                className="border border-gray-300 rounded-lg p-2"
              >
                <option value="all">全部题型</option>
                <option value="single">单选题</option>
                <option value="multiple">多选题</option>
                <option value="judge">判断题</option>
              </select>
              <div className="flex items-center gap-2 relative  ">
                <input
                  type="text"
                  placeholder="搜索题目内容..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border border-gray-300 rounded-lg p-2 pr-8 w-56  md:w-64"
                />

                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setPage(1);
                    }}
                    className="text-gray-500 hover:text-gray-700 absolute  left-50 md:left-58  "
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-4 self-end">
              <button
                onClick={handleExportWord}
                disabled={exporting || loading}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {exporting ? "导出中..." : "导出 Word"}
              </button>
              <button
                onClick={() => {
                  setPage(1);
                  loadQuestions();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                筛选
              </button>
              {isAdmin && (
                <button
                  onClick={handleClearAll}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  清除所有题库
                </button>
              )}
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
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">
                暂无题目
              </h3>
              <p className="text-gray-600">
                去{" "}
                <Link href="/import" className="text-blue-600 hover:underline">
                  导入页面
                </Link>{" "}
                添加题目
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                {questions.map((q, index) => {
                  // 计算序号：(当前页数-1) * 每页数量 + 当前索引 + 1
                  const serialNumber = (page - 1) * limit + index + 1;
                  return (
                    <div
                      key={q.id}
                      className="border border-gray-200 rounded-lg p-4 md:p-6 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-base font-semibold text-gray-700">
                            第 {serialNumber} 题
                          </span>
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
                            {formatDate(q.created_at)}
                          </span>
                        </div>
                        <div className="flex  gap-2 items-center">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => setEditingQuestion(q)}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(q.id)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                删除
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-gray-800 text-base md:text-lg">
                          {q.content}
                        </p>

                        {q.options && (
                          <div className="space-y-2 ml-2 md:ml-4">
                            {q.options.map((opt, optIndex) => (
                              <div key={optIndex} className="text-gray-700">
                                <span className="font-medium">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>{" "}
                                {opt}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex flex-col md:flex-row gap-2 md:gap-4 text-sm">
                          <span className="text-green-600 font-medium">
                            正确答案：{q.correct_answer}
                          </span>
                        </div>

                        {q.explanation && (
                          <div className="bg-blue-50 p-2 md:p-3 rounded-lg">
                            <span className="text-xs md:text-sm text-gray-600">
                              解析：{q.explanation}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="flex flex-col md:flex-row justify-center items-center gap-3 md:gap-4 mt-8">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    上一页
                  </button>
                  <span className="text-gray-700">
                    第 {page} / {totalPages} 页
                  </span>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50"
                  >
                    下一页
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">跳转到</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handlePageJump();
                      }}
                      className="w-20 border border-gray-300 rounded-lg p-2 text-center"
                    />
                    <span className="text-sm text-gray-600">
                      / {totalPages}
                    </span>
                    <button
                      onClick={handlePageJump}
                      className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      跳转
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 编辑模态框 */}
      {editingQuestion && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 md:p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-4 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">编辑题目</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  题目类型
                </label>
                <select
                  value={editingQuestion.type}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      type: e.target.value as "single" | "multiple" | "judge",
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="single">单选题</option>
                  <option value="multiple">多选题</option>
                  <option value="judge">判断题</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  题目内容
                </label>
                <textarea
                  value={editingQuestion.content}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      content: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm md:text-base"
                  rows={3}
                />
              </div>

              {editingQuestion.options && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    选项
                  </label>
                  {editingQuestion.options.map((opt, index) => (
                    <div key={index} className="flex gap-2 mb-2">
                      <span className="font-medium">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const newOptions = [...editingQuestion.options!];
                          newOptions[index] = e.target.value;
                          setEditingQuestion({
                            ...editingQuestion,
                            options: newOptions,
                          });
                        }}
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm md:text-base"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  正确答案
                </label>
                <input
                  type="text"
                  value={editingQuestion.correct_answer}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      correct_answer: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  解析
                </label>
                <textarea
                  value={editingQuestion.explanation || ""}
                  onChange={(e) =>
                    setEditingQuestion({
                      ...editingQuestion,
                      explanation: e.target.value,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm md:text-base"
                  rows={2}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleSaveEdit}
                  className="flex-1 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingQuestion(null)}
                  className="flex-1 bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
