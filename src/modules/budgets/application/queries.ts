import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";

export type BudgetWithCurrentVersion = Prisma.BudgetGetPayload<{
  include: {
    project: { include: { client: true } };
    versions: {
      include: {
        approvedBy: { select: { id: true; name: true; email: true } };
        sections: { include: { lineItems: true } };
      };
    };
  };
}>;

const budgetVersionInclude = {
  approvedBy: { select: { id: true, name: true, email: true } },
  sections: {
    include: { lineItems: { orderBy: [{ type: "asc" as const }, { position: "asc" as const }] } },
    orderBy: { position: "asc" as const }
  }
};

export async function getProjectBudget(projectId: string) {
  return prisma.budget.findFirst({
    where: { projectId },
    include: {
      project: { include: { client: true } },
      versions: {
        include: budgetVersionInclude,
        orderBy: { versionNumber: "desc" }
      }
    }
  });
}

export async function getBudgetVersion(versionId: string) {
  return prisma.budgetVersion.findUnique({
    where: { id: versionId },
    include: {
      ...budgetVersionInclude,
      budget: { include: { project: { include: { client: true } } } }
    }
  });
}
