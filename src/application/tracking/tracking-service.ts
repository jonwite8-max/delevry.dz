import { prisma } from "@/infrastructure/db/prisma";

export async function getPublicTracking(reference: string) {
  const normalized = reference.trim();
  if (!normalized) throw new Error("TRACKING_REFERENCE_REQUIRED");

  const shipment = await prisma.shipment.findUnique({
    where: { reference: normalized },
    select: {
      reference: true,
      status: true,
      destinationWilaya: true,
      destinationCommune: true,
      updatedAt: true,
      statusHistory: {
        orderBy: { createdAt: "asc" },
        select: { fromStatus: true, toStatus: true, reason: true, createdAt: true },
      },
    },
  });

  if (!shipment) throw new Error("SHIPMENT_NOT_FOUND");

  return {
    reference: shipment.reference,
    status: shipment.status,
    destination: {
      wilaya: shipment.destinationWilaya,
      commune: shipment.destinationCommune,
    },
    updatedAt: shipment.updatedAt,
    history: shipment.statusHistory,
  };
}
