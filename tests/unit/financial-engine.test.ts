import { describe, expect, it } from "vitest";
import {
  debtStatusFor,
  financialStatusFor,
  remainingDebt,\n  validateCollectionAgainstDue,
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

  it("rejects collection that exceeds the shipment amount due", () => {
    expect(() => validateCollectionAgainstDue(1000, 0, 1001)).toThrow("AMOUNT_EXCEEDS_DUE");
    expect(() => validateCollectionAgainstDue(1000, 700, 301)).toThrow("AMOUNT_EXCEEDS_DUE");
    expect(() => validateCollectionAgainstDue(1000, 700, 300)).not.toThrow();
  });
  });
});
