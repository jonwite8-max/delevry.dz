import { prisma } from "@/infrastructure/db/prisma";
import { can, permissionActions } from "@/domain/auth/permission-engine";
import { recordAudit } from "@/application/audit/audit-service";
import { customerInputSchema, type CustomerInput } from "@/domain/customer/customer-input";

function clean(value?: string) {
  const v = value?.trim();
  return v || undefined;
}

export async function createCustomer(role: string, userId: string, input: CustomerInput) {
  if (!can(role, permissionActions.customerCreate)) throw new Error("FORBIDDEN");

  const parsed = customerInputSchema.safeParse(input);
  if (!parsed.success) throw new Error("INVALID_CUSTOMER");
  const data = parsed.data;
  const name = data.name;
  const phone = data.phone;

  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.create({
      data: {
        name,
        businessName: clean(data.businessName),
        phone,
        additionalPhone: clean(data.additionalPhone),
        wilaya: clean(data.wilaya),
        commune: clean(data.commune),
        niche: clean(data.niche),
        address: clean(data.address),
        notes: clean(data.notes),
        type: "REGISTERED",
        lifecycle: "NEW",
      },
    });

    await recordAudit({
      actorUserId: userId,
      action: "CREATE",
      entityType: "Customer",
      entityId: customer.id,
      afterData: customer,
    }, tx);

    return customer;
  });
}

export async function searchCustomers(role: string, query: string, page = 1, pageSize = 25) {
  if (!can(role, permissionActions.customerRead)) throw new Error("FORBIDDEN");

  const take = Math.min(100, Math.max(10, pageSize));
  const skip = (Math.max(1, page) - 1) * take;
  const q = query.trim();

  const where = q ? {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { businessName: { contains: q, mode: "insensitive" as const } },
      { phone: { contains: q, mode: "insensitive" as const } },
    ],
  } : {};

  const [items, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip,
      take,
      select: {
        id: true, name: true, businessName: true, phone: true,
        additionalPhone: true, wilaya: true, commune: true,
        type: true, lifecycle: true, createdAt: true, updatedAt: true,
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    items,
    pagination: { page: Math.max(1, page), pageSize: take, total, pages: Math.ceil(total / take) },
  };
}
