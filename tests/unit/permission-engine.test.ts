import { describe, expect, it } from "vitest";
import { can, permissionActions } from "@/domain/auth/permission-engine";

describe("PermissionEngine", () => {
  it("grants finance mutations to SUPER_ADMIN", () => {
    expect(can("SUPER_ADMIN", permissionActions.financePaymentCreate)).toBe(true);
    expect(can("SUPER_ADMIN", permissionActions.debtSettle)).toBe(true);
  });

  it("grants finance mutations to ADMIN but not STAFF", () => {
    expect(can("ADMIN", permissionActions.financePaymentReverse)).toBe(true);
    expect(can("ADMIN", permissionActions.expenseCreate)).toBe(true);
    expect(can("STAFF", permissionActions.financePaymentCreate)).toBe(false);
  });

  it("keeps shipment cancellation as a distinct permission", () => {
    expect(can("ADMIN", permissionActions.shipmentCancel)).toBe(true);
    expect(can("STAFF", permissionActions.shipmentCancel)).toBe(false);
  });

  it("denies unknown roles", () => {
    expect(can("UNKNOWN", permissionActions.shipmentRead)).toBe(false);
  });
});
