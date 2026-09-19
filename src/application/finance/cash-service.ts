import { prisma } from "@/infrastructure/db/prisma";

export async function getCashSummary() {
  const account = await prisma.cashAccount.findUnique({
    where: { id: "main-cash" },
    select: { id: true, name: true, currency: true },
  });
  if (!account) throw new Error("MAIN_CASH_NOT_FOUND");

  const [incoming, outgoing] = await Promise.all([
    prisma.cashLedgerEntry.aggregate({ where: { cashAccountId: account.id, direction: "IN" }, _sum: { amount: true } }),
    prisma.cashLedgerEntry.aggregate({ where: { cashAccountId: account.id, direction: "OUT" }, _sum: { amount: true } }),
  ]);

  const totalIn = Number(incoming._sum.amount ?? 0);
  const totalOut = Number(outgoing._sum.amount ?? 0);
  return { account, totalIn, totalOut, balance: totalIn - totalOut };
}
