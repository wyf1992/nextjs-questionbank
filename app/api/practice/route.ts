import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface QuestionRow {
  id: number;
  type: "single" | "multiple" | "judge";
  content: string;
  options: string | null;
  correct_answer: string;
  explanation: string | null;
  created_at: string;
}

// 获取随机题目进行练习
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");
    const count = parseInt(searchParams.get("count") || "10");
    const order = searchParams.get("order") || "random"; // 新增：排序方式
    const startFrom = searchParams.get("startFrom") || "last"; // 新增：从新开始还是从上次开始
    const user = await getCurrentUser(request);

    let query = "SELECT * FROM questions";
    const params: (string | number)[] = [];

    // 构建WHERE条件
    const whereConditions: string[] = [];

    if (type && ["single", "multiple", "judge"].includes(type)) {
      whereConditions.push("type = ?");
      params.push(type);
    }

    // 如果是按序刷题，需要处理从上次开始还是从新开始
    if (order === "sequential") {
      let lastId = 0;

      // 如果用户已登录且选择从上次开始，获取用户的刷题进度
      if (user && startFrom === "last") {
        const userStmt = db.prepare(
          "SELECT sequential_practice_last_id FROM users WHERE id = ?"
        );
        const userData = userStmt.get(user.id) as
          | { sequential_practice_last_id: number }
          | undefined;
        if (userData && userData.sequential_practice_last_id > 0) {
          lastId = userData.sequential_practice_last_id;
        }
      }

      console.log("Sequential practice last ID:", lastId);

      // 如果从上次开始且有进度，则从lastId之后开始
      if (lastId > 0) {
        whereConditions.push("id > ?");
        params.push(lastId);
      }
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    // 根据排序方式添加ORDER BY子句
    if (order === "sequential") {
      query += " ORDER BY id ASC";
    } else {
      query += " ORDER BY RANDOM()";
    }

    query += " LIMIT ?";
    params.push(count);

    const stmt = db.prepare(query);
    const questions = stmt.all(...params) as QuestionRow[];

    return NextResponse.json({
      questions: questions.map((q) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
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
    // 获取当前用户
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { questionId, userAnswer, isCorrect, order, isLastQuestion } =
      await request.json();

    if (!questionId || userAnswer === undefined || isCorrect === undefined) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    // 记录练习（关联用户ID）
    const practiceStmt = db.prepare(`
      INSERT INTO practice_records (user_id, question_id, user_answer, is_correct)
      VALUES (?, ?, ?, ?)
    `);
    practiceStmt.run(user.id, questionId, userAnswer, isCorrect ? 1 : 0);

    // 如果答错，添加到错题本
    if (!isCorrect) {
      const checkStmt = db.prepare(
        "SELECT * FROM wrong_questions WHERE question_id = ? AND user_id = ?"
      );
      const existing = checkStmt.get(questionId, user.id);

      if (existing) {
        // 更新错题记录
        const updateStmt = db.prepare(`
          UPDATE wrong_questions
          SET wrong_count = wrong_count + 1, user_answer = ?, last_wrong_at = CURRENT_TIMESTAMP
          WHERE question_id = ? AND user_id = ?
        `);
        updateStmt.run(userAnswer, questionId, user.id);
      } else {
        // 新增错题记录（关联用户ID）
        const insertStmt = db.prepare(`
          INSERT INTO wrong_questions (user_id, question_id, user_answer)
          VALUES (?, ?, ?)
        `);
        insertStmt.run(user.id, questionId, userAnswer);
      }
    }

    // 如果是按序刷题并且是最后一题，更新用户的刷题进度
    if (order === "sequential" && isLastQuestion) {
      const updateStmt = db.prepare(`
        UPDATE users SET sequential_practice_last_id = ? WHERE id = ?
      `);
      updateStmt.run(questionId, user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("提交答案失败:", error);
    return NextResponse.json({ error: "提交答案失败" }, { status: 500 });
  }
}
