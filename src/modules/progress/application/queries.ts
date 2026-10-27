import type { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";

export async function getProjectProgressWorkspace(projectId: string) {
	const [
		project,
		schedule,
		latestReport,
		reports,
		inventoryResources,
		warehouses,
		projectDeliveries,
		projectConsumptions,
	] = await Promise.all([
		prisma.project.findUnique({
			where: { id: projectId },
			include: { responsible: true },
		}),
		prisma.schedule.findFirst({
			where: { projectId },
			include: { activities: { orderBy: { position: "asc" } } },
		}),
		prisma.dailyReport.findFirst({
			where: { projectId },
			include: {
				activities: { orderBy: { position: "asc" } },
				laborEntries: { orderBy: { position: "asc" } },
				materialEntries: { orderBy: { position: "asc" } },
				mediaEntries: {
					orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
				},
			},
			orderBy: [
				{ status: "asc" },
				{ reportDate: "desc" },
				{ createdAt: "desc" },
			],
		}),
		prisma.dailyReport.findMany({
			where: { projectId },
			orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
			take: 8,
		}),
		prisma.inventoryMaterial.findMany({
			where: { active: true, resourceType: "MATERIAL" },
			select: { id: true, code: true, name: true, unit: true },
			orderBy: { name: "asc" },
		}),
		prisma.warehouse.findMany({
			where: { active: true },
			select: { id: true, code: true, name: true },
			orderBy: { name: "asc" },
		}),
		prisma.stockMovement.findMany({
			where: { projectId, type: "OUT", dailyReportMaterialId: null },
			select: { materialId: true, warehouseId: true, quantity: true },
		}),
		prisma.dailyReportMaterial.findMany({
			where: {
				dailyReport: {
					projectId,
					status: { in: ["APPROVED", "PUBLISHED"] },
				},
				materialId: { not: null },
				warehouseId: { not: null },
			},
			select: {
				materialId: true,
				warehouseId: true,
				quantityUsed: true,
				wasteQuantity: true,
				returnedQuantity: true,
			},
		}),
	]);

	const deliveredByLocation = new Map<string, number>();
	for (const movement of projectDeliveries) {
		const key = `${movement.materialId}:${movement.warehouseId}`;
		deliveredByLocation.set(
			key,
			(deliveredByLocation.get(key) ?? 0) + movement.quantity.toNumber(),
		);
	}
	const consumedByLocation = new Map<string, number>();
	for (const entry of projectConsumptions) {
		if (!entry.materialId || !entry.warehouseId) continue;
		const key = `${entry.materialId}:${entry.warehouseId}`;
		consumedByLocation.set(
			key,
			(consumedByLocation.get(key) ?? 0) +
				entry.quantityUsed.toNumber() +
				entry.wasteQuantity.toNumber() +
				entry.returnedQuantity.toNumber(),
		);
	}
	const materialById = new Map(
		inventoryResources.map((material) => [material.id, material]),
	);
	const warehouseById = new Map(
		warehouses.map((warehouse) => [warehouse.id, warehouse]),
	);
	const projectResources = Array.from(deliveredByLocation.entries())
		.map(([key, delivered]) => {
			const [materialId, warehouseId] = key.split(":");
			const material = materialById.get(materialId);
			const warehouse = warehouseById.get(warehouseId);
			const available = delivered - (consumedByLocation.get(key) ?? 0);
			if (!material || !warehouse || available <= 0) return null;
			return {
				...material,
				warehouseId,
				warehouseCode: warehouse.code,
				warehouseName: warehouse.name,
				delivered,
				available,
			};
		})
		.filter((resource): resource is NonNullable<typeof resource> =>
			Boolean(resource),
		)
		.sort((left, right) => left.name.localeCompare(right.name, "es"));

	const enrichedSchedule = schedule
		? {
				...schedule,
				activities: schedule.activities.map((activity) => ({
					...activity,
					contractedQuantity: "100",
					measurementUnit: "%",
				})),
			}
		: null;

	return {
		project,
		schedule: enrichedSchedule,
		latestReport,
		reports,
		inventoryResources: projectResources,
	};
}

export async function getLatestDailyReportId(projectId: string) {
	return prisma.dailyReport.findFirst({
		where: { projectId },
		select: { id: true },
		orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
	});
}

export async function getDailyReportById(projectId: string, reportId: string) {
	return prisma.dailyReport.findFirst({
		where: { id: reportId, projectId },
		include: {
			project: { include: { client: true, responsible: true } },
			activities: { orderBy: { position: "asc" } },
			laborEntries: { orderBy: { position: "asc" } },
			materialEntries: { orderBy: { position: "asc" } },
			mediaEntries: {
				orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
			},
			approvedBy: true,
		},
	});
}

export async function getProjectEvidenceGallery(projectId: string) {
	return prisma.dailyReport.findMany({
		where: {
			projectId,
			mediaEntries: { some: {} },
		},
		include: {
			activities: { orderBy: { position: "asc" } },
			mediaEntries: {
				orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { id: "asc" }],
			},
		},
		orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
		take: 24,
	});
}

export const reportHistoryPeriods = ["30", "90", "todos"] as const;
export const reportHistoryStatuses = ["", "pendientes", "aprobados"] as const;
export type ReportHistoryPeriod = (typeof reportHistoryPeriods)[number];
export type ReportHistoryStatus = (typeof reportHistoryStatuses)[number];

export const REPORT_HISTORY_PAGE_SIZE = 20;

// Historial paginado: por defecto solo los últimos 30 días para que la vista
// diaria no se llene de informes viejos; "todos" sigue dando acceso completo.
export async function getProjectReportHistory(
	projectId: string,
	filters: {
		period: ReportHistoryPeriod;
		status: ReportHistoryStatus;
		page: number;
	},
) {
	const where: Prisma.DailyReportWhereInput = { projectId };
	if (filters.period !== "todos") {
		const since = new Date();
		since.setHours(0, 0, 0, 0);
		since.setDate(since.getDate() - Number(filters.period));
		where.reportDate = { gte: since };
	}
	if (filters.status === "pendientes") {
		where.status = { in: ["DRAFT", "SUBMITTED", "REVIEWED"] };
	} else if (filters.status === "aprobados") {
		where.status = { in: ["APPROVED", "PUBLISHED"] };
	}

	const [total, reports] = await Promise.all([
		prisma.dailyReport.count({ where }),
		prisma.dailyReport.findMany({
			where,
			orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }],
			skip: (filters.page - 1) * REPORT_HISTORY_PAGE_SIZE,
			take: REPORT_HISTORY_PAGE_SIZE,
		}),
	]);

	return { total, reports };
}
