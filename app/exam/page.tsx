"use client";

import { useState } from "react";
import Link from "next/link";

interface Question {
  id: number;
  type: "single" | "multiple" | "judge";
  content: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
}

interface ExamData {
  success: boolean;
  examId: number;
  configId: number;
  questions: Question[];
  error?: string;
}

export default function ExamPage() {
  const [examName, setExamName] = useState("模拟考试");
  const [singleCount, setSingleCount] = useState(60);
  const [multipleCount, setMultipleCount] = useState(30);
  const [judgeCount, setJudgeCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [examData, setExamData] = useState<ExamData | null>(null);

  const handleGenerateExam = async () => {
    if (!examName.trim()) {
      setMessage("请输入试卷名称");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/exam", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: examName,
          singleCount,
          multipleCount,
          judgeCount,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setExamData(data);
        setMessage(`试卷生成成功！共 ${data.questions.length} 道题目`);
      } else {
        setMessage(data.error || "生成试卷失败");
      }
    } catch (error) {
      console.error("生成试卷失败:", error);
      setMessage("生成试卷失败");
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = () => {
    if (examData) {
      // 跳转到考试页面
      window.location.href = `/exam/taking/${examData.examId}`;
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-800 mb-6">模拟考试</h1>

          {!examData ? (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  试卷名称
                </label>
                <input
                  type="text"
                  value={examName}
                  onChange={(e) => setExamName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="请输入试卷名称"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    单选题数量
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={singleCount}
                    onChange={(e) =>
                      setSingleCount(parseInt(e.target.value) || 0)
                    }
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    多选题数量
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={multipleCount}
                    onChange={(e) =>
                      setMultipleCount(parseInt(e.target.value) || 0)
                    }
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    判断题数量
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={judgeCount}
                    onChange={(e) =>
                      setJudgeCount(parseInt(e.target.value) || 0)
                    }
                    className="w-full border border-gray-300 rounded-lg p-2"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">试卷配置</h3>
                <p className="text-sm text-blue-700">
                  总计：{singleCount + multipleCount + judgeCount} 题 （单选题{" "}
                  {singleCount} 题，多选题 {multipleCount} 题，判断题{" "}
                  {judgeCount} 题）
                </p>
              </div>

              {message && (
                <div
                  className={`p-4 rounded-lg ${
                    message.includes("成功")
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {message}
                </div>
              )}

              <button
                onClick={handleGenerateExam}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-lg font-medium"
              >
                {loading ? "生成中..." : "生成试卷"}
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-green-800">
                    {examName}
                  </h2>
                  <span className="text-sm text-green-600">
                    试卷 ID：{examData.examId}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-gray-600">单选题</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {
                        examData.questions.filter(
                          (q: Question) => q.type === "single"
                        ).length
                      }
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-gray-600">多选题</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {
                        examData.questions.filter(
                          (q: Question) => q.type === "multiple"
                        ).length
                      }
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-lg">
                    <div className="text-sm text-gray-600">判断题</div>
                    <div className="text-2xl font-bold text-green-600">
                      {
                        examData.questions.filter(
                          (q: Question) => q.type === "judge"
                        ).length
                      }
                    </div>
                  </div>
                </div>

                <p className="text-sm text-green-700">
                  试卷已生成，共 {examData.questions.length} 道题目
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-800">
                  题目预览（前 5 题）
                </h3>
                {examData.questions
                  .slice(0, 5)
                  .map((q: Question, index: number) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          第 {index + 1} 题
                        </span>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            q.type === "single"
                              ? "bg-blue-100 text-blue-800"
                              : q.type === "multiple"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {q.type === "single"
                            ? "单选题"
                            : q.type === "multiple"
                            ? "多选题"
                            : "判断题"}
                        </span>
                      </div>
                      <p className="text-gray-800">{q.content}</p>
                    </div>
                  ))}
                {examData.questions.length > 5 && (
                  <p className="text-sm text-gray-600 text-center">
                    ... 还有 {examData.questions.length - 5} 道题目
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleStartExam}
                  className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                >
                  开始考试
                </button>
                <button
                  onClick={() => setExamData(null)}
                  className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 font-medium"
                >
                  重新配置
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
