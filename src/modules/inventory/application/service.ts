import { randomUUID } from "node:crypto";
import { Prisma, type StockMovementType } from "@prisma/client";
import { env } from "@/shared/lib/env";
import { prisma } from "@/shared/lib/prisma";
import {
	type InventoryMaterialInput,
	type InventoryMaterialUpdateInput,
	inventoryMaterialInputSchema,
	inventoryMaterialUpdateInputSchema,
	type StockMovementInput,
	stockMovementInputSchema,
	type WarehouseInput,
	type WasteReviewInput,
	warehouseInputSchema,
	wasteReviewInputSchema,
} from "../domain/validation";
import { evaluateWasteReview } from "../domain/waste-review";

type InventoryContext = {
	userId: string;
};

type InventoryTx = Prisma.TransactionClient;
type StockMovementMutationInput = Omit<
	StockMovementInput,
	"requestWasteReview"
> & {
	requestWasteReview?: boolean;
};

function nullable(value?: string | null) {
	const clean = value?.trim();
	return clean ? clean : null;
}

function decimal(value: number | string | Prisma.Decimal) {
	return new Prisma.Decimal(value || 0).toDecimalPlaces(2);
}

function signedQuantity(type: StockMovementType, quantity: Prisma.Decimal) {
	if (type === "OUT" || type === "WASTE") return quantity.neg();
	return quantity;
}

function normalizeForLookup(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");
}

function readableName(value: string) {
	const lowerWords = new Set([
		"de",
		"del",
		"la",
		"las",
		"el",
		"los",
		"y",
		"en",
		"para",
		"por",
	]);

	return value
		.trim()
		.replace(/\s+/g, " ")
		.split(" ")
		.map((part) => {
			const lower = part.toLowerCase();
			if (lowerWords.has(lower)) return lower;
			if (/[0-9]/.test(part) || part.length <= 3) return part.toUpperCase();
			return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
		})
		.join(" ");
}

function materialPrefix(name: string) {
	const firstWord = normalizeForLookup(name)
		.replace(/[^a-z0-9\s]/g, " ")
		.split(/\s+/)
		.find(Boolean);
	const letters =
		firstWord
			?.replace(/[^a-z]/g, "")
			.slice(0, 2)
			.toUpperCase() ?? "";
	return (letters || "MT").padEnd(2, "X").slice(0, 2);
}

function codeCandidate(value: string) {
	return (
		value.trim().split(/\s|-/)[0]?.toUpperCase() ?? value.trim().toUpperCase()
	);
}

function nextCode(existingCodes: string[], prefix: string) {
	const matcher = new RegExp(`^${prefix}(\\d{4})$`);
	const max = existingCodes.reduce((currentMax, code) => {
		const match = matcher.exec(code);
		return match ? Math.max(currentMax, Number(match[1])) : currentMax;
	}, 0);

	let sequence = max + 1;
	let code = `${prefix}${String(sequence).padStart(4, "0")}`;
	const used = new Set(existingCodes);
	while (used.has(code)) {
		sequence += 1;
		code = `${prefix}${String(sequence).padStart(4, "0")}`;
	}
	return code;
}

function nextWarehouseCode(existingCodes: string[]) {
	const matcher = /^BOD-(\d{4})$/;
	const max = existingCodes.reduce((currentMax, code) => {
		const match = matcher.exec(code);
		return match ? Math.max(currentMax, Number(match[1])) : currentMax;
	}, 0);
	let sequence = max + 1;
	let code = `BOD-${String(sequence).padStart(4, "0")}`;
	const used = new Set(existingCodes);
	while (used.has(code)) {
		sequence += 1;
		code = `BOD-${String(sequence).padStart(4, "0")}`;
	}
	return code;
}

