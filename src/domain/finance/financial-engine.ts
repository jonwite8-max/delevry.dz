export const paymentTypes = {
  COLLECTION: "COLLECTION",
  REFUND: "REFUND",
} as const;

export const paymentStatuses = {
  VALID: "VALID",
  REVERSED: "REVERSED",
} as const;

export const paymentMethods = {
  CASH: "CASH",
  CCP: "CCP",
  BANK: "BANK",
  OTHER: "OTHER",
} as const;

export const debtStatuses = {
  OPEN: "OPEN",
  PARTIALLY_SETTLED: "PARTIALLY_SETTLED",
  SETTLED: "SETTLED",
} as const;

export const ledgerDirections = {
  IN: "IN",
  OUT: "OUT",
} as const;

export function financialStatusFor(totalDue: number, collected: number) {
  if (totalDue <= 0) return "PAID" as const;
  if (collected <= 0) return "UNPAID" as const;
  if (collected < totalDue) return "PARTIALLY_PAID" as const;
  return "PAID" as const;
}

export function debtStatusFor(original: number, settled: number) {
  if (settled <= 0) return debtStatuses.OPEN;
  if (settled < original) return debtStatuses.PARTIALLY_SETTLED;
  return debtStatuses.SETTLED;
}

export function remainingDebt(original: number, settled: number) {
  return Math.max(0, original - settled);
}

export function validateCollectionAgainstDue(totalDue: number, collected: number, amount: number) {
  if (!Number.isFinite(totalDue) || totalDue < 0) throw new Error("INVALID_TOTAL_DUE");
  if (!Number.isFinite(collected) || collected < 0) throw new Error("INVALID_COLLECTED");
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
  if (collected + amount > totalDue) throw new Error("AMOUNT_EXCEEDS_DUE");
}