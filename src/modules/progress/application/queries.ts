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
