"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { authGet, authPut } from "@/lib/api";

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
}

export default function ExamTakingPage() {
  const params = useParams();
  const router = useRouter();
  const examId = params.examId as string;

  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120 * 60); // 120分钟，单位：秒
  const [showResults, setShowResults] = useState(false);
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
    }>;
  } | null>(null);

  // 加载考试数据
  useEffect(() => {
    const loadExamData = async () => {
      try {
        const response = await authGet(`/api/exam?examId=${examId}`);
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setExamData(data);
          // 如果有之前的答案，恢复它们
          if (data.answers) {
            setUserAnswers(data.answers);
          }

          // 如果考试已经完成，显示结果
          if (data.completed_at && data.score !== null) {
            const questionResults = data.questions.map((question: Question) => {
              const userAnswer = data.answers?.[question.id] || "未作答";
              const isCorrect = userAnswer === question.correct_answer;

              return {
                id: question.id,
                userAnswer,
                correctAnswer: question.correct_answer,
                isCorrect,
                content: question.content,
                type: question.type,
                explanation: question.explanation,
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

            setShowResults(true);
          }
        }
      } catch (err) {
        console.error("加载考试数据失败:", err);
        setError("加载考试数据失败");
      } finally {
        setLoading(false);
      }
    };

    loadExamData();
  }, [examId]);

  // 倒计时计时器
  useEffect(() => {
    if (timeLeft <= 0 || !examData || examData.completed_at) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(); // 时间到自动提交
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, examData]);

  const handleAnswerChange = (questionId: number, answer: string) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // 将选项内容转换为字母（A, B, C, D, E）
  const getOptionLetter = (
    question: Question,
    optionContent: string
  ): string => {
    if (!question.options) return optionContent;

    const index = question.options.indexOf(optionContent);
    if (index === -1) return optionContent;

    // 0 -> A, 1 -> B, 2 -> C, 3 -> D, 4 -> E
    return String.fromCharCode(65 + index); // 65 is 'A' in ASCII
  };

  // 将字母转换为选项内容
  const getOptionContent = (question: Question, letter: string): string => {
    if (!question.options) return letter;

    const index = letter.charCodeAt(0) - 65; // 'A' -> 0, 'B' -> 1, etc.
    if (index >= 0 && index < question.options.length) {
      return question.options[index];
    }
    return letter;
  };

  // 处理选择题答案选择
  const handleChoiceAnswer = (question: Question, optionContent: string) => {
    const letter = getOptionLetter(question, optionContent);

    if (question.type === "single") {
      // 单选题：直接存储字母
      handleAnswerChange(question.id, letter);
    } else if (question.type === "multiple") {
      // 多选题：存储逗号分隔的字母
      const currentAnswer = userAnswers[question.id] || "";
      const currentLetters = currentAnswer ? currentAnswer.split(",") : [];

      if (currentLetters.includes(letter)) {
        // 如果已经选中，则取消选择
        const newLetters = currentLetters.filter((l) => l !== letter);
        handleAnswerChange(question.id, newLetters.join(","));
      } else {
        // 如果未选中，则添加
        const newLetters = [...currentLetters, letter].sort();
        handleAnswerChange(question.id, newLetters.join(","));
      }
    }
  };

  // 检查选项是否被选中
  const isOptionSelected = (
    question: Question,
    optionContent: string
  ): boolean => {
    const letter = getOptionLetter(question, optionContent);
    const currentAnswer = userAnswers[question.id];

    if (!currentAnswer) return false;

    if (question.type === "single") {
      return currentAnswer === letter;
    } else if (question.type === "multiple") {
      const letters = currentAnswer.split(",");
      return letters.includes(letter);
    }

    return false;
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

  const handleSubmitExam = async () => {
    if (!examData) return;

    setSubmitting(true);
    try {
      const response = await authPut("/api/exam", {
        examId: examData.id,
        answers: userAnswers,
      });

      const result = await response.json();

      if (result.success) {
        // 重定向到独立的结果页面
        router.push(`/exam/results/${examData.id}`);
      } else {
        alert("提交失败：" + result.error);
      }
    } catch (err) {
      console.error("提交考试失败:", err);
      alert("提交考试失败");
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

  const handleCloseResults = () => {
    setShowResults(false);
    router.push(`/exam-history?examId=${examData?.id}`);
  };

  const handleReviewQuestions = () => {
    setShowResults(false);
    setCurrentQuestionIndex(0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载考试数据中...</p>
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
              href="/exam"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← 返回考试列表
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

  if (!examData) {
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
            <p>未找到考试数据</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = examData.questions[currentQuestionIndex];
  const totalQuestions = examData.questions.length;
  const answeredCount = Object.keys(userAnswers).length;

  // 获取分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  return (
    <div className="min-h-screen bg-gray-50 py-4 md:py-8">
      <div className="container mx-auto px-3 md:px-4 max-w-6xl">
        <div className="mb-4 md:mb-6">
          <Link
            href="/exam"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm md:text-base"
          >
            ← 返回考试列表
          </Link>
        </div>

        {/* 考试结果模态框 */}
        {showResults && examResults && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">考试结果</h2>
                  <button
                    onClick={handleCloseResults}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* 成绩概览 */}
                <div className="mb-8">
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
                      <div className="text-sm text-gray-600 mb-2">答题时间</div>
                      <div className="text-4xl font-bold text-purple-600">
                        {formatTime(120 * 60 - timeLeft)}
                      </div>
                      <div className="text-sm text-gray-600 mt-2">
                        剩余时间：{formatTime(timeLeft)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 题目结果列表 */}
                <div className="mb-8">
                  <h3 className="text-xl font-bold text-gray-800 mb-4">
                    题目详情
                  </h3>
                  <div className="space-y-4">
                    {examResults.questionResults.map((result, index) => (
                      <div
                        key={result.id}
                        className={`border rounded-lg p-4 ${
                          result.isCorrect
                            ? "border-green-200 bg-green-50"
                            : "border-red-200 bg-red-50"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">
                              第 {index + 1} 题
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-medium ${
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
                              className={`px-2 py-1 rounded text-xs font-medium ${
                                result.isCorrect
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {result.isCorrect ? "正确" : "错误"}
                            </span>
                          </div>
                        </div>

                        <p className="text-gray-800 mb-3">{result.content}</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <div>
                            <div className="text-gray-600 mb-1">你的答案：</div>
                            <div
                              className={`font-medium ${
                                result.isCorrect
                                  ? "text-green-700"
                                  : "text-red-700"
                              }`}
                            >
                              {result.userAnswer.replace(/,/g, "")}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-600 mb-1">正确答案：</div>
                            <div className="font-medium text-green-700">
                              {result.correctAnswer}
                            </div>
                          </div>
                        </div>

                        {result.explanation && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <div className="text-gray-600 mb-1">解析：</div>
                            <div className="text-gray-800">
                              {result.explanation}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-end gap-4">
                  <button
                    onClick={handleReviewQuestions}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    查看题目
                  </button>
                  <button
                    onClick={handleCloseResults}
                    className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    查看考试记录
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-6">
          {/* 考试头部信息 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-800">
                {examData.name}
              </h1>
              <div className="text-right">
                <div className="text-2xl font-bold text-red-600">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-sm text-gray-600">剩余时间</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6">
            {/* 题目导航 - 在md宽时放在左边 */}
            <div className="md:col-span-4">
              <div className="sticky top-8">
                <h3 className="text-lg font-medium text-gray-800 mb-4">
                  题目导航
                </h3>
                <div className="flex flex-wrap gap-1 md:gap-2  md:max-h-[680px] overflow-y-auto p-1 md:p-2">
                  {examData.questions.map((q, index) => (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestionIndex(index)}
                      className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center text-sm md:text-base ${
                        currentQuestionIndex === index
                          ? "bg-blue-600 text-white"
                          : userAnswers[q.id]
                          ? "bg-green-400 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      } hover:bg-blue-100 hover:text-blue-800 transition-colors`}
                      title={`第 ${index + 1} 题`}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>

                <div className="mt-4 md:mt-6 p-3 md:p-4 bg-gray-50 rounded-lg">
                  <div className="text-sm text-gray-600 mb-2">答题状态</div>
                  <div className="flex flex-row md:flex-col gap-4">
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-blue-600"></div>
                        <span className="text-sm">当前题目</span>
                      </div>
                      <span className="text-sm font-medium text-blue-600">
                        {currentQuestionIndex + 1}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-green-400"></div>
                        <span className="text-sm">已答题</span>
                      </div>
                      <span className="text-sm font-medium text-green-600">
                        {answeredCount}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded bg-gray-100"></div>
                        <span className="text-sm">未答题</span>
                      </div>
                      <span className="text-sm font-medium text-gray-600">
                        {totalQuestions - answeredCount}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 当前题目 - 在md宽时放在右边 */}
            <div className="md:col-span-8">
              <div className="mb-8">
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
                        : "bg-green-400 text-green-800"
                    }`}
                  >
                    {currentQuestion.type === "single"
                      ? "单选题"
                      : currentQuestion.type === "multiple"
                      ? "多选题"
                      : "判断题"}
                  </span>
                </div>

                <div className="bg-gray-50 p-4 md:p-6 rounded-lg mb-4 md:mb-6">
                  <p className="text-base md:text-lg text-gray-800 mb-4 md:mb-6">
                    {currentQuestion.content}
                  </p>

                  {currentQuestion.type === "judge" ? (
                    <div className="space-y-3">
                      <label className="flex items-center gap-2 md:gap-3 p-2 md:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value="对"
                          checked={userAnswers[currentQuestion.id] === "对"}
                          onChange={() =>
                            handleAnswerChange(currentQuestion.id, "对")
                          }
                          className="h-5 w-5"
                        />
                        <span className="text-gray-800">对</span>
                      </label>
                      <label className="flex items-center gap-2 md:gap-3 p-2 md:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          value="错"
                          checked={userAnswers[currentQuestion.id] === "错"}
                          onChange={() =>
                            handleAnswerChange(currentQuestion.id, "错")
                          }
                          className="h-5 w-5"
                        />
                        <span className="text-gray-800">错</span>
                      </label>
                    </div>
                  ) : currentQuestion.options ? (
                    <div className="space-y-3">
                      {currentQuestion.options.map((option, index) => (
                        <label
                          key={index}
                          className="flex items-center gap-2 md:gap-3 p-2 md:p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type={
                              currentQuestion.type === "single"
                                ? "radio"
                                : "checkbox"
                            }
                            name={`question-${currentQuestion.id}`}
                            value={option}
                            checked={isOptionSelected(currentQuestion, option)}
                            onChange={() => {
                              handleChoiceAnswer(currentQuestion, option);
                            }}
                            className="h-5 w-5"
                          />
                          <span className="text-gray-800">
                            {String.fromCharCode(65 + index)}. {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-col  justify-between gap-4">
                <div className="flex justify-between  gap-2 md:gap-4">
                  <button
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2 md:px-6 md:py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm md:text-base"
                  >
                    上一题
                  </button>
                  <button
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex === totalQuestions - 1}
                    className="px-4 py-2 md:px-6 md:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-sm md:text-base"
                  >
                    下一题
                  </button>
                </div>

                <div className="flex justify-center gap-2 md:gap-4">
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          "确定要提交试卷吗？提交后将无法修改答案。"
                        )
                      ) {
                        handleSubmitExam();
                      }
                    }}
                    disabled={submitting}
                    className="px-4 py-2 md:px-6 md:py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-300 text-sm md:text-base"
                  >
                    {submitting ? "提交中..." : "提交试卷"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
