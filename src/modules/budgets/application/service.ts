import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";
import { calculateBudget } from "./calculations";
import { budgetVersionInputSchema } from "../domain/validation";

type BudgetMutationContext = {
	userId: string;
};

function buildScheduleActivitiesFromApprovedBudget(
	project: { code: string | null; name: string; startDate: Date | null },
	version: {
		sourceReference?: string | null;
		sections: Array<{
			code: string;
			name: string;
			position: number;
			category?: string | null;
			lineItems: Array<{
				type: "MATERIAL" | "LABOR" | "OTHER";
				position: number;
				description: string;
			}>;
		}>;
	},
) {
	const baseDate = project.startDate ? new Date(project.startDate) : new Date();
	baseDate.setUTCHours(0, 0, 0, 0);

	const activities: Array<{
		code: string;
		description: string;
		labor: string | null;
		budgetSectionCode: string | null;
		budgetSectionName: string | null;
		status: "PENDING";
		plannedStart: Date;
		plannedEnd: Date;
		progress: Prisma.Decimal;
		position: number;
		notes: string | null;
	}> = [];

	for (const section of version.sections) {
		const description = section.name.trim();
		if (!description) continue;

		const start = new Date(baseDate);
		start.setUTCDate(start.getUTCDate() + activities.length * 2);

		const end = new Date(start);
		end.setUTCDate(end.getUTCDate() + 3);

		activities.push({
			code: section.code,
			description,
			labor: null,
			budgetSectionCode: section.code,
			budgetSectionName: section.name,
			status: "PENDING",
			plannedStart: start,
			plannedEnd: end,
			progress: new Prisma.Decimal(0),
			position: activities.length + 1,
			notes: section.category
				? `Importada desde presupuesto aprobado: ${section.category}`
				: `Importada desde presupuesto aprobado: ${section.name}`,
		});
	}

	return activities;
}

function sectionCreateInput(
	section: ReturnType<typeof calculateBudget>["sections"][number],
) {
	return {
		code: section.code,
		name: section.name,
		category: section.category || null,
		position: section.position,
		materialSubtotal: section.materialSubtotal,
		laborSubtotal: section.laborSubtotal,
		otherSubtotal: section.otherSubtotal,
		total: section.total,
		lineItems: {
			create: section.lineItems.map((line) => ({
				type: line.type,
				position: line.position,
				description: line.description,
				quantity: new Prisma.Decimal(line.quantity),
				unit: line.unit || null,
				days: line.days ? new Prisma.Decimal(line.days) : null,
				unitPrice: new Prisma.Decimal(line.unitPrice),
				subtotal: line.subtotal,
			})),
		},
	};
}

export async function createInitialBudget(
	projectId: string,
	rawInput: unknown,
	context: BudgetMutationContext,
) {
	const parsed = budgetVersionInputSchema.parse(rawInput);
	const calculated = calculateBudget(parsed);

	return prisma.$transaction(async (tx) => {
		const existingBudget = await tx.budget.findFirst({
			where: { projectId },
			select: { id: true },
		});
		if (existingBudget) throw new Error("El proyecto ya tiene un presupuesto.");

		const project = await tx.project.findUniqueOrThrow({
			where: { id: projectId },
			select: { code: true, internalId: true },
		});

		const sourceReference =
			calculated.sourceReference.trim() ||
			project.code ||
			project.internalId ||
			"";

		const budget = await tx.budget.create({
			data: {
				projectId,
				title: calculated.title,
				versions: {
					create: {
						versionNumber: 1,
						status: "DRAFT",
						sourceReference,
						notes: calculated.notes,
						executorName: calculated.executorName || null,
						lineSubtotal: calculated.lineSubtotal,
						siteManagerCost: calculated.siteManagerCost,
						contingencyPercentage: new Prisma.Decimal(
							calculated.contingencyPercentage,
						),
						contingencyAmount: calculated.contingencyAmount,
						administrationPercentage: new Prisma.Decimal(
							calculated.administrationPercentage,
						),
						administrationAmount: calculated.administrationAmount,
						profitPercentage: new Prisma.Decimal(calculated.profitPercentage),
						profitAmount: calculated.profitAmount,
						vatPercentage: new Prisma.Decimal(calculated.vatPercentage),
						vatAmount: calculated.vatAmount,
						financingPercentage: new Prisma.Decimal(
							calculated.financingPercentage,
						),
						financingAmount: calculated.financingAmount,
						subtotal: calculated.subtotal,
						grandTotal: calculated.grandTotal,
						sections: { create: calculated.sections.map(sectionCreateInput) },
					},
				},
			},
			include: { versions: true },
		});

		await tx.project.update({
			where: { id: projectId },
			data: { baseBudget: calculated.grandTotal },
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "Budget",
				entityId: budget.id,
				metadata: { projectId, grandTotal: calculated.grandTotal.toString() },
			},
		});

		return budget;
	});
}

