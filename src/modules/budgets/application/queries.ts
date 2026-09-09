import { prisma } from "@/shared/lib/prisma";

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

