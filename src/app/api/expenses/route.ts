import { NextResponse } from "next/server";
import { getSession } from "@/shared/auth/session";
import { createExpense } from "@/application/finance/expense-service";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "صيغة البيانات غير صحيحة" }, { status: 400 });
  }

  try {
    const expense = await createExpense(session.role, session.userId, body as never);
    return NextResponse.json({ id: expense.id, reference: expense.reference }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    if (error instanceof Error && (error.message === "INVALID_AMOUNT" || error.message === "INVALID_EXPENSE")) {
      return NextResponse.json({ error: "بيانات المصروف غير صحيحة" }, { status: 400 });
    }
    console.error("expense create failed", error);
    return NextResponse.json({ error: "تعذر تسجيل المصروف" }, { status: 500 });
  }
}
