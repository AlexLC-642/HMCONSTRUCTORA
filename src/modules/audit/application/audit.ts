import type { AuditAction, Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";

type RecordAuditLogInput = {
  userId?: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string;
};

export async function recordAuditLog(input: RecordAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: input.metadata,
      ipAddress: input.ipAddress
    }
  });
}