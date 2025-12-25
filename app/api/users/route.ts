import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "@/lib/db";

// 获取用户列表（仅管理员）
export async function GET(request: NextRequest) {
  try {
    // 这里应该检查用户权限，暂时简化处理
    const users = db
      .prepare("SELECT id, username, role, created_at FROM users ORDER BY id")
      .all();
    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("获取用户列表错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// 创建新用户
export async function POST(request: NextRequest) {
  try {
    const { username, password, role = "user" } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (existingUser) {
      return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 插入新用户
    const result = db
      .prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)")
      .run(username, hashedPassword, role);

    return NextResponse.json({
      success: true,
      userId: result.lastInsertRowid,
      message: "用户创建成功",
    });
  } catch (error) {
    console.error("创建用户错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// 更新用户
export async function PUT(request: NextRequest) {
  try {
    const { id, username, password, role } = await request.json();

    if (!id) {
      return NextResponse.json({ error: "用户ID不能为空" }, { status: 400 });
    }

    // 检查用户是否存在
    const existingUser = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(id);
    if (!existingUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 构建更新语句
    const updates: string[] = [];
    const params: (string | number)[] = [];

    if (username !== undefined) {
      // 检查新用户名是否与其他用户冲突
      const conflictUser = db
        .prepare("SELECT id FROM users WHERE username = ? AND id != ?")
        .get(username, id);
      if (conflictUser) {
        return NextResponse.json({ error: "用户名已存在" }, { status: 400 });
      }
      updates.push("username = ?");
      params.push(username);
    }

    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push("password = ?");
      params.push(hashedPassword);
    }

    if (role !== undefined) {
      updates.push("role = ?");
      params.push(role);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "没有提供更新内容" }, { status: 400 });
    }

    params.push(id);
    const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = ?`;
    db.prepare(sql).run(...params);

    return NextResponse.json({
      success: true,
      message: "用户更新成功",
    });
  } catch (error) {
    console.error("更新用户错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}

// 删除用户
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "用户ID不能为空" }, { status: 400 });
    }

    // 检查用户是否存在
    const existingUser = db
      .prepare("SELECT id FROM users WHERE id = ?")
      .get(id);
    if (!existingUser) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 });
    }

    // 删除用户
    db.prepare("DELETE FROM users WHERE id = ?").run(id);

    return NextResponse.json({
      success: true,
      message: "用户删除成功",
    });
  } catch (error) {
    console.error("删除用户错误:", error);
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 });
  }
}
