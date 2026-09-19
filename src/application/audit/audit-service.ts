import { prisma } from "@/infrastructure/db/prisma";
import type { AuditAction } from "@/generated/prisma/client";

type AuditInput = {
  actorUserId?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  beforeData?: unknown;
  afterData?: unknown;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
};

export async function recordAudit(input: AuditInput, tx = prisma) {
  return tx.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      beforeData: input.beforeData === undefined ? undefined : JSON.parse(JSON.stringify(input.beforeData)),
      afterData: input.afterData === undefined ? undefined : JSON.parse(JSON.stringify(input.afterData)),
      reason: input.reason?.trim() || undefined,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    },
  });
}
