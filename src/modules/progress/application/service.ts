import { Prisma } from "@prisma/client";
import { consumeInventoryForDailyReport } from "@/modules/inventory/application/service";
import { prisma } from "@/shared/lib/prisma";
import {
	canEditReport,
	isInReview,
	reportEditBlockedMessage,
	returnToDraftInputSchema,
} from "../domain/report-editing";
import {
	type DailyReportInput,
	dailyReportInputSchema,
} from "../domain/validation";
import { calculateDailyReportActivity } from "./calculations";

type ProgressMutationContext = {
	userId: string;
	/** Puede corregir informes en revisión (avance.revisar o avance.aprobar). */
	canReview?: boolean;
};

function nullable(value: string) {
	return value.trim() === "" ? null : value.trim();
}

function decimal(value: string) {
	return new Prisma.Decimal(value || "0");
}

function activityCreateInput(activity: DailyReportInput["activities"][number]) {
	const calculated = calculateDailyReportActivity(activity);
	return {
		scheduleActivityId: nullable(activity.scheduleActivityId),
		activityCode: activity.activityCode,
		activityName: activity.activityName,
		budgetSectionCode: nullable(activity.budgetSectionCode),
		budgetSectionName: nullable(activity.budgetSectionName),
		workDescription: activity.workDescription,
		unit: nullable(activity.unit),
		contractedQuantity: calculated.contractedQuantity,
		previousQuantity: calculated.previousQuantity,
		todayQuantity: calculated.todayQuantity,
		accumulatedQuantity: calculated.accumulatedQuantity,
		previousProgress: calculated.previousProgress,
		newProgress: calculated.newProgress,
		status: activity.status,
		issues: nullable(activity.issues),
		position: activity.position,
	};
}

function activityUpdateInput(activity: DailyReportInput["activities"][number]) {
	return activityCreateInput(activity);
}

function laborCreateInput(entry: DailyReportInput["laborEntries"][number]) {
	const people = decimal(entry.people);
	const hours = decimal(entry.hours);
	const rate = decimal(entry.rate);
	return {
		position: entry.position,
		workerLabel: entry.workerLabel || entry.role || "Personal",
		role: nullable(entry.role),
		people,
		hours,
		rate,
		amount: people.mul(hours).mul(rate).toDecimalPlaces(2),
		notes: nullable(entry.notes),
	};
}

function materialCreateInput(
	entry: DailyReportInput["materialEntries"][number],
) {
	return {
		position: entry.position,
		materialName: entry.materialName || "Material",
		warehouse: nullable(entry.warehouse),
		quantityUsed: decimal(entry.quantityUsed),
		unit: nullable(entry.unit),
		wasteQuantity: decimal(entry.wasteQuantity),
		returnedQuantity: decimal(entry.returnedQuantity),
		activityCode: nullable(entry.activityCode),
		notes: nullable(entry.notes),
		materialId: nullable(entry.materialId),
		warehouseId: nullable(entry.warehouseId),
	};
}

async function updateProjectProgressFromSchedule(
	tx: Prisma.TransactionClient,
	projectId: string,
	completionDate: Date,
	actorUserId: string,
) {
	const activities = await tx.scheduleActivity.findMany({
		where: { schedule: { projectId } },
		select: { progress: true },
	});

	if (activities.length === 0) return;

	const total = activities.reduce(
		(sum, activity) => sum.add(activity.progress),
		new Prisma.Decimal(0),
	);
	const average = total.div(activities.length).toDecimalPlaces(2);
	const project = await tx.project.findUniqueOrThrow({
		where: { id: projectId },
		select: { actualEndDate: true, code: true, status: true },
	});
	const shouldComplete =
		average.greaterThanOrEqualTo(100) &&
		project.status !== "COMPLETED" &&
		project.status !== "ARCHIVED" &&
		project.status !== "CANCELED";

	await tx.project.update({
		where: { id: projectId },
		data: {
			progressPercentage: average,
			...(shouldComplete
				? {
						status: "COMPLETED" as const,
						actualEndDate: project.actualEndDate ?? completionDate,
					}
				: {}),
		},
	});

	if (shouldComplete) {
		await tx.auditLog.create({
			data: {
				userId: actorUserId,
				action: "UPDATE",
				entityType: "Project",
				entityId: projectId,
				metadata: {
					code: project.code,
					previousStatus: project.status,
					status: "COMPLETED",
					lifecycleChange: true,
					completedFromApprovedProgress: true,
				},
			},
		});
	}
}

