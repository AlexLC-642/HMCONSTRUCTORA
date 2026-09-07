import {
	type InventoryMaterial,
	Prisma,
	type RequisitionStatus,
} from "@prisma/client";
import {
	createInventoryMaterialInTransaction,
	recordStockMovementInTransaction,
} from "@/modules/inventory/application/service";
import { prisma } from "@/shared/lib/prisma";
import {
	type RequisitionInput,
	type RequisitionMaterialLinkInput,
	requisitionInputSchema,
	requisitionMaterialLinkSchema,
} from "../domain/validation";

type RequisitionContext = { userId: string };

type LoadedRequisition = Prisma.RequisitionGetPayload<{
	include: {
		items: {
			include: {
				budgetLineItem: { include: { section: true } };
				scheduleActivity: true;
			};
		};
		warehouse: true;
		project: true;
	};
}>;

function nullable(value?: string | null) {
	const clean = value?.trim();
	return clean ? clean : null;
}

function decimal(value: number | string | Prisma.Decimal) {
	return new Prisma.Decimal(value || 0).toDecimalPlaces(2);
}

function normalizeForLookup(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim()
		.replace(/\s+/g, " ");
}

function codeCandidate(value: string) {
	return (
		value.trim().split(/\s|-/)[0]?.toUpperCase() ?? value.trim().toUpperCase()
	);
}

async function nextRequisitionNumber(tx: Prisma.TransactionClient) {
	const count = await tx.requisition.count();
	return `REQ-${String(count + 1).padStart(4, "0")}`;
}

async function findExistingMaterial(
	tx: Prisma.TransactionClient,
	value: string,
) {
	const normalized = normalizeForLookup(value);
	const code = codeCandidate(value);
	const materials = await tx.inventoryMaterial.findMany({
		where: { active: true },
		select: {
			id: true,
			code: true,
			name: true,
			unit: true,
			unitCost: true,
			resourceType: true,
		},
	});

	return (
		materials.find(
			(material) =>
				material.code.toUpperCase() === code ||
				normalizeForLookup(material.name) === normalized,
		) ?? null
	);
}

function ensureStatus(
	requisition: LoadedRequisition,
	allowed: RequisitionStatus[],
	message: string,
) {
	if (!allowed.includes(requisition.status)) throw new Error(message);
}

async function auditStatus(
	tx: Prisma.TransactionClient,
	requisition: { id: string; number: string; status: RequisitionStatus },
	context: RequisitionContext,
) {
	await tx.auditLog.create({
		data: {
			userId: context.userId,
			action: requisition.status === "APPROVED" ? "APPROVE" : "UPDATE",
			entityType: "Requisition",
			entityId: requisition.id,
			metadata: { number: requisition.number, status: requisition.status },
		},
	});
}

async function getRequisitionForTransition(
	tx: Prisma.TransactionClient,
	requisitionId: string,
) {
	return tx.requisition.findUniqueOrThrow({
		where: { id: requisitionId },
		include: {
			items: {
				include: {
					budgetLineItem: { include: { section: true } },
					scheduleActivity: true,
				},
			},
			warehouse: true,
			project: true,
		},
	});
}

function requisitionExpenseDocumentNumber(
	requisition: LoadedRequisition,
	itemId: string,
) {
	return `${requisition.number}-${itemId.slice(0, 8)}`.toUpperCase();
}

function requisitionExpenseNotes(
	requisition: LoadedRequisition,
	item: LoadedRequisition["items"][number],
	source: "PURCHASED" | "RECEIVED",
) {
	return [
		`Generado desde requerimiento ${requisition.number}.`,
		source === "PURCHASED" ? "Etapa: compra." : "Etapa: recepcion.",
		requisition.warehouse
			? `Bodega destino: ${requisition.warehouse.code} - ${requisition.warehouse.name}.`
			: null,
		item.notes,
	]
		.filter(Boolean)
		.join(" ");
}

