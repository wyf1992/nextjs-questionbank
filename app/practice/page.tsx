"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Question {
  id: number;
  type: "single" | "multiple" | "judge";
  content: string;
  options?: string[];
  correct_answer: string;
  explanation?: string;
}

export default function PracticePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [questionType, setQuestionType] = useState<string>("all");
  const [questionCount, setQuestionCount] = useState(10);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (questionType !== "all") {
        params.append("type", questionType);
      }
      params.append("count", questionCount.toString());

      const response = await fetch(`/api/practice?${params}`);
      const data = await response.json();

      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
        setCurrentIndex(0);
        setUserAnswer("");
        setSelectedOptions([]);
        setShowResult(false);
        setStats({ correct: 0, total: 0 });
      } else {
        alert("题库中没有符合条件的题目");
      }
    } catch (error) {
      console.error("加载题目失败:", error);
      alert("加载题目失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    let answer = userAnswer;

    if (currentQuestion.type === "multiple") {
      answer = selectedOptions.sort().join("");
    }

    const correct = answer === currentQuestion.correct_answer;
    setIsCorrect(correct);
    setShowResult(true);

    // 提交答案到后端
    try {
      await fetch("/api/practice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          questionId: currentQuestion.id,
          userAnswer: answer,
          isCorrect: correct,
        }),
      });

      setStats((prev) => ({
        correct: prev.correct + (correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (error) {
      console.error("提交答案失败:", error);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setUserAnswer("");
      setSelectedOptions([]);
      setShowResult(false);
    }
  };

  const handleMultipleChoice = (option: string) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter((o) => o !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6">
            <Link
              href="/"
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← 返回首页
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">开始刷题</h1>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  题目类型
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                >
                  <option value="all">全部题型</option>
                  <option value="single">单选题</option>
                  <option value="multiple">多选题</option>
                  <option value="judge">判断题</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  题目数量
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-lg p-2"
                />
              </div>

              <button
                onClick={loadQuestions}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 text-lg font-medium"
              >
                {loading ? "加载中..." : "开始练习"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-6 flex justify-between items-center">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← 返回首页
          </Link>
          <div className="text-sm text-gray-600">
            正确率：
            {stats.total > 0
              ? ((stats.correct / stats.total) * 100).toFixed(1)
              : 0}
            % （{stats.correct}/{stats.total}）
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">
                第 {currentIndex + 1} / {questions.length} 题
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentQuestion.type === "single"
                    ? "bg-blue-100 text-blue-800"
                    : currentQuestion.type === "multiple"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-green-100 text-green-800"
                }`}
              >
                {getTypeLabel(currentQuestion.type)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-medium text-gray-800 mb-6">
              {currentQuestion.content}
            </h2>

            {currentQuestion.type === "judge" ? (
              <div className="space-y-3">
                {["对", "错"].map((option) => (
                  <button
                    key={option}
                    onClick={() => !showResult && setUserAnswer(option)}
                    disabled={showResult}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      userAnswer === option
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-blue-300"
                    } ${showResult ? "cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            ) : currentQuestion.type === "single" ? (
              <div className="space-y-3">
                {currentQuestion.options?.map((option, index) => {
                  const optionLabel = String.fromCharCode(65 + index);
                  return (
                    <button
                      key={index}
                      onClick={() => !showResult && setUserAnswer(optionLabel)}
                      disabled={showResult}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        userAnswer === optionLabel
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      } ${
                        showResult ? "cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      <span className="font-medium">{optionLabel}.</span>{" "}
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 mb-3">
                  （多选题，可选择多个答案）
                </p>
                {currentQuestion.options?.map((option, index) => {
                  const optionLabel = String.fromCharCode(65 + index);
                  return (
                    <button
                      key={index}
                      onClick={() =>
                        !showResult && handleMultipleChoice(optionLabel)
                      }
                      disabled={showResult}
                      className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                        selectedOptions.includes(optionLabel)
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-blue-300"
                      } ${
                        showResult ? "cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      <span className="font-medium">{optionLabel}.</span>{" "}
                      {option}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {showResult && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                isCorrect
                  ? "bg-green-100 border border-green-300"
                  : "bg-red-100 border border-red-300"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg font-bold">
                  {isCorrect ? "✓ 回答正确" : "✗ 回答错误"}
                </span>
              </div>
              <div className="text-sm">
                <p>
                  正确答案：
                  <span className="font-medium">
                    {currentQuestion.correct_answer}
                  </span>
                </p>
                {currentQuestion.explanation && (
                  <p className="mt-2">
                    <span className="font-medium">解析：</span>
                    {currentQuestion.explanation}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            {!showResult ? (
              <button
                onClick={handleSubmitAnswer}
                disabled={
                  currentQuestion.type === "multiple"
                    ? selectedOptions.length === 0
                    : !userAnswer
                }
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                提交答案
              </button>
            ) : (
              <>
                {currentIndex < questions.length - 1 ? (
                  <button
                    onClick={handleNextQuestion}
                    className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                  >
                    下一题
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setQuestions([]);
                      setCurrentIndex(0);
                      setUserAnswer("");
                      setSelectedOptions([]);
                      setShowResult(false);
                    }}
                    className="flex-1 bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 font-medium"
                  >
                    完成练习
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