export async function saveBudgetVersion(
	projectId: string,
	versionId: string,
	rawInput: unknown,
	context: BudgetMutationContext,
) {
	const parsed = budgetVersionInputSchema.parse(rawInput);
	const calculated = calculateBudget(parsed);

	return prisma.$transaction(async (tx) => {
		const existing = await tx.budgetVersion.findUniqueOrThrow({
			where: { id: versionId },
			include: { budget: true },
		});

		if (existing.status !== "DRAFT") {
			throw new Error("Solo se pueden editar versiones en borrador.");
		}

		const project = await tx.project.findUniqueOrThrow({
			where: { id: projectId },
			select: { code: true, internalId: true },
		});

		const sourceReference =
			calculated.sourceReference.trim() ||
			project.code ||
			project.internalId ||
			"";

		await tx.budget.update({
			where: { id: existing.budgetId },
			data: { title: calculated.title },
		});
		await tx.budgetLineItem.deleteMany({
			where: { section: { budgetVersionId: versionId } },
		});
		await tx.budgetSection.deleteMany({
			where: { budgetVersionId: versionId },
		});

		const updated = await tx.budgetVersion.update({
			where: { id: versionId },
			data: {
				sourceReference,
				notes: calculated.notes,
				executorName: calculated.executorName || null,
				lineSubtotal: calculated.lineSubtotal,
				siteManagerCost: calculated.siteManagerCost,
				contingencyPercentage: new Prisma.Decimal(
					calculated.contingencyPercentage,
				),
				contingencyAmount: calculated.contingencyAmount,
				administrationPercentage: new Prisma.Decimal(
					calculated.administrationPercentage,
				),
				administrationAmount: calculated.administrationAmount,
				profitPercentage: new Prisma.Decimal(calculated.profitPercentage),
				profitAmount: calculated.profitAmount,
				vatPercentage: new Prisma.Decimal(calculated.vatPercentage),
				vatAmount: calculated.vatAmount,
				financingPercentage: new Prisma.Decimal(calculated.financingPercentage),
				financingAmount: calculated.financingAmount,
				subtotal: calculated.subtotal,
				grandTotal: calculated.grandTotal,
				sections: { create: calculated.sections.map(sectionCreateInput) },
			},
		});

		await tx.project.update({
			where: { id: projectId },
			data: { baseBudget: calculated.grandTotal },
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "BudgetVersion",
				entityId: versionId,
				metadata: {
					projectId,
					versionNumber: existing.versionNumber,
					grandTotal: calculated.grandTotal.toString(),
				},
			},
		});

		return updated;
	});
}

export async function approveBudgetVersion(
	projectId: string,
	versionId: string,
	context: BudgetMutationContext,
) {
	return prisma.$transaction(async (tx) => {
		const existing = await tx.budgetVersion.findUniqueOrThrow({
			where: { id: versionId },
			include: {
				budget: true,
				sections: {
					orderBy: { position: "asc" },
					include: { lineItems: { orderBy: { position: "asc" } } },
				},
			},
		});

		const project = await tx.project.findUniqueOrThrow({
			where: { id: projectId },
			select: {
				status: true,
				actualEndDate: true,
				code: true,
				name: true,
				startDate: true,
			},
		});

		if (existing.status !== "DRAFT") {
			throw new Error("Solo se pueden aprobar versiones en borrador.");
		}

		await tx.budgetVersion.updateMany({
			where: {
				budgetId: existing.budgetId,
				status: "APPROVED",
				id: { not: versionId },
			},
			data: { status: "SUPERSEDED" },
		});

		const approved = await tx.budgetVersion.update({
			where: { id: versionId },
			data: {
				status: "APPROVED",
				approvedAt: new Date(),
				approvedById: context.userId,
			},
		});

		const nextProjectStatus = ["DRAFT", "PLANNING"].includes(project.status)
			? "ACTIVE"
			: project.status;

		if (nextProjectStatus !== project.status) {
			await tx.project.update({
				where: { id: projectId },
				data: {
					status: nextProjectStatus,
					actualEndDate:
						nextProjectStatus === "ACTIVE" ? null : project.actualEndDate,
					updatedById: context.userId,
				},
			});
		}

		const existingSchedule = await tx.schedule.findFirst({
			where: { projectId },
			include: { activities: true },
		});

		const generatedActivities = buildScheduleActivitiesFromApprovedBudget(
			project,
			{
				sourceReference: existing.sourceReference,
				sections: existing.sections.map((section) => ({
					code: section.code,
					name: section.name,
					position: section.position,
					category: section.category,
					lineItems: section.lineItems.map((line) => ({
						type: line.type,
						position: line.position,
						description: line.description,
					})),
				})),
			},
		);

		if (generatedActivities.length > 0) {
			if (existingSchedule) {
				await tx.scheduleActivityDependency.deleteMany({
					where: { activity: { scheduleId: existingSchedule.id } },
				});
				await tx.scheduleActivity.deleteMany({
					where: { scheduleId: existingSchedule.id },
				});

				await tx.schedule.update({
					where: { id: existingSchedule.id },
					data: {
						title: `${project.code ?? "Cronograma"} - ${project.name}`,
						sourceReference: existing.sourceReference ?? project.code,
						notes:
							"Cronograma generado automáticamente desde el presupuesto aprobado.",
						startDate:
							generatedActivities[0]?.plannedStart ??
							project.startDate ??
							new Date(),
						endDate:
							generatedActivities.at(-1)?.plannedEnd ??
							project.startDate ??
							new Date(),
						activities: {
							create: generatedActivities.map((activity) => ({
								code: activity.code,
								description: activity.description,
								labor: activity.labor,
								budgetSectionCode: activity.budgetSectionCode,
								budgetSectionName: activity.budgetSectionName,
								status: activity.status,
								plannedStart: activity.plannedStart,
								plannedEnd: activity.plannedEnd,
								progress: activity.progress,
								position: activity.position,
								notes: activity.notes,
							})),
						},
					},
				});
			} else {
				await tx.schedule.create({
					data: {
						projectId,
						title: `${project.code ?? "Cronograma"} - ${project.name}`,
						sourceReference: existing.sourceReference ?? project.code,
						notes:
							"Cronograma generado automáticamente desde el presupuesto aprobado.",
						startDate:
							generatedActivities[0]?.plannedStart ??
							project.startDate ??
							new Date(),
						endDate:
							generatedActivities.at(-1)?.plannedEnd ??
							project.startDate ??
							new Date(),
						activities: {
							create: generatedActivities.map((activity) => ({
								code: activity.code,
								description: activity.description,
								labor: activity.labor,
								budgetSectionCode: activity.budgetSectionCode,
								budgetSectionName: activity.budgetSectionName,
								status: activity.status,
								plannedStart: activity.plannedStart,
								plannedEnd: activity.plannedEnd,
								progress: activity.progress,
								position: activity.position,
								notes: activity.notes,
							})),
						},
					},
				});
			}
		}

		await tx.project.update({
			where: { id: projectId },
			data: { baseBudget: existing.grandTotal },
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "APPROVE",
				entityType: "BudgetVersion",
				entityId: versionId,
				metadata: {
					projectId,
					versionNumber: existing.versionNumber,
					grandTotal: existing.grandTotal.toString(),
					projectStatus: nextProjectStatus,
					previousProjectStatus: project.status,
					scheduleCreated:
						!existingSchedule || existingSchedule.activities.length === 0,
				},
			},
		});

		return approved;
	});
}

