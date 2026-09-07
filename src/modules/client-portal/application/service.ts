import { createHash, randomBytes, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";

const TOKEN_BYTES = 32;

type PortalShareStatus = {
  id: string;
  token: string | null;
  createdAt: Date;
  expiresAt: Date | null;
  createdBy: { name: string } | null;
};

type PortalShareRow = {
  id: string;
  projectId: string;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
};

type PortalProject = Prisma.ProjectGetPayload<{
  include: {
    client: true;
    responsible: { select: { name: true; email: true } };
    budgets: { include: { versions: { include: { sections: { include: { lineItems: true } } } } } };
    schedules: { include: { activities: true } };
    dailyReports: { include: { activities: true; laborEntries: true; materialEntries: true; mediaEntries: true } };
    documents: { include: { category: true; versions: true } };
  };
}>;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function toNumber(value: Prisma.Decimal | number | null | undefined) {
  if (value instanceof Prisma.Decimal) return value.toNumber();
  return Number(value ?? 0);
}

export async function createPortalShare(projectId: string, userId: string) {
  const token = randomBytes(TOKEN_BYTES).toString("base64url");
  const tokenHash = hashToken(token);
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE PortalShare
      SET revokedAt = ${now}, updatedAt = ${now}
      WHERE projectId = ${projectId} AND revokedAt IS NULL
    `;

    await tx.$executeRaw`
      INSERT INTO PortalShare (id, projectId, token, tokenHash, label, expiresAt, revokedAt, createdById, createdAt, updatedAt)
      VALUES (${randomUUID()}, ${projectId}, ${token}, ${tokenHash}, ${"Enlace principal"}, ${null}, ${null}, ${userId}, ${now}, ${now})
    `;

    await tx.project.update({
      where: { id: projectId },
      data: { portalEnabled: true }
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "SHARE",
        entityType: "Project",
        entityId: projectId,
        metadata: { surface: "client-portal" }
      }
    });
  });

  return token;
}

export async function revokePortalShares(projectId: string, userId: string) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE PortalShare
      SET revokedAt = ${now}, updatedAt = ${now}
      WHERE projectId = ${projectId} AND revokedAt IS NULL
    `;

    await tx.project.update({
      where: { id: projectId },
      data: { portalEnabled: false }
    });

    await tx.auditLog.create({
      data: {
        userId,
        action: "REVOKE",
        entityType: "Project",
        entityId: projectId,
        metadata: { surface: "client-portal" }
      }
    });
  });
}

export async function getPortalShareStatus(projectId: string): Promise<PortalShareStatus | null> {
  const rows = await prisma.$queryRaw<Array<{
    id: string;
    token: string | null;
    createdAt: Date;
    expiresAt: Date | null;
    createdByName: string | null;
  }>>`
    SELECT ps.id, ps.token, ps.createdAt, ps.expiresAt, u.name AS createdByName
    FROM PortalShare ps
    LEFT JOIN User u ON u.id = ps.createdById
    WHERE ps.projectId = ${projectId}
      AND ps.revokedAt IS NULL
      AND (ps.expiresAt IS NULL OR ps.expiresAt > NOW())
    ORDER BY ps.createdAt DESC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    token: row.token,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    createdBy: row.createdByName ? { name: row.createdByName } : null
  };
}

export async function getClientPortalByToken(token: string) {
  const rows = await prisma.$queryRaw<PortalShareRow[]>`
    SELECT id, projectId, expiresAt, revokedAt, createdAt
    FROM PortalShare
    WHERE tokenHash = ${hashToken(token)}
    LIMIT 1
  `;

  const share = rows[0];
  if (!share || share.revokedAt || (share.expiresAt && share.expiresAt < new Date())) {
    return null;
  }

  const project = await prisma.project.findUnique({
    where: { id: share.projectId, portalEnabled: true },
    include: {
      client: true,
      responsible: { select: { name: true, email: true } },
      budgets: {
        include: {
          versions: {
            where: { status: "APPROVED" },
            include: {
              sections: {
                include: {
                  lineItems: { orderBy: [{ type: "asc" }, { position: "asc" }] }
                },
                orderBy: { position: "asc" }
              }
            },
            orderBy: { approvedAt: "desc" },
            take: 1
          }
        },
        take: 1
      },
      schedules: {
        include: {
          activities: { orderBy: { position: "asc" } }
        },
        orderBy: { updatedAt: "desc" },
        take: 1
      },
      dailyReports: {
        where: { status: "PUBLISHED" },
        include: {
          activities: { orderBy: { position: "asc" } },
          laborEntries: { orderBy: { position: "asc" } },
          materialEntries: { orderBy: { position: "asc" } },
          mediaEntries: { orderBy: { sortOrder: "asc" } }
        },
        orderBy: { reportDate: "desc" },
        take: 5
      },
      documents: {
        where: {
          status: "APPROVED",
          portalVisible: true
        },
        include: {
          category: true,
          versions: { orderBy: { versionNumber: "desc" }, take: 1 }
        },
        orderBy: { updatedAt: "desc" }
      }
    }
  }) as PortalProject | null;

  if (!project) return null;

  const schedule = project.schedules[0];
  const activities = schedule?.activities ?? [];
  const completed = activities.filter((activity) => activity.status === "COMPLETED").length;
  const inProgress = activities.filter((activity) => activity.status === "IN_PROGRESS").length;
  const approvedBudget = project.budgets[0]?.versions[0];

  return {
    share: { createdAt: share.createdAt, expiresAt: share.expiresAt },
    project,
    approvedBudget,
    schedule,
    stats: {
      progress: toNumber(project.progressPercentage),
      budget: toNumber(approvedBudget?.grandTotal ?? project.baseBudget),
      activities: activities.length,
      completed,
      inProgress,
      pending: Math.max(0, activities.length - completed - inProgress),
      reports: project.dailyReports.length,
      documents: project.documents.length
    }
  };
}
