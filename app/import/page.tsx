"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/useAuth";

interface Question {
  type: "single" | "multiple" | "judge";
  content: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();
  const { isLoggedIn, isAdmin, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!isLoggedIn) {
      router.push("/login");
      return;
    }

    if (!isAdmin) {
      router.push("/not-found");
      return;
    }
  }, [authLoading, isLoggedIn, isAdmin, router]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setQuestions([]);
      setMessage("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage("请选择文件");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setQuestions(data.questions);
        setMessage(`成功解析 ${data.count} 道题目，请预览并确认`);
      } else {
        setMessage(data.error || "解析失败");
      }
    } catch (error) {
      setMessage("上传失败，请重试");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQuestions = async () => {
    if (questions.length === 0) {
      setMessage("没有题目可以保存");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ questions }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage(`成功导入 ${data.count} 道题目到题库`);
        setQuestions([]);
        setFile(null);
      } else {
        setMessage(data.error || "保存失败");
      }
    } catch (error) {
      setMessage("保存失败，请重试");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditQuestion = (index: number, field: string, value: string) => {
    const newQuestions = [...questions];
    (newQuestions[index] as unknown as Record<string, unknown>)[field] = value;
    setQuestions(newQuestions);
  };

  const handleEditOption = (
    qIndex: number,
    optIndex: number,
    value: string
  ) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options) {
      newQuestions[qIndex].options![optIndex] = value;
      setQuestions(newQuestions);
    }
  };

  const handleDeleteQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    setMessage(`已删除第 ${index + 1} 题`);
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

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      {authLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-xl text-gray-600">加载中...</div>
        </div>
      ) : (
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-6">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← 返回首页
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">导入题库</h1>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择 Word 文档（.doc 或 .docx）
              </label>
              <input
                type="file"
                accept=".doc,.docx"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <button
              onClick={handleUpload}
              disabled={!file || loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? "解析中..." : "解析文档"}
            </button>

            {message && (
              <div
                className={`mt-4 p-4 rounded-lg ${
                  message.includes("成功")
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {message}
              </div>
            )}
          </div>

          {questions.length > 0 && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  题目预览（共 {questions.length} 题）
                </h2>
                <button
                  onClick={handleSaveQuestions}
                  disabled={loading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {loading ? "保存中..." : "确认入库"}
                </button>
              </div>

              <div className="space-y-6">
                {questions.map((q, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-semibold text-gray-700">
                          第 {index + 1} 题
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
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setEditingIndex(
                              editingIndex === index ? null : index
                            )
                          }
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          {editingIndex === index ? "完成编辑" : "编辑"}
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          删除
                        </button>
                      </div>
                    </div>

                    {editingIndex === index ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            题目内容
                          </label>
                          <textarea
                            value={q.content}
                            onChange={(e) =>
                              handleEditQuestion(
                                index,
                                "content",
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg p-2"
                            rows={3}
                          />
                        </div>

                        {q.options && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              选项
                            </label>
                            {q.options.map((opt, optIndex) => (
                              <div key={optIndex} className="flex gap-2 mb-2">
                                <span className="font-medium">
                                  {String.fromCharCode(65 + optIndex)}.
                                </span>
                                <input
                                  type="text"
                                  value={opt}
                                  onChange={(e) =>
                                    handleEditOption(
                                      index,
                                      optIndex,
                                      e.target.value
                                    )
                                  }
                                  className="flex-1 border border-gray-300 rounded px-2 py-1"
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
                            value={q.correctAnswer}
                            onChange={(e) =>
                              handleEditQuestion(
                                index,
                                "correctAnswer",
                                e.target.value
                              )
                            }
                            className="w-full border border-gray-300 rounded-lg p-2"
                          />
                        </div>

                        {q.explanation && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              解析
                            </label>
                            <textarea
                              value={q.explanation}
                              onChange={(e) =>
                                handleEditQuestion(
                                  index,
                                  "explanation",
                                  e.target.value
                                )
                              }
                              className="w-full border border-gray-300 rounded-lg p-2"
                              rows={2}
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-gray-800 text-lg">{q.content}</p>

                        {q.options && (
                          <div className="space-y-2 ml-4">
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

                        <div className="flex gap-4 text-sm">
                          <span className="text-green-600 font-medium">
                            正确答案：{q.correctAnswer}
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
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
