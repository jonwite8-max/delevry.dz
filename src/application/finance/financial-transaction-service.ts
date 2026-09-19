import { randomUUID } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { recordAudit } from "@/application/audit/audit-service";
import {
  paymentMethods,
  paymentStatuses,
  paymentTypes,
  ledgerDirections,
  financialStatusFor,
  debtStatusFor,
  debtStatuses,
  validateCollectionAgainstDue,
  moneyFromDatabase,
  moneyToNumber,
  moneyToString,
} from "@/domain/finance/financial-engine";

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

  const collectedMinor = moneyFromDatabase(aggregate._sum.amount?.toString() ?? "0", "INVALID_COLLECTED");
  const dueMinor = moneyFromDatabase(shipment.deliveryFee.toString(), "INVALID_TOTAL_DUE");
  const collected = moneyToNumber(collectedMinor);
  const due = moneyToNumber(dueMinor);
  const financialStatus = financialStatusFor(shipment.deliveryFee.toString(), aggregate._sum.amount?.toString() ?? "0");

  await tx.shipment.update({
    where: { id: shipment.id },
    data: { financialStatus },
  });

  const debtBefore = await tx.debt.findUnique({
    where: { shipmentId },
  });

  let debtAfter = debtBefore;

  if (shipment.customerId && collectedMinor < dueMinor) {
    debtAfter = await tx.debt.upsert({
      where: { shipmentId: shipment.id },
      update: {
        customerId: shipment.customerId,
        settledAmount: moneyToString(collectedMinor),
        status: debtStatusFor(shipment.deliveryFee.toString(), aggregate._sum.amount?.toString() ?? "0"),
      },
      create: {
        customerId: shipment.customerId,
        shipmentId: shipment.id,
        originalAmount: moneyToString(dueMinor),
        settledAmount: moneyToString(collectedMinor),
        status: debtStatusFor(shipment.deliveryFee.toString(), aggregate._sum.amount?.toString() ?? "0"),
      },
    });
  } else {
    const settledMinor = collectedMinor < dueMinor ? collectedMinor : dueMinor;
    const settledStatus = debtStatusFor(shipment.deliveryFee.toString(), moneyToString(settledMinor));
    await tx.debt.updateMany({
      where: { shipmentId: shipment.id },
      data: {
        settledAmount: moneyToString(settledMinor),
        status: settledStatus,
      },
    });
    debtAfter = await tx.debt.findUnique({ where: { shipmentId } });
  }

  return { shipment, collected, due, financialStatus, debtBefore, debtAfter };
}

export async function createCollectionPayment(tx: Tx, input: CollectionPaymentInput) {
  const amountMinor = moneyFromDatabase(input.amount, "INVALID_AMOUNT");
  if (amountMinor <= 0n) throw new Error("INVALID_AMOUNT");
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
    const shipmentDue = await tx.shipment.findUniqueOrThrow({
      where: { id: shipment.id },
      select: { deliveryFee: true },
    });
    const aggregate = await tx.payment.aggregate({
      where: {
        shipmentId: shipment.id,
        status: paymentStatuses.VALID,
        type: paymentTypes.COLLECTION,
      },
      _sum: { amount: true },
    });
    validateCollectionAgainstDue(
      shipmentDue.deliveryFee.toString(),
      aggregate._sum.amount?.toString() ?? "0",
      moneyToString(amountMinor),
    );
  }

  const payment = await tx.payment.create({
    data: {
      reference: `PAY-${randomUUID()}`,
      shipmentId: input.shipmentId,
      customerId,
      amount: moneyToString(amountMinor),
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
      amount: moneyToString(amountMinor),
      direction: ledgerDirections.IN,
      referenceType: "Payment",
      referenceId: payment.id,
      reason: input.reason?.trim() || undefined,
    },
  });

  const financial = shipment ? await syncShipmentFinancialState(tx, shipment.id) : null;

  return { payment, financial };
}

export async function reverseShipmentFinancials(tx: Tx, shipmentId: string, reason: string, actorUserId: string) {
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
    await recordAudit({
      actorUserId,
      action: "REVERSE",
      entityType: "Payment",
      entityId: payment.id,
      beforeData: payment,
      afterData: { ...payment, status: paymentStatuses.REVERSED },
      reason: reason.trim(),
    }, tx);
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
    refundedAmount: moneyToNumber(payments.reduce((sum, payment) => sum + moneyFromDatabase(payment.amount.toString()), 0n)),
    financial,
  };
}
