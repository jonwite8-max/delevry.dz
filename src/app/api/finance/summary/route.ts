import { NextResponse } from "next/server";
import { getSession } from "@/shared/auth/session";
import { getFinanceSummary } from "@/application/finance/finance-summary-service";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    return NextResponse.json(await getFinanceSummary(session.role));
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    console.error("finance summary failed", error);
    return NextResponse.json({ error: "تعذر تحميل الملخص المالي" }, { status: 500 });
  }
}
