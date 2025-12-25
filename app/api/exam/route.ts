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

// 生成试卷
export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { name, singleCount, multipleCount, judgeCount } =
      await request.json();

    // 验证参数
    if (!name) {
      return NextResponse.json({ error: "试卷名称不能为空" }, { status: 400 });
    }

    const single = singleCount || 0;
    const multiple = multipleCount || 0;
    const judge = judgeCount || 0;

    if (single <= 0 && multiple <= 0 && judge <= 0) {
      return NextResponse.json(
        { error: "至少需要选择一种题型" },
        { status: 400 }
      );
    }

    // 获取各类型题目
    const singleStmt = db.prepare(
      "SELECT * FROM questions WHERE type = 'single' ORDER BY RANDOM() LIMIT ?"
    );
    const multipleStmt = db.prepare(
      "SELECT * FROM questions WHERE type = 'multiple' ORDER BY RANDOM() LIMIT ?"
    );
    const judgeStmt = db.prepare(
      "SELECT * FROM questions WHERE type = 'judge' ORDER BY RANDOM() LIMIT ?"
    );

    const singleQuestions = singleStmt.all(single) as QuestionRow[];
    const multipleQuestions = multipleStmt.all(multiple) as QuestionRow[];
    const judgeQuestions = judgeStmt.all(judge) as QuestionRow[];

    // 检查题目数量是否足够
    if (
      singleQuestions.length < single ||
      multipleQuestions.length < multiple ||
      judgeQuestions.length < judge
    ) {
      return NextResponse.json(
        {
          error: "题库中题目数量不足",
          available: {
            single: singleQuestions.length,
            multiple: multipleQuestions.length,
            judge: judgeQuestions.length,
          },
        },
        { status: 400 }
      );
    }

    // 保存试卷配置
    const configStmt = db.prepare(`
      INSERT INTO exam_configs (name, single_count, multiple_count, judge_count)
      VALUES (?, ?, ?, ?)
    `);
    const result = configStmt.run(name, single, multiple, judge);
    const configId = result.lastInsertRowid;

    // 组合所有题目
    const allQuestions = [
      ...singleQuestions,
      ...multipleQuestions,
      ...judgeQuestions,
    ];

    // 创建试卷记录（关联用户ID）
    const examStmt = db.prepare(`
      INSERT INTO exam_records (user_id, config_id, questions)
      VALUES (?, ?, ?)
    `);
    const examResult = examStmt.run(
      user.id,
      configId,
      JSON.stringify(allQuestions.map((q: QuestionRow) => q.id))
    );

    return NextResponse.json({
      success: true,
      examId: examResult.lastInsertRowid,
      configId,
      questions: allQuestions.map((q: QuestionRow) => ({
        ...q,
        options: q.options ? JSON.parse(q.options) : null,
      })),
    });
  } catch (error) {
    console.error("生成试卷失败:", error);
    return NextResponse.json({ error: "生成试卷失败" }, { status: 500 });
  }
}

// 获取试卷列表
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const examId = searchParams.get("examId");

    if (examId) {
      // 获取特定试卷详情（只能获取自己的试卷）
      const stmt = db.prepare(`
        SELECT 
          er.*,
          ec.name,
          ec.single_count,
          ec.multiple_count,
          ec.judge_count
        FROM exam_records er
        JOIN exam_configs ec ON er.config_id = ec.id
        WHERE er.id = ? AND er.user_id = ?
      `);
      const exam = stmt.get(examId, user.id) as
        | Record<string, unknown>
        | undefined;

      if (!exam) {
        return NextResponse.json({ error: "试卷不存在" }, { status: 404 });
      }

      // 获取题目详情
      const questionIds = JSON.parse(exam.questions as string);
      const questions: QuestionRow[] = [];

      for (const id of questionIds) {
        const qStmt = db.prepare("SELECT * FROM questions WHERE id = ?");
        const question = qStmt.get(id) as QuestionRow | undefined;
        if (question) {
          questions.push(question);
        }
      }

      return NextResponse.json({
        ...exam,
        questions: questions.map((q: QuestionRow) => ({
          ...q,
          options: q.options ? JSON.parse(q.options) : null,
        })),
        answers: exam.answers ? JSON.parse(exam.answers as string) : null,
      });
    } else {
      // 获取当前用户的所有试卷列表
      const stmt = db.prepare(`
        SELECT 
          er.*,
          ec.name,
          ec.single_count,
          ec.multiple_count,
          ec.judge_count
        FROM exam_records er
        JOIN exam_configs ec ON er.config_id = ec.id
        WHERE er.user_id = ?
        ORDER BY er.created_at DESC
      `);
      const exams = stmt.all(user.id);

      return NextResponse.json({ exams });
    }
  } catch (error) {
    console.error("获取试卷失败:", error);
    return NextResponse.json({ error: "获取试卷失败" }, { status: 500 });
  }
}

// 提交试卷答案
export async function PUT(request: NextRequest) {
  try {
    // 获取当前用户
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { examId, answers } = await request.json();

    if (!examId || !answers) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    // 获取试卷信息（只能提交自己的试卷）
    const examStmt = db.prepare(
      "SELECT * FROM exam_records WHERE id = ? AND user_id = ?"
    );
    const exam = examStmt.get(examId, user.id) as
      | Record<string, unknown>
      | undefined;

    if (!exam) {
      return NextResponse.json({ error: "试卷不存在" }, { status: 404 });
    }

    // 计算分数
    const questionIds = JSON.parse(exam.questions as string);
    let correctCount = 0;
    const totalCount = questionIds.length;

    for (const id of questionIds) {
      const qStmt = db.prepare("SELECT * FROM questions WHERE id = ?");
      const question = qStmt.get(id) as Record<string, unknown> | undefined;

      if (question && answers[id]) {
        const userAnswer = answers[id];
        const correctAnswer = question.correct_answer;

        if (userAnswer === correctAnswer) {
          correctCount++;
        }
      }
    }

    const score = (correctCount / totalCount) * 100;

    // 更新试卷记录
    const updateStmt = db.prepare(`
      UPDATE exam_records
      SET answers = ?, score = ?, completed_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `);
    updateStmt.run(JSON.stringify(answers), score, examId, user.id);

    return NextResponse.json({
      success: true,
      score,
      correctCount,
      totalCount,
    });
  } catch (error) {
    console.error("提交试卷失败:", error);
    return NextResponse.json({ error: "提交试卷失败" }, { status: 500 });
  }
}
