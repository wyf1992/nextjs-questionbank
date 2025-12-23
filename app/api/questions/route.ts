import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

interface QuestionRow {
  id: number;
  type: "single" | "multiple" | "judge";
  content: string;
  options: string | null;
  correct_answer: string;
  explanation: string | null;
  created_at: string;
}

// 获取题目列表
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM questions";
    const params: (string | number)[] = [];

    if (type && ["single", "multiple", "judge"].includes(type)) {
      query += " WHERE type = ?";
      params.push(type);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const questions = stmt.all(...params) as QuestionRow[];

    // 获取总数
    let countQuery = "SELECT COUNT(*) as total FROM questions";
    if (type && ["single", "multiple", "judge"].includes(type)) {
      countQuery += " WHERE type = ?";
      const countStmt = db.prepare(countQuery);
      const result = countStmt.get(type) as { total: number };
      const total = result.total;

      return NextResponse.json({
        questions: questions.map((q) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null,
        })),
        total,
        page,
        limit,
      });
    } else {
      const countStmt = db.prepare(countQuery);
      const result = countStmt.get() as { total: number };
      const total = result.total;

      return NextResponse.json({
        questions: questions.map((q) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null,
        })),
        total,
        page,
        limit,
      });
    }
  } catch (error) {
    console.error("获取题目失败:", error);
    return NextResponse.json({ error: "获取题目失败" }, { status: 500 });
  }
}

interface ImportQuestion {
  type: "single" | "multiple" | "judge";
  content: string;
  options?: string[];
  correctAnswer?: string;
  correct_answer?: string;
  explanation?: string;
}

// 批量添加题目
export async function POST(request: NextRequest) {
  try {
    const { questions } = await request.json();

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json({ error: "题目数据无效" }, { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO questions (type, content, options, correct_answer, explanation)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((questions: ImportQuestion[]) => {
      for (const q of questions) {
        stmt.run(
          q.type,
          q.content,
          q.options ? JSON.stringify(q.options) : null,
          q.correctAnswer || q.correct_answer, // 支持两种字段名
          q.explanation || null
        );
      }
    });

    insertMany(questions);

    return NextResponse.json({
      success: true,
      count: questions.length,
    });
  } catch (error) {
    console.error("添加题目失败:", error);
    return NextResponse.json({ error: "添加题目失败" }, { status: 500 });
  }
}

// 更新题目
export async function PUT(request: NextRequest) {
  try {
    const question = await request.json();

    if (!question.id) {
      return NextResponse.json({ error: "缺少题目 ID" }, { status: 400 });
    }

    const stmt = db.prepare(`
      UPDATE questions
      SET type = ?, content = ?, options = ?, correct_answer = ?, explanation = ?
      WHERE id = ?
    `);

    stmt.run(
      question.type,
      question.content,
      question.options ? JSON.stringify(question.options) : null,
      question.correct_answer || question.correctAnswer, // 支持两种字段名
      question.explanation || null,
      question.id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("更新题目失败:", error);
    return NextResponse.json({ error: "更新题目失败" }, { status: 500 });
  }
}

// 删除题目
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const clearAll = searchParams.get("clearAll");

    // 清除所有题目
    if (clearAll === "true") {
      if (!confirmClearAll()) {
        return NextResponse.json({ error: "操作已取消" }, { status: 400 });
      }

      // 删除所有相关表中的数据（需要按外键约束顺序删除）
      db.exec("DELETE FROM practice_records");
      db.exec("DELETE FROM wrong_questions");
      db.exec("DELETE FROM exam_records");
      db.exec("DELETE FROM questions");

      return NextResponse.json({
        success: true,
        message: "已清除所有题目及相关记录",
      });
    }

    // 删除单个题目
    if (!id) {
      return NextResponse.json({ error: "缺少题目 ID" }, { status: 400 });
    }

    const stmt = db.prepare("DELETE FROM questions WHERE id = ?");
    stmt.run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除题目失败:", error);
    return NextResponse.json({ error: "删除题目失败" }, { status: 500 });
  }
}

// 确认清除所有题目（这里可以添加额外的验证逻辑）
function confirmClearAll(): boolean {
  // 在实际应用中，这里可以添加更复杂的验证逻辑
  // 例如检查用户权限、添加二次确认等
  // 目前返回true表示允许清除
  return true;
}
