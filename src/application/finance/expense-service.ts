import { randomInt } from "node:crypto";
import { prisma } from "@/infrastructure/db/prisma";
import { can, permissionActions } from "@/domain/auth/permission-engine";
import { ledgerDirections } from "@/domain/finance/financial-engine";
import { recordAudit } from "@/application/audit/audit-service";

type ExpenseInput = {
  category: string;
  amount: number;
  paymentMethod: string;
  beneficiary?: string;
  description?: string;
  reason?: string;
};

export async function createExpense(role: string, userId: string, input: ExpenseInput) {
  if (!can(role, permissionActions.expenseCreate)) throw new Error("FORBIDDEN");
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("INVALID_AMOUNT");
  if (!input.category.trim() || !input.paymentMethod.trim()) throw new Error("INVALID_EXPENSE");

  return prisma.$transaction(async (tx) => {
    const cash = await tx.cashAccount.findUnique({ where: { id: "main-cash" }, select: { id: true } });
    if (!cash) throw new Error("MAIN_CASH_NOT_FOUND");

    const reference = `EXP-${Date.now()}-${randomInt(1000, 10000)}`;
    const expense = await tx.expense.create({
      data: {
        reference,
        category: input.category.trim(),
        amount: String(input.amount),
        paymentMethod: input.paymentMethod.trim(),
        beneficiary: input.beneficiary?.trim() || undefined,
        description: input.description?.trim() || undefined,
        createdByUserId: userId,
      },
    });

    await tx.cashLedgerEntry.create({
      data: {
        cashAccountId: cash.id,
        type: "EXPENSE",
        amount: String(input.amount),
        direction: ledgerDirections.OUT,
        referenceType: "Expense",
        referenceId: expense.id,
        reason: input.reason?.trim() || undefined,
      },
    });

    await recordAudit({
      actorUserId: userId,
      action: "CREATE",
      entityType: "Expense",
      entityId: expense.id,
      afterData: expense,
      reason: input.reason,
    }, tx);

    return expense;
  });
}
