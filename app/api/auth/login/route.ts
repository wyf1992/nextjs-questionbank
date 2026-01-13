import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "@/lib/db";
import { cookies } from "next/headers";
import { createSession } from "@/lib/session";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 查询用户
    const user = db
      .prepare("SELECT * FROM users WHERE username = ?")
      .get(username) as
      | { id: number; username: string; password: string; role: string }
      | undefined;

    if (!user) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    // 验证密码
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return NextResponse.json({ error: "用户名或密码错误" }, { status: 401 });
    }

    // 返回用户信息（不包含密码）
    const { password: _, ...userWithoutPassword } = user;

    // 创建会话
    const sessionId = await createSession(user.id, {
      id: user.id,
      username: user.username,
      role: user.role,
    });

    // 设置 HttpOnly cookie，只存储session ID
    const cookieStore = await cookies();
    cookieStore.set("session_id", sessionId, {
      httpOnly: true,
      // secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7天
      path: "/",
    });
    console.log("User logged in:", userWithoutPassword);
    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      message: "登录成功",
    });
  } catch (error) {
    console.error("登录错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