export async function recordStockMovementInTransaction(
	tx: InventoryTx,
	input: StockMovementMutationInput & {
		dailyReportMaterialId?: string;
		idempotencyKey?: string;
	},
	context: InventoryContext,
) {
	if (input.idempotencyKey) {
		const existing = await tx.stockMovement.findUnique({
			where: { idempotencyKey: input.idempotencyKey },
		});
		if (existing) return existing;
	}

	const quantity = decimal(input.quantity ?? 0);
	const inputUnitCost = decimal(input.unitCost);
	const material = await tx.inventoryMaterial.findUniqueOrThrow({
		where: { id: input.materialId },
		select: { unitCost: true, resourceType: true },
	});
	const unitCost = inputUnitCost.gt(0)
		? inputUnitCost
		: decimal(material.unitCost);
	const destinationWarehouseId =
		input.destinationWarehouseId?.trim() || undefined;
	if (
		input.type === "TRANSFER" &&
		(!destinationWarehouseId || destinationWarehouseId === input.warehouseId)
	)
		throw new Error("El traslado requiere una bodega destino diferente.");
	if (input.type === "ADJUSTMENT" && input.physicalStock === undefined)
		throw new Error("El ajuste requiere el stock físico contado.");
	const sourceWarehouse = await tx.warehouse.findFirst({
		where: { id: input.warehouseId, active: true },
	});
	if (!sourceWarehouse)
		throw new Error("La bodega de origen no existe o está inactiva.");

	const current = await tx.stock.findUnique({
		where: {
			materialId_warehouseId: {
				materialId: input.materialId,
				warehouseId: input.warehouseId,
			},
		},
	});
	const currentQuantity = current?.quantity ?? new Prisma.Decimal(0);
	const delta =
		input.type === "ADJUSTMENT"
			? decimal(input.physicalStock ?? 0).sub(currentQuantity)
			: signedQuantity(input.type, quantity);
	const nextQuantity = currentQuantity.add(delta).toDecimalPlaces(2);

	if (nextQuantity.lt(0)) {
		throw new Error("La salida supera la existencia disponible en bodega.");
	}

	const destination =
		input.type === "TRANSFER"
			? await tx.warehouse.findFirst({
					where: { id: destinationWarehouseId, active: true },
				})
			: null;
	if (input.type === "TRANSFER" && !destination)
		throw new Error("La bodega destino no existe o está inactiva.");
	const transferGroupId = input.type === "TRANSFER" ? randomUUID() : undefined;
	const totalCost = quantity.mul(unitCost).toDecimalPlaces(2);
	const wasteReviewTriggers =
		input.type === "WASTE" && input.wasteReason
			? evaluateWasteReview({
					reason: input.wasteReason,
					resourceType: material.resourceType,
					totalCost: totalCost.toNumber(),
					reviewAmountThreshold: env.WASTE_REVIEW_AMOUNT_GTQ,
					requestedByUser: input.requestWasteReview ?? false,
				})
			: [];

	if (
		input.type === "OUT" ||
		input.type === "WASTE" ||
		input.type === "TRANSFER"
	) {
		const stockUpdate = await tx.stock.updateMany({
			where: {
				materialId: input.materialId,
				warehouseId: input.warehouseId,
				quantity: { gte: quantity },
			},
			data: { quantity: { decrement: quantity } },
		});
		if (stockUpdate.count !== 1) {
			throw new Error(
				"La existencia cambió mientras se registraba. Actualice e intente nuevamente.",
			);
		}
	} else if (input.type === "IN" || input.type === "RETURN") {
		await tx.stock.upsert({
			where: {
				materialId_warehouseId: {
					materialId: input.materialId,
					warehouseId: input.warehouseId,
				},
			},
			create: {
				materialId: input.materialId,
				warehouseId: input.warehouseId,
				quantity,
			},
			update: { quantity: { increment: quantity } },
		});
	} else {
		await tx.stock.upsert({
			where: {
				materialId_warehouseId: {
					materialId: input.materialId,
					warehouseId: input.warehouseId,
				},
			},
			create: {
				materialId: input.materialId,
				warehouseId: input.warehouseId,
				quantity: nextQuantity,
			},
			update: { quantity: nextQuantity },
		});
	}

	const movement = await tx.stockMovement.create({
		data: {
			materialId: input.materialId,
			warehouseId: input.warehouseId,
			transferGroupId,
			projectId: nullable(input.projectId),
			dailyReportMaterialId: input.dailyReportMaterialId,
			idempotencyKey: input.idempotencyKey,
			type: input.type,
			quantity: input.type === "ADJUSTMENT" ? delta.abs() : quantity,
			unitCost,
			totalCost,
			reference: nullable(input.reference),
			notes: nullable(input.notes),
			responsibleName: nullable(input.responsibleName),
			expectedReturnDate: input.expectedReturnDate
				? new Date(`${input.expectedReturnDate}T00:00:00.000Z`)
				: null,
			wasteReason: input.type === "WASTE" ? input.wasteReason : null,
			wasteReviewStatus:
				input.type === "WASTE"
					? wasteReviewTriggers.length > 0
						? "PENDING"
						: "NOT_REQUIRED"
					: null,
			wasteReviewTriggers:
				input.type === "WASTE" ? wasteReviewTriggers : Prisma.JsonNull,
			createdById: context.userId,
		},
	});
	if (input.type === "TRANSFER" && destinationWarehouseId) {
		await tx.stock.upsert({
			where: {
				materialId_warehouseId: {
					materialId: input.materialId,
					warehouseId: destinationWarehouseId,
				},
			},
			create: {
				materialId: input.materialId,
				warehouseId: destinationWarehouseId,
				quantity,
			},
			update: { quantity: { increment: quantity } },
		});
		await tx.stockMovement.create({
			data: {
				materialId: input.materialId,
				warehouseId: destinationWarehouseId,
				projectId: nullable(input.projectId),
				transferGroupId,
				type: "IN",
				quantity,
				unitCost,
				totalCost: quantity.mul(unitCost).toDecimalPlaces(2),
				reference: nullable(input.reference),
				notes: nullable(input.notes),
				createdById: context.userId,
			},
		});
	}
	return movement;
}

