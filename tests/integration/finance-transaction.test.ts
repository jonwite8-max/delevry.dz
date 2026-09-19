import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/db/prisma";
import { createCollectionPayment } from "@/application/finance/financial-transaction-service";
import { reversePayment } from "@/application/finance/payment-service";

async function fixture() {
  const user = await prisma.user.create({
    data: {
      name: "Finance Integration",
      email: `finance-test-${Date.now()}-${Math.random().toString(36).slice(2)}@test.local`,
      passwordHash: "test",
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });
  const customer = await prisma.customer.create({
    data: { name: "Integration Customer", phone: "0555000000", type: "REGISTERED" },
  });
  const shipment = await prisma.shipment.create({
    data: {
      reference: `INT-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      serialNumber: `INT-S-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      customerId: customer.id,
      senderName: "Test Sender",
      recipientName: "Test Recipient",
      originWilaya: "Setif",
      destinationWilaya: "Alger",
      description: "Finance integration",
      deliveryFee: "1000",
      createdByUserId: user.id,
    },
  });
  return { user, customer, shipment };
}

describe("Finance transaction integration", () => {
  beforeAll(async () => {
    await prisma.cashAccount.upsert({
      where: { id: "main-cash" },
      update: {},
      create: { id: "main-cash", name: "Integration Cash", currency: "DZD" },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("supports unpaid -> partial -> paid and settles debt", async () => {
    const { user, customer, shipment } = await fixture();

    const first = await prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      customerId: customer.id,
      amount: 400,
      method: "CASH",
      createdByUserId: user.id,
    }));
    expect(first.financial?.financialStatus).toBe("PARTIALLY_PAID");
    expect(first.financial?.debtAfter?.status).toBe("PARTIALLY_SETTLED");

    const second = await prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      customerId: customer.id,
      amount: 600,
      method: "CASH",
      createdByUserId: user.id,
    }));
    expect(second.financial?.financialStatus).toBe("PAID");
    expect(second.financial?.debtAfter?.status).toBe("SETTLED");

    const payments = await prisma.payment.findMany({ where: { shipmentId: shipment.id, status: "VALID" } });
    const ledger = await prisma.cashLedgerEntry.findMany({ where: { referenceType: "Payment", referenceId: { in: payments.map((p) => p.id) } } });
    expect(payments.reduce((sum, p) => sum + Number(p.amount), 0)).toBe(1000);
    expect(ledger.reduce((sum, e) => sum + Number(e.amount), 0)).toBe(1000);
  });

  it("rejects overpayment before creating payment or ledger entry", async () => {
    const { user, customer, shipment } = await fixture();

    await expect(prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      customerId: customer.id,
      amount: 1001,
      method: "CASH",
      createdByUserId: user.id,
    }))).rejects.toThrow("AMOUNT_EXCEEDS_DUE");

    expect(await prisma.payment.count({ where: { shipmentId: shipment.id } })).toBe(0);
    expect(await prisma.cashLedgerEntry.count({ where: { referenceType: "Payment" } })).toBeGreaterThanOrEqual(0);
  });

  it("reverses a full payment and returns shipment to unpaid", async () => {
    const { user, shipment } = await fixture();
    const created = await prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      amount: 1000,
      method: "CASH",
      createdByUserId: user.id,
    }));
    expect(created.financial?.financialStatus).toBe("PAID");

    await reversePayment("SUPER_ADMIN", user.id, created.payment.id, "integration reversal");

    const current = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(current.financialStatus).toBe("UNPAID");

    const entries = await prisma.cashLedgerEntry.findMany({
      where: { referenceType: "Payment", referenceId: created.payment.id },
    });
    expect(entries.some((e) => e.direction === "IN")).toBe(true);
    expect(entries.some((e) => e.direction === "OUT")).toBe(true);
  });
});
