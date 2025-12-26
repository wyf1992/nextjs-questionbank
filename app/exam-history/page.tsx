"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authGet } from "@/lib/api";
import { formatLocalTime } from "@/lib/time";

interface ExamRecord {
  id: number;
  config_id: number;
  questions: string;
  answers: string | null;
  score: number | null;
  completed_at: string | null;
  created_at: string;
  name: string;
  single_count: number;
  multiple_count: number;
  judge_count: number;
}

interface Question {
  id: number;
  type: "single" | "multiple" | "judge";
  content: string;
  options: string[] | null;
  correct_answer: string;
  explanation: string | null;
}

interface ExamDetail {
  id: number;
  config_id: number;
  questions: Question[];
  answers: Record<number, string> | null;
  score: number | null;
  completed_at: string | null;
  created_at: string;
  name: string;
  single_count: number;
  multiple_count: number;
  judge_count: number;
}

function ExamHistoryContent() {
  const searchParams = useSearchParams();
  const examId = searchParams.get("examId");

  const [exams, setExams] = useState<ExamRecord[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState("");

  // 加载考试记录列表
  useEffect(() => {
    const loadExams = async () => {
      try {
        const response = await authGet("/api/exam");
        const data = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setExams(data.exams || []);
        }
      } catch (err) {
        console.error("加载考试记录失败:", err);
        setError("加载考试记录失败");
      } finally {
        setLoading(false);
      }
    };

    loadExams();
  }, []);

  // 如果有 examId 参数，加载该考试详情
  useEffect(() => {
    if (examId) {
      loadExamDetail(examId);
    }
  }, [examId]);

  const loadExamDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const response = await authGet(`/api/exam?examId=${id}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setSelectedExam(data);
      }
    } catch (err) {
      console.error("加载考试详情失败:", err);
      setError("加载考试详情失败");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return formatLocalTime(dateString);
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-gray-600";
    if (score >= 90) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBgColor = (score: number | null) => {
    if (score === null) return "bg-gray-100";
    if (score >= 90) return "bg-green-100";
    if (score >= 60) return "bg-yellow-100";
    return "bg-red-100";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">加载考试记录中...</p>
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
          <h1 className="text-3xl font-bold text-gray-800 mb-6">考试记录</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <p className="font-bold">错误</p>
              <p>{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 考试记录列表 */}
            <div className="lg:col-span-2">
              <h2 className="text-xl font-bold text-gray-800 mb-4">
                历史考试记录
              </h2>

              {exams.length === 0 ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <p className="text-gray-600 mb-4">暂无考试记录</p>
                  <Link
                    href="/exam"
                    className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                  >
                    去创建试卷
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {exams.map((exam) => (
                    <div
                      key={exam.id}
                      className={`border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                        selectedExam?.id === exam.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      }`}
                      onClick={() => loadExamDetail(exam.id.toString())}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-gray-800">
                            {exam.name}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {formatDate(exam.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreBgColor(
                              exam.score
                            )} ${getScoreColor(exam.score)}`}
                          >
                            {exam.score !== null
                              ? `${exam.score.toFixed(1)}分`
                              : "未完成"}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {exam.completed_at ? "已完成" : "进行中"}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>单选题: {exam.single_count}</span>
                        <span>多选题: {exam.multiple_count}</span>
                        <span>判断题: {exam.judge_count}</span>
                      </div>

                      {exam.completed_at && (
                        <div className="mt-2 text-sm text-gray-600">
                          完成时间: {formatDate(exam.completed_at)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 考试详情 */}
            <div className="lg:col-span-1">
              <h2 className="text-xl font-bold text-gray-800 mb-4">考试详情</h2>

              {detailLoading ? (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">加载详情中...</p>
                </div>
              ) : selectedExam ? (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-gray-800 mb-4">
                    {selectedExam.name}
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        考试信息
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="text-gray-600">试卷ID:</div>
                        <div className="text-gray-800">{selectedExam.id}</div>
                        <div className="text-gray-600">创建时间:</div>
                        <div className="text-gray-800">
                          {formatDate(selectedExam.created_at)}
                        </div>
                        <div className="text-gray-600">完成时间:</div>
                        <div className="text-gray-800">
                          {selectedExam.completed_at
                            ? formatDate(selectedExam.completed_at)
                            : "未完成"}
                        </div>
                        <div className="text-gray-600">状态:</div>
                        <div className="text-gray-800">
                          {selectedExam.completed_at ? "已完成" : "进行中"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">
                        题目配置
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-blue-100 p-3 rounded text-center">
                          <div className="text-sm text-gray-600">单选题</div>
                          <div className="text-xl font-bold text-blue-600">
                            {selectedExam.single_count}
                          </div>
                        </div>
                        <div className="bg-purple-100 p-3 rounded text-center">
                          <div className="text-sm text-gray-600">多选题</div>
                          <div className="text-xl font-bold text-purple-600">
                            {selectedExam.multiple_count}
                          </div>
                        </div>
                        <div className="bg-green-100 p-3 rounded text-center">
                          <div className="text-sm text-gray-600">判断题</div>
                          <div className="text-xl font-bold text-green-600">
                            {selectedExam.judge_count}
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedExam.score !== null && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          考试成绩
                        </h4>
                        <div
                          className={`p-4 rounded-lg text-center ${getScoreBgColor(
                            selectedExam.score
                          )}`}
                        >
                          <div className="text-3xl font-bold mb-1">
                            <span className={getScoreColor(selectedExam.score)}>
                              {selectedExam.score.toFixed(1)}分
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">
                            {selectedExam.score >= 90
                              ? "优秀"
                              : selectedExam.score >= 60
                              ? "及格"
                              : "不及格"}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedExam.questions && (
                      <div>
                        <h4 className="font-medium text-gray-700 mb-2">
                          题目统计
                        </h4>
                        <div className="text-sm text-gray-600">
                          共 {selectedExam.questions.length} 道题目
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex gap-3">
                        {!selectedExam.completed_at ? (
                          <Link
                            href={`/exam/taking/${selectedExam.id}`}
                            className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-center"
                          >
                            继续考试
                          </Link>
                        ) : (
                          <Link
                            href={`/exam/results/${selectedExam.id}`}
                            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center"
                          >
                            查看详细结果
                          </Link>
                        )}
                        <button
                          onClick={() => setSelectedExam(null)}
                          className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                        >
                          关闭详情
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-8 rounded-lg text-center">
                  <p className="text-gray-600">点击考试记录查看详情</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ExamHistoryPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">加载中...</p>
          </div>
        </div>
      }
    >
      <ExamHistoryContent />
    </Suspense>
  );
}
