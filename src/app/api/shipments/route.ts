import { NextResponse } from "next/server";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/infrastructure/db/prisma";
import { getSession } from "@/shared/auth/session";
import { createShipmentSchema } from "@/domain/shipment/shipment-input";
import { createShipmentReference } from "@/domain/shipment/shipment-reference";

async function uniqueReference() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = createShipmentReference(randomInt(100000, 1000000));
    const exists = await prisma.shipment.findUnique({ where: { reference }, select: { id: true } });
    if (!exists) return reference;
  }
  throw new Error("Unable to allocate shipment reference");
}

function decimalInput(value: number | undefined) {
  return value === undefined ? undefined : String(value);
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

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

  const parsed = createShipmentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "بيانات الطرد غير صحيحة", details: z.flattenError(parsed.error) },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const reference = await uniqueReference();

  const shipment = await prisma.$transaction(async (tx) => {
    const created = await tx.shipment.create({
      data: {
        reference,
        serialNumber: reference,
        senderName: input.senderName,
        senderPhone: input.senderPhone || undefined,
        recipientName: input.recipientName,
        recipientPhone: input.recipientPhone || undefined,
        originWilaya: input.originWilaya,
        originCommune: input.originCommune || undefined,
        destinationWilaya: input.destinationWilaya,
        destinationCommune: input.destinationCommune || undefined,
        description: input.description,
        quantity: input.quantity,
        weight: decimalInput(input.weight),
        volume: decimalInput(input.volume),
        deliveryFee: String(input.deliveryFee),
        createdByUserId: session.userId,
        status: "NEW",
        financialStatus: "UNPAID",
      },
    });
    await tx.shipmentStatusHistory.create({
      data: { shipmentId: created.id, toStatus: "NEW", changedByUserId: session.userId },
    });
    return created;
  });

  return NextResponse.json(
    {
      reference: shipment.reference,
      serialNumber: shipment.serialNumber,
      trackingUrl: "/tracking?ref=" + encodeURIComponent(shipment.reference),
    },
    { status: 201 },
  );
}
