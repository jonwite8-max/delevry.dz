import { describe, expect, it } from "vitest";
import {
  debtStatusFor,
  financialStatusFor,
  remainingDebt,
  validateCollectionAgainstDue,
  moneyFromDatabase,
  moneyToString,
} from "@/domain/finance/financial-engine";

describe("FinancialEngine", () => {
  it("derives shipment financial state from due and collected", () => {
    expect(financialStatusFor(1000, 0)).toBe("UNPAID");
    expect(financialStatusFor(1000, 300)).toBe("PARTIALLY_PAID");
    expect(financialStatusFor(1000, 1000)).toBe("PAID");
    expect(financialStatusFor(1000, 1200)).toBe("PAID");
  });

  it("derives debt state without allowing negative remaining debt", () => {
    expect(debtStatusFor(1000, 0)).toBe("OPEN");
    expect(debtStatusFor(1000, 400)).toBe("PARTIALLY_SETTLED");
    expect(debtStatusFor(1000, 1000)).toBe("SETTLED");
    expect(remainingDebt(1000, 1200)).toBe(0);
  });

  it("compares money exactly at two decimal places", () => {
    expect(financialStatusFor("1000.00", "999.99")).toBe("PARTIALLY_PAID");
    expect(financialStatusFor("1000.00", "1000.00")).toBe("PAID");
    expect(() => validateCollectionAgainstDue("1000.00", "999.99", "0.01")).not.toThrow();
    expect(() => validateCollectionAgainstDue("1000.00", "999.99", "0.02")).toThrow("AMOUNT_EXCEEDS_DUE");
  });

  it("normalizes persisted money without floating-point arithmetic", () => {
    expect(moneyToString(moneyFromDatabase("0.10"))).toBe("0.10");
    expect(moneyToString(moneyFromDatabase("999.99"))).toBe("999.99");
    expect(() => moneyFromDatabase("1.001")).toThrow("INVALID_MONEY");
    expect(() => moneyFromDatabase("NaN")).toThrow("INVALID_MONEY");
  });

  it("derives debt state without precision drift", () => {
    expect(debtStatusFor("10.00", "9.99")).toBe("PARTIALLY_SETTLED");
    expect(remainingDebt("10.00", "9.99")).toBe(0.01);
  });

  it("rejects collection that exceeds the shipment amount due", () => {
    expect(() => validateCollectionAgainstDue(1000, 0, 1001)).toThrow("AMOUNT_EXCEEDS_DUE");
    expect(() => validateCollectionAgainstDue(1000, 700, 301)).toThrow("AMOUNT_EXCEEDS_DUE");
    expect(() => validateCollectionAgainstDue(1000, 700, 300)).not.toThrow();
  });
});
