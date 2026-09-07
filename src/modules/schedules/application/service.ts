import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { getScheduleBounds, parseDateInput } from "./dates";
import { scheduleInputSchema, type ScheduleInput } from "../domain/validation";

type ScheduleMutationContext = {
  userId: string;
};

function boundsFromInput(input: ScheduleInput) {
  const bounds = getScheduleBounds(input.activities);
  return { startDate: bounds.start, endDate: bounds.end };
}

function activityCreateInput(activity: ScheduleInput["activities"][number]) {
  return {
    code: activity.code,
    description: activity.description,
    labor: activity.labor || null,
    budgetSectionCode: activity.budgetSectionCode || null,
    budgetSectionName: activity.budgetSectionName || null,
    status: activity.status,
    plannedStart: parseDateInput(activity.plannedStart),
    plannedEnd: parseDateInput(activity.plannedEnd),
    actualStart: activity.actualStart ? parseDateInput(activity.actualStart) : null,
    actualEnd: activity.actualEnd ? parseDateInput(activity.actualEnd) : null,
    progress: new Prisma.Decimal(activity.progress),
    position: activity.position,
    notes: activity.notes || null,
    assignments: {
      create: activity.assigneeLabels
        .filter((label) => label.trim().length > 0)
        .map((label) => ({ label }))
    }
  };
}

function activityUpdateData(activity: ScheduleInput["activities"][number]) {
  const data = activityCreateInput(activity);
  const { assignments: _assignments, ...scalarData } = data;
  return scalarData;
}

async function updateProjectProgressFromSchedule(tx: Prisma.TransactionClient, projectId: string) {
  const activities = await tx.scheduleActivity.findMany({
    where: { schedule: { projectId } },
    select: { progress: true }
  });

  if (activities.length === 0) return;

  const total = activities.reduce((sum, activity) => sum.add(activity.progress), new Prisma.Decimal(0));
  await tx.project.update({
    where: { id: projectId },
    data: { progressPercentage: total.div(activities.length).toDecimalPlaces(2) }
  });
}

export async function createInitialSchedule(projectId: string, rawInput: unknown, context: ScheduleMutationContext) {
  const input = scheduleInputSchema.parse(rawInput);
  const bounds = boundsFromInput(input);

  return prisma.$transaction(async (tx) => {
    const existingSchedule = await tx.schedule.findFirst({ where: { projectId }, select: { id: true } });
    if (existingSchedule) throw new Error("El proyecto ya tiene un cronograma.");

    const schedule = await tx.schedule.create({
      data: {
        projectId,
        title: input.title,
        sourceReference: input.sourceReference,
        notes: input.notes,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        activities: { create: input.activities.map(activityCreateInput) }
      },
      include: { activities: true }
    });

    const activityIdsByCode = new Map(schedule.activities.map((activity) => [activity.code, activity.id]));
    for (const activity of input.activities) {
      const activityId = activityIdsByCode.get(activity.code);
      if (!activityId) continue;
      for (const dependencyCode of activity.dependsOnCodes) {
        const dependsOnActivityId = activityIdsByCode.get(dependencyCode);
        if (!dependsOnActivityId) continue;
        await tx.scheduleActivityDependency.create({ data: { activityId, dependsOnActivityId } });
      }
    }

    await tx.auditLog.create({
      data: {
        userId: context.userId,
        action: "CREATE",
        entityType: "Schedule",
        entityId: schedule.id,
        metadata: { projectId, sourceReference: input.sourceReference }
      }
    });

    return schedule;
  });
}

export async function saveSchedule(projectId: string, scheduleId: string, rawInput: unknown, context: ScheduleMutationContext) {
  const input = scheduleInputSchema.parse(rawInput);
  const bounds = boundsFromInput(input);

  return prisma.$transaction(async (tx) => {
    await tx.schedule.findFirstOrThrow({ where: { id: scheduleId, projectId } });
    await tx.scheduleActivityDependency.deleteMany({ where: { activity: { scheduleId } } });

    const existingActivities = await tx.scheduleActivity.findMany({
      where: { scheduleId },
      select: { id: true }
    });
    const existingIds = new Set(existingActivities.map((activity) => activity.id));
    const submittedIds = new Set(input.activities.map((activity) => activity.id).filter((id): id is string => Boolean(id)));
    const removedIds = existingActivities.map((activity) => activity.id).filter((id) => !submittedIds.has(id));

    if (removedIds.length > 0) {
      await tx.scheduleActivity.deleteMany({ where: { id: { in: removedIds }, scheduleId } });
    }

    for (const activity of input.activities) {
      if (activity.id && !existingIds.has(activity.id)) {
        throw new Error("Una actividad del cronograma no pertenece al cronograma actual.");
      }

      if (activity.id) {
        await tx.scheduleAssignment.deleteMany({ where: { activityId: activity.id } });
        await tx.scheduleActivity.update({ where: { id: activity.id }, data: activityUpdateData(activity) });
        await tx.scheduleAssignment.createMany({
          data: activity.assigneeLabels
            .filter((label) => label.trim().length > 0)
            .map((label) => ({ activityId: activity.id as string, label }))
        });
      } else {
        const created = await tx.scheduleActivity.create({
          data: { ...activityCreateInput(activity), scheduleId }
        });
        activity.id = created.id;
      }
    }

    const schedule = await tx.schedule.update({
      where: { id: scheduleId },
      data: {
        title: input.title,
        sourceReference: input.sourceReference,
        notes: input.notes,
        startDate: bounds.startDate,
        endDate: bounds.endDate
      },
      include: { activities: { orderBy: { position: "asc" } } }
    });

    const activityIdsByCode = new Map(schedule.activities.map((activity) => [activity.code, activity.id]));
    for (const activity of input.activities) {
      const activityId = activityIdsByCode.get(activity.code);
      if (!activityId) continue;
      for (const dependencyCode of activity.dependsOnCodes) {
        const dependsOnActivityId = activityIdsByCode.get(dependencyCode);
        if (!dependsOnActivityId || dependsOnActivityId === activityId) continue;
        await tx.scheduleActivityDependency.create({ data: { activityId, dependsOnActivityId } });
      }
    }

    await updateProjectProgressFromSchedule(tx, projectId);

    await tx.auditLog.create({
      data: {
        userId: context.userId,
        action: "UPDATE",
        entityType: "Schedule",
        entityId: schedule.id,
        metadata: { projectId, activities: input.activities.length }
      }
    });

    return schedule;
  });
}
