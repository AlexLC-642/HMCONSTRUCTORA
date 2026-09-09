import type { RequisitionStatus } from "@prisma/client";
import {
	hasProjectScopePortfolioAccess,
	projectScopeWhere,
} from "@/modules/auth/application/authorization";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import { prisma } from "@/shared/lib/prisma";
import { requisitionStatusFilters } from "../domain/validation";

type RequisitionWorkspaceFilters = {
	projectId?: string;
	warehouseId?: string;
	status?: string;
};

function clean(value?: string) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

function normalizeMaterial(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");
}

const requisitionStatusValues = new Set<RequisitionStatus>([
	"REQUESTED",
	"REVIEWED",
	"APPROVED",
	"PURCHASED",
	"RECEIVED",
	"DELIVERED",
	"CLOSED",
	"REJECTED",
]);
const purchasedStatuses = new Set<RequisitionStatus>([
	"PURCHASED",
	"RECEIVED",
	"DELIVERED",
	"CLOSED",
]);
const receivedStatuses = new Set<RequisitionStatus>([
	"RECEIVED",
	"DELIVERED",
	"CLOSED",
]);

export async function getRequisitionWorkspace(
	filters: RequisitionWorkspaceFilters = {},
	user: Pick<AuthenticatedUser, "id" | "roles">,
) {
	const projectId = clean(filters.projectId);
	const warehouseId = clean(filters.warehouseId);
	const requestedStatus = clean(filters.status);
	const groupedStatuses = requestedStatus
		? requisitionStatusFilters[
				requestedStatus as keyof typeof requisitionStatusFilters
			]?.statuses
		: undefined;
	const status =
		!groupedStatuses &&
		requestedStatus &&
		requisitionStatusValues.has(requestedStatus as RequisitionStatus)
			? (requestedStatus as RequisitionStatus)
			: undefined;
	const canSeeAllProjects = hasProjectScopePortfolioAccess(
		user,
		"requisitions",
	);

	const [projects, warehouses] = await Promise.all([
		prisma.project.findMany({
			where: projectScopeWhere(user, "requisitions"),
			select: { id: true, code: true, name: true },
			orderBy: { updatedAt: "desc" },
			take: 50,
		}),
		prisma.warehouse.findMany({
			where: { active: true },
			orderBy: { name: "asc" },
		}),
	]);

	const projectIds = projects.map((project) => project.id);
	const [
		requisitions,
		materials,
		approvedBudgets,
		requisitionItems,
		scheduleActivities,
	] = await Promise.all([
		prisma.requisition.findMany({
			where: {
				...(!canSeeAllProjects ? { projectId: { in: projectIds } } : {}),
				...(projectId ? { projectId } : {}),
				...(warehouseId ? { warehouseId } : {}),
				...(groupedStatuses
					? { status: { in: [...groupedStatuses] } }
					: status
						? { status }
						: {}),
			},
			include: {
				project: true,
				warehouse: true,
				items: {
					include: {
						material: true,
						budgetLineItem: true,
						scheduleActivity: true,
					},
				},
				createdBy: { select: { name: true, email: true } },
				approvedBy: { select: { name: true, email: true } },
			},
			orderBy: { createdAt: "desc" },
			take: 50,
		}),
		prisma.inventoryMaterial.findMany({
			where: { active: true },
			orderBy: { name: "asc" },
		}),
		prisma.budget.findMany({
			where: { projectId: { in: projectIds } },
			select: {
				projectId: true,
				versions: {
					where: { status: "APPROVED" },
					orderBy: { updatedAt: "desc" },
					take: 1,
					select: {
						versionNumber: true,
						sections: {
							select: {
								lineItems: {
									where: { type: "MATERIAL" },
									orderBy: { position: "asc" },
									select: {
										id: true,
										description: true,
										unit: true,
										quantity: true,
										unitPrice: true,
									},
								},
							},
						},
					},
				},
			},
		}),
		prisma.requisitionItem.findMany({
			where: {
				requisition: {
					projectId: { in: projectIds },
					status: { not: "REJECTED" },
				},
			},
			select: {
				budgetLineItemId: true,
				description: true,
				quantity: true,
				requisition: { select: { projectId: true, status: true } },
			},
		}),
		prisma.scheduleActivity.findMany({
			where: { schedule: { projectId: { in: projectIds } } },
			select: {
				id: true,
				code: true,
				description: true,
				schedule: { select: { projectId: true } },
			},
			orderBy: [{ scheduleId: "asc" }, { position: "asc" }],
		}),
	]);

	const requestedByMaterial = new Map<
		string,
		{ requested: number; purchased: number; received: number }
	>();
	for (const item of requisitionItems) {
		if (!item.requisition.projectId) continue;
		const key = item.budgetLineItemId
			? `${item.requisition.projectId}:budget:${item.budgetLineItemId}`
			: `${item.requisition.projectId}:legacy:${normalizeMaterial(item.description)}`;
		const current = requestedByMaterial.get(key) ?? {
			requested: 0,
			purchased: 0,
			received: 0,
		};
		const quantity = item.quantity.toNumber();
		current.requested += quantity;
		if (purchasedStatuses.has(item.requisition.status))
			current.purchased += quantity;
		if (receivedStatuses.has(item.requisition.status))
			current.received += quantity;
		requestedByMaterial.set(key, current);
	}

	const materialPlans = approvedBudgets.flatMap((budget) => {
		const version = budget.versions[0];
		if (!version) return [];
		const grouped = new Map<
			string,
			{
				id: string;
				budgetLineItemId: string;
				name: string;
				unit: string;
				planned: number;
				unitPrice: number;
			}
		>();

		for (const line of version.sections.flatMap(
			(section) => section.lineItems,
		)) {
			const name = line.description.trim();
			if (!name) continue;
			const key = line.id;
			const current = grouped.get(key);
			if (current) current.planned += line.quantity.toNumber();
			else
				grouped.set(key, {
					id: line.id,
					budgetLineItemId: line.id,
					name,
					unit: line.unit ?? "U",
					planned: line.quantity.toNumber(),
					unitPrice: line.unitPrice.toNumber(),
				});
		}

		return Array.from(grouped.values()).map((material) => {
			const progress = requestedByMaterial.get(
				`${budget.projectId}:budget:${material.budgetLineItemId}`,
			) ?? { requested: 0, purchased: 0, received: 0 };
			return {
				...material,
				id: `budget-${material.id}`,
				projectId: budget.projectId,
				budgetVersion: version.versionNumber,
				requested: progress.requested,
				purchased: progress.purchased,
				received: progress.received,
				pending: Math.max(material.planned - progress.requested, 0),
				source: "budget" as const,
			};
		});
	});

	const stockRows = await prisma.stock.findMany({
		where: {
			warehouseId: {
				in: requisitions
					.map((requisition) => requisition.warehouseId)
					.filter((id): id is string => Boolean(id)),
			},
			materialId: {
				in: requisitions.flatMap((requisition) =>
					requisition.items
						.map((item) => item.materialId)
						.filter((id): id is string => Boolean(id)),
				),
			},
		},
		select: { warehouseId: true, materialId: true, quantity: true },
	});
	const stockByLocation = new Map(
		stockRows.map((stock) => [
			`${stock.warehouseId}:${stock.materialId}`,
			stock.quantity.toNumber(),
		]),
	);
	const requisitionsWithAvailability = requisitions.map((requisition) => ({
		...requisition,
		items: requisition.items.map((item) => ({
			...item,
			availableStock:
				requisition.warehouseId && item.materialId
					? (stockByLocation.get(
							`${requisition.warehouseId}:${item.materialId}`,
						) ?? 0)
					: 0,
		})),
	}));

	return {
		requisitions: requisitionsWithAvailability,
		materials,
		warehouses,
		projects,
		materialPlans,
		scheduleActivities: scheduleActivities.map((activity) => ({
			id: activity.id,
			code: activity.code,
			description: activity.description,
			projectId: activity.schedule.projectId,
		})),
		selectedProjectId: projectId,
		selectedWarehouseId: warehouseId,
	};
}
