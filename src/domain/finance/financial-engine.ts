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
  CANCELLED: "CANCELLED",
} as const;

export const ledgerDirections = {
  IN: "IN",
  OUT: "OUT",
} as const;

type MoneyInput = number | string;

function moneyMinorUnits(value: MoneyInput, errorCode: string) {
  const raw = typeof value === "number" ? value.toString() : value.trim();
  if (!/^(?:\d+)(?:\.\d{1,2})?$/.test(raw)) throw new Error(errorCode);
  const [whole, fraction = ""] = raw.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

export function financialStatusFor(totalDue: MoneyInput, collected: MoneyInput) {
  const due = moneyMinorUnits(totalDue, "INVALID_TOTAL_DUE");
  const paid = moneyMinorUnits(collected, "INVALID_COLLECTED");
  if (due === 0n) return "PAID" as const;
  if (paid === 0n) return "UNPAID" as const;
  if (paid < due) return "PARTIALLY_PAID" as const;
  return "PAID" as const;
}

export function debtStatusFor(original: MoneyInput, settled: MoneyInput) {
  const due = moneyMinorUnits(original, "INVALID_TOTAL_DUE");
  const paid = moneyMinorUnits(settled, "INVALID_COLLECTED");
  if (paid === 0n) return debtStatuses.OPEN;
  if (paid < due) return debtStatuses.PARTIALLY_SETTLED;
  return debtStatuses.SETTLED;
}

export function remainingDebt(original: MoneyInput, settled: MoneyInput) {
  const due = moneyMinorUnits(original, "INVALID_TOTAL_DUE");
  const paid = moneyMinorUnits(settled, "INVALID_COLLECTED");
  const remaining = due > paid ? due - paid : 0n;
  return Number(remaining) / 100;
}

export function validateCollectionAgainstDue(totalDue: MoneyInput, collected: MoneyInput, amount: MoneyInput) {
  const due = moneyMinorUnits(totalDue, "INVALID_TOTAL_DUE");
  const paid = moneyMinorUnits(collected, "INVALID_COLLECTED");
  const collection = moneyMinorUnits(amount, "INVALID_AMOUNT");
  if (collection <= 0n) throw new Error("INVALID_AMOUNT");
  if (paid + collection > due) throw new Error("AMOUNT_EXCEEDS_DUE");
}

export function moneyFromDatabase(value: MoneyInput, errorCode = "INVALID_MONEY") {
  return moneyMinorUnits(value, errorCode);
}

export function moneyToNumber(value: bigint) {
  return Number(value) / 100;
}

export function moneyToString(value: bigint) {
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, "0");
  return fraction === "00" ? whole.toString() : `${whole}.${fraction}`;
}