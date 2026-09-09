import { Prisma } from "@prisma/client";
import { recordStockMovementInTransaction } from "@/modules/inventory/application/service";
import { prisma } from "@/shared/lib/prisma";
import {
	type PurchaseOrderInput,
	type PurchaseReceiptInput,
	purchaseOrderInputSchema,
	purchaseReceiptInputSchema,
	type SupplierInput,
	supplierInputSchema,
} from "../domain/validation";

type PurchaseContext = { userId: string };

function nullable(value?: string | null) {
	const clean = value?.trim();
	return clean ? clean : null;
}

export async function receivePurchaseOrder(
	rawInput: unknown,
	context: PurchaseContext,
) {
	const parsed = purchaseReceiptInputSchema.parse(
		rawInput,
	) as PurchaseReceiptInput;
	return prisma.$transaction(async (tx) => {
		const order = await tx.purchaseOrder.findUnique({
			where: { id: parsed.purchaseOrderId },
			include: { items: true, requisition: true },
		});
		if (!order || !["ISSUED", "PARTIAL"].includes(order.status)) {
			throw new Error("Solo se pueden recibir ordenes emitidas o parciales.");
		}
		if (!order.warehouseId) {
			throw new Error("La orden necesita una bodega de recepcion.");
		}
		const requested = new Map(
			parsed.items.map((item) => [item.purchaseOrderItemId, item.quantity]),
		);
		const orderItemIds = new Set(order.items.map((item) => item.id));
		if (
			parsed.items.some((item) => !orderItemIds.has(item.purchaseOrderItemId))
		) {
			throw new Error(
				"La recepcion contiene un renglon que no pertenece a la orden.",
			);
		}
		const receivedDate = date(parsed.receivedDate);
		if (receivedDate < order.issueDate) {
			throw new Error(
				"La recepcion no puede ser anterior a la fecha de emision.",
			);
		}
		for (const item of order.items) {
			const quantity = new Prisma.Decimal(
				requested.get(item.id) ?? 0,
			).toDecimalPlaces(2);
			if (quantity.lte(0)) continue;
			const remaining = item.quantity
				.sub(item.receivedQuantity)
				.toDecimalPlaces(2);
			if (quantity.gt(remaining)) {
				throw new Error(
					`La recepcion de ${item.description} supera el saldo pendiente.`,
				);
			}
			if (!item.materialId) {
				throw new Error(
					`Vincule ${item.description} al catalogo de inventario antes de recibirlo.`,
				);
			}
			const receivedAfter = item.receivedQuantity
				.add(quantity)
				.toDecimalPlaces(2);
			await recordStockMovementInTransaction(
				tx,
				{
					materialId: item.materialId,
					warehouseId: order.warehouseId,
					projectId: order.projectId ?? undefined,
					type: "IN",
					quantity: quantity.toNumber(),
					unitCost: item.unitCost.toNumber(),
					reference: parsed.reference,
					notes: nullable(parsed.notes) ?? `Recepcion de ${order.number}`,
					idempotencyKey: `purchase-order:${order.id}:item:${item.id}:received:${receivedAfter.toString()}`,
				},
				context,
			);
			await tx.purchaseOrderItem.update({
				where: { id: item.id },
				data: { receivedQuantity: receivedAfter },
			});
		}
		const refreshed = await tx.purchaseOrderItem.findMany({
			where: { purchaseOrderId: order.id },
			select: { quantity: true, receivedQuantity: true },
		});
		const complete = refreshed.every((item) =>
			item.receivedQuantity.gte(item.quantity),
		);
		const updated = await tx.purchaseOrder.update({
			where: { id: order.id },
			data: {
				status: complete ? "RECEIVED" : "PARTIAL",
				receivedAt: complete ? receivedDate : null,
			},
		});
		if (complete && order.requisitionId && order.requisition) {
			await tx.requisition.update({
				where: { id: order.requisitionId },
				data: {
					status:
						order.requisition.destinationType === "WAREHOUSE"
							? "CLOSED"
							: "RECEIVED",
				},
			});
		}
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "PurchaseOrder",
				entityId: order.id,
				metadata: { status: updated.status, reference: parsed.reference },
			},
		});
		return updated;
	});
}

function date(value: string) {
	return new Date(`${value}T00:00:00.000Z`);
}

async function nextSupplierCode(tx: Prisma.TransactionClient) {
	const suppliers = await tx.supplier.findMany({ select: { code: true } });
	const highest = suppliers.reduce((max, supplier) => {
		const match = /^PROV-(\d{4})$/.exec(supplier.code);
		return match ? Math.max(max, Number(match[1])) : max;
	}, 0);
	return `PROV-${String(highest + 1).padStart(4, "0")}`;
}

async function nextOrderNumber(tx: Prisma.TransactionClient, issueDate: Date) {
	const year = issueDate.getUTCFullYear();
	const prefix = `OC-${year}-`;
	const orders = await tx.purchaseOrder.findMany({
		where: { number: { startsWith: prefix } },
		select: { number: true },
	});
	const highest = orders.reduce((max, order) => {
		const value = Number(order.number.slice(prefix.length));
		return Number.isFinite(value) ? Math.max(max, value) : max;
	}, 0);
	return `${prefix}${String(highest + 1).padStart(5, "0")}`;
}

