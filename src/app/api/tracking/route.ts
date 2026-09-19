import { NextResponse } from "next/server";
import { prisma } from "@/infrastructure/db/prisma";

export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("ref")?.trim();
  if (!reference) {
    return NextResponse.json({ error: "رقم التتبع مطلوب" }, { status: 400 });
  }

  const shipment = await prisma.shipment.findUnique({
    where: { reference },
    select: {
      reference: true,
      status: true,
      destinationWilaya: true,
      destinationCommune: true,
      createdAt: true,
      updatedAt: true,
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: { fromStatus: true, toStatus: true, reason: true, createdAt: true },
      },
    },
  });

  if (!shipment) {
    return NextResponse.json({ error: "رقم التتبع غير موجود" }, { status: 404 });
  }

  return NextResponse.json({
    reference: shipment.reference,
    status: shipment.status,
    destination: {
      wilaya: shipment.destinationWilaya,
      commune: shipment.destinationCommune,
    },
    updatedAt: shipment.updatedAt,
    history: shipment.statusHistory,
  });
}
