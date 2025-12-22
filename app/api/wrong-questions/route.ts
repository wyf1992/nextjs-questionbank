import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

interface WrongQuestionRow {
  id: number;
  question_id: number;
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
export async function GET() {
  try {
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
      ORDER BY wq.last_wrong_at DESC
    `);

    const wrongQuestions = stmt.all() as WrongQuestionRow[];

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
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少错题 ID" }, { status: 400 });
    }

    const stmt = db.prepare("DELETE FROM wrong_questions WHERE id = ?");
    stmt.run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("删除错题失败:", error);
    return NextResponse.json({ error: "删除错题失败" }, { status: 500 });
  }
}
