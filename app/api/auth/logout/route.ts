import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { deleteSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    // 获取session ID并删除会话
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("session_id")?.value;

    if (sessionId) {
      deleteSession(sessionId);
    }

    // 清除 HttpOnly cookie
    cookieStore.set("session_id", "", {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0, // 立即过期
      path: "/",
    });

    return NextResponse.json({
      success: true,
      message: "登出成功",
    });
  } catch (error) {
    console.error("登出错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
