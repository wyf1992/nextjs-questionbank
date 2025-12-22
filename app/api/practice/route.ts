import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

// 获取随机题目进行练习
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const count = parseInt(searchParams.get("count") || "10");

    let query = "SELECT * FROM questions";
    const params: string[] = [];

    if (type && ["single", "multiple", "judge"].includes(type)) {
      query += " WHERE type = ?";
      params.push(type);
    }

    query += " ORDER BY RANDOM() LIMIT ?";
    params.push(count.toString());

    const stmt = db.prepare(query);
    const questions = stmt.all(...params);

    return NextResponse.json({
      questions: questions.map((q: Record<string, unknown>) => ({
        ...q,
        options: q.options ? JSON.parse(q.options as string) : null,
      })),
    });
  } catch (error) {
    console.error("获取练习题目失败:", error);
    return NextResponse.json({ error: "获取练习题目失败" }, { status: 500 });
  }
}

// 提交练习答案
export async function POST(request: NextRequest) {
  try {
    const { questionId, userAnswer, isCorrect } = await request.json();

    if (!questionId || userAnswer === undefined || isCorrect === undefined) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    // 记录练习
    const practiceStmt = db.prepare(`
      INSERT INTO practice_records (question_id, user_answer, is_correct)
      VALUES (?, ?, ?)
    `);
    practiceStmt.run(questionId, userAnswer, isCorrect ? 1 : 0);

    // 如果答错，添加到错题本
    if (!isCorrect) {
      const checkStmt = db.prepare(
        "SELECT * FROM wrong_questions WHERE question_id = ?"
      );
      const existing = checkStmt.get(questionId);

      if (existing) {
        // 更新错题记录
        const updateStmt = db.prepare(`
          UPDATE wrong_questions
          SET wrong_count = wrong_count + 1, user_answer = ?, last_wrong_at = CURRENT_TIMESTAMP
          WHERE question_id = ?
        `);
        updateStmt.run(userAnswer, questionId);
      } else {
        // 新增错题记录
        const insertStmt = db.prepare(`
          INSERT INTO wrong_questions (question_id, user_answer)
          VALUES (?, ?)
        `);
        insertStmt.run(questionId, userAnswer);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("提交答案失败:", error);
    return NextResponse.json({ error: "提交答案失败" }, { status: 500 });
  }
}