export async function saveSupplier(
	rawInput: unknown,
	context: PurchaseContext,
) {
	const parsed = supplierInputSchema.parse(rawInput) as SupplierInput;
	return prisma.$transaction(async (tx) => {
		const duplicate = parsed.taxId
			? await tx.supplier.findFirst({
					where: {
						taxId: parsed.taxId.toUpperCase(),
						...(parsed.id ? { id: { not: parsed.id } } : {}),
					},
					select: { id: true },
				})
			: null;
		if (duplicate) throw new Error("Ya existe un proveedor con este NIT.");

		const data = {
			businessName: parsed.businessName,
			tradeName: nullable(parsed.tradeName),
			taxId: nullable(parsed.taxId)?.toUpperCase() ?? null,
			contactName: nullable(parsed.contactName),
			email: nullable(parsed.email)?.toLowerCase() ?? null,
			phone: nullable(parsed.phone),
			address: nullable(parsed.address),
			notes: nullable(parsed.notes),
		};
		const supplier = parsed.id
			? await tx.supplier.update({ where: { id: parsed.id }, data })
			: await tx.supplier.create({
					data: {
						...data,
						code: await nextSupplierCode(tx),
						createdById: context.userId,
					},
				});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: parsed.id ? "UPDATE" : "CREATE",
				entityType: "Supplier",
				entityId: supplier.id,
				metadata: { code: supplier.code, businessName: supplier.businessName },
			},
		});
		return supplier;
	});
}

export async function setSupplierActive(
	supplierId: string,
	active: boolean,
	context: PurchaseContext,
) {
	return prisma.$transaction(async (tx) => {
		if (!active) {
			const openOrders = await tx.purchaseOrder.count({
				where: {
					supplierId,
					status: { in: ["DRAFT", "ISSUED", "PARTIAL"] },
				},
			});
			if (openOrders > 0) {
				throw new Error(
					"No se puede desactivar un proveedor con órdenes abiertas.",
				);
			}
		}
		const supplier = await tx.supplier.update({
			where: { id: supplierId },
			data: { status: active ? "ACTIVE" : "INACTIVE" },
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "Supplier",
				entityId: supplier.id,
				metadata: { status: supplier.status },
			},
		});
		return supplier;
	});
}

