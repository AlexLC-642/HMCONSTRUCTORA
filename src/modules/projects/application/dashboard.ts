import type { ProjectStatus, ScheduleActivityStatus } from "@prisma/client";
import {
	hasPortfolioAccess,
	projectAccessWhere,
} from "@/modules/auth/application/authorization";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import { prisma } from "@/shared/lib/prisma";
import { classifyProgressGap } from "../domain/risk";

type StatusCount<T extends string> = {
	status: T;
	count: number;
};

const activeRequisitionStatuses = [
	"REQUESTED",
	"REVIEWED",
	"APPROVED",
	"PURCHASED",
] as const;
const pendingReportStatuses = ["SUBMITTED", "REVIEWED"] as const;

function toNumber(
	value: { toNumber: () => number } | number | null | undefined,
) {
	if (typeof value === "number") return value;
	return value?.toNumber() ?? 0;
}

function daysBetween(start: Date, end: Date) {
	const startUtc = Date.UTC(
		start.getFullYear(),
		start.getMonth(),
		start.getDate(),
	);
	const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
	return Math.max(1, Math.round((endUtc - startUtc) / 86_400_000) + 1);
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function startOfMonth(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), 1);
}

function monthKey(date: Date) {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function calculatePlannedProgress(
	activities: Array<{ plannedStart: Date; plannedEnd: Date }>,
	today = new Date(),
) {
	if (activities.length === 0) return 0;

	const total = activities.reduce((sum, activity) => {
		if (today < activity.plannedStart) return sum;
		if (today >= activity.plannedEnd) return sum + 100;

		const elapsed = daysBetween(activity.plannedStart, today);
		const duration = daysBetween(activity.plannedStart, activity.plannedEnd);
		return sum + Math.min(100, (elapsed / duration) * 100);
	}, 0);

	return total / activities.length;
}

function riskLabel(
	realProgress: number,
	plannedProgress: number,
	overdueActivities: number,
) {
	return classifyProgressGap(realProgress - plannedProgress, overdueActivities);
}

function timelineDates(start: Date, end: Date) {
	const duration = daysBetween(start, end);
	const step = Math.max(1, Math.ceil(duration / 8));
	const dates: Date[] = [];

	for (let date = start; date <= end; date = addDays(date, step)) {
		dates.push(new Date(date));
	}

	if (dates.at(-1)?.toDateString() !== end.toDateString()) {
		dates.push(new Date(end));
	}

	return dates;
}

function calculatePlannedProgressAt(
	activities: Array<{ plannedStart: Date; plannedEnd: Date }>,
	date: Date,
) {
	return calculatePlannedProgress(activities, date);
}

export async function getDashboardMetrics(
	user: Pick<AuthenticatedUser, "id" | "roles">,
) {
	const today = new Date();
	const twelveMonthsAgo = startOfMonth(addDays(today, -335));
	const projectWhere = projectAccessWhere(user);
	const projectRelationWhere = hasPortfolioAccess(user)
		? undefined
		: projectWhere;
	const [
		totalProjects,
		activeProjects,
		baseBudget,
		approvedBudget,
		validExpenses,
		registeredPayments,
		averageProgress,
		statusCounts,
		activityStatusCounts,
		overdueActivities,
		pendingRequirements,
		pendingReports,
		stockAlertRows,
		recentReports,
		recentRequisitions,
		expensesForPeriod,
		paymentsForPeriod,
		expenseSumsByProject,
		paymentSumsByProject,
		requisitionCountsByProject,
		reportCountsByProject,
		projectSnapshot,
	] = await Promise.all([
		prisma.project.count({ where: projectWhere }),
		prisma.project.count({ where: { ...projectWhere, status: "ACTIVE" } }),
		prisma.project.aggregate({
			where: projectWhere,
			_sum: { baseBudget: true },
		}),
		prisma.budgetVersion.aggregate({
			where: {
				status: "APPROVED",
				...(projectRelationWhere
					? { budget: { project: projectRelationWhere } }
					: {}),
			},
			_sum: { grandTotal: true },
		}),
		prisma.financialExpense.aggregate({
			where: {
				status: "VALID",
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
			_sum: { subtotal: true },
		}),
		prisma.clientPayment.aggregate({
			where: {
				status: "REGISTERED",
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
			_sum: { amount: true },
		}),
		prisma.project.aggregate({
			where: projectWhere,
			_avg: { progressPercentage: true },
		}),
		prisma.project.groupBy({
			by: ["status"],
			where: projectWhere,
			_count: { status: true },
		}),
		prisma.scheduleActivity.groupBy({
			by: ["status"],
			where: projectRelationWhere
				? { schedule: { project: projectRelationWhere } }
				: undefined,
			_count: { status: true },
		}),
		prisma.scheduleActivity.count({
			where: {
				status: { not: "COMPLETED" },
				plannedEnd: { lt: today },
				...(projectRelationWhere
					? { schedule: { project: projectRelationWhere } }
					: {}),
			},
		}),
		prisma.requisition.count({
			where: {
				status: { in: [...activeRequisitionStatuses] },
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
		}),
		prisma.dailyReport.count({
			where: {
				status: { in: [...pendingReportStatuses] },
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
		}),
		// Pushes the "quantity <= minimumStock" comparison into SQL instead of
		// fetching every Stock row (healthy ones included) just to filter them
		// in JS - Prisma's query builder can't compare two columns of the same
		// row, so this is the one spot in the dashboard that needs raw SQL.
		hasPortfolioAccess(user)
			? prisma.$queryRaw<
					Array<{
						materialName: string;
						unit: string;
						// Raw queries return DECIMAL columns as number/string
						// (driver-dependent), never as a Prisma.Decimal
						// instance - always go through Number(...), not the
						// toNumber()/.lte() helpers meant for Client API results.
						quantity: number | string;
						minimumStock: number | string;
					}>
				>`
				SELECT m.name AS materialName, m.unit AS unit, s.quantity AS quantity, m.minimumStock AS minimumStock
				FROM Stock s
				INNER JOIN InventoryMaterial m ON m.id = s.materialId
				WHERE m.active = true AND s.quantity <= m.minimumStock
				ORDER BY s.quantity ASC
			`
			: Promise.resolve([]),
		prisma.dailyReport.findMany({
			where: {
				status: { in: ["APPROVED", "PUBLISHED", "SUBMITTED", "REVIEWED"] },
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
			include: {
				laborEntries: true,
				activities: true,
				project: { select: { code: true, name: true } },
			},
			orderBy: { reportDate: "desc" },
			take: 20,
		}),
		prisma.requisition.findMany({
			where: projectRelationWhere
				? { project: projectRelationWhere }
				: undefined,
			include: { project: { select: { code: true, name: true } }, items: true },
			orderBy: { requestedDate: "desc" },
			take: 8,
		}),
		prisma.financialExpense.findMany({
			where: {
				status: "VALID",
				expenseDate: { gte: twelveMonthsAgo },
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
			select: {
				expenseDate: true,
				subtotal: true,
				description: true,
				project: { select: { code: true, name: true } },
			},
			orderBy: { expenseDate: "asc" },
		}),
		prisma.clientPayment.findMany({
			where: {
				status: "REGISTERED",
				paymentDate: { gte: twelveMonthsAgo },
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
			select: {
				paymentDate: true,
				amount: true,
				paymentNumber: true,
				project: { select: { code: true, name: true } },
			},
			orderBy: { paymentDate: "asc" },
		}),
		// Per-project spent/paid/pending totals used to be nested full-row
		// includes on the project.findMany below (every expense, every
		// payment, every open requisition/report of every project, just to
		// sum().length() them in JS). That scales with the company's entire
		// transaction history, not with project count. A GROUP BY aggregate
		// scales with it correctly instead - same numbers, same indexes
		// (projectId/status) already used by the per-project pages.
		prisma.financialExpense.groupBy({
			by: ["projectId"],
			where: {
				status: "VALID",
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
			_sum: { subtotal: true },
		}),
		prisma.clientPayment.groupBy({
			by: ["projectId"],
			where: {
				status: "REGISTERED",
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
			_sum: { amount: true },
		}),
		prisma.requisition.groupBy({
			by: ["projectId"],
			where: {
				status: { in: [...activeRequisitionStatuses] },
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
			_count: { _all: true },
		}),
		prisma.dailyReport.groupBy({
			by: ["projectId"],
			where: {
				status: { in: [...pendingReportStatuses] },
				...(projectRelationWhere ? { project: projectRelationWhere } : {}),
			},
			_count: { _all: true },
		}),
		prisma.project.findMany({
			where: projectWhere,
			include: {
				client: { select: { name: true } },
				responsible: { select: { name: true } },
				schedules: {
					include: { activities: true },
					orderBy: { updatedAt: "desc" },
					take: 1,
				},
				budgets: {
					include: {
						versions: {
							orderBy: [{ status: "asc" }, { versionNumber: "desc" }],
							take: 1,
						},
					},
					orderBy: { updatedAt: "desc" },
					take: 1,
				},
			},
			orderBy: { updatedAt: "desc" },
		}),
	]);

	const spentByProject = new Map(
		expenseSumsByProject.map((row) => [
			row.projectId,
			toNumber(row._sum.subtotal),
		]),
	);
	const paidByProject = new Map(
		paymentSumsByProject.map((row) => [
			row.projectId,
			toNumber(row._sum.amount),
		]),
	);
	const pendingRequirementsByProject = new Map(
		requisitionCountsByProject
			.filter(
				(row): row is typeof row & { projectId: string } =>
					row.projectId !== null,
			)
			.map((row) => [row.projectId, row._count._all]),
	);
	const pendingReportsByProject = new Map(
		reportCountsByProject.map((row) => [row.projectId, row._count._all]),
	);

	const lowStock = stockAlertRows.length;
	const peopleWorking = recentReports.reduce((sum, report) => {
		return (
			sum +
			report.laborEntries.reduce(
				(reportSum, entry) => reportSum + toNumber(entry.people),
				0,
			)
		);
	}, 0);

	const projectSummaries = projectSnapshot.map((project) => {
		const activities = project.schedules[0]?.activities ?? [];
		const plannedProgress = calculatePlannedProgress(activities, today);
		const realProgress =
			activities.length > 0
				? activities.reduce(
						(sum, activity) => sum + toNumber(activity.progress),
						0,
					) / activities.length
				: toNumber(project.progressPercentage);
		const overdue = activities.filter(
			(activity) =>
				activity.status !== "COMPLETED" && activity.plannedEnd < today,
		).length;
		const approvedOrLatestBudget = project.budgets[0]?.versions[0]?.grandTotal;
		const budgetTotal =
			toNumber(approvedOrLatestBudget) || toNumber(project.baseBudget);
		const spent = spentByProject.get(project.id) ?? 0;
		const paid = paidByProject.get(project.id) ?? 0;

		return {
			id: project.id,
			code: project.code,
			name: project.name,
			clientName: project.client?.name ?? "Sin cliente",
			responsibleName: project.responsible?.name ?? "Sin asignar",
			status: project.status,
			startDate: project.startDate?.toISOString() ?? null,
			expectedEndDate: project.expectedEndDate?.toISOString() ?? null,
			daysRemaining: project.expectedEndDate
				? Math.ceil(
						(project.expectedEndDate.getTime() - today.getTime()) / 86_400_000,
					)
				: null,
			budgetTotal,
			spent,
			paid,
			balance: paid - spent,
			plannedProgress,
			realProgress,
			overdueActivities: overdue,
			pendingRequirements: pendingRequirementsByProject.get(project.id) ?? 0,
			pendingReports: pendingReportsByProject.get(project.id) ?? 0,
			risk: riskLabel(realProgress, plannedProgress, overdue),
		};
	});

	const scheduleActivities = projectSnapshot.flatMap((project) => {
		const schedule = project.schedules[0];
		return (schedule?.activities ?? []).map((activity) => ({
			id: activity.id,
			projectId: project.id,
			projectCode: project.code,
			projectName: project.name,
			responsibleName: project.responsible?.name ?? "Sin asignar",
			description: activity.description,
			status: activity.status,
			progress: toNumber(activity.progress),
			plannedStart: activity.plannedStart,
			plannedEnd: activity.plannedEnd,
		}));
	});

	const timelineStart =
		scheduleActivities.length > 0
			? new Date(
					Math.min(
						...scheduleActivities.map((activity) =>
							activity.plannedStart.getTime(),
						),
					),
				)
			: null;
	const timelineEnd =
		scheduleActivities.length > 0
			? new Date(
					Math.max(
						...scheduleActivities.map((activity) =>
							activity.plannedEnd.getTime(),
						),
					),
				)
			: null;
	const timelineReportRows = recentReports.flatMap((report) => {
		return report.activities
			.filter((activity) => activity.scheduleActivityId)
			.map((activity) => ({
				date: report.reportDate,
				scheduleActivityId: activity.scheduleActivityId as string,
				progress: toNumber(activity.newProgress),
			}));
	});

	const timeline =
		timelineStart && timelineEnd
			? timelineDates(timelineStart, timelineEnd).map((date) => {
					const progressByActivity = new Map<string, number>();
					for (const reportActivity of timelineReportRows) {
						if (reportActivity.date <= date) {
							progressByActivity.set(
								reportActivity.scheduleActivityId,
								reportActivity.progress,
							);
						}
					}
					const realValues = scheduleActivities
						.map((activity) => progressByActivity.get(activity.id))
						.filter((value): value is number => typeof value === "number");
					const real =
						realValues.length > 0
							? realValues.reduce((sum, value) => sum + value, 0) /
								scheduleActivities.length
							: null;
					const planned = calculatePlannedProgressAt(scheduleActivities, date);
					const financial = approvedBudget._sum.grandTotal
						? (expensesForPeriod
								.filter((expense) => expense.expenseDate <= date)
								.reduce((sum, expense) => sum + toNumber(expense.subtotal), 0) /
								toNumber(approvedBudget._sum.grandTotal)) *
							100
						: null;

					return {
						date: date.toISOString(),
						planned,
						real,
						financial,
					};
				})
			: [];

	const monthBuckets = new Map<
		string,
		{ month: string; spent: number; paid: number }
	>();
	for (
		let month = startOfMonth(twelveMonthsAgo);
		month <= today;
		month = new Date(month.getFullYear(), month.getMonth() + 1, 1)
	) {
		const key = monthKey(month);
		monthBuckets.set(key, { month: key, spent: 0, paid: 0 });
	}
	for (const expense of expensesForPeriod) {
		const bucket = monthBuckets.get(monthKey(expense.expenseDate));
		if (bucket) bucket.spent += toNumber(expense.subtotal);
	}
	for (const payment of paymentsForPeriod) {
		const bucket = monthBuckets.get(monthKey(payment.paymentDate));
		if (bucket) bucket.paid += toNumber(payment.amount);
	}

	const stockAlerts = stockAlertRows.slice(0, 8).map((stock) => {
		const quantity = Number(stock.quantity);
		return {
			material: stock.materialName,
			unit: stock.unit,
			quantity,
			minimum: Number(stock.minimumStock),
			level: quantity <= 0 ? "Critico" : "Bajo",
		};
	});

	const ganttRows = projectSnapshot.map((project) => {
		const activities = project.schedules[0]?.activities ?? [];
		const plannedStart =
			activities.length > 0
				? new Date(
						Math.min(
							...activities.map((activity) => activity.plannedStart.getTime()),
						),
					)
				: project.startDate;
		const plannedEnd =
			activities.length > 0
				? new Date(
						Math.max(
							...activities.map((activity) => activity.plannedEnd.getTime()),
						),
					)
				: project.expectedEndDate;
		const summary = projectSummaries.find((item) => item.id === project.id);
		return {
			id: project.id,
			code: project.code,
			name: project.name,
			start: plannedStart?.toISOString() ?? null,
			end: plannedEnd?.toISOString() ?? null,
			risk: summary?.risk ?? "Pendiente",
			progress: summary?.realProgress ?? 0,
		};
	});

	const recentActivity = [
		...recentReports.slice(0, 5).map((report) => ({
			at: report.reportDate.toISOString(),
			title: `Informe ${report.reportNumber}`,
			detail: report.project
				? `${report.project.code} - ${report.project.name}`
				: "Sin proyecto",
			href: `/projects/${report.projectId}/progress`,
		})),
		...expensesForPeriod.slice(-5).map((expense) => ({
			at: expense.expenseDate.toISOString(),
			title: `Gasto ${expense.project.code}`,
			detail: `${expense.description.slice(0, 80)} - ${toNumber(expense.subtotal).toFixed(2)}`,
			href: "/finances",
		})),
		...paymentsForPeriod.slice(-5).map((payment) => ({
			at: payment.paymentDate.toISOString(),
			title: `Abono ${payment.project.code}`,
			detail: `${payment.paymentNumber} - ${toNumber(payment.amount).toFixed(2)}`,
			href: "/finances",
		})),
	]
		.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
		.slice(0, 8);

	const operationalAlerts = [
		...scheduleActivities
			.filter(
				(activity) =>
					activity.status !== "COMPLETED" && activity.plannedEnd < today,
			)
			.slice(0, 5)
			.map((activity) => ({
				severity: "Critico",
				title: "Actividad atrasada",
				detail: `${activity.projectCode} - ${activity.description}`,
				href: `/projects/${activity.projectId}/schedule`,
			})),
		...stockAlerts.slice(0, 4).map((stock) => ({
			severity: stock.level,
			title: "Stock bajo",
			detail: `${stock.material}: ${stock.quantity} / ${stock.minimum} ${stock.unit}`,
			href: "/inventory",
		})),
		...recentRequisitions
			.filter((requisition) =>
				activeRequisitionStatuses.includes(
					requisition.status as (typeof activeRequisitionStatuses)[number],
				),
			)
			.slice(0, 4)
			.map((requisition) => ({
				severity: requisition.priority === "URGENT" ? "Critico" : "Pendiente",
				title: requisition.title,
				detail: requisition.project
					? `${requisition.project.code} - ${requisition.items.length} items`
					: `${requisition.items.length} items`,
				href: "/requisitions",
			})),
	].slice(0, 10);

	return {
		totalProjects,
		activeProjects,
		baseBudgetTotal: toNumber(baseBudget._sum.baseBudget),
		approvedBudgetTotal: toNumber(approvedBudget._sum.grandTotal),
		spentTotal: toNumber(validExpenses._sum.subtotal),
		paidTotal: toNumber(registeredPayments._sum.amount),
		balanceTotal:
			toNumber(registeredPayments._sum.amount) -
			toNumber(validExpenses._sum.subtotal),
		plannedProgressAverage: calculatePlannedProgress(
			projectSnapshot.flatMap(
				(project) => project.schedules[0]?.activities ?? [],
			),
			today,
		),
		realProgressAverage: toNumber(averageProgress._avg.progressPercentage),
		pendingRequirements,
		pendingReports,
		overdueActivities,
		lowStock,
		peopleWorking,
		statusCounts: statusCounts.map(
			(item): StatusCount<ProjectStatus> => ({
				status: item.status,
				count: item._count.status,
			}),
		),
		activityStatusCounts: activityStatusCounts.map(
			(item): StatusCount<ScheduleActivityStatus> => ({
				status: item.status,
				count: item._count.status,
			}),
		),
		projectSummaries,
		timeline,
		financialFlow: Array.from(monthBuckets.values()),
		stockAlerts,
		ganttRows,
		recentActivity,
		operationalAlerts,
	};
}

export async function getProjectDashboard(projectId: string) {
	const today = new Date();
	const project = await prisma.project.findUnique({
		where: { id: projectId },
		include: {
			client: true,
			responsible: { select: { id: true, name: true, email: true } },
			members: {
				include: { user: { select: { id: true, name: true, email: true } } },
				orderBy: { createdAt: "asc" },
			},
			budgets: {
				include: {
					versions: {
						include: { sections: true },
						orderBy: [{ status: "asc" }, { versionNumber: "desc" }],
					},
				},
				orderBy: { updatedAt: "desc" },
			},
			schedules: {
				include: { activities: { orderBy: { position: "asc" } } },
				orderBy: { updatedAt: "desc" },
				take: 1,
			},
			dailyReports: {
				include: {
					laborEntries: true,
					materialEntries: true,
					activities: true,
					mediaEntries: { orderBy: { createdAt: "desc" }, take: 6 },
				},
				orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
				take: 5,
			},
			requisitions: {
				where: { status: { in: [...activeRequisitionStatuses] } },
				include: { items: true },
				orderBy: { requestedDate: "desc" },
				take: 5,
			},
			financialExpenses: {
				where: { status: "VALID" },
				orderBy: { expenseDate: "desc" },
				take: 8,
			},
			clientPayments: {
				where: { status: "REGISTERED" },
				orderBy: { paymentDate: "desc" },
				take: 8,
			},
			stockMovements: { orderBy: { createdAt: "desc" }, take: 6 },
		},
	});

	if (!project) return null;

	const approvedVersion = project.budgets
		.flatMap((budget) => budget.versions)
		.find((version) => version.status === "APPROVED");
	const latestVersion = project.budgets.flatMap((budget) => budget.versions)[0];
	const budgetVersion = approvedVersion ?? latestVersion;
	const budgetTotal =
		toNumber(budgetVersion?.grandTotal) || toNumber(project.baseBudget);
	const lineSubtotal = toNumber(budgetVersion?.lineSubtotal);
	const activities = project.schedules[0]?.activities ?? [];
	const plannedProgress = calculatePlannedProgress(activities, today);
	const realProgress =
		activities.length > 0
			? activities.reduce(
					(sum, activity) => sum + toNumber(activity.progress),
					0,
				) / activities.length
			: toNumber(project.progressPercentage);
	const spent = project.financialExpenses.reduce(
		(sum, expense) => sum + toNumber(expense.subtotal),
		0,
	);
	const paid = project.clientPayments.reduce(
		(sum, payment) => sum + toNumber(payment.amount),
		0,
	);
	const pendingReports = project.dailyReports.filter(
		(report) => report.status === "SUBMITTED" || report.status === "REVIEWED",
	).length;
	const latestReport = project.dailyReports[0] ?? null;
	const latestPeople =
		latestReport?.laborEntries.reduce(
			(sum, entry) => sum + toNumber(entry.people),
			0,
		) ?? 0;
	const latestMaterials =
		latestReport?.materialEntries.reduce(
			(sum, entry) => sum + toNumber(entry.quantityUsed),
			0,
		) ?? 0;
	const overdueActivities = activities.filter(
		(activity) =>
			activity.status !== "COMPLETED" && activity.plannedEnd < today,
	).length;
	const budgetSections = [...(budgetVersion?.sections ?? [])].sort(
		(a, b) => a.position - b.position,
	);
	const recentMedia = project.dailyReports
		.flatMap((report) =>
			report.mediaEntries.map((media) => ({
				...media,
				reportDate: report.reportDate,
				reportNumber: report.reportNumber,
			})),
		)
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
		.slice(0, 6);
	const activityCounts: Record<ScheduleActivityStatus, number> = {
		PENDING: 0,
		IN_PROGRESS: 0,
		BLOCKED: 0,
		COMPLETED: 0,
	};
	for (const activity of activities) {
		activityCounts[activity.status] += 1;
	}

	return {
		project,
		budget: {
			version: budgetVersion?.versionNumber ?? null,
			status: budgetVersion?.status ?? null,
			lineSubtotal,
			total: budgetTotal,
			spent,
			paid,
			balance: paid - spent,
			costVariance: budgetTotal - spent,
			sections: budgetSections,
		},
		progress: {
			planned: plannedProgress,
			real: realProgress,
			gap: realProgress - plannedProgress,
			risk: riskLabel(realProgress, plannedProgress, overdueActivities),
		},
		schedule: {
			title: project.schedules[0]?.title ?? "Sin cronograma",
			startDate: project.schedules[0]?.startDate,
			endDate: project.schedules[0]?.endDate,
			totalActivities: activities.length,
			overdueActivities,
			counts: activityCounts,
			activities,
			nextActivities: activities
				.filter((activity) => activity.status !== "COMPLETED")
				.sort((a, b) => a.plannedStart.getTime() - b.plannedStart.getTime())
				.slice(0, 5),
		},
		reports: {
			pending: pendingReports,
			latest: latestReport,
			recent: project.dailyReports,
			latestPeople,
			latestMaterials,
			recentMedia,
		},
		requisitions: project.requisitions,
		finance: {
			expenses: project.financialExpenses,
			payments: project.clientPayments,
		},
		stockMovements: project.stockMovements,
	};
}
