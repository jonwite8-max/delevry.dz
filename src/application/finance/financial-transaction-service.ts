import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { paymentMethods, paymentStatuses, paymentTypes, ledgerDirections, financialStatusFor, debtStatusFor, debtStatuses, validateCollectionAgainstDue } from "@/domain/finance/financial-engine";

type Tx = Prisma.TransactionClient;

export type CollectionPaymentInput = {
  shipmentId?: string;
  customerId?: string;
  amount: number;
  method: string;
  createdByUserId: string;
  reason?: string;
  ledgerType?: string;
};

export async function syncShipmentFinancialState(tx: Tx, shipmentId: string) {
  await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Shipment" WHERE id = ${shipmentId} FOR UPDATE`;

  const shipment = await tx.shipment.findUnique({
    where: { id: shipmentId },
    select: { id: true, customerId: true, deliveryFee: true, financialStatus: true },
  });
  if (!shipment) throw new Error("SHIPMENT_NOT_FOUND");

  const aggregate = await tx.payment.aggregate({
    where: {
      shipmentId,
      status: paymentStatuses.VALID,
      type: paymentTypes.COLLECTION,
    },
    _sum: { amount: true },
  });

  const collected = Number(aggregate._sum.amount ?? 0);
  const due = Number(shipment.deliveryFee);
  const financialStatus = financialStatusFor(due, collected);

  await tx.shipment.update({
    where: { id: shipment.id },
    data: { financialStatus },
  });

  const debtBefore = await tx.debt.findUnique({
    where: { shipmentId },
  });

  let debtAfter = debtBefore;

  if (shipment.customerId && collected < due) {
    debtAfter = await tx.debt.upsert({
      where: { shipmentId: shipment.id },
      update: {
        customerId: shipment.customerId,
        settledAmount: String(collected),
        status: debtStatusFor(due, collected),
      },
      create: {
        customerId: shipment.customerId,
        shipmentId: shipment.id,
        originalAmount: String(due),
        settledAmount: String(collected),
        status: debtStatusFor(due, collected),
      },
    });
  } else {
    await tx.debt.updateMany({
      where: { shipmentId: shipment.id },
      data: {
        settledAmount: String(Math.min(collected, due)),
        status: debtStatusFor(due, Math.min(collected, due)),
      },
    });
    debtAfter = await tx.debt.findUnique({ where: { shipmentId } });
  }

  return { shipment, collected, due, financialStatus, debtBefore, debtAfter };
}

export async function createCollectionPayment(tx: Tx, input: CollectionPaymentInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("INVALID_AMOUNT");
  if (!Object.values(paymentMethods).includes(input.method as never)) throw new Error("INVALID_METHOD");
  if (!input.shipmentId && !input.customerId) throw new Error("PAYMENT_TARGET_REQUIRED");

  const shipment = input.shipmentId
    ? await tx.shipment.findUnique({
        where: { id: input.shipmentId },
        select: { id: true, customerId: true },
      })
    : null;
  if (input.shipmentId && !shipment) throw new Error("SHIPMENT_NOT_FOUND");

  const customerId = input.customerId ?? shipment?.customerId;

  if (shipment) {
    await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Shipment" WHERE id = ${shipment.id} FOR UPDATE`;
    const due = Number((await tx.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      select: { deliveryFee: true },
    })).deliveryFee);
    const aggregate = await tx.payment.aggregate({
      where: {
        shipmentId: shipment.id,
        status: paymentStatuses.VALID,
        type: paymentTypes.COLLECTION,
      },
      _sum: { amount: true },
    });
    validateCollectionAgainstDue(due, Number(aggregate._sum.amount ?? 0), input.amount);
  }
  const payment = await tx.payment.create({
    data: {
      reference: `PAY-${randomUUID()}`,
      shipmentId: input.shipmentId,
      customerId,
      amount: String(input.amount),
      method: input.method,
      type: paymentTypes.COLLECTION,
      status: paymentStatuses.VALID,
      createdByUserId: input.createdByUserId,
    },
  });

  const cash = await tx.cashAccount.findUnique({
    where: { id: "main-cash" },
    select: { id: true },
  });
  if (!cash) throw new Error("MAIN_CASH_NOT_FOUND");

  await tx.cashLedgerEntry.create({
    data: {
      cashAccountId: cash.id,
      type: input.ledgerType ?? "PAYMENT",
      amount: String(input.amount),
      direction: ledgerDirections.IN,
      referenceType: "Payment",
      referenceId: payment.id,
      reason: input.reason?.trim() || undefined,
    },
  });

  const financial = shipment
    ? await syncShipmentFinancialState(tx, shipment.id)
    : null;

  return { payment, financial };
}

export async function reverseShipmentFinancials(tx: Tx, shipmentId: string, reason: string) {
  if (reason.trim().length < 3) throw new Error("REASON_REQUIRED");

  await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Shipment" WHERE id = ${shipmentId} FOR UPDATE`;
  const shipment = await tx.shipment.findUnique({
    where: { id: shipmentId },
    select: { id: true, financialStatus: true },
  });
  if (!shipment) throw new Error("SHIPMENT_NOT_FOUND");

  const payments = await tx.payment.findMany({
    where: { shipmentId, status: paymentStatuses.VALID, type: paymentTypes.COLLECTION },
  });

  if (payments.length === 0) {
    return { shipmentId, reversedPaymentIds: [] as string[], refundedAmount: 0 };
  }

  const cash = await tx.cashAccount.findUnique({ where: { id: "main-cash" }, select: { id: true } });
  if (!cash) throw new Error("MAIN_CASH_NOT_FOUND");

  for (const payment of payments) {
    await tx.payment.update({ where: { id: payment.id }, data: { status: paymentStatuses.REVERSED } });
    await tx.cashLedgerEntry.create({
      data: {
        cashAccountId: cash.id,
        type: "PAYMENT_REVERSAL",
        amount: payment.amount,
        direction: ledgerDirections.OUT,
        referenceType: "Payment",
        referenceId: payment.id,
        reason: reason.trim(),
      },
    });
  }

  const financial = await syncShipmentFinancialState(tx, shipmentId);
  await tx.debt.updateMany({
    where: { shipmentId },
    data: { status: debtStatuses.CANCELLED },
  });
  await tx.shipment.update({ where: { id: shipmentId }, data: { financialStatus: "REFUNDED" } });

  return {
    shipmentId,
    reversedPaymentIds: payments.map((payment) => payment.id),
    refundedAmount: payments.reduce((sum, payment) => sum + Number(payment.amount), 0),
    financial,
  };
}