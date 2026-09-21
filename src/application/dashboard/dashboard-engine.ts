import { prisma } from "@/infrastructure/db/prisma";

export async function getDashboardSnapshot() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [today, processing, transit, ready, delivered, returned, customers, recent] =
    await prisma.$transaction([
      prisma.shipment.count({ where: { createdAt: { gte: start, lt: end } } }),
      prisma.shipment.count({ where: { status: { in: ["PROCESSING", "RECEIVED"] } } }),
      prisma.shipment.count({ where: { status: "IN_TRANSIT" } }),
      prisma.shipment.count({ where: { status: "READY_FOR_PICKUP" } }),
      prisma.shipment.count({ where: { status: "DELIVERED", updatedAt: { gte: start, lt: end } } }),
      prisma.shipment.count({ where: { status: "RETURNED", updatedAt: { gte: start, lt: end } } }),
      prisma.customer.count({ where: { lifecycle: { in: ["ACTIVE", "REPEAT"] } } }),
      prisma.shipment.findMany({
        orderBy: { updatedAt: "desc" }, take: 8,
        select: { reference:true, senderName:true, recipientName:true, originWilaya:true, destinationWilaya:true, status:true, updatedAt:true }
      })
    ]);

  return { today, processing, transit, ready, delivered, returned, customers, recent };
}