async function ensureFinancialExpensesForRequisition(
	tx: Prisma.TransactionClient,
	requisition: LoadedRequisition,
	context: RequisitionContext,
	source: "PURCHASED" | "RECEIVED",
) {
	const projectId = requisition.projectId;
	if (!projectId) return;

	for (const item of requisition.items) {
		const quantity = decimal(item.quantity);
		const unitCost = decimal(item.estimatedCost);
		const subtotal = quantity.mul(unitCost).toDecimalPlaces(2);
		if (subtotal.lte(0)) continue;

		const sourceReference = requisitionExpenseDocumentNumber(
			requisition,
			item.id,
		);
		// requisitionItemId is unique on FinancialExpense: a requisition line can
		// originate only one purchase, and this check-then-create is backstopped
		// by a caught P2002 below in case of a concurrent double submit.
		const existing = await tx.financialExpense.findUnique({
			where: { requisitionItemId: item.id },
			select: { id: true },
		});
		if (existing) continue;

		let expense: { id: string };
		try {
			expense = await tx.financialExpense.create({
				data: {
					projectId,
					requisitionItemId: item.id,
					expenseDate: new Date(),
					description: item.description,
					vendor: null,
					quantity,
					unit: item.unit,
					subtotal,
					type: "Requerimiento",
					phase: item.budgetLineItem
						? `${item.budgetLineItem.section.code} - ${item.budgetLineItem.section.name}`
						: [
								item.scheduleActivity?.budgetSectionCode,
								item.scheduleActivity?.budgetSectionName,
							]
								.filter(Boolean)
								.join(" - ") || null,
					budgetSectionNo:
						item.budgetLineItem?.section.code ??
						item.scheduleActivity?.budgetSectionCode ??
						null,
					activity: requisition.title,
					// La requisición identifica el origen de la compra, pero no es una
					// factura emitida por el proveedor. El folio se captura al adjuntar
					// el comprobante real desde Finanzas.
					documentNumber: null,
					paymentMethod: null,
					notes: requisitionExpenseNotes(requisition, item, source),
					createdById: context.userId,
				},
			});
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2002"
			) {
				continue;
			}
			throw error;
		}

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "FinancialExpense",
				entityId: expense.id,
				metadata: {
					projectId,
					requisitionId: requisition.id,
					requisitionNumber: requisition.number,
					itemId: item.id,
					sourceReference,
					source,
					subtotal: subtotal.toNumber(),
				},
			},
		});
	}
}

export async function createRequisition(
	rawInput: unknown,
	context: RequisitionContext,
) {
	const parsed = requisitionInputSchema.parse(rawInput) as RequisitionInput;

	return prisma.$transaction(async (tx) => {
		const number = await nextRequisitionNumber(tx);
		const projectId =
			parsed.destinationType === "PROJECT" ? nullable(parsed.projectId) : null;
		const itemRecords: Prisma.RequisitionItemUncheckedCreateWithoutRequisitionInput[] =
			[];

		for (const item of parsed.items) {
			const budgetLineItemId = nullable(item.budgetLineItemId);
			if (budgetLineItemId) {
				if (!projectId) {
					throw new Error(
						"Una solicitud para bodega no puede usar una partida de proyecto.",
					);
				}
				const budgetLine = await tx.budgetLineItem.findFirst({
					where: {
						id: budgetLineItemId,
						section: {
							budgetVersion: {
								status: "APPROVED",
								budget: { projectId },
							},
						},
					},
					select: { id: true },
				});
				if (!budgetLine) {
					throw new Error(
						"Una partida seleccionada no pertenece al presupuesto aprobado del proyecto.",
					);
				}
			}

			const scheduleActivityId = nullable(item.scheduleActivityId);
			if (scheduleActivityId) {
				if (!projectId) {
					throw new Error(
						"Una solicitud para bodega no puede usar una actividad de proyecto.",
					);
				}
				const activity = await tx.scheduleActivity.findFirst({
					where: { id: scheduleActivityId, schedule: { projectId } },
					select: { id: true },
				});
				if (!activity) {
					throw new Error(
						"Una actividad seleccionada no pertenece al proyecto.",
					);
				}
			}

			let materialId = nullable(item.materialId);
			let material = materialId
				? await tx.inventoryMaterial.findUnique({
						where: { id: materialId },
						select: {
							id: true,
							code: true,
							name: true,
							unit: true,
							unitCost: true,
							resourceType: true,
						},
					})
				: null;
			const newMaterialName = nullable(item.description);

			if (!material && newMaterialName) {
				material = await findExistingMaterial(tx, newMaterialName);
				materialId = material?.id ?? materialId;
			}

			if (!material && item.catalogNewMaterial) {
				const unit = nullable(item.unit);
				if (!unit) throw new Error(`Indique la unidad de ${item.description}.`);
				material = await createInventoryMaterialInTransaction(
					tx,
					{
						name: item.description,
						resourceType: item.resourceType,
						specification: item.specification,
						brand: item.brand,
						model: item.model,
						trackIndividually: item.trackIndividually,
						unit,
						unitCost: item.estimatedCost,
						minimumStock: item.minimumStock,
					},
					context,
				);
				materialId = material.id;
			}

			itemRecords.push({
				materialId,
				budgetLineItemId,
				scheduleActivityId,
				description: material?.name ?? item.description,
				quantity: decimal(item.quantity),
				unit: material?.unit ?? nullable(item.unit),
				estimatedCost: material
					? decimal(material.unitCost)
					: decimal(item.estimatedCost),
				notes: nullable(item.itemNotes),
			});
		}

		const requisition = await tx.requisition.create({
			data: {
				number,
				projectId,
				warehouseId: nullable(parsed.warehouseId),
				title: parsed.title,
				destinationType: parsed.destinationType,
				priority: parsed.priority,
				type: parsed.items[0]?.resourceType ?? "MATERIAL",
				status: "REQUESTED",
				neededDate: parsed.neededDate
					? new Date(`${parsed.neededDate}T00:00:00.000Z`)
					: null,
				requestedBy: nullable(parsed.requestedBy),
				notes: nullable(parsed.notes),
				createdById: context.userId,
				items: {
					create: itemRecords,
				},
			},
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "Requisition",
				entityId: requisition.id,
				metadata: { number: requisition.number, status: requisition.status },
			},
		});

		return requisition;
	});
}

