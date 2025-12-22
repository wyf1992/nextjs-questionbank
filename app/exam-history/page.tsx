"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ExamRecord {
  id: number;
  name: string;
  score: number | null;
  completed_at: string | null;
  created_at: string;
  single_count: number;
  multiple_count: number;
  judge_count: number;
}

export default function ExamHistoryPage() {
  const [examRecords, setExamRecords] = useState<ExamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "completed" | "incomplete">(
    "all"
  );

  useEffect(() => {
    loadExamRecords();
  }, []);

  const loadExamRecords = async () => {
    try {
      const response = await fetch("/api/exam");
      const data = await response.json();

      if (data.error) {
        setError(data.error);
      } else {
        setExamRecords(data.exams || []);
      }
    } catch (error) {
      console.error("加载考试记录失败:", error);
      setError("加载考试记录失败");
    } finally {
      setLoading(false);
    }
  };

  const deleteExamRecord = async (examId: number) => {
    if (!confirm("确定要删除这条考试记录吗？此操作不可恢复。")) {
      return;
    }

    try {
      const response = await fetch(`/api/exam?examId=${examId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        alert("删除成功");
        loadExamRecords();
      } else {
        alert("删除失败：" + data.error);
      }
    } catch (error) {
      console.error("删除考试记录失败:", error);
      alert("删除考试记录失败");
    }
  };

  const filteredRecords = examRecords.filter((record) => {
    if (filter === "completed") return record.score !== null;
    if (filter === "incomplete") return record.score === null;
    return true;
  });

  const getStatusColor = (score: number | null) => {
    if (score === null) return "bg-gray-100 text-gray-800";
    if (score >= 80) return "bg-green-100 text-green-800";
    if (score >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getStatusText = (score: number | null) => {
    if (score === null) return "未完成";
    if (score >= 80) return "优秀";
    if (score >= 60) return "合格";
    return "不合格";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center py-12">
            <div className="text-2xl font-bold text-gray-800">加载中...</div>
            <div className="text-gray-600 mt-2">正在加载考试记录，请稍候</div>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">考试记录</h1>
            <p className="text-gray-600">
              查看所有模拟考试的历史记录，分析学习进度
            </p>
          </div>

          {error && (
            <div className="bg-red-100 text-red-800 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* 筛选选项 */}
          <div className="flex flex-wrap gap-4 mb-6">
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-lg ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              全部 ({examRecords.length})
            </button>
            <button
              onClick={() => setFilter("completed")}
              className={`px-4 py-2 rounded-lg ${
                filter === "completed"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              已完成 ({examRecords.filter((r) => r.score !== null).length})
            </button>
            <button
              onClick={() => setFilter("incomplete")}
              className={`px-4 py-2 rounded-lg ${
                filter === "incomplete"
                  ? "bg-yellow-600 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              未完成 ({examRecords.filter((r) => r.score === null).length})
            </button>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">
                {examRecords.length}
              </div>
              <div className="text-gray-700">总考试次数</div>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <div className="text-3xl font-bold text-green-600">
                {examRecords.filter((r) => r.score !== null).length}
              </div>
              <div className="text-gray-700">已完成考试</div>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {examRecords.filter((r) => r.score !== null).length > 0
                  ? (
                      examRecords
                        .filter((r) => r.score !== null)
                        .reduce((sum, r) => sum + (r.score || 0), 0) /
                      examRecords.filter((r) => r.score !== null).length
                    ).toFixed(1)
                  : "0.0"}
              </div>
              <div className="text-gray-700">平均分数</div>
            </div>
          </div>

          {/* 考试记录列表 */}
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-2xl font-bold text-gray-800 mb-2">
                暂无考试记录
              </div>
              <p className="text-gray-600 mb-6">
                {filter === "all"
                  ? "还没有进行过模拟考试"
                  : filter === "completed"
                  ? "没有已完成的考试"
                  : "没有未完成的考试"}
              </p>
              <Link
                href="/exam"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
              >
                去模拟考试
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRecords.map((record) => (
                <div
                  key={record.id}
                  className="border border-gray-200 rounded-lg p-6 hover:bg-gray-50"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-800">
                          {record.name}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                            record.score
                          )}`}
                        >
                          {getStatusText(record.score)}
                        </span>
                      </div>
                      <div className="text-gray-600 space-y-1">
                        <p>试卷 ID: {record.id}</p>
                        <p>创建时间: {formatDate(record.created_at)}</p>
                        {record.completed_at && (
                          <p>完成时间: {formatDate(record.completed_at)}</p>
                        )}
                        <p>
                          题目配置: 单选题 {record.single_count} 题，多选题{" "}
                          {record.multiple_count} 题，判断题{" "}
                          {record.judge_count} 题
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      {record.score !== null ? (
                        <>
                          <div className="text-right">
                            <div className="text-3xl font-bold text-blue-600">
                              {record.score.toFixed(1)}
                            </div>
                            <div className="text-gray-600">分数</div>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/exam/result/${record.id}`}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                            >
                              查看详情
                            </Link>
                            <button
                              onClick={() => deleteExamRecord(record.id)}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                            >
                              删除
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <div className="text-lg font-medium text-gray-600">
                              未完成
                            </div>
                            <div className="text-sm text-gray-500">
                              可继续考试
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Link
                              href={`/exam/take/${record.id}`}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                            >
                              继续考试
                            </Link>
                            <button
                              onClick={() => deleteExamRecord(record.id)}
                              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                            >
                              删除
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 分析总结 */}
          {examRecords.filter((r) => r.score !== null).length > 0 && (
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-800 mb-4">
                学习分析
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">分数分布</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">优秀 (≥80分)</span>
                      <span className="font-medium">
                        {
                          examRecords.filter(
                            (r) => r.score !== null && r.score >= 80
                          ).length
                        }{" "}
                        次
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">合格 (60-79分)</span>
                      <span className="font-medium">
                        {
                          examRecords.filter(
                            (r) =>
                              r.score !== null && r.score >= 60 && r.score < 80
                          ).length
                        }{" "}
                        次
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">不合格 ({"<"}60分)</span>
                      <span className="font-medium">
                        {
                          examRecords.filter(
                            (r) => r.score !== null && r.score < 60
                          ).length
                        }{" "}
                        次
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">学习建议</h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• 定期进行模拟考试，检测学习效果</li>
                    <li>• 重点复习错题集中的题目</li>
                    <li>• 保持每周至少2次模拟考试</li>
                    <li>• 分析分数趋势，调整学习计划</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
