import { NextResponse } from "next/server";
import { authenticate } from "@/application/auth/login-service";
import { setSession } from "@/shared/auth/session";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "صيغة البيانات غير صحيحة" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("identifier" in body) ||
    !("password" in body) ||
    typeof body.identifier !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "بيانات الدخول مطلوبة" }, { status: 400 });
  }

  const token = await authenticate(body.identifier, body.password);
  if (!token) {
    return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
  }

  await setSession(token);
  return NextResponse.json({ ok: true });
}