export async function createInventoryMaterialInTransaction(
	tx: InventoryTx,
	rawInput: unknown,
	context: InventoryContext,
) {
	const parsed = inventoryMaterialInputSchema.parse(
		rawInput,
	) as InventoryMaterialInput;
	const name = readableName(parsed.name);
	const normalizedName = normalizeForLookup(name);
	const explicitCode = nullable(parsed.code)?.toUpperCase();
	const lookupCode = explicitCode ?? codeCandidate(parsed.name);
	const unitCost = decimal(parsed.unitCost);
	const minimumStock = decimal(parsed.minimumStock);

	const existingMaterials = await tx.inventoryMaterial.findMany();
	const duplicate = existingMaterials.find(
		(material) =>
			material.code.toUpperCase() === lookupCode ||
			normalizeForLookup(material.name) === normalizedName,
	);
	if (duplicate) {
		return tx.inventoryMaterial.update({
			where: { id: duplicate.id },
			data: {
				name: duplicate.name,
				resourceType: parsed.resourceType,
				specification: nullable(parsed.specification),
				brand: nullable(parsed.brand),
				model: nullable(parsed.model),
				trackIndividually: parsed.trackIndividually,
				unit: parsed.unit.trim(),
				unitCost:
					unitCost.gt(0) || duplicate.unitCost.equals(0)
						? unitCost
						: duplicate.unitCost,
				minimumStock:
					minimumStock.gt(0) || duplicate.minimumStock.equals(0)
						? minimumStock
						: duplicate.minimumStock,
				notes: nullable(parsed.notes) ?? duplicate.notes,
				active: true,
			},
		});
	}

	const material = await tx.inventoryMaterial.create({
		data: {
			code:
				explicitCode ??
				nextCode(
					existingMaterials.map((material) => material.code),
					materialPrefix(name),
				),
			name,
			resourceType: parsed.resourceType,
			specification: nullable(parsed.specification),
			brand: nullable(parsed.brand),
			model: nullable(parsed.model),
			trackIndividually: parsed.trackIndividually,
			unit: parsed.unit.trim(),
			unitCost,
			minimumStock,
			notes: nullable(parsed.notes),
		},
	});

	await tx.auditLog.create({
		data: {
			userId: context.userId,
			action: "CREATE",
			entityType: "InventoryMaterial",
			entityId: material.id,
			metadata: { code: material.code, name: material.name },
		},
	});

	return material;
}

export async function createInventoryMaterial(
	rawInput: unknown,
	context: InventoryContext,
) {
	return prisma.$transaction((tx) =>
		createInventoryMaterialInTransaction(tx, rawInput, context),
	);
}

