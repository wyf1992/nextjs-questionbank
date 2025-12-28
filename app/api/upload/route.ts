import { NextRequest, NextResponse } from "next/server";
import { parseWordDocument } from "@/lib/wordParser";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // 检查用户权限
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "只有管理员可以上传题目" },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "没有上传文件" }, { status: 400 });
    }

    // 检查文件类型
    if (!file.name.endsWith(".docx") && !file.name.endsWith(".doc")) {
      return NextResponse.json(
        { error: "只支持 .doc 或 .docx 格式的文件" },
        { status: 400 }
      );
    }

    // 读取文件内容
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 解析 Word 文档
    const questions = await parseWordDocument(buffer);

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length,
    });
  } catch (error) {
    console.error("解析文档失败:", error);
    return NextResponse.json(
      { error: "解析文档失败，请检查文档格式" },
      { status: 500 }
    );
  }
}
