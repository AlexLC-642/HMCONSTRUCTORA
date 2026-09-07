import { prisma } from "@/shared/lib/prisma";

export async function getProjectSchedule(projectId: string) {
  return prisma.schedule.findFirst({
    where: { projectId },
    include: {
      project: { include: { client: true } },
      activities: {
        include: {
          assignments: true,
          dependencies: { include: { dependsOnActivity: true } }
        },
        orderBy: { position: "asc" }
      }
    }
  });
}
