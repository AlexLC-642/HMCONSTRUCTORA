import { prisma } from "@/shared/lib/prisma";

export async function getProjectProgressWorkspace(projectId: string) {
	const [
		project,
		schedule,
		latestReport,
		reports,
		inventoryResources,
		warehouses,
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
	]);

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
		inventoryResources,
		warehouses,
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
