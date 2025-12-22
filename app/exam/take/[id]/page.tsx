"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  id: number;
  name: string;
  questions: Question[];
  answers: Record<number, string> | null;
  score: number | null;
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 120分钟，以秒为单位

  useEffect(() => {
    loadExamData();
  }, [examId]);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // 时间到，自动提交
      handleSubmitExam();
    }
  }, [timeLeft]);

  const loadExamData = async () => {
    try {
      const response = await fetch(`/api/exam?examId=${examId}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setExamData(data);
        // 如果已有答案，恢复答案状态
        if (data.answers) {
          setAnswers(data.answers);
        }
      }
    } catch (error) {
      console.error("加载试卷失败:", error);
      setError("加载试卷失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: number, answer: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNextQuestion = () => {
    if (examData && currentQuestionIndex < examData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitExam = async () => {
    if (!examData) return;

    const confirmed = window.confirm("确定要提交试卷吗？提交后无法修改。");
    if (!confirmed) return;

    setSubmitting(true);
    try {
      const response = await fetch("/api/exam", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          examId: examData.id,
          answers,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(`考试提交成功！得分：${result.score.toFixed(1)}分`);
        router.push(`/exam/result/${examData.id}`);
      } else {
        alert("提交失败：" + result.error);
      }
    } catch (error) {
      console.error("提交试卷失败:", error);
      alert("提交试卷失败");
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">加载中...</div>
          <div className="text-gray-600 mt-2">正在加载试卷，请稍候</div>
        </div>
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">加载失败</div>
          <div className="text-gray-600 mt-2">{error || "试卷不存在"}</div>
          <Link
            href="/exam"
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            返回考试列表
          </Link>
        </div>
      </div>
    );
  }

  const currentQuestion = examData.questions[currentQuestionIndex];
  const totalQuestions = examData.questions.length;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link
            href="/exam"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← 返回考试列表
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {examData.name}
              </h1>
              <p className="text-gray-600 mt-2">
                试卷 ID: {examData.id} | 共 {totalQuestions} 题
              </p>
            </div>
            <div className="text-right">
              <div
                className={`text-2xl font-bold ${
                  timeLeft < 600 ? "text-red-600" : "text-green-600"
                }`}
              >
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-gray-600">剩余时间</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* 左侧：题目导航 */}
            <div className="lg:col-span-1">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-800 mb-4">题目导航</h3>
                <div className="grid grid-cols-5 gap-2">
                  {examData.questions.map((q, index) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`h-10 rounded flex items-center justify-center text-sm ${
                        index === currentQuestionIndex
                          ? "bg-blue-600 text-white"
                          : answers[q.id]
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      }`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-600 rounded"></div>
                    <span className="text-sm text-gray-600">当前题目</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-100 rounded border border-green-300"></div>
                    <span className="text-sm text-gray-600">已作答</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span className="text-sm text-gray-600">未作答</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：题目内容 */}
            <div className="lg:col-span-3">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-lg font-medium text-gray-700">
                    第 {currentQuestionIndex + 1} 题 / 共 {totalQuestions} 题
                  </span>
                  <span
                    className={`px-3 py-1 rounded text-sm font-medium ${
                      currentQuestion.type === "single"
                        ? "bg-blue-100 text-blue-800"
                        : currentQuestion.type === "multiple"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-green-100 text-green-800"
                    }`}
                  >
                    {currentQuestion.type === "single"
                      ? "单选题"
                      : currentQuestion.type === "multiple"
                      ? "多选题"
                      : "判断题"}
                  </span>
                </div>

                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-xl font-medium text-gray-800 mb-4">
                    {currentQuestion.content}
                  </h3>

                  {currentQuestion.type === "judge" ? (
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={answers[currentQuestion.id] === "正确"}
                          onChange={() =>
                            handleAnswerChange(currentQuestion.id, "正确")
                          }
                          className="w-5 h-5"
                        />
                        <span className="text-lg">正确</span>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={answers[currentQuestion.id] === "错误"}
                          onChange={() =>
                            handleAnswerChange(currentQuestion.id, "错误")
                          }
                          className="w-5 h-5"
                        />
                        <span className="text-lg">错误</span>
                      </label>
                    </div>
                  ) : currentQuestion.options ? (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <label
                          key={index}
                          className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer"
                        >
                          <input
                            type={
                              currentQuestion.type === "single"
                                ? "radio"
                                : "checkbox"
                            }
                            name={`question-${currentQuestion.id}`}
                            checked={
                              currentQuestion.type === "single"
                                ? answers[currentQuestion.id] ===
                                  String.fromCharCode(65 + index)
                                : answers[currentQuestion.id]?.includes(
                                    String.fromCharCode(65 + index)
                                  ) || false
                            }
                            onChange={() => {
                              if (currentQuestion.type === "single") {
                                handleAnswerChange(
                                  currentQuestion.id,
                                  String.fromCharCode(65 + index)
                                );
                              } else {
                                const currentAnswer =
                                  answers[currentQuestion.id] || "";
                                const answerArray = currentAnswer
                                  .split("")
                                  .filter((c) => c !== "");
                                const optionChar = String.fromCharCode(
                                  65 + index
                                );

                                if (answerArray.includes(optionChar)) {
                                  // 移除选项
                                  handleAnswerChange(
                                    currentQuestion.id,
                                    answerArray
                                      .filter((c) => c !== optionChar)
                                      .join("")
                                  );
                                } else {
                                  // 添加选项
                                  handleAnswerChange(
                                    currentQuestion.id,
                                    [...answerArray, optionChar].join("")
                                  );
                                }
                              }
                            }}
                            className="w-5 h-5"
                          />
                          <span className="text-lg">
                            {String.fromCharCode(65 + index)}. {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex justify-between items-center">
                  <button
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    上一题
                  </button>

                  <div className="flex gap-4">
                    <button
                      onClick={() => {
                        const confirmed = window.confirm(
                          "确定要保存并退出吗？下次可以继续考试。"
                        );
                        if (confirmed) {
                          router.push("/exam");
                        }
                      }}
                      className="px-6 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      保存退出
                    </button>

                    {currentQuestionIndex === totalQuestions - 1 ? (
                      <button
                        onClick={handleSubmitExam}
                        disabled={submitting}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                      >
                        {submitting ? "提交中..." : "提交试卷"}
                      </button>
                    ) : (
                      <button
                        onClick={handleNextQuestion}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        下一题
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">考试提示</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• 单选题：选择一个正确答案</li>
                  <li>• 多选题：选择一个或多个正确答案</li>
                  <li>• 判断题：选择"正确"或"错误"</li>
                  <li>• 点击题目导航中的数字可以快速跳转到对应题目</li>
                  <li>• 已作答的题目会显示为绿色</li>
                  <li>• 时间结束后会自动提交试卷</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
