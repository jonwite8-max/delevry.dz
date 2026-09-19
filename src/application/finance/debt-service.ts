import { prisma } from "@/infrastructure/db/prisma";
import { can, permissionActions } from "@/domain/auth/permission-engine";
import { paymentMethods, remainingDebt } from "@/domain/finance/financial-engine";
import { recordAudit } from "@/application/audit/audit-service";
import { createCollectionPayment } from "@/application/finance/financial-transaction-service";

export async function settleDebt(role: string, userId: string, debtId: string, amount: number, method: string, reason?: string) {
  if (!can(role, permissionActions.debtSettle)) throw new Error("FORBIDDEN");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
  if (!Object.values(paymentMethods).includes(method as never)) throw new Error("INVALID_METHOD");

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw<{ id: string }[]>`SELECT id FROM "Debt" WHERE id = ${debtId} FOR UPDATE`;
    const debt = await tx.debt.findUnique({
      where: { id: debtId },
      select: { id: true, customerId: true, shipmentId: true, originalAmount: true, settledAmount: true, status: true },
    });
    if (!debt) throw new Error("DEBT_NOT_FOUND");
    if (debt.status === "CANCELLED") throw new Error("DEBT_CANCELLED");

    const remaining = remainingDebt(Number(debt.originalAmount), Number(debt.settledAmount));
    if (amount > remaining) throw new Error("AMOUNT_EXCEEDS_DEBT");

    const result = await createCollectionPayment(tx, {
      shipmentId: debt.shipmentId ?? undefined,
      customerId: debt.customerId,
      amount,
      method,
      createdByUserId: userId,
      reason,
      ledgerType: "DEBT_SETTLEMENT",
    });

    const updated = await tx.debt.findUnique({ where: { id: debt.id } });
    if (!updated) throw new Error("DEBT_NOT_FOUND");

    await recordAudit({
      actorUserId: userId,
      action: "CREATE",
      entityType: "Payment",
      entityId: result.payment.id,
      afterData: result.payment,
      reason,
    }, tx);

    await recordAudit({
      actorUserId: userId,
      action: "UPDATE",
      entityType: "Debt",
      entityId: debt.id,
      beforeData: debt,
      afterData: updated,
      reason,
    }, tx);

    return { debt: updated, payment: result.payment };
  });
}
