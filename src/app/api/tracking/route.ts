import { NextResponse } from "next/server";
import { getPublicTracking } from "@/application/tracking/tracking-service";

export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("ref") ?? "";
  try {
    return NextResponse.json(await getPublicTracking(reference));
  } catch (error) {
    if (error instanceof Error && error.message === "TRACKING_REFERENCE_REQUIRED") {
      return NextResponse.json({ error: "رقم التتبع مطلوب" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "SHIPMENT_NOT_FOUND") {
      return NextResponse.json({ error: "رقم التتبع غير موجود" }, { status: 404 });
    }
    console.error("public tracking failed", error);
    return NextResponse.json({ error: "تعذر تحميل التتبع" }, { status: 500 });
  }
}
