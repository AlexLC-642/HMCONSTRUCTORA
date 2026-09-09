import {
	hasProjectScopePortfolioAccess,
	projectScopeWhere,
} from "@/modules/auth/application/authorization";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import { prisma } from "@/shared/lib/prisma";
import {
	serializeMaterial,
	serializeMovement,
	serializeWarehouse,
} from "./serializers";

type InventoryCatalogFilters = {
	query?: string;
	status?: string;
	unit?: string;
	resourceType?: string;
	page?: number;
	pageSize?: number;
};

export type InventoryListFilters = {
	query?: string;
	materialId?: string;
	warehouseId?: string;
	projectId?: string;
	status?: string;
	type?: string;
	page?: number;
	pageSize?: number;
};

function clean(value?: string) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : undefined;
}

export async function getInventoryCatalog(
	filters: InventoryCatalogFilters = {},
) {
	const query = clean(filters.query);
	const status =
		filters.status === "active" || filters.status === "inactive"
			? filters.status
			: undefined;
	const unit = clean(filters.unit);
	const resourceType = ["MATERIAL", "TOOL", "EQUIPMENT"].includes(
		filters.resourceType ?? "",
	)
		? (filters.resourceType as "MATERIAL" | "TOOL" | "EQUIPMENT")
		: undefined;
	const pageSize = [25, 50, 100].includes(filters.pageSize ?? 25)
		? (filters.pageSize ?? 25)
		: 25;
	const page = Math.max(1, filters.page ?? 1);
	const materialWhere = {
		...(query
			? {
					OR: [
						{ code: { contains: query, mode: "insensitive" as const } },
						{ name: { contains: query, mode: "insensitive" as const } },
					],
				}
			: {}),
		...(status ? { active: status === "active" } : {}),
		...(unit ? { unit: { equals: unit, mode: "insensitive" as const } } : {}),
		...(resourceType ? { resourceType } : {}),
	};

	const [
		materials,
		totalMaterials,
		activeMaterials,
		inactiveMaterials,
		warehouses,
		stockRows,
		unitRows,
		resourceRows,
	] = await Promise.all([
		prisma.inventoryMaterial.findMany({
			where: materialWhere,
			orderBy: [{ active: "desc" }, { name: "asc" }],
			skip: (page - 1) * pageSize,
			take: pageSize,
		}),
		prisma.inventoryMaterial.count({ where: materialWhere }),
		prisma.inventoryMaterial.count({ where: { active: true } }),
		prisma.inventoryMaterial.count({ where: { active: false } }),
		prisma.warehouse.findMany({
			orderBy: [{ active: "desc" }, { name: "asc" }],
		}),
		prisma.stock.findMany({
			select: {
				materialId: true,
				warehouseId: true,
				quantity: true,
				material: { select: { minimumStock: true, unitCost: true } },
			},
		}),
		prisma.inventoryMaterial.findMany({
			distinct: ["unit"],
			select: { unit: true },
			orderBy: { unit: "asc" },
		}),
		prisma.inventoryMaterial.groupBy({
			by: ["resourceType"],
			where: { active: true },
			_count: { _all: true },
		}),
	]);

	const materialStats = new Map<
		string,
		{ total: number; warehouseCount: number; low: boolean }
	>();
	const warehouseStats = new Map<
		string,
		{ materialCount: number; total: number; value: number; alerts: number }
	>();
	for (const stock of stockRows) {
		const quantity = stock.quantity.toNumber();
		const material = materialStats.get(stock.materialId) ?? {
			total: 0,
			warehouseCount: 0,
			low: false,
		};
		material.total += quantity;
		material.warehouseCount += 1;
		material.low ||= stock.quantity.lte(stock.material.minimumStock);
		materialStats.set(stock.materialId, material);
		const warehouse = warehouseStats.get(stock.warehouseId) ?? {
			materialCount: 0,
			total: 0,
			value: 0,
			alerts: 0,
		};
		warehouse.materialCount += 1;
		warehouse.total += quantity;
		warehouse.value += quantity * stock.material.unitCost.toNumber();
		if (stock.quantity.lte(stock.material.minimumStock)) warehouse.alerts += 1;
		warehouseStats.set(stock.warehouseId, warehouse);
	}

	return {
		materials: materials.map((material) => ({
			...serializeMaterial(material),
			stats: materialStats.get(material.id) ?? {
				total: 0,
				warehouseCount: 0,
				low: false,
			},
		})),
		warehouses: warehouses.map((warehouse) => ({
			...serializeWarehouse(warehouse),
			stats: warehouseStats.get(warehouse.id) ?? {
				materialCount: 0,
				total: 0,
				value: 0,
				alerts: 0,
			},
		})),
		totalMaterials,
		activeMaterials,
		inactiveMaterials,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(totalMaterials / pageSize)),
		units: [...materialStats.values()].reduce(
			(sum, item) => sum + item.total,
			0,
		),
		unitsCatalog: unitRows.map((item) => item.unit),
		resourceCounts: Object.fromEntries(
			resourceRows.map((item) => [item.resourceType, item._count._all]),
		) as Partial<Record<"MATERIAL" | "TOOL" | "EQUIPMENT", number>>,
	};
}