function calculateApprovedActivityTotals(
	currentProgress: Prisma.Decimal,
	activity: {
		activityCode: string;
		todayQuantity: Prisma.Decimal;
		contractedQuantity: Prisma.Decimal;
	},
) {
	const contractedQuantity = new Prisma.Decimal(activity.contractedQuantity);
	const todayProgress = contractedQuantity.gt(0)
		? activity.todayQuantity.div(contractedQuantity).mul(100).toDecimalPlaces(2)
		: activity.todayQuantity.toDecimalPlaces(2);
	const newProgress = currentProgress.add(todayProgress).toDecimalPlaces(2);
	const accumulatedQuantity = newProgress;

	if (newProgress.gt(100)) {
		throw new Error(
			`La actividad ${activity.activityCode} supera el 100% con los informes aprobados acumulados.`,
		);
	}

	return { accumulatedQuantity, newProgress };
}
function baseReportData(
	projectId: string,
	parsed: DailyReportInput,
	userId: string,
) {
	return {
		projectId,
		reportNumber: parsed.reportNumber,
		reportDate: new Date(`${parsed.reportDate}T00:00:00.000Z`),
		siteManager: parsed.siteManager,
		location: nullable(parsed.location),
		workShift: nullable(parsed.workShift),
		startTime: nullable(parsed.startTime),
		endTime: nullable(parsed.endTime),
		weather: nullable(parsed.weather),
		generalObservations: nullable(parsed.generalObservations),
		updatedById: userId,
	};
}

async function syncDailyReportActivities(
	tx: Prisma.TransactionClient,
	reportId: string,
	activities: DailyReportInput["activities"],
) {
	const existingActivities = await tx.dailyReportActivity.findMany({
		where: { dailyReportId: reportId },
		select: { id: true },
	});
	const existingIds = new Set(
		existingActivities.map((activity) => activity.id),
	);
	const submittedIds = new Set(
		activities.map((activity) => activity.id).filter(Boolean),
	);

	for (const activity of activities) {
		if (!activity.id) {
			await tx.dailyReportActivity.create({
				data: { ...activityCreateInput(activity), dailyReportId: reportId },
			});
			continue;
		}

		if (!existingIds.has(activity.id)) {
			throw new Error(
				"Una actividad del informe no pertenece al borrador actual.",
			);
		}

		await tx.dailyReportActivity.update({
			where: { id: activity.id },
			data: activityUpdateInput(activity),
		});
	}

	const removedIds = existingActivities
		.map((activity) => activity.id)
		.filter((id) => !submittedIds.has(id));
	if (removedIds.length === 0) return;

	const protectedMediaCount = await tx.dailyReportMedia.count({
		where: { dailyReportActivityId: { in: removedIds } },
	});

	if (protectedMediaCount > 0) {
		throw new Error(
			"Esta actividad tiene evidencias asociadas. Elimine o reasigne las evidencias antes de quitarla.",
		);
	}

	await tx.dailyReportActivity.deleteMany({
		where: { id: { in: removedIds }, dailyReportId: reportId },
	});
}

