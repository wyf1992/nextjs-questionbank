import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // 清除 HttpOnly cookie
    const cookieStore = await cookies();
    cookieStore.set("user", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
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