export async function getStockDashboard(filters: InventoryListFilters = {}) {
	const query = clean(filters.query);
	const materialId = clean(filters.materialId);
	const warehouseId = clean(filters.warehouseId);
	const status = ["available", "low", "empty"].includes(filters.status ?? "")
		? filters.status
		: undefined;
	const materials = await prisma.inventoryMaterial.findMany({
		where: {
			active: true,
			...(query
				? {
						OR: [
							{ code: { contains: query, mode: "insensitive" as const } },
							{ name: { contains: query, mode: "insensitive" as const } },
						],
					}
				: {}),
			...(materialId ? { id: materialId } : {}),
		},
		orderBy: { name: "asc" },
	});
	const allWarehouses = await prisma.warehouse.findMany({
		where: { active: true },
		orderBy: { name: "asc" },
	});
	const stocks = await prisma.stock.findMany({
		where: {
			...(materialId ? { materialId } : {}),
			...(warehouseId ? { warehouseId } : {}),
		},
		include: { material: true, warehouse: true },
		orderBy: [{ material: { name: "asc" } }, { warehouse: { name: "asc" } }],
	});
	const purchases = await prisma.stockMovement.groupBy({
		by: ["materialId", "warehouseId"],
		where: {
			type: "IN",
			...(materialId ? { materialId } : {}),
			...(warehouseId ? { warehouseId } : {}),
		},
		_sum: { quantity: true, totalCost: true },
	});
	const purchaseIndex = new Map(
		purchases.map((item) => [
			`${item.materialId}:${item.warehouseId}`,
			{
				quantity: item._sum.quantity?.toNumber() ?? 0,
				total: item._sum.totalCost?.toNumber() ?? 0,
			},
		]),
	);
	const allRows = stocks.map((stock) => {
		const quantity = stock.quantity.toNumber();
		const purchase = purchaseIndex.get(
			`${stock.materialId}:${stock.warehouseId}`,
		);
		const unitCost =
			purchase && purchase.quantity > 0
				? purchase.total / purchase.quantity
				: stock.material.unitCost.toNumber();
		const value = quantity * unitCost;
		const rowStatus =
			quantity <= 0
				? "empty"
				: quantity <= stock.material.minimumStock.toNumber()
					? "low"
					: "available";
		return {
			id: stock.id,
			materialId: stock.materialId,
			warehouseId: stock.warehouseId,
			material: {
				id: stock.material.id,
				code: stock.material.code,
				name: stock.material.name,
				unit: stock.material.unit,
				minimumStock: stock.material.minimumStock.toNumber(),
			},
			warehouse: {
				id: stock.warehouse.id,
				code: stock.warehouse.code,
				name: stock.warehouse.name,
			},
			quantity,
			unitCost,
			value,
			status: rowStatus,
		};
	});
	const rows = allRows.filter((row) => !status || row.status === status);
	const stockByMaterial = new Map<string, number>();
	for (const row of rows)
		stockByMaterial.set(
			row.materialId,
			(stockByMaterial.get(row.materialId) ?? 0) + row.quantity,
		);
	const health = { available: 0, low: 0, empty: 0 };
	const allStockByMaterial = new Map<string, number>();
	for (const row of allRows)
		allStockByMaterial.set(
			row.materialId,
			(allStockByMaterial.get(row.materialId) ?? 0) + row.quantity,
		);
	for (const material of materials) {
		const quantity = allStockByMaterial.get(material.id) ?? 0;
		if (quantity <= 0) health.empty += 1;
		else if (quantity <= material.minimumStock.toNumber()) health.low += 1;
		else health.available += 1;
	}
	const warehouseValues = allWarehouses
		.map((warehouse) => {
			const warehouseRows = rows.filter(
				(row) => row.warehouseId === warehouse.id,
			);
			return {
				id: warehouse.id,
				code: warehouse.code,
				name: warehouse.name,
				value: warehouseRows.reduce((sum, row) => sum + row.value, 0),
				materialCount: new Set(
					warehouseRows
						.filter((row) => row.quantity > 0)
						.map((row) => row.materialId),
				).size,
			};
		})
		.sort((a, b) => b.value - a.value);
	return {
		materials: materials.map(serializeMaterial),
		warehouses: allWarehouses.map(serializeWarehouse),
		rows,
		health,
		warehouseValues,
		alerts: rows.filter((row) => row.status !== "available").slice(0, 5),
		totalMaterials: materials.length,
		activeMaterials: materials.length,
		activeWarehouses: allWarehouses.length,
		positionCount: rows.filter((row) => row.quantity > 0).length,
		inventoryValue: rows.reduce((sum, row) => sum + row.value, 0),
	};
}

