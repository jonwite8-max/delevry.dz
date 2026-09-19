import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/infrastructure/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ reference: string }> },
) {
  const { reference } = await params;
  const shipment = await prisma.shipment.findFirst({
    where: { OR: [{ reference }, { serialNumber: reference }] },
    select: { reference: true },
  });

  if (!shipment) {
    return NextResponse.json({ error: "الطرد غير موجود" }, { status: 404 });
  }

  const base = process.env.APP_URL ?? "http://localhost:3000";
  const url = new URL(
    "/tracking?ref=" + encodeURIComponent(shipment.reference),
    base,
  ).toString();

  const png = await QRCode.toBuffer(url, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 500,
  });

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "content-type": "image/png",
      "cache-control": "private, max-age=300",
    },
  });
}
