import { describe, expect, it } from "vitest";
import { allowedTransitions, canTransition } from "@/domain/shipment/shipment-engine";
import { createShipmentSchema } from "@/domain/shipment/shipment-input";

describe("ShipmentTransitionEngine", () => {
  it("allows processing to transit", () => {
    expect(canTransition("PROCESSING", "IN_TRANSIT")).toBe(true);
  });

  it("blocks delivered to processing", () => {
    expect(canTransition("DELIVERED", "PROCESSING")).toBe(false);
  });

  it("exposes only centrally defined next states", () => {
    expect(allowedTransitions("NEW")).toEqual(["PROCESSING", "CANCELLED", "ISSUE"]);
  });

  it("createShipmentSchema accepts valid shipment and defaults", () => {
    const result = createShipmentSchema.safeParse({
      senderName: "مؤسسة النور",
      recipientName: "متجر النجاح",
      originWilaya: "سطيف",
      destinationWilaya: "الوادي",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.quantity).toBe(1);
      expect(result.data.deliveryFee).toBe(0);
      expect(result.data.description).toBe("");
    }
  });

  it("rejects invalid quantity and negative fee", () => {
    const result = createShipmentSchema.safeParse({
      senderName: "مؤسسة النور",
      recipientName: "متجر النجاح",
      originWilaya: "سطيف",
      destinationWilaya: "الوادي",
      quantity: 0,
      deliveryFee: -1,
    });
    expect(result.success).toBe(false);
  });
});
