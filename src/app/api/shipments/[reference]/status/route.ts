import { NextResponse } from "next/server";
import { transitionShipment } from "@/application/shipments/shipment-service";
import { getSession } from "@/shared/auth/session";

type Context = { params: Promise<{ reference: string }> };

export async function POST(req: Request, context: Context) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "صيغة البيانات غير صحيحة" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("status" in body) ||
    typeof body.status !== "string"
  ) {
    return NextResponse.json({ error: "الحالة مطلوبة" }, { status: 400 });
  }

  const { reference } = await context.params;

  try {
    const shipment = await transitionShipment(
      session.role,
      session.userId,
      reference,
      body.status as Parameters<typeof transitionShipment>[3],
      "reason" in body && typeof body.reason === "string" ? body.reason : undefined,
    );
    return NextResponse.json({
      reference: shipment.reference,
      status: shipment.status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "FORBIDDEN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    if (message === "SHIPMENT_NOT_FOUND") {
      return NextResponse.json({ error: "الطرد غير موجود" }, { status: 404 });
    }
    if (message === "INVALID_TRANSITION") {
      return NextResponse.json({ error: "انتقال الحالة غير مسموح" }, { status: 409 });
    }
    console.error("shipment transition failed", error);
    return NextResponse.json({ error: "تعذر تحديث حالة الطرد" }, { status: 500 });
  }
}
