"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authGet } from "@/lib/api";

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
  config_id: number;
  questions: Question[];
  answers: Record<number, string> | null;
  score: number | null;
  completed_at: string | null;
  name: string;
  single_count: number;
  multiple_count: number;
  judge_count: number;
  created_at: string;
}

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [examResults, setExamResults] = useState<{
    score: number;
    correctCount: number;
    totalCount: number;
    questionResults: Array<{
      id: number;
      userAnswer: string;
      correctAnswer: string;
      isCorrect: boolean;
      content: string;
      type: string;
      explanation: string | null;
      options: string[] | null;
    }>;
  } | null>(null);

  // 加载考试结果数据
  useEffect(() => {
    const loadExamResults = async () => {
      try {
        const response = await authGet(`/api/exam?examId=${examId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setExamData(data);

          // 如果考试未完成，重定向到考试页面
          if (!data.completed_at || data.score === null) {
            router.push(`/exam/taking/${examId}`);
            return;
          }

          // 计算每道题的结果
          const questionResults = data.questions.map((question: Question) => {
            const userAnswer = data.answers?.[question.id] || "未作答";
            const isCorrect = compareAnswers(
              userAnswer,
              question.correct_answer,
              question.type
            );

            return {
              id: question.id,
              userAnswer,
              correctAnswer: question.correct_answer,
              isCorrect,
              content: question.content,
              type: question.type,
              explanation: question.explanation,
              options: question.options,
            };
          });

          setExamResults({
            score: data.score,
            correctCount: questionResults.filter(
              (r: { isCorrect: boolean }) => r.isCorrect
            ).length,
            totalCount: data.questions.length,
            questionResults,
          });
        }
      } catch (err) {
        console.error("加载考试结果失败:", err);
        setError("加载考试结果失败");
      } finally {
        setLoading(false);
      }
    };

    loadExamResults();
  }, [examId, router]);

  // 比较答案是否相等（处理多选题逗号分隔问题）
  const compareAnswers = (
    userAnswer: string,
    correctAnswer: string,
    type: string
  ): boolean => {
    if (!userAnswer || userAnswer === "未作答") return false;

    if (type === "multiple") {
      // 多选题：移除逗号并排序后比较
      const userLetters = userAnswer
        .replace(/,/g, "")
        .split("")
        .sort()
        .join("");
      const correctLetters = correctAnswer.split("").sort().join("");
      return userLetters === correctLetters;
    }

    // 单选题和判断题：直接比较
    return userAnswer === correctAnswer;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // 计算考试用时
  const calculateExamDuration = () => {
    if (!examData || !examData.completed_at || !examData.created_at) {
      return 0;
    }

    const startTime = new Date(examData.created_at).getTime();
    const endTime = new Date(examData.completed_at).getTime();
    return Math.floor((endTime - startTime) / 1000); // 转换为秒
  };

  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载考试结果中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-6">
            <Link
              href="/exam-history"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← 返回考试记录
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              <p className="font-bold">错误</p>
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!examData || !examResults) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="mb-6">
            <Link
              href="/exam-history"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← 返回考试记录
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-8">
            <p>未找到考试结果数据</p>
          </div>
        </div>
      </div>
    );
  }

  const examDuration = calculateExamDuration();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-6">
          <Link
            href="/exam-history"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← 返回考试记录
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* 考试头部信息 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  {examData.name} - 考试结果
                </h1>
                <p className="text-gray-600 mt-2">
                  考试时间：
                  {new Date(examData.created_at).toLocaleString("zh-CN")}
                </p>
                <p className="text-gray-600">
                  完成时间：
                  {new Date(examData.completed_at!).toLocaleString("zh-CN")}
                </p>
              </div>
              <div className="text-right">
                <div
                  className={`text-4xl font-bold ${getScoreColor(
                    examResults.score
                  )}`}
                >
                  {examResults.score.toFixed(1)}分
                </div>
                <div className="text-sm text-gray-600">总分</div>
              </div>
            </div>
          </div>

          {/* 成绩概览 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">成绩概览</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-blue-50 p-6 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">总分</div>
                <div
                  className={`text-4xl font-bold ${getScoreColor(
                    examResults.score
                  )}`}
                >
                  {examResults.score.toFixed(1)}分
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {examResults.score >= 90
                    ? "优秀"
                    : examResults.score >= 60
                    ? "及格"
                    : "不及格"}
                </div>
              </div>
              <div className="bg-green-50 p-6 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">正确题数</div>
                <div className="text-4xl font-bold text-green-600">
                  {examResults.correctCount}/{examResults.totalCount}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  正确率：
                  {(
                    (examResults.correctCount / examResults.totalCount) *
                    100
                  ).toFixed(1)}
                  %
                </div>
              </div>
              <div className="bg-purple-50 p-6 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-2">答题用时</div>
                <div className="text-4xl font-bold text-purple-600">
                  {formatTime(examDuration)}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  平均每题：
                  {formatTime(
                    Math.floor(examDuration / examResults.totalCount)
                  )}
                </div>
              </div>
            </div>

            {/* 题型分布 */}
            <div className="mb-8">
              <h3 className="text-xl font-bold text-gray-800 mb-4">题型分布</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">单选题</div>
                      <div className="text-2xl font-bold text-blue-600">
                        {examData.single_count}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-bold">单</span>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">多选题</div>
                      <div className="text-2xl font-bold text-purple-600">
                        {examData.multiple_count}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <span className="text-purple-600 font-bold">多</span>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-600">判断题</div>
                      <div className="text-2xl font-bold text-green-600">
                        {examData.judge_count}
                      </div>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <span className="text-green-600 font-bold">判</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 题目结果列表 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">题目详情</h2>
              <div className="text-sm text-gray-600">
                共 {examResults.totalCount} 题
              </div>
            </div>
            <div className="space-y-4">
              {examResults.questionResults.map((result, index) => (
                <div
                  key={result.id}
                  className={`border rounded-lg p-6 ${
                    result.isCorrect
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-gray-800 text-lg">
                        第 {index + 1} 题
                      </span>
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          result.type === "single"
                            ? "bg-blue-100 text-blue-800"
                            : result.type === "multiple"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-green-100 text-green-800"
                        }`}
                      >
                        {result.type === "single"
                          ? "单选题"
                          : result.type === "multiple"
                          ? "多选题"
                          : "判断题"}
                      </span>
                      <span
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          result.isCorrect
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {result.isCorrect ? "正确" : "错误"}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-800 text-lg mb-6">{result.content}</p>

                  {/* 显示选项（如果是选择题） */}
                  {result.options && result.options.length > 0 && (
                    <div className="mb-6">
                      <div className="text-gray-700 font-medium mb-3">
                        选项：
                      </div>
                      <div className="space-y-2">
                        {result.options.map((option, optionIndex) => {
                          const optionLetter = String.fromCharCode(
                            65 + optionIndex
                          );
                          const isUserAnswer =
                            result.type === "single"
                              ? result.userAnswer === optionLetter
                              : result.type === "multiple"
                              ? result.userAnswer
                                  .split(",")
                                  .includes(optionLetter)
                              : false;
                          const isCorrectAnswer =
                            result.type === "single"
                              ? result.correctAnswer === optionLetter
                              : result.type === "multiple"
                              ? result.correctAnswer.includes(optionLetter)
                              : false;

                          let optionClass = "p-3 rounded-lg border ";
                          let textClass = "text-gray-800";

                          if (isUserAnswer && isCorrectAnswer) {
                            // 用户答对：绿色背景
                            optionClass += "bg-green-100 border-green-300";
                            textClass = "text-green-800 font-medium";
                          } else if (isUserAnswer && !isCorrectAnswer) {
                            // 用户答错：红色背景
                            optionClass += "bg-red-100 border-red-300";
                            textClass = "text-red-800 font-medium";
                          } else if (!isUserAnswer && isCorrectAnswer) {
                            // 正确答案但用户未选：浅绿色背景
                            optionClass += "bg-green-50 border-green-200";
                            textClass = "text-green-700";
                          } else {
                            // 其他选项：灰色背景
                            optionClass += "bg-gray-50 border-gray-200";
                            textClass = "text-gray-600";
                          }

                          return (
                            <div key={optionIndex} className={optionClass}>
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                    isUserAnswer && isCorrectAnswer
                                      ? "bg-green-500 text-white"
                                      : isUserAnswer && !isCorrectAnswer
                                      ? "bg-red-500 text-white"
                                      : !isUserAnswer && isCorrectAnswer
                                      ? "bg-green-200 text-green-800"
                                      : "bg-gray-200 text-gray-600"
                                  }`}
                                >
                                  {optionLetter}
                                </div>
                                <div className={textClass}>{option}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-white p-1 rounded-lg border">
                      <div className="text-gray-600 mb-1">你的答案：</div>
                      <div
                        className={`text-xl font-bold ${
                          result.isCorrect ? "text-green-700" : "text-red-700"
                        }`}
                      >
                        {result.userAnswer.replace(/,/g, "")}
                      </div>
                    </div>
                    <div className="bg-white p-1 rounded-lg border">
                      <div className="text-gray-600 mb-1">正确答案：</div>
                      <div className="text-xl font-bold text-green-700">
                        {result.correctAnswer}
                      </div>
                    </div>
                  </div>

                  {result.explanation && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <div className="text-gray-700 font-medium mb-2">
                        解析：
                      </div>
                      <div className="text-gray-800 bg-gray-50 p-4 rounded-lg">
                        {result.explanation}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-between gap-4">
            <Link
              href="/exam-history"
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              返回考试记录
            </Link>
            <div className="flex gap-4">
              <Link
                href="/exam"
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                开始新考试
              </Link>
              <Link
                href="/practice"
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                继续练习
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