export async function linkRequisitionItemMaterial(
	rawInput: unknown,
	context: RequisitionContext,
) {
	const parsed = requisitionMaterialLinkSchema.parse(
		rawInput,
	) as RequisitionMaterialLinkInput;

	return prisma.$transaction(async (tx) => {
		const item = await tx.requisitionItem.findUniqueOrThrow({
			where: { id: parsed.requisitionItemId },
			include: { requisition: true, material: true },
		});
		if (item.materialId) {
			throw new Error("Este material ya está vinculado al catálogo.");
		}
		if (
			!["REQUESTED", "REVIEWED", "APPROVED", "PURCHASED"].includes(
				item.requisition.status,
			)
		) {
			throw new Error(
				"El material solo se puede vincular antes de recibir el requerimiento.",
			);
		}

		let material: InventoryMaterial;
		if (parsed.mode === "EXISTING") {
			if (!parsed.materialId) {
				throw new Error("Seleccione un material del catálogo.");
			}
			material = await tx.inventoryMaterial.findFirstOrThrow({
				where: { id: parsed.materialId, active: true },
			});
		} else {
			material = await createInventoryMaterialInTransaction(
				tx,
				{
					name: parsed.name ?? item.description,
					resourceType: parsed.resourceType,
					specification: parsed.specification,
					brand: parsed.brand,
					model: parsed.model,
					trackIndividually: parsed.trackIndividually,
					unit: parsed.unit ?? item.unit ?? "U",
					unitCost: parsed.unitCost,
					minimumStock: parsed.minimumStock,
					notes: `Creado desde el requerimiento ${item.requisition.number}.`,
				},
				context,
			);
		}

		const linkedItem = await tx.requisitionItem.update({
			where: { id: item.id },
			data: {
				materialId: material.id,
				unit: material.unit,
			},
		});
		await tx.requisition.update({
			where: { id: item.requisitionId },
			data: { type: material.resourceType },
		});

		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "RequisitionItem",
				entityId: linkedItem.id,
				metadata: {
					requisitionId: item.requisitionId,
					requisitionNumber: item.requisition.number,
					materialId: material.id,
					materialCode: material.code,
				},
			},
		});

		return linkedItem;
	});
}

export async function approveRequisition(
	requisitionId: string,
	context: RequisitionContext,
) {
	return prisma.$transaction(async (tx) => {
		const requisition = await getRequisitionForTransition(tx, requisitionId);
		ensureStatus(
			requisition,
			["REQUESTED", "REVIEWED"],
			"Solo se pueden aprobar requerimientos solicitados o revisados.",
		);

		const approved = await tx.requisition.update({
			where: { id: requisitionId },
			data: {
				status: "APPROVED",
				approvedAt: new Date(),
				approvedById: context.userId,
			},
		});

		await auditStatus(tx, approved, context);
		return approved;
	});
}

export async function reviewRequisition(
	requisitionId: string,
	context: RequisitionContext,
) {
	return prisma.$transaction(async (tx) => {
		const requisition = await getRequisitionForTransition(tx, requisitionId);
		ensureStatus(
			requisition,
			["REQUESTED"],
			"Solo se pueden revisar requerimientos solicitados.",
		);

		const reviewed = await tx.requisition.update({
			where: { id: requisitionId },
			data: { status: "REVIEWED" },
		});
		await auditStatus(tx, reviewed, context);
		return reviewed;
	});
}

