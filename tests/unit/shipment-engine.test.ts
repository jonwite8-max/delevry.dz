import { describe, expect, it } from "vitest";
import { canTransition } from "@/domain/shipment/shipment-engine";
import { createShipmentSchema } from "@/domain/shipment/shipment-input";

describe("ShipmentTransitionEngine", () => {
  it("allows processing to transit", () => expect(canTransition("PROCESSING", "IN_TRANSIT")).toBe(true));
  it("blocks delivered to processing", () => expect(canTransition("DELIVERED", "PROCESSING")).toBe(false));
});

describe("createShipmentSchema", () => {
  it("accepts a valid shipment and applies defaults", () => {
    const result = createShipmentSchema.parse({
      senderName: "مؤسسة النور",
      recipientName: "متجر النجاح",
      originWilaya: "سطيف",
      destinationWilaya: "الوادي",
    });
    expect(result.quantity).toBe(1);
    expect(result.deliveryFee).toBe(0);
    expect(result.description).toBe("");
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