export async function updateInventoryMaterial(
	rawInput: unknown,
	context: InventoryContext,
) {
	const parsed = inventoryMaterialUpdateInputSchema.parse(
		rawInput,
	) as InventoryMaterialUpdateInput;
	const name = readableName(parsed.name);
	const normalizedName = normalizeForLookup(name);
	const explicitCode = nullable(parsed.code)?.toUpperCase();

	return prisma.$transaction(async (tx) => {
		const current = await tx.inventoryMaterial.findUniqueOrThrow({
			where: { id: parsed.id },
		});
		const existingMaterials = await tx.inventoryMaterial.findMany({
			where: { id: { not: parsed.id } },
			select: { code: true, name: true },
		});
		const duplicate = existingMaterials.find(
			(material) =>
				(explicitCode ? material.code.toUpperCase() === explicitCode : false) ||
				normalizeForLookup(material.name) === normalizedName,
		);

		if (duplicate) {
			throw new Error(
				`Este material ya existe como ${duplicate.code} - ${duplicate.name}.`,
			);
		}

		const material = await tx.inventoryMaterial.update({
			where: { id: current.id },
			data: {
				code: explicitCode ?? current.code,
				name,
				resourceType: parsed.resourceType,
				specification: nullable(parsed.specification),
				brand: nullable(parsed.brand),
				model: nullable(parsed.model),
				trackIndividually: parsed.trackIndividually,
				unit: parsed.unit.trim(),
				unitCost: decimal(parsed.unitCost),
				minimumStock: decimal(parsed.minimumStock),
				notes: nullable(parsed.notes),
				active: true,
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "InventoryMaterial",
				entityId: material.id,
				metadata: { code: material.code, name: material.name },
			},
		});

		return material;
	});
}

export async function createWarehouse(
	rawInput: unknown,
	context: InventoryContext,
) {
	const parsed = warehouseInputSchema.parse(rawInput) as WarehouseInput;
	const name = readableName(parsed.name);
	const normalizedName = normalizeForLookup(name);

	return prisma.$transaction(async (tx) => {
		const existingWarehouses = await tx.warehouse.findMany({
			select: { code: true, name: true },
		});
		const duplicate = existingWarehouses.find(
			(warehouse) => normalizeForLookup(warehouse.name) === normalizedName,
		);

		if (duplicate) {
			throw new Error(
				`Esta bodega ya esta registrada como "${duplicate.name} - ${duplicate.code}".`,
			);
		}

		const warehouse = await tx.warehouse.create({
			data: {
				code: nextWarehouseCode(
					existingWarehouses.map((warehouse) => warehouse.code),
				),
				name,
				location: nullable(parsed.location),
				notes: nullable(parsed.notes),
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "Warehouse",
				entityId: warehouse.id,
				metadata: { code: warehouse.code, name: warehouse.name },
			},
		});

		return warehouse;
	});
}

export async function recordStockMovement(
	rawInput: unknown,
	context: InventoryContext,
) {
	const parsed = stockMovementInputSchema.parse(rawInput) as StockMovementInput;

	return prisma.$transaction(async (tx) => {
		const movement = await recordStockMovementInTransaction(
			tx,
			parsed,
			context,
		);
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "StockMovement",
				entityId: movement.id,
				metadata: {
					type: movement.type,
					materialId: movement.materialId,
					warehouseId: movement.warehouseId,
				},
			},
		});
		return movement;
	});
}

export async function reviewWasteMovement(
	rawInput: unknown,
	context: InventoryContext,
) {
	const parsed = wasteReviewInputSchema.parse(rawInput) as WasteReviewInput;

	return prisma.$transaction(async (tx) => {
		const existing = await tx.stockMovement.findUniqueOrThrow({
			where: { id: parsed.movementId },
			select: {
				id: true,
				type: true,
				wasteReviewStatus: true,
				wasteReviewNotes: true,
			},
		});
		if (existing.type !== "WASTE" || !existing.wasteReviewStatus) {
			throw new Error(
				"El movimiento no corresponde a un desperdicio revisable.",
			);
		}
		if (
			existing.wasteReviewStatus !== "PENDING" &&
			existing.wasteReviewStatus !== "NEEDS_ACTION"
		) {
			throw new Error(
				"Este desperdicio ya fue cerrado o no requiere revisión.",
			);
		}

		const updated = await tx.stockMovement.updateMany({
			where: {
				id: parsed.movementId,
				type: "WASTE",
				wasteReviewStatus: { in: ["PENDING", "NEEDS_ACTION"] },
			},
			data: {
				wasteReviewStatus: parsed.status,
				wasteReviewNotes: nullable(parsed.notes),
				wasteReviewedById: context.userId,
				wasteReviewedAt: new Date(),
			},
		});
		if (updated.count !== 1) {
			throw new Error(
				"El desperdicio cambió mientras se revisaba. Actualice la página.",
			);
		}

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "StockMovementWasteReview",
				entityId: parsed.movementId,
				metadata: {
					previousStatus: existing.wasteReviewStatus,
					previousNotes: existing.wasteReviewNotes,
					status: parsed.status,
					notes: nullable(parsed.notes),
				},
			},
		});
	});
}

