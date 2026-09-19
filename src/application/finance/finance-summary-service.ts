import { prisma } from "@/infrastructure/db/prisma";
import { can, permissionActions } from "@/domain/auth/permission-engine";
import { getCashSummary } from "@/application/finance/cash-service";

export async function getFinanceSummary(role: string) {
  if (!can(role, permissionActions.financeRead)) throw new Error("FORBIDDEN");

  const cash = await getCashSummary();
  const [openDebt, todayIncoming] = await Promise.all([
    prisma.debt.aggregate({
      where: { status: { in: ["OPEN", "PARTIALLY_SETTLED"] } },
      _sum: { originalAmount: true, settledAmount: true },
    }),
    prisma.cashLedgerEntry.aggregate({
      where: { direction: "IN", createdAt: { gte: startOfToday() } },
      _sum: { amount: true },
    }),
  ]);

  const debtOriginal = Number(openDebt._sum.originalAmount ?? 0);
  const debtSettled = Number(openDebt._sum.settledAmount ?? 0);
  return {
    cash,
    outstandingDebt: Math.max(0, debtOriginal - debtSettled),
    todayIncoming: Number(todayIncoming._sum.amount ?? 0),
  };
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
