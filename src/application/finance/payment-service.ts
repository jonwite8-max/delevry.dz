import { prisma } from "@/infrastructure/db/prisma";
import { can, permissionActions } from "@/domain/auth/permission-engine";
import { paymentMethods, paymentStatuses, paymentTypes, ledgerDirections } from "@/domain/finance/financial-engine";
import { recordAudit } from "@/application/audit/audit-service";
import { createCollectionPayment, syncShipmentFinancialState } from "@/application/finance/financial-transaction-service";

type PaymentInput = {
  shipmentId?: string;
  customerId?: string;
  amount: number;
  method: string;
  type?: string;
  reason?: string;
};

export async function recordPayment(role: string, userId: string, input: PaymentInput) {
  if (!can(role, permissionActions.financePaymentCreate)) throw new Error("FORBIDDEN");
  const type = input.type ?? paymentTypes.COLLECTION;
  if (type !== paymentTypes.COLLECTION) throw new Error("INVALID_PAYMENT_TYPE");

  return prisma.$transaction(async (tx) => {
    const result = await createCollectionPayment(tx, {
      shipmentId: input.shipmentId,
      customerId: input.customerId,
      amount: input.amount,
      method: input.method,
      createdByUserId: userId,
      reason: input.reason,
      ledgerType: "PAYMENT",
    });

    await recordAudit({
      actorUserId: userId,
      action: "CREATE",
      entityType: "Payment",
      entityId: result.payment.id,
      afterData: result.payment,
      reason: input.reason,
    }, tx);

    if (result.financial?.debtBefore?.id !== result.financial?.debtAfter?.id ||
        result.financial?.debtBefore?.settledAmount.toString() !== result.financial?.debtAfter?.settledAmount.toString() ||
        result.financial?.debtBefore?.status !== result.financial?.debtAfter?.status) {
      await recordAudit({
        actorUserId: userId,
        action: "UPDATE",
        entityType: "Debt",
        entityId: result.financial.debtAfter?.id ?? result.financial.debtBefore?.id ?? "",
        beforeData: result.financial.debtBefore,
        afterData: result.financial.debtAfter,
        reason: input.reason,
      }, tx);
    }

    return result.payment;
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

    let financial = null;
    if (payment.shipmentId) {
      financial = await syncShipmentFinancialState(tx, payment.shipmentId);
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

    if (financial?.debtBefore?.id !== financial?.debtAfter?.id ||
        financial?.debtBefore?.settledAmount.toString() !== financial?.debtAfter?.settledAmount.toString() ||
        financial?.debtBefore?.status !== financial?.debtAfter?.status) {
      await recordAudit({
        actorUserId: userId,
        action: "UPDATE",
        entityType: "Debt",
        entityId: financial.debtAfter?.id ?? financial.debtBefore?.id ?? "",
        beforeData: financial.debtBefore,
        afterData: financial.debtAfter,
        reason: reason.trim(),
      }, tx);
    }

    return updated;
  });
}