export async function consumeInventoryForDailyReport(
	tx: InventoryTx,
	projectId: string,
	reportNumber: string,
	materialEntries: Array<{
		id: string;
		materialName: string;
		warehouse: string | null;
		quantityUsed: Prisma.Decimal;
		wasteQuantity: Prisma.Decimal;
		returnedQuantity: Prisma.Decimal;
		unit: string | null;
		notes: string | null;
		materialId: string | null;
		warehouseId: string | null;
	}>,
	context: InventoryContext,
) {
	for (const entry of materialEntries) {
		const siteExit = entry.quantityUsed
			.add(entry.wasteQuantity)
			.add(entry.returnedQuantity);
		if (siteExit.lte(0)) continue;
		if (!entry.materialName.trim())
			throw new Error("Cada consumo necesita un material.");
		if (!entry.materialId)
			throw new Error(
				`El material ${entry.materialName} no está vinculado al inventario.`,
			);
		if (!entry.warehouseId)
			throw new Error(
				`El material ${entry.materialName} no tiene una entrega de obra vinculada.`,
			);

		const [material, warehouse] = await Promise.all([
			tx.inventoryMaterial.findUnique({ where: { id: entry.materialId } }),
			tx.warehouse.findUnique({ where: { id: entry.warehouseId } }),
		]);

		if (!material)
			throw new Error(
				`El material ${entry.materialName} no existe en el inventario.`,
			);
		if (!warehouse)
			throw new Error(
				`La bodega ${entry.warehouse} no existe o está inactiva.`,
			);

		const [deliveryTotals, previousUsage] = await Promise.all([
			tx.stockMovement.aggregate({
				where: {
					projectId,
					materialId: material.id,
					warehouseId: warehouse.id,
					type: "OUT",
					dailyReportMaterialId: null,
				},
				_sum: { quantity: true },
			}),
			tx.dailyReportMaterial.aggregate({
				where: {
					id: { not: entry.id },
					materialId: material.id,
					warehouseId: warehouse.id,
					dailyReport: {
						projectId,
						status: { in: ["APPROVED", "PUBLISHED"] },
					},
				},
				_sum: {
					quantityUsed: true,
					wasteQuantity: true,
					returnedQuantity: true,
				},
			}),
		]);
		const delivered = deliveryTotals._sum.quantity ?? new Prisma.Decimal(0);
		const previouslyUsed = (
			previousUsage._sum.quantityUsed ?? new Prisma.Decimal(0)
		)
			.add(previousUsage._sum.wasteQuantity ?? new Prisma.Decimal(0))
			.add(previousUsage._sum.returnedQuantity ?? new Prisma.Decimal(0));
		const availableAtProject = delivered.sub(previouslyUsed);
		if (siteExit.gt(availableAtProject)) {
			throw new Error(
				`El consumo de ${entry.materialName} supera lo disponible en obra (${availableAtProject.toFixed(2)} ${entry.unit ?? material.unit}).`,
			);
		}

		// La entrega ya descontó la bodega. Solo una devolución vuelve a ingresar.
		if (entry.returnedQuantity.gt(0)) {
			await recordStockMovementInTransaction(
				tx,
				{
					materialId: material.id,
					warehouseId: warehouse.id,
					projectId,
					type: "RETURN",
					quantity: entry.returnedQuantity.toNumber(),
					unitCost: 0,
					reference: `Devolución ${reportNumber}`,
					notes: entry.notes ?? "Devolución de material desde la obra.",
					dailyReportMaterialId: entry.id,
					idempotencyKey: `daily-report-material:${entry.id}:return`,
				},
				context,
			);
		}
	}
}
