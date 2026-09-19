import { prisma } from "@/infrastructure/db/prisma";
import { can, permissionActions } from "@/domain/auth/permission-engine";
import { debtStatusFor, remainingDebt, paymentMethods, paymentStatuses, paymentTypes, ledgerDirections } from "@/domain/finance/financial-engine";
import { recordAudit } from "@/application/audit/audit-service";

export async function settleDebt(role: string, userId: string, debtId: string, amount: number, method: string, reason?: string) {
  if (!can(role, permissionActions.debtSettle)) throw new Error("FORBIDDEN");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
  if (!Object.values(paymentMethods).includes(method as never)) throw new Error("INVALID_METHOD");

  return prisma.$transaction(async (tx) => {
    const debt = await tx.debt.findUnique({
      where: { id: debtId },
      select: { id: true, customerId: true, shipmentId: true, originalAmount: true, settledAmount: true, status: true },
    });
    if (!debt) throw new Error("DEBT_NOT_FOUND");

    const original = Number(debt.originalAmount);
    const settled = Number(debt.settledAmount);
    const remaining = remainingDebt(original, settled);
    if (amount > remaining) throw new Error("AMOUNT_EXCEEDS_DEBT");

    const paymentReference = `PAY-DEBT-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
    const payment = await tx.payment.create({
      data: {
        reference: paymentReference,
        shipmentId: debt.shipmentId ?? undefined,
        customerId: debt.customerId,
        amount: String(amount),
        method,
        type: paymentTypes.COLLECTION,
        status: paymentStatuses.VALID,
        createdByUserId: userId,
      },
    });

    const nextSettled = settled + amount;
    const updated = await tx.debt.update({
      where: { id: debt.id },
      data: { settledAmount: String(nextSettled), status: debtStatusFor(original, nextSettled) },
    });

    const cash = await tx.cashAccount.findUnique({ where: { id: "main-cash" }, select: { id: true } });
    if (!cash) throw new Error("MAIN_CASH_NOT_FOUND");

    await tx.cashLedgerEntry.create({
      data: {
        cashAccountId: cash.id,
        type: "DEBT_SETTLEMENT",
        amount: String(amount),
        direction: ledgerDirections.IN,
        referenceType: "Payment",
        referenceId: payment.id,
        reason: reason?.trim() || undefined,
      },
    });

    await recordAudit({
      actorUserId: userId,
      action: "UPDATE",
      entityType: "Debt",
      entityId: debt.id,
      beforeData: debt,
      afterData: updated,
      reason,
    }, tx);

    return { debt: updated, payment };
  });
}
