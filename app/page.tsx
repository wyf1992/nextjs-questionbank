import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            在线刷题系统
          </h1>
          <p className="text-xl text-gray-600">
            支持单选、多选、判断题，Word 导入题库，智能错题本
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* 导入题库 */}
          <Link href="/import">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-blue-500">
              <div className="text-4xl mb-4">📝</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                导入题库
              </h2>
              <p className="text-gray-600">
                上传 Word 文档，自动解析题目，支持预览和编辑后入库
              </p>
            </div>
          </Link>

          {/* 开始刷题 */}
          <Link href="/practice">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-green-500">
              <div className="text-4xl mb-4">✍️</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                开始刷题
              </h2>
              <p className="text-gray-600">
                随机抽取题目进行练习，支持按题型筛选，实时反馈答题结果
              </p>
            </div>
          </Link>

          {/* 错题本 */}
          <Link href="/wrong-questions">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-red-500">
              <div className="text-4xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                我的错题
              </h2>
              <p className="text-gray-600">
                查看历史错题记录，重点复习薄弱环节，提高答题准确率
              </p>
            </div>
          </Link>

          {/* 模拟考试 */}
          <Link href="/exam">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-purple-500">
              <div className="text-4xl mb-4">📋</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                模拟考试
              </h2>
              <p className="text-gray-600">
                生成模拟试卷，可配置题目数量，完整的考试体验
              </p>
            </div>
          </Link>

          {/* 题库管理 */}
          <Link href="/questions">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-yellow-500">
              <div className="text-4xl mb-4">📚</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                题库管理
              </h2>
              <p className="text-gray-600">
                查看、编辑、删除题目，管理题库内容，支持分类筛选
              </p>
            </div>
          </Link>

          {/* 考试记录 */}
          <Link href="/exam-history">
            <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition-shadow cursor-pointer border-2 border-transparent hover:border-indigo-500">
              <div className="text-4xl mb-4">📊</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                考试记录
              </h2>
              <p className="text-gray-600">
                查看历史考试记录，分析答题情况，追踪学习进度
              </p>
            </div>
          </Link>
        </div>

        <div className="mt-12 text-center text-gray-600">
          <p className="text-sm">
            💡 提示：首次使用请先导入题库，然后开始刷题练习
          </p>
        </div>
      </div>
    </div>
  );
}
