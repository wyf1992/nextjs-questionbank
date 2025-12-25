import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface WrongQuestionRow {
  id: number;
  question_id: number;
  user_id: number;
  user_answer: string | null;
  wrong_count: number;
  last_wrong_at: string;
  type: "single" | "multiple" | "judge";
  content: string;
  options: string | null;
  correct_answer: string;
  explanation: string | null;
}

// 获取错题列表
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser(request);

    console.log("当前用户:", user);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const stmt = db.prepare(`
      SELECT 
        wq.*,
        q.type,
        q.content,
        q.options,
        q.correct_answer,
        q.explanation
      FROM wrong_questions wq
      JOIN questions q ON wq.question_id = q.id
      WHERE wq.user_id = ?
      ORDER BY wq.last_wrong_at DESC
    `);

    const wrongQuestions = stmt.all(user.id) as WrongQuestionRow[];

    return NextResponse.json({
      questions: wrongQuestions.map((q) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
      })),
    });
  } catch (error) {
    console.error("获取错题失败:", error);
    return NextResponse.json({ error: "获取错题失败" }, { status: 500 });
  }
}

// 删除错题记录
export async function DELETE(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少错题 ID" }, { status: 400 });
    }

    // 确保只能删除自己的错题记录
    const stmt = db.prepare(
      "DELETE FROM wrong_questions WHERE id = ? AND user_id = ?"
    );
    const result = stmt.run(id, user.id);

    if (result.changes === 0) {
      return NextResponse.json(
        { error: "错题记录不存在或无权删除" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除错题失败:", error);
    return NextResponse.json({ error: "删除错题失败" }, { status: 500 });
  }
}