export async function saveDailyReport(
	projectId: string,
	rawInput: unknown,
	context: ProgressMutationContext,
) {
	const parsed = dailyReportInputSchema.parse(rawInput);

	return prisma.$transaction(async (tx) => {
		const existing = parsed.reportId
			? await tx.dailyReport.findFirst({
					where: { id: parsed.reportId, projectId },
				})
			: null;

		if (
			existing &&
			!canEditReport(existing.status, Boolean(context.canReview))
		) {
			throw new Error(reportEditBlockedMessage(existing.status));
		}

		if (existing) {
			await tx.dailyReportLabor.deleteMany({
				where: { dailyReportId: existing.id },
			});
			await tx.dailyReportMaterial.deleteMany({
				where: { dailyReportId: existing.id },
			});
			const report = await tx.dailyReport.update({
				where: { id: existing.id },
				data: {
					...baseReportData(projectId, parsed, context.userId),
					laborEntries: { create: parsed.laborEntries.map(laborCreateInput) },
					materialEntries: {
						create: parsed.materialEntries.map(materialCreateInput),
					},
				},
			});
			await syncDailyReportActivities(tx, report.id, parsed.activities);

			await tx.auditLog.create({
				data: {
					userId: context.userId,
					action: "UPDATE",
					entityType: "DailyReport",
					entityId: report.id,
					metadata: {
						projectId,
						reportNumber: report.reportNumber,
						// Corrección hecha por quien revisa: queda constancia.
						...(existing.status !== "DRAFT"
							? { editedInReview: true, status: existing.status }
							: {}),
					},
				},
			});

			return report;
		}

		const report = await tx.dailyReport.create({
			data: {
				...baseReportData(projectId, parsed, context.userId),
				createdById: context.userId,
				activities: { create: parsed.activities.map(activityCreateInput) },
				laborEntries: { create: parsed.laborEntries.map(laborCreateInput) },
				materialEntries: {
					create: parsed.materialEntries.map(materialCreateInput),
				},
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "DailyReport",
				entityId: report.id,
				metadata: { projectId, reportNumber: report.reportNumber },
			},
		});

		return report;
	});
}

/**
 * Devuelve un informe en revisión al encargado para que lo corrija. Vuelve a
 * borrador (aún no tenía efectos) y el motivo queda en la bitácora.
 */
export async function returnDailyReportToDraft(
	projectId: string,
	reportId: string,
	rawReason: unknown,
	context: ProgressMutationContext,
) {
	const { reason } = returnToDraftInputSchema.parse({ reason: rawReason });
	return prisma.$transaction(async (tx) => {
		await tx.$executeRaw`SELECT id FROM DailyReport WHERE id = ${reportId} FOR UPDATE`;
		const report = await tx.dailyReport.findFirstOrThrow({
			where: { id: reportId, projectId },
		});
		if (!isInReview(report.status)) {
			throw new Error(
				"Solo se puede devolver un informe que está en revisión.",
			);
		}
		const updated = await tx.dailyReport.update({
			where: { id: reportId },
			data: { status: "DRAFT", submittedAt: null, updatedById: context.userId },
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "DailyReport",
				entityId: reportId,
				metadata: {
					projectId,
					status: "DRAFT",
					previousStatus: report.status,
					returnedForCorrection: true,
					reason,
				},
			},
		});
		return updated;
	});
}

export async function submitDailyReport(
	projectId: string,
	reportId: string,
	context: ProgressMutationContext,
) {
	return prisma.$transaction(async (tx) => {
		const report = await tx.dailyReport.findFirstOrThrow({
			where: { id: reportId, projectId },
		});
		if (report.status !== "DRAFT")
			throw new Error("Solo se pueden enviar informes en borrador.");

		const updated = await tx.dailyReport.update({
			where: { id: reportId },
			data: {
				status: "SUBMITTED",
				submittedAt: new Date(),
				updatedById: context.userId,
			},
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "DailyReport",
				entityId: reportId,
				metadata: { projectId, status: "SUBMITTED" },
			},
		});
		return updated;
	});
}

