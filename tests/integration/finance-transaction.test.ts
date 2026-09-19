import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { prisma } from "@/infrastructure/db/prisma";
import { createCollectionPayment } from "@/application/finance/financial-transaction-service";
import { reversePayment } from "@/application/finance/payment-service";
import { settleDebt } from "@/application/finance/debt-service";

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
    const ledger = await prisma.cashLedgerEntry.findMany({
      where: { referenceType: "Payment", referenceId: { in: payments.map((p) => p.id) } },
    });
    expect(payments.reduce((sum, p) => sum + Number(p.amount), 0)).toBe(1000);
    expect(ledger.reduce((sum, e) => sum + Number(e.amount), 0)).toBe(1000);
  });

  it("settles the remaining debt through the central debt service", async () => {
    const { user, customer, shipment } = await fixture();

    await prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      customerId: customer.id,
      amount: 400,
      method: "CASH",
      createdByUserId: user.id,
    }));

    const debt = await prisma.debt.findUniqueOrThrow({ where: { shipmentId: shipment.id } });
    expect(debt.status).toBe("PARTIALLY_SETTLED");

    const settled = await settleDebt("SUPER_ADMIN", user.id, debt.id, 600, "CASH", "integration settlement");
    expect(settled.debt.status).toBe("SETTLED");

    const current = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(current.financialStatus).toBe("PAID");

    const payments = await prisma.payment.findMany({ where: { shipmentId: shipment.id, status: "VALID" } });
    expect(payments.reduce((sum, p) => sum + Number(p.amount), 0)).toBe(1000);
  });

  it("rejects overpayment without creating payment or ledger entry", async () => {
    const { user, customer, shipment } = await fixture();
    const paymentCountBefore = await prisma.payment.count({ where: { shipmentId: shipment.id } });
    const ledgerCountBefore = await prisma.cashLedgerEntry.count({ where: { type: "PAYMENT", referenceType: "Payment" } });

    await expect(prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      customerId: customer.id,
      amount: 1001,
      method: "CASH",
      createdByUserId: user.id,
    }))).rejects.toThrow("AMOUNT_EXCEEDS_DUE");

    expect(await prisma.payment.count({ where: { shipmentId: shipment.id } })).toBe(paymentCountBefore);
    expect(await prisma.cashLedgerEntry.count({ where: { type: "PAYMENT", referenceType: "Payment" } })).toBe(ledgerCountBefore);
  });

  it("allows only the non-overpaying transaction under concurrent collection attempts", async () => {
    const { user, customer, shipment } = await fixture();

    const results = await Promise.allSettled([
      prisma.$transaction((tx) => createCollectionPayment(tx, {
        shipmentId: shipment.id,
        customerId: customer.id,
        amount: 600,
        method: "CASH",
        createdByUserId: user.id,
      })),
      prisma.$transaction((tx) => createCollectionPayment(tx, {
        shipmentId: shipment.id,
        customerId: customer.id,
        amount: 600,
        method: "CASH",
        createdByUserId: user.id,
      })),
    ]);

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

    const payments = await prisma.payment.findMany({ where: { shipmentId: shipment.id, status: "VALID" } });
    expect(payments.reduce((sum, p) => sum + Number(p.amount), 0)).toBe(600);

    const current = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(current.financialStatus).toBe("PARTIALLY_PAID");
  });

  it("cancels a partially paid shipment and reverses cash without leaving outstanding debt", async () => {
    const { user, customer, shipment } = await fixture();

    const created = await prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      customerId: customer.id,
      amount: 300,
      method: "CASH",
      createdByUserId: user.id,
    }));
    expect(created.financial?.financialStatus).toBe("PARTIALLY_PAID");

    const { transitionShipment } = await import("@/application/shipments/shipment-service");
    const cancelled = await transitionShipment("ADMIN", user.id, shipment.reference, "CANCELLED", "customer cancellation");
    expect(cancelled.status).toBe("CANCELLED");

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: created.payment.id } });
    expect(payment.status).toBe("REVERSED");

    const debt = await prisma.debt.findUniqueOrThrow({ where: { shipmentId: shipment.id } });
    expect(debt.status).toBe("CANCELLED");

    const current = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    expect(current.financialStatus).toBe("REFUNDED");

    const reversal = await prisma.cashLedgerEntry.findFirst({
      where: { referenceType: "Payment", referenceId: payment.id, type: "PAYMENT_REVERSAL", direction: "OUT" },
    });
    expect(reversal).not.toBeNull();
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

  it("cancels a fully paid shipment, reverses payment, and records actor audit", async () => {
    const { user, shipment } = await fixture();

    const created = await prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      amount: 1000,
      method: "CASH",
      createdByUserId: user.id,
    }));

    const { transitionShipment } = await import("@/application/shipments/shipment-service");
    await transitionShipment("SUPER_ADMIN", user.id, shipment.reference, "CANCELLED", "full cancellation");

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: created.payment.id } });
    const current = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    const debt = await prisma.debt.findUnique({ where: { shipmentId: shipment.id } });
    const reversal = await prisma.cashLedgerEntry.findFirst({
      where: { referenceType: "Payment", referenceId: payment.id, type: "PAYMENT_REVERSAL", direction: "OUT" },
    });
    const audits = await prisma.auditLog.findMany({
      where: { entityType: "Payment", entityId: payment.id, action: "REVERSE" },
    });

    expect(payment.status).toBe("REVERSED");
    expect(current.status).toBe("CANCELLED");
    expect(current.financialStatus).toBe("REFUNDED");
    expect(debt).toBeNull();
    expect(reversal?.amount.toString()).toBe("1000");
    expect(audits.some((audit) => audit.actorUserId === user.id && audit.reason === "full cancellation")).toBe(true);
  });

  it("rejects settlement of a cancelled debt", async () => {
    const { user, customer, shipment } = await fixture();

    const created = await prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      customerId: customer.id,
      amount: 300,
      method: "CASH",
      createdByUserId: user.id,
    }));

    const debt = await prisma.debt.findUniqueOrThrow({ where: { shipmentId: shipment.id } });
    const { transitionShipment } = await import("@/application/shipments/shipment-service");
    await transitionShipment("ADMIN", user.id, shipment.reference, "CANCELLED", "cancel before settlement");

    const cancelledDebt = await prisma.debt.findUniqueOrThrow({ where: { id: debt.id } });
    expect(cancelledDebt.status).toBe("CANCELLED");

    await expect(
      settleDebt("SUPER_ADMIN", user.id, cancelledDebt.id, 700, "CASH", "must reject cancelled debt"),
    ).rejects.toThrow("DEBT_CANCELLED");

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: created.payment.id } });
    expect(payment.status).toBe("REVERSED");
  });

  it("reverses a partial payment and restores the debt", async () => {
    const { user, customer, shipment } = await fixture();
    const created = await prisma.$transaction((tx) => createCollectionPayment(tx, {
      shipmentId: shipment.id,
      customerId: customer.id,
      amount: 300,
      method: "CASH",
      createdByUserId: user.id,
    }));
    expect(created.financial?.financialStatus).toBe("PARTIALLY_PAID");
    expect(created.financial?.debtAfter?.settledAmount.toString()).toBe("300");

    await reversePayment("SUPER_ADMIN", user.id, created.payment.id, "partial integration reversal");

    const current = await prisma.shipment.findUniqueOrThrow({ where: { id: shipment.id } });
    const debt = await prisma.debt.findUniqueOrThrow({ where: { shipmentId: shipment.id } });
    expect(current.financialStatus).toBe("UNPAID");
    expect(debt.status).toBe("OPEN");
    expect(debt.settledAmount.toString()).toBe("0");
  });
});