export async function createEditableBudgetDraft(
	projectId: string,
	sourceVersionId: string,
	context: BudgetMutationContext,
) {
	return prisma.$transaction(async (tx) => {
		const source = await tx.budgetVersion.findUniqueOrThrow({
			where: { id: sourceVersionId },
			include: {
				budget: true,
				sections: {
					include: { lineItems: { orderBy: { position: "asc" } } },
					orderBy: { position: "asc" },
				},
			},
		});

		if (source.budget.projectId !== projectId) {
			throw new Error("La version del presupuesto no pertenece al proyecto.");
		}

		const existingDraft = await tx.budgetVersion.findFirst({
			where: { budgetId: source.budgetId, status: "DRAFT" },
			select: { id: true },
		});

		if (existingDraft) return existingDraft;

		const project = await tx.project.findUniqueOrThrow({
			where: { id: projectId },
			select: { code: true, internalId: true },
		});

		const lastVersion = await tx.budgetVersion.findFirst({
			where: { budgetId: source.budgetId },
			orderBy: { versionNumber: "desc" },
			select: { versionNumber: true },
		});

		const draft = await tx.budgetVersion.create({
			data: {
				budgetId: source.budgetId,
				versionNumber: (lastVersion?.versionNumber ?? source.versionNumber) + 1,
				status: "DRAFT",
				sourceReference:
					source.sourceReference?.trim() ||
					project.code ||
					project.internalId ||
					"",
				notes: source.notes,
				executorName: source.executorName,
				lineSubtotal: source.lineSubtotal,
				siteManagerCost: source.siteManagerCost,
				contingencyPercentage: source.contingencyPercentage,
				contingencyAmount: source.contingencyAmount,
				administrationPercentage: source.administrationPercentage,
				administrationAmount: source.administrationAmount,
				profitPercentage: source.profitPercentage,
				profitAmount: source.profitAmount,
				vatPercentage: source.vatPercentage,
				vatAmount: source.vatAmount,
				financingPercentage: source.financingPercentage,
				financingAmount: source.financingAmount,
				subtotal: source.subtotal,
				grandTotal: source.grandTotal,
				sections: {
					create: source.sections.map((section) => ({
						code: section.code,
						name: section.name,
						category: section.category,
						position: section.position,
						materialSubtotal: section.materialSubtotal,
						laborSubtotal: section.laborSubtotal,
						otherSubtotal: section.otherSubtotal,
						total: section.total,
						lineItems: {
							create: section.lineItems.map((line) => ({
								type: line.type,
								position: line.position,
								description: line.description,
								quantity: line.quantity,
								unit: line.unit,
								days: line.days,
								unitPrice: line.unitPrice,
								subtotal: line.subtotal,
							})),
						},
					})),
				},
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "BudgetVersion",
				entityId: draft.id,
				metadata: {
					projectId,
					copiedFromVersion: source.versionNumber,
					versionNumber: draft.versionNumber,
				},
			},
		});

		return draft;
	});
}
