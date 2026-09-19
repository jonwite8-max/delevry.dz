import { randomInt } from "node:crypto";
import { prisma } from "@/infrastructure/db/prisma";
import { can, permissionActions } from "@/domain/auth/permission-engine";
import {
  debtStatusFor,
  financialStatusFor,
  ledgerDirections,
  paymentMethods,
  paymentStatuses,
  paymentTypes,
  remainingDebt,
} from "@/domain/finance/financial-engine";
import { recordAudit } from "@/application/audit/audit-service";

type PaymentInput = {
  shipmentId?: string;
  customerId?: string;
  amount: number;
  method: string;
  type?: string;
  reason?: string;
};

async function uniquePaymentReference(tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  for (let i = 0; i < 10; i += 1) {
    const reference = `PAY-${Date.now()}-${randomInt(1000, 10000)}`;
    const exists = await tx.payment.findUnique({ where: { reference }, select: { id: true } });
    if (!exists) return reference;
  }
  throw new Error("PAYMENT_REFERENCE_FAILED");
}

export async function recordPayment(role: string, userId: string, input: PaymentInput) {
  if (!can(role, permissionActions.financePaymentCreate)) throw new Error("FORBIDDEN");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("INVALID_AMOUNT");
  if (!Object.values(paymentMethods).includes(input.method as never)) throw new Error("INVALID_METHOD");
  const type = input.type ?? paymentTypes.COLLECTION;
  if (type !== paymentTypes.COLLECTION) throw new Error("INVALID_PAYMENT_TYPE");

  return prisma.$transaction(async (tx) => {
    if (!input.shipmentId && !input.customerId) throw new Error("PAYMENT_TARGET_REQUIRED");

    const shipment = input.shipmentId
      ? await tx.shipment.findUnique({
          where: { id: input.shipmentId },
          select: { id: true, customerId: true, deliveryFee: true, financialStatus: true },
        })
      : null;
    if (input.shipmentId && !shipment) throw new Error("SHIPMENT_NOT_FOUND");

    const customerId = input.customerId ?? shipment?.customerId;
    const reference = await uniquePaymentReference(tx);

    const payment = await tx.payment.create({
      data: {
        reference,
        shipmentId: input.shipmentId,
        customerId,
        amount: String(input.amount),
        method: input.method,
        type,
        status: paymentStatuses.VALID,
        createdByUserId: userId,
      },
    });

    if (shipment) {
      const aggregate = await tx.payment.aggregate({
        where: { shipmentId: shipment.id, status: paymentStatuses.VALID, type: paymentTypes.COLLECTION },
        _sum: { amount: true },
      });
      const collected = Number(aggregate._sum.amount ?? 0);
      const due = Number(shipment.deliveryFee);
      await tx.shipment.update({
        where: { id: shipment.id },
        data: { financialStatus: financialStatusFor(due, collected) },
      });
    }

    const cash = await tx.cashAccount.findUnique({ where: { id: "main-cash" }, select: { id: true } });
    if (!cash) throw new Error("MAIN_CASH_NOT_FOUND");

    await tx.cashLedgerEntry.create({
      data: {
        cashAccountId: cash.id,
        type: "PAYMENT",
        amount: String(input.amount),
        direction: ledgerDirections.IN,
        referenceType: "Payment",
        referenceId: payment.id,
        reason: input.reason?.trim() || undefined,
      },
    });

    await recordAudit({
      actorUserId: userId,
      action: "CREATE",
      entityType: "Payment",
      entityId: payment.id,
      afterData: payment,
      reason: input.reason,
    }, tx);

    return payment;
  });
}

export async function reversePayment(role: string, userId: string, paymentId: string, reason: string) {
  if (!can(role, permissionActions.financePaymentReverse)) throw new Error("FORBIDDEN");
  if (reason.trim().length < 3) throw new Error("REASON_REQUIRED");

  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error("PAYMENT_NOT_FOUND");
    if (payment.status !== paymentStatuses.VALID) throw new Error("PAYMENT_ALREADY_REVERSED");

    const updated = await tx.payment.update({
      where: { id: payment.id },
      data: { status: paymentStatuses.REVERSED },
    });

    const cash = await tx.cashAccount.findUnique({ where: { id: "main-cash" }, select: { id: true } });
    if (!cash) throw new Error("MAIN_CASH_NOT_FOUND");

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

    if (payment.shipmentId) {
      const shipment = await tx.shipment.findUnique({
        where: { id: payment.shipmentId },
        select: { id: true, deliveryFee: true },
      });
      if (shipment) {
        const aggregate = await tx.payment.aggregate({
          where: { shipmentId: shipment.id, status: paymentStatuses.VALID, type: paymentTypes.COLLECTION },
          _sum: { amount: true },
        });
        await tx.shipment.update({
          where: { id: shipment.id },
          data: { financialStatus: financialStatusFor(Number(shipment.deliveryFee), Number(aggregate._sum.amount ?? 0)) },
        });
      }
    }

    await recordAudit({
      actorUserId: userId,
      action: "REVERSE",
      entityType: "Payment",
      entityId: payment.id,
      beforeData: payment,
      afterData: updated,
      reason: reason.trim(),
    }, tx);

    return updated;
  });
}
