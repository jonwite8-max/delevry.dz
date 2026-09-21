import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/infrastructure/db/prisma";
import { createSession, setSession } from "@/shared/auth/session";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const identifier = typeof body?.identifier === "string" ? body.identifier.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!identifier || !password) return NextResponse.json({ error: "بيانات الدخول مطلوبة" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: identifier } });
    if (!user || user.status !== "ACTIVE" || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    await setSession(await createSession(user.id, user.role));
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("LOGIN_ERROR", error);
    return NextResponse.json({ error: "تعذر إتمام تسجيل الدخول حاليًا" }, { status: 500 });
  }
}