export async function approveDailyReport(
	projectId: string,
	reportId: string,
	context: ProgressMutationContext,
) {
	return prisma.$transaction(async (tx) => {
		// Bloquea el informe: dos aprobaciones simultáneas (doble clic, dos
		// usuarios) leerían ambas "SUBMITTED" y sumarían el avance dos veces.
		await tx.$executeRaw`SELECT id FROM DailyReport WHERE id = ${reportId} FOR UPDATE`;
		const report = await tx.dailyReport.findFirstOrThrow({
			where: { id: reportId, projectId },
			include: { activities: true, materialEntries: true },
		});

		if (report.status !== "SUBMITTED" && report.status !== "REVIEWED") {
			throw new Error("Solo se pueden aprobar informes enviados o revisados.");
		}

		for (const activity of report.activities) {
			if (!activity.scheduleActivityId) continue;

			// Otro informe de la misma actividad puede aprobarse a la vez: se
			// bloquea la fila para no perder ninguno de los dos avances.
			await tx.$executeRaw`SELECT id FROM ScheduleActivity WHERE id = ${activity.scheduleActivityId} FOR UPDATE`;
			const scheduleActivity = await tx.scheduleActivity.findFirst({
				where: { id: activity.scheduleActivityId, schedule: { projectId } },
				select: { id: true, progress: true, actualStart: true },
			});

			if (!scheduleActivity) {
				throw new Error(
					`La actividad ${activity.activityCode} ya no pertenece al cronograma de este proyecto.`,
				);
			}

			const totals = calculateApprovedActivityTotals(
				scheduleActivity.progress,
				{
					activityCode: activity.activityCode,
					todayQuantity: activity.todayQuantity,
					contractedQuantity: activity.contractedQuantity,
				},
			);

			await tx.scheduleActivity.update({
				where: { id: scheduleActivity.id },
				data: {
					progress: totals.newProgress,
					status:
						activity.status === "BLOCKED"
							? "BLOCKED"
							: totals.newProgress.equals(new Prisma.Decimal(100))
								? "COMPLETED"
								: totals.newProgress.gt(0)
									? "IN_PROGRESS"
									: "PENDING",
					// El inicio real es el día más temprano con trabajo reportado,
					// aunque los informes se aprueben en desorden.
					actualStart:
						activity.todayQuantity.gt(0) &&
						(!scheduleActivity.actualStart ||
							report.reportDate < scheduleActivity.actualStart)
							? report.reportDate
							: undefined,
					actualEnd: totals.newProgress.equals(new Prisma.Decimal(100))
						? report.reportDate
						: undefined,
				},
			});
			await tx.dailyReportActivity.update({
				where: { id: activity.id },
				data: {
					accumulatedQuantity: totals.accumulatedQuantity,
					newProgress: totals.newProgress,
				},
			});
		}

		await updateProjectProgressFromSchedule(
			tx,
			projectId,
			report.reportDate,
			context.userId,
		);
		await consumeInventoryForDailyReport(
			tx,
			projectId,
			report.reportNumber,
			report.materialEntries,
			{ userId: context.userId },
		);

		const approved = await tx.dailyReport.update({
			where: { id: reportId },
			data: {
				status: "APPROVED",
				approvedAt: new Date(),
				approvedById: context.userId,
				updatedById: context.userId,
			},
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "APPROVE",
				entityType: "DailyReport",
				entityId: reportId,
				metadata: { projectId },
			},
		});
		return approved;
	});
}
export async function publishDailyReport(
	projectId: string,
	reportId: string,
	context: ProgressMutationContext,
) {
	return prisma.$transaction(async (tx) => {
		const report = await tx.dailyReport.findFirstOrThrow({
			where: { id: reportId, projectId },
		});
		if (report.status !== "APPROVED")
			throw new Error("Solo se pueden publicar informes aprobados.");

		const published = await tx.dailyReport.update({
			where: { id: reportId },
			data: {
				status: "PUBLISHED",
				publishedAt: new Date(),
				updatedById: context.userId,
			},
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "PUBLISH",
				entityType: "DailyReport",
				entityId: reportId,
				metadata: { projectId },
			},
		});
		return published;
	});
}