export async function rejectRequisition(
	requisitionId: string,
	context: RequisitionContext,
) {
	return prisma.$transaction(async (tx) => {
		const requisition = await getRequisitionForTransition(tx, requisitionId);
		ensureStatus(
			requisition,
			["REQUESTED", "REVIEWED", "APPROVED"],
			"Solo se pueden rechazar requerimientos pendientes o aprobados.",
		);

		const rejected = await tx.requisition.update({
			where: { id: requisitionId },
			data: { status: "REJECTED" },
		});
		await auditStatus(tx, rejected, context);
		return rejected;
	});
}

export async function markRequisitionPurchased(
	requisitionId: string,
	context: RequisitionContext,
) {
	return prisma.$transaction(async (tx) => {
		const requisition = await getRequisitionForTransition(tx, requisitionId);
		ensureStatus(
			requisition,
			["APPROVED"],
			"Solo se pueden marcar como comprados los requerimientos aprobados.",
		);
		await ensureFinancialExpensesForRequisition(
			tx,
			requisition,
			context,
			"PURCHASED",
		);

		const purchased = await tx.requisition.update({
			where: { id: requisitionId },
			data: { status: "PURCHASED" },
		});
		await auditStatus(tx, purchased, context);
		return purchased;
	});
}

export async function receiveRequisition(
	requisitionId: string,
	context: RequisitionContext,
) {
	return prisma.$transaction(async (tx) => {
		const requisition = await getRequisitionForTransition(tx, requisitionId);
		ensureStatus(
			requisition,
			["PURCHASED"],
			"Registre primero la compra antes de recibir el requerimiento.",
		);
		if (!requisition.warehouseId)
			throw new Error(
				"Seleccione una bodega destino antes de recibir el requerimiento.",
			);
		if (requisition.items.some((item) => !item.materialId)) {
			throw new Error(
				"Vincule todos los materiales al catálogo antes de recibirlos en bodega.",
			);
		}
		for (const item of requisition.items) {
			await recordStockMovementInTransaction(
				tx,
				{
					materialId: item.materialId as string,
					warehouseId: requisition.warehouseId,
					projectId: requisition.projectId ?? undefined,
					type: "IN",
					quantity: item.quantity.toNumber(),
					unitCost: item.estimatedCost.toNumber(),
					reference: `Recepcion ${requisition.number}`,
					notes:
						item.notes ?? `Entrada desde requerimiento ${requisition.number}`,
					idempotencyKey: `requisition:${requisition.id}:item:${item.id}:received`,
				},
				context,
			);
		}

		const received = await tx.requisition.update({
			where: { id: requisitionId },
			data: { status: "RECEIVED" },
		});
		await auditStatus(tx, received, context);
		return received;
	});
}

export async function deliverRequisition(
	requisitionId: string,
	context: RequisitionContext,
) {
	return prisma.$transaction(async (tx) => {
		const requisition = await getRequisitionForTransition(tx, requisitionId);
		ensureStatus(
			requisition,
			["RECEIVED"],
			"Solo se pueden entregar requerimientos recibidos.",
		);
		if (requisition.destinationType !== "PROJECT") {
			throw new Error(
				"Este requerimiento abastece la bodega y no necesita entrega a una obra.",
			);
		}
		if (!requisition.projectId)
			throw new Error(
				"El requerimiento necesita proyecto para registrar la entrega.",
			);
		if (!requisition.warehouseId)
			throw new Error(
				"El requerimiento necesita bodega para registrar la salida.",
			);

		for (const item of requisition.items) {
			if (!item.materialId) continue;
			await recordStockMovementInTransaction(
				tx,
				{
					materialId: item.materialId,
					warehouseId: requisition.warehouseId,
					projectId: requisition.projectId,
					type: "OUT",
					quantity: item.quantity.toNumber(),
					unitCost: item.estimatedCost.toNumber(),
					reference: `Entrega ${requisition.number}`,
					notes: item.notes ?? `Salida a obra desde ${requisition.number}`,
					idempotencyKey: `requisition:${requisition.id}:item:${item.id}:delivered`,
				},
				context,
			);
		}

		const delivered = await tx.requisition.update({
			where: { id: requisitionId },
			data: { status: "DELIVERED" },
		});
		await auditStatus(tx, delivered, context);
		return delivered;
	});
}

export async function closeRequisition(
	requisitionId: string,
	context: RequisitionContext,
) {
	return prisma.$transaction(async (tx) => {
		const requisition = await getRequisitionForTransition(tx, requisitionId);
		ensureStatus(
			requisition,
			["RECEIVED", "DELIVERED"],
			"Solo se pueden cerrar requerimientos recibidos o entregados.",
		);

		const closed = await tx.requisition.update({
			where: { id: requisitionId },
			data: { status: "CLOSED" },
		});
		await auditStatus(tx, closed, context);
		return closed;
	});
}
