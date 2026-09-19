import { NextResponse } from "next/server";
import { createShipment, listShipments } from "@/application/shipments/shipment-service";
import { getSession } from "@/shared/auth/session";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const url = new URL(req.url);

  try {
    return NextResponse.json(await listShipments(session.role, {
      search: url.searchParams.get("search") ?? "",
      status: url.searchParams.get("status") ?? "",
      page: Number(url.searchParams.get("page") ?? "1") || 1,
      pageSize: Number(url.searchParams.get("pageSize") ?? "25") || 25,
    }));
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    console.error("shipment list failed", error);
    return NextResponse.json({ error: "تعذر تحميل الطرود" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "صيغة البيانات غير صحيحة" }, { status: 400 }); }

  try {
    const shipment = await createShipment(session.role, session.userId, body);
    return NextResponse.json({
      reference: shipment.reference,
      serialNumber: shipment.serialNumber,
      trackingUrl: "/tracking?ref=" + encodeURIComponent(shipment.reference),
    }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    if (error instanceof Error && error.message === "INVALID_SHIPMENT") {
      return NextResponse.json({ error: "بيانات الطرد غير صحيحة" }, { status: 400 });
    }
    console.error("create shipment failed", error);
    return NextResponse.json({ error: "تعذر إنشاء الطرد" }, { status: 500 });
  }
}