export async function getMovementHistory(
	filters: InventoryListFilters = {},
	user: Pick<AuthenticatedUser, "id" | "roles">,
) {
	const pageSize = [25, 50, 100].includes(filters.pageSize ?? 25)
		? (filters.pageSize ?? 25)
		: 25;
	const page = Math.max(1, filters.page ?? 1);
	const query = clean(filters.query);
	const canSeePortfolio = hasProjectScopePortfolioAccess(user, "inventory");
	const allowedProjectWhere = projectScopeWhere(user, "inventory");
	const where = {
		...(!canSeePortfolio ? { project: allowedProjectWhere } : {}),
		...(filters.materialId ? { materialId: filters.materialId } : {}),
		...(filters.warehouseId ? { warehouseId: filters.warehouseId } : {}),
		...(filters.projectId ? { projectId: filters.projectId } : {}),
		...(filters.type
			? {
					type: filters.type as
						| "IN"
						| "OUT"
						| "RETURN"
						| "WASTE"
						| "ADJUSTMENT"
						| "TRANSFER",
				}
			: {}),
		...(query
			? {
					OR: [
						{ reference: { contains: query, mode: "insensitive" as const } },
						{
							material: {
								name: { contains: query, mode: "insensitive" as const },
							},
						},
					],
				}
			: {}),
	};
	const [items, total, movementGroups, materials, warehouses, projects] =
		await Promise.all([
			prisma.stockMovement.findMany({
				where,
				include: {
					material: true,
					warehouse: true,
					project: { select: { id: true, code: true, name: true } },
					createdBy: { select: { name: true } },
				},
				orderBy: { createdAt: "desc" },
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			prisma.stockMovement.count({ where }),
			prisma.stockMovement.groupBy({
				by: ["type"],
				where,
				_count: { _all: true },
				_sum: { totalCost: true },
			}),
			prisma.inventoryMaterial.findMany({
				where: { active: true },
				orderBy: { name: "asc" },
			}),
			prisma.warehouse.findMany({
				where: { active: true },
				orderBy: { name: "asc" },
			}),
			prisma.project.findMany({
				where: allowedProjectWhere,
				select: { id: true, code: true, name: true },
				orderBy: { updatedAt: "desc" },
				take: 50,
			}),
		]);
	const movementCounts = Object.fromEntries(
		movementGroups.map((item) => [item.type, item._count._all]),
	);
	const movedValue = movementGroups.reduce(
		(sum, item) => sum + (item._sum.totalCost?.toNumber() ?? 0),
		0,
	);
	return {
		items: items.map(serializeMovement),
		total,
		movementCounts,
		movedValue,
		page,
		pageSize,
		totalPages: Math.max(1, Math.ceil(total / pageSize)),
		materials: materials.map(serializeMaterial),
		warehouses: warehouses.map(serializeWarehouse),
		projects,
	};
}
