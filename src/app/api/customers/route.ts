import { NextResponse } from "next/server";
import { getSession } from "@/shared/auth/session";
import { createCustomer, searchCustomers } from "@/application/customers/customer-service";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const url = new URL(req.url);
  try {
    const result = await searchCustomers(
      session.role,
      url.searchParams.get("search") ?? "",
      Number(url.searchParams.get("page") ?? "1") || 1,
      Number(url.searchParams.get("pageSize") ?? "25") || 25,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    console.error("customer search failed", error);
    return NextResponse.json({ error: "تعذر تحميل العملاء" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "صيغة البيانات غير صحيحة" }, { status: 400 });
  }

  if (
    typeof body !== "object" || body === null ||
    typeof (body as Record<string, unknown>).name !== "string" ||
    typeof (body as Record<string, unknown>).phone !== "string"
  ) {
    return NextResponse.json({ error: "الاسم والهاتف مطلوبان" }, { status: 400 });
  }

  try {
    const customer = await createCustomer(session.role, session.userId, body as never);
    return NextResponse.json({ id: customer.id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "INVALID_CUSTOMER") {
      return NextResponse.json({ error: "بيانات العميل غير صحيحة" }, { status: 400 });
    }
    console.error("customer create failed", error);
    return NextResponse.json({ error: "تعذر إنشاء العميل" }, { status: 500 });
  }
}
