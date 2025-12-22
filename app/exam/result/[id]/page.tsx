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

interface ExamResult {
  id: number;
  name: string;
  questions: Question[];
  answers: Record<number, string>;
  score: number;
  correctCount: number;
  totalCount: number;
  completed_at: string;
  created_at: string;
}

export default function ExamResultPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.id as string;

  const [result, setResult] = useState<ExamResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showWrongOnly, setShowWrongOnly] = useState(false);

  useEffect(() => {
    loadExamResult();
  }, [examId]);

  const loadExamResult = async () => {
    try {
      const response = await fetch(`/api/exam?examId=${examId}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        // 计算正确题目数量
        let correctCount = 0;
        const questions = data.questions || [];
        const answers = data.answers || {};

        questions.forEach((q: Question) => {
          const userAnswer = answers[q.id];
          if (userAnswer === q.correct_answer) {
            correctCount++;
          }
        });

        setResult({
          ...data,
          questions,
          answers,
          correctCount,
          totalCount: questions.length,
          score: data.score || 0,
        });
      }
    } catch (error) {
      console.error("加载考试结果失败:", error);
      setError("加载考试结果失败");
    } finally {
      setLoading(false);
    }
  };

  const getAnswerText = (question: Question, answer: string) => {
    if (question.type === "judge") {
      return answer;
    }

    if (!answer) return "未作答";

    if (question.type === "single") {
      const optionIndex = answer.charCodeAt(0) - 65;
      return question.options && optionIndex >= 0
        ? `${answer}. ${question.options[optionIndex]}`
        : answer;
    } else {
      // 多选题
      const answerArray = answer.split("");
      return answerArray
        .map((char) => {
          const optionIndex = char.charCodeAt(0) - 65;
          return question.options && optionIndex >= 0
            ? `${char}. ${question.options[optionIndex]}`
            : char;
        })
        .join("，");
    }
  };

  const getCorrectAnswerText = (question: Question) => {
    if (question.type === "judge") {
      return question.correct_answer;
    }

    if (question.type === "single") {
      const optionIndex = question.correct_answer.charCodeAt(0) - 65;
      return question.options && optionIndex >= 0
        ? `${question.correct_answer}. ${question.options[optionIndex]}`
        : question.correct_answer;
    } else {
      // 多选题
      const answerArray = question.correct_answer.split("");
      return answerArray
        .map((char) => {
          const optionIndex = char.charCodeAt(0) - 65;
          return question.options && optionIndex >= 0
            ? `${char}. ${question.options[optionIndex]}`
            : char;
        })
        .join("，");
    }
  };

  const isAnswerCorrect = (question: Question) => {
    const userAnswer = result?.answers[question.id];
    return userAnswer === question.correct_answer;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">加载中...</div>
          <div className="text-gray-600 mt-2">正在加载考试结果，请稍候</div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">加载失败</div>
          <div className="text-gray-600 mt-2">{error || "考试结果不存在"}</div>
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

  const filteredQuestions = showWrongOnly
    ? result.questions.filter((q) => !isAnswerCorrect(q))
    : result.questions;

  const wrongCount = result.totalCount - result.correctCount;

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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              {result.name} - 考试结果
            </h1>
            <p className="text-gray-600">
              试卷 ID: {result.id} | 提交时间:{" "}
              {new Date(
                result.completed_at || result.created_at
              ).toLocaleString()}
            </p>
          </div>

          {/* 成绩概览 */}
          <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-xl p-8 mb-8 border border-blue-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600">
                  {result.score.toFixed(1)}
                </div>
                <div className="text-gray-600 mt-2">总分</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-green-600">
                  {result.correctCount}
                </div>
                <div className="text-gray-600 mt-2">正确题数</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-red-600">
                  {wrongCount}
                </div>
                <div className="text-gray-600 mt-2">错误题数</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-purple-600">
                  {result.totalCount}
                </div>
                <div className="text-gray-600 mt-2">总题数</div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700">正确率</span>
                <span className="font-medium">
                  {((result.correctCount / result.totalCount) * 100).toFixed(1)}
                  %
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-green-600 h-4 rounded-full"
                  style={{
                    width: `${
                      (result.correctCount / result.totalCount) * 100
                    }%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* 控制选项 */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowWrongOnly(false)}
                className={`px-4 py-2 rounded-lg ${
                  !showWrongOnly
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                全部题目 ({result.totalCount})
              </button>
              <button
                onClick={() => setShowWrongOnly(true)}
                className={`px-4 py-2 rounded-lg ${
                  showWrongOnly
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                错题集 ({wrongCount})
              </button>
            </div>
            <div className="text-sm text-gray-600">
              {showWrongOnly
                ? `显示 ${filteredQuestions.length} 道错题`
                : `显示全部 ${result.totalCount} 道题目`}
            </div>
          </div>

          {/* 题目详情 */}
          <div className="space-y-6">
            {filteredQuestions.map((question, index) => {
              const isCorrect = isAnswerCorrect(question);
              const userAnswer = result.answers[question.id];

              return (
                <div
                  key={question.id}
                  className={`border rounded-lg p-6 ${
                    isCorrect
                      ? "border-green-200 bg-green-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-medium text-gray-800">
                          第 {index + 1} 题
                        </span>
                        <span
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            question.type === "single"
                              ? "bg-blue-100 text-blue-800"
                              : question.type === "multiple"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {question.type === "single"
                            ? "单选题"
                            : question.type === "multiple"
                            ? "多选题"
                            : "判断题"}
                        </span>
                        <span
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            isCorrect
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {isCorrect ? "正确" : "错误"}
                        </span>
                      </div>
                      <h3 className="text-xl font-medium text-gray-800">
                        {question.content}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">
                        你的答案
                      </h4>
                      <div
                        className={`p-4 rounded-lg ${
                          isCorrect
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        <div className="font-medium">
                          {getAnswerText(question, userAnswer)}
                        </div>
                        {!isCorrect && userAnswer && (
                          <div className="text-sm mt-2">
                            {isCorrect ? "✓ 回答正确" : "✗ 回答错误"}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-3">
                        正确答案
                      </h4>
                      <div className="p-4 rounded-lg bg-blue-100 text-blue-800">
                        <div className="font-medium">
                          {getCorrectAnswerText(question)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {question.explanation && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-700 mb-2">解析</h4>
                      <div className="p-4 bg-gray-50 rounded-lg text-gray-700">
                        {question.explanation}
                      </div>
                    </div>
                  )}

                  {question.options && (
                    <div className="mt-6">
                      <h4 className="font-medium text-gray-700 mb-2">选项</h4>
                      <div className="space-y-2">
                        {question.options.map((option, optIndex) => {
                          const optionChar = String.fromCharCode(65 + optIndex);
                          const isSelected = userAnswer?.includes(optionChar);
                          const isCorrectOption =
                            question.correct_answer.includes(optionChar);

                          return (
                            <div
                              key={optIndex}
                              className={`p-3 rounded-lg border ${
                                isCorrectOption
                                  ? "border-green-300 bg-green-50"
                                  : isSelected
                                  ? "border-red-300 bg-red-50"
                                  : "border-gray-200"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                    isCorrectOption
                                      ? "bg-green-600 text-white"
                                      : isSelected
                                      ? "bg-red-600 text-white"
                                      : "bg-gray-200"
                                  }`}
                                >
                                  {optionChar}
                                </div>
                                <span
                                  className={
                                    isCorrectOption
                                      ? "text-green-800 font-medium"
                                      : isSelected
                                      ? "text-red-800"
                                      : "text-gray-700"
                                  }
                                >
                                  {option}
                                </span>
                                {isCorrectOption && (
                                  <span className="ml-auto text-sm text-green-600">
                                    ✓ 正确选项
                                  </span>
                                )}
                                {isSelected && !isCorrectOption && (
                                  <span className="ml-auto text-sm text-red-600">
                                    ✗ 你的选择
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* 操作按钮 */}
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => router.push("/exam")}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              返回考试列表
            </button>
            <button
              onClick={() => router.push(`/exam/take/${result.id}`)}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              重新考试
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              打印结果
            </button>
          </div>

          {/* 总结 */}
          <div className="mt-8 p-6 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-medium text-gray-800 mb-4">考试总结</h3>
            <ul className="space-y-2 text-gray-700">
              <li>• 本次考试得分：{result.score.toFixed(1)} 分</li>
              <li>
                • 正确率：
                {((result.correctCount / result.totalCount) * 100).toFixed(1)}%
                （{result.correctCount}/{result.totalCount}）
              </li>
              <li>
                • 建议：
                {result.score >= 80
                  ? "优秀！继续保持。"
                  : result.score >= 60
                  ? "合格，还有提升空间。"
                  : "需要加强练习，建议重点复习错题。"}
              </li>
              <li>• 错题已自动加入错题本，可以在错题练习页面中重点复习。</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
