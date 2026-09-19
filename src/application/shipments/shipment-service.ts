import { randomInt } from "node:crypto";
import { prisma } from "@/infrastructure/db/prisma";
import { can, permissionActions } from "@/domain/auth/permission-engine";
import { createShipmentSchema, type CreateShipmentInput } from "@/domain/shipment/shipment-input";
import { createShipmentReference } from "@/domain/shipment/shipment-reference";
import { canTransition, type ShipmentStatus } from "@/domain/shipment/shipment-engine";

async function uniqueReference() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const reference = createShipmentReference(randomInt(100000, 1000000));
    const exists = await prisma.shipment.findUnique({
      where: { reference },
      select: { id: true },
    });
    if (!exists) return reference;
  }
  throw new Error("Unable to allocate shipment reference");
}

function decimalInput(value: number | undefined) {
  return value === undefined ? undefined : String(value);
}

export async function createShipment(
  role: string,
  userId: string,
  rawInput: unknown,
) {
  if (!can(role, permissionActions.shipmentCreate)) {
    throw new Error("FORBIDDEN");
  }

  const parsed = createShipmentSchema.safeParse(rawInput);
  if (!parsed.success) {
    throw new Error("INVALID_SHIPMENT");
  }

  const input: CreateShipmentInput = parsed.data;
  const reference = await uniqueReference();

  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.create({
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
        createdByUserId: userId,
        status: "NEW",
        financialStatus: "UNPAID",
      },
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        toStatus: "NEW",
        changedByUserId: userId,
      },
    });

    return shipment;
  });
}

export async function transitionShipment(
  role: string,
  userId: string,
  reference: string,
  toStatus: ShipmentStatus,
  reason?: string,
) {
  if (!can(role, permissionActions.shipmentUpdateStatus)) {
    throw new Error("FORBIDDEN");
  }

  return prisma.$transaction(async (tx) => {
    const shipment = await tx.shipment.findUnique({
      where: { reference },
      select: { id: true, status: true },
    });

    if (!shipment) throw new Error("SHIPMENT_NOT_FOUND");

    const fromStatus = shipment.status as ShipmentStatus;
    if (!canTransition(fromStatus, toStatus)) {
      throw new Error("INVALID_TRANSITION");
    }

    const updated = await tx.shipment.update({
      where: { id: shipment.id },
      data: { status: toStatus },
    });

    await tx.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        fromStatus,
        toStatus,
        reason: reason?.trim() || undefined,
        changedByUserId: userId,
      },
    });

    return updated;
  });
}