export async function createPurchaseOrder(
	rawInput: unknown,
	context: PurchaseContext,
) {
	const parsed = purchaseOrderInputSchema.parse(rawInput) as PurchaseOrderInput;
	return prisma.$transaction(async (tx) => {
		const supplier = await tx.supplier.findUnique({
			where: { id: parsed.supplierId },
			select: { id: true, status: true },
		});
		if (supplier?.status !== "ACTIVE") {
			throw new Error("Seleccione un proveedor activo.");
		}
		const requisition = parsed.requisitionId
			? await tx.requisition.findUnique({
					where: { id: parsed.requisitionId },
					include: {
						items: true,
						purchaseOrders: {
							where: { status: { not: "CANCELED" } },
							select: { id: true },
						},
					},
				})
			: null;
		let projectId = nullable(parsed.projectId);
		let warehouseId = nullable(parsed.warehouseId);
		let orderItems: {
			requisitionItemId: string | null;
			materialId: string | null;
			description: string;
			quantity: Prisma.Decimal;
			unit: string | null;
			unitCost: Prisma.Decimal;
			subtotal: Prisma.Decimal;
			notes: string | null;
		}[];

		if (parsed.requisitionId) {
			if (requisition?.status !== "APPROVED") {
				throw new Error("Solo se pueden comprar solicitudes autorizadas.");
			}
			if (requisition.purchaseOrders.length > 0) {
				throw new Error("Esta solicitud ya tiene una orden de compra activa.");
			}
			const costs = new Map(
				parsed.items.map((item) => [item.requisitionItemId, item.unitCost]),
			);
			if (
				costs.size !== requisition.items.length ||
				requisition.items.some((item) => !costs.has(item.id))
			) {
				throw new Error(
					"La orden debe incluir todos los renglones de la solicitud.",
				);
			}
			projectId = requisition.projectId;
			warehouseId = requisition.warehouseId;
			orderItems = requisition.items.map((item) => {
				const unitCost = new Prisma.Decimal(
					costs.get(item.id) ?? 0,
				).toDecimalPlaces(2);
				return {
					requisitionItemId: item.id,
					materialId: item.materialId,
					description: item.description,
					quantity: item.quantity,
					unit: item.unit,
					unitCost,
					subtotal: item.quantity.mul(unitCost).toDecimalPlaces(2),
					notes: item.notes,
				};
			});
		} else {
			const warehouse = warehouseId
				? await tx.warehouse.findFirst({
						where: { id: warehouseId, active: true },
					})
				: null;
			if (!warehouse) {
				throw new Error("Seleccione una bodega activa para recibir la compra.");
			}
			if (projectId) {
				const project = await tx.project.findUnique({
					where: { id: projectId },
					select: { id: true },
				});
				if (!project) {
					throw new Error("El proyecto seleccionado ya no está disponible.");
				}
			}
			const materialIds = parsed.items.flatMap((item) =>
				item.materialId ? [item.materialId] : [],
			);
			const materials = await tx.inventoryMaterial.findMany({
				where: { id: { in: materialIds }, active: true },
				select: { id: true, name: true, unit: true },
			});
			if (new Set(materialIds).size !== materials.length) {
				throw new Error(
					"Uno de los artículos ya no está activo en Inventario.",
				);
			}
			const materialById = new Map(
				materials.map((material) => [material.id, material]),
			);
			orderItems = parsed.items.map((item) => {
				if (!item.materialId || !item.quantity) {
					throw new Error("Complete todos los renglones de la compra directa.");
				}
				const material = materialById.get(item.materialId);
				if (!material) {
					throw new Error("Uno de los artículos ya no está disponible.");
				}
				const quantity = new Prisma.Decimal(item.quantity).toDecimalPlaces(2);
				const unitCost = new Prisma.Decimal(item.unitCost).toDecimalPlaces(2);
				return {
					requisitionItemId: null,
					materialId: item.materialId,
					description: material.name,
					quantity,
					unit: material.unit,
					unitCost,
					subtotal: quantity.mul(unitCost).toDecimalPlaces(2),
					notes: null,
				};
			});
		}
		if (parsed.paymentType === "CREDIT" && !projectId) {
			throw new Error(
				"Asigne un proyecto para controlar la factura, los abonos y el vencimiento de la compra a crédito.",
			);
		}
		const subtotal = orderItems.reduce(
			(total, item) => total.add(item.subtotal),
			new Prisma.Decimal(0),
		);
		const taxPercentage = new Prisma.Decimal(
			parsed.taxPercentage,
		).toDecimalPlaces(2);
		const taxAmount = subtotal.mul(taxPercentage).div(100).toDecimalPlaces(2);
		const issueDate = date(parsed.issueDate);
		const order = await tx.purchaseOrder.create({
			data: {
				number: await nextOrderNumber(tx, issueDate),
				supplierId: supplier.id,
				requisitionId: requisition?.id ?? null,
				projectId,
				warehouseId,
				issueDate,
				expectedDate: parsed.expectedDate ? date(parsed.expectedDate) : null,
				paymentType: parsed.paymentType,
				paymentDueDate:
					parsed.paymentType === "CREDIT" && parsed.paymentDueDate
						? date(parsed.paymentDueDate)
						: null,
				subtotal,
				taxPercentage,
				taxAmount,
				total: subtotal.add(taxAmount),
				notes: nullable(parsed.notes),
				createdById: context.userId,
				items: { create: orderItems },
			},
		});
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "CREATE",
				entityType: "PurchaseOrder",
				entityId: order.id,
				metadata: {
					number: order.number,
					requisitionId: requisition?.id ?? null,
					origin: requisition ? "REQUISITION" : "DIRECT",
					paymentType: parsed.paymentType,
					supplierId: supplier.id,
					total: order.total.toString(),
				},
			},
		});
		return order;
	});
}

export async function issuePurchaseOrder(
	orderId: string,
	context: PurchaseContext,
) {
	return prisma.$transaction(async (tx) => {
		const order = await tx.purchaseOrder.findUnique({ where: { id: orderId } });
		if (order?.status !== "DRAFT") {
			throw new Error("Solo se pueden emitir órdenes en borrador.");
		}
		const issued = await tx.purchaseOrder.update({
			where: { id: orderId },
			data: {
				status: "ISSUED",
				issuedAt: new Date(),
				issuedById: context.userId,
			},
		});
		if (order.requisitionId) {
			await tx.requisition.updateMany({
				where: { id: order.requisitionId, status: "APPROVED" },
				data: { status: "PURCHASED" },
			});
		}
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "APPROVE",
				entityType: "PurchaseOrder",
				entityId: order.id,
				metadata: { number: order.number, status: "ISSUED" },
			},
		});
		return issued;
	});
}

export async function cancelPurchaseOrder(
	orderId: string,
	context: PurchaseContext,
) {
	return prisma.$transaction(async (tx) => {
		const order = await tx.purchaseOrder.findUnique({ where: { id: orderId } });
		if (!order || !["DRAFT", "ISSUED"].includes(order.status)) {
			throw new Error("Esta orden ya no se puede anular.");
		}
		const canceled = await tx.purchaseOrder.update({
			where: { id: orderId },
			data: { status: "CANCELED" },
		});
		if (order.status === "ISSUED" && order.requisitionId) {
			await tx.requisition.updateMany({
				where: { id: order.requisitionId, status: "PURCHASED" },
				data: { status: "APPROVED" },
			});
		}
		await tx.auditLog.create({
			data: {
				userId: context.userId,
				action: "UPDATE",
				entityType: "PurchaseOrder",
				entityId: order.id,
				metadata: { number: order.number, status: "CANCELED" },
			},
		});
		return canceled;
	});
}
