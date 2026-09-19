import { NextResponse } from "next/server";
import { can, permissionActions } from "@/domain/auth/permission-engine";
import { createShipment } from "@/application/shipments/shipment-service";
import { getSession } from "@/shared/auth/session";
import { prisma } from "@/infrastructure/db/prisma";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  if (!can(session.role, permissionActions.shipmentRead)) {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? "1") || 1);
  const pageSize = Math.min(100, Math.max(10, Number(url.searchParams.get("pageSize") ?? "25") || 25));
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status")?.trim() ?? "";

  const where = {
    ...(status ? { status: status as never } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search, mode: "insensitive" as const } },
            { serialNumber: { contains: search, mode: "insensitive" as const } },
            { senderName: { contains: search, mode: "insensitive" as const } },
            { recipientName: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.shipment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, reference: true, senderName: true, recipientName: true,
        originWilaya: true, destinationWilaya: true, quantity: true,
        deliveryFee: true, status: true, financialStatus: true, createdAt: true,
      },
    }),
    prisma.shipment.count({ where }),
  ]);

  return NextResponse.json({
    items,
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "صيغة البيانات غير صحيحة" }, { status: 400 });
  }

  try {
    const shipment = await createShipment(session.role, session.userId, body);
    return NextResponse.json(
      {
        reference: shipment.reference,
        serialNumber: shipment.serialNumber,
        trackingUrl: "/tracking?ref=" + encodeURIComponent(shipment.reference),
      },
      { status: 201 },
    );
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
