import type { PurchaseOrderStatus } from "@prisma/client";
import {
	hasProjectScopePortfolioAccess,
	projectScopeWhere,
} from "@/modules/auth/application/authorization";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import { prisma } from "@/shared/lib/prisma";
import { documentFileUrl } from "@/modules/documents/domain/catalog";
import { purchaseOrderBudgetScope } from "../domain/order-rules";

export type PurchaseFilters = {
	query?: string;
	status?: string;
	supplierId?: string;
};

const statuses = new Set<PurchaseOrderStatus>([
	"DRAFT",
	"ISSUED",
	"PARTIAL",
	"RECEIVED",
	"CANCELED",
]);

function clean(value?: string) {
	const result = value?.trim();
	return result || undefined;
}

export async function getPurchaseWorkspace(
	user: Pick<AuthenticatedUser, "id" | "roles">,
	filters: PurchaseFilters = {},
) {
	const query = clean(filters.query);
	const supplierId = clean(filters.supplierId);
	const status = statuses.has(filters.status as PurchaseOrderStatus)
		? (filters.status as PurchaseOrderStatus)
		: undefined;
	const canSeePortfolio = hasProjectScopePortfolioAccess(user, "purchases");
	const projectWhere = projectScopeWhere(user, "purchases");
	const orderScope = canSeePortfolio ? {} : { project: projectWhere };

	const [
		suppliers,
		orders,
		readyRequisitions,
		projects,
		warehouses,
		materials,
	] = await Promise.all([
		prisma.supplier.findMany({
			select: {
				id: true,
				code: true,
				businessName: true,
				tradeName: true,
				taxId: true,
				contactName: true,
				email: true,
				phone: true,
				address: true,
				notes: true,
				status: true,
				purchaseOrders: {
					select: { total: true, status: true },
				},
			},
			orderBy: [{ status: "asc" }, { businessName: "asc" }],
		}),
		prisma.purchaseOrder.findMany({
			where: {
				...orderScope,
				...(supplierId ? { supplierId } : {}),
				...(status ? { status } : {}),
				...(query
					? {
							OR: [
								{ number: { contains: query } },
								{
									supplier: {
										businessName: { contains: query },
									},
								},
								{
									requisition: {
										number: { contains: query },
									},
								},
							],
						}
					: {}),
			},
			include: {
				supplier: {
					select: { id: true, code: true, businessName: true },
				},
				financialExpenses: {
					where: { status: "VALID" },
					select: {
						id: true,
						subtotal: true,
						documentNumber: true,
						expenseDate: true,
						supportingDocument: {
							select: {
								versions: {
									select: { id: true },
									orderBy: { versionNumber: "desc" },
									take: 1,
								},
							},
						},
						supplierPayments: {
							where: { status: "REGISTERED" },
							select: { amount: true, paymentDate: true },
						},
					},
				},
				project: { select: { id: true, code: true, name: true } },
				warehouse: { select: { id: true, code: true, name: true } },
				requisition: {
					select: {
						id: true,
						number: true,
						title: true,
						destinationType: true,
					},
				},
				items: {
					orderBy: { description: "asc" },
					include: {
						requisitionItem: {
							select: {
								outsideBudget: true,
								budgetLineItem: {
									select: {
										description: true,
										section: { select: { code: true, name: true } },
									},
								},
							},
						},
					},
				},
			},
			orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
		}),
		prisma.requisition.findMany({
			where: {
				status: "APPROVED",
				purchaseOrders: { none: { status: { not: "CANCELED" } } },
				...(!canSeePortfolio ? { project: projectWhere } : {}),
			},
			include: {
				project: { select: { id: true, code: true, name: true } },
				warehouse: { select: { id: true, code: true, name: true } },
				items: { orderBy: { description: "asc" } },
			},
			orderBy: [
				{ priority: "desc" },
				{ neededDate: "asc" },
				{ requestedDate: "asc" },
			],
		}),
		prisma.project.findMany({
			where: canSeePortfolio ? {} : projectWhere,
			select: { id: true, code: true, name: true },
			orderBy: [{ status: "asc" }, { name: "asc" }],
		}),
		prisma.warehouse.findMany({
			where: { active: true },
			select: { id: true, code: true, name: true },
			orderBy: { name: "asc" },
		}),
		prisma.inventoryMaterial.findMany({
			where: { active: true },
			select: {
				id: true,
				code: true,
				name: true,
				unit: true,
				unitCost: true,
				resourceType: true,
			},
			orderBy: [{ resourceType: "asc" }, { name: "asc" }],
		}),
	]);

	const supplierRows = suppliers.map((supplier) => ({
		id: supplier.id,
		code: supplier.code,
		businessName: supplier.businessName,
		tradeName: supplier.tradeName,
		taxId: supplier.taxId,
		contactName: supplier.contactName,
		email: supplier.email,
		phone: supplier.phone,
		address: supplier.address,
		notes: supplier.notes,
		status: supplier.status,
		orderCount: supplier.purchaseOrders.filter(
			(order) => order.status !== "CANCELED",
		).length,
		orderedValue: supplier.purchaseOrders
			.filter((order) => order.status !== "CANCELED")
			.reduce((total, order) => total + order.total.toNumber(), 0),
	}));
	const now = new Date();
	const today = new Date(
		Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()),
	);
	const orderRows = orders.map((order) => {
		const paidAmount = order.financialExpenses.reduce(
			(total, expense) =>
				total +
				expense.supplierPayments.reduce(
					(paymentTotal, payment) => paymentTotal + payment.amount.toNumber(),
					0,
				),
			0,
		);
		const trackedAmount = order.financialExpenses.reduce(
			(total, expense) => total + expense.subtotal.toNumber(),
			0,
		);
		const creditBalance = Math.max(0, order.total.toNumber() - paidAmount);
		const dueDate = order.paymentDueDate
			? new Date(order.paymentDueDate)
			: null;
		const creditStatus =
			order.paymentType !== "CREDIT"
				? null
				: trackedAmount <= 0
					? "PENDING_INVOICE"
					: creditBalance <= 0
						? "PAID"
						: dueDate && dueDate < today
							? "OVERDUE"
							: paidAmount > 0
								? "PARTIAL"
								: "PENDING";

		return {
			id: order.id,
			number: order.number,
			status: order.status,
			issueDate: order.issueDate.toISOString(),
			expectedDate: order.expectedDate?.toISOString() ?? null,
			paymentType: order.paymentType,
			paymentDueDate: order.paymentDueDate?.toISOString() ?? null,
			issuedAt: order.issuedAt?.toISOString() ?? null,
			currency: order.currency,
			subtotal: order.subtotal.toNumber(),
			taxPercentage: order.taxPercentage.toNumber(),
			taxAmount: order.taxAmount.toNumber(),
			total: order.total.toNumber(),
			notes: order.notes,
			invoiceCount: order.financialExpenses.length,
			invoicedAmount: order.financialExpenses.reduce(
				(total, expense) => total + expense.subtotal.toNumber(),
				0,
			),
			paidAmount,
			creditBalance,
			creditStatus,
			lastPaymentDate:
				order.financialExpenses
					.flatMap((expense) => expense.supplierPayments)
					.sort((a, b) => b.paymentDate.getTime() - a.paymentDate.getTime())[0]
					?.paymentDate.toISOString() ?? null,
			supplier: {
				id: order.supplier.id,
				code: order.supplier.code,
				businessName: order.supplier.businessName,
			},
			project: order.project,
			warehouse: order.warehouse,
			requisition: order.requisition,
			invoices: order.financialExpenses.map((expense) => {
				const versionId = expense.supportingDocument?.versions[0]?.id;
				return {
					id: expense.id,
					number: expense.documentNumber,
					date: expense.expenseDate.toISOString(),
					amount: expense.subtotal.toNumber(),
					fileUrl: versionId ? documentFileUrl(versionId) : null,
				};
			}),
			budgetExceptionReason: order.budgetExceptionReason,
			budgetScope: purchaseOrderBudgetScope({
				projectId: order.projectId,
				requisitionId: order.requisitionId,
				items: order.items.map((item) => ({
					outsideBudget: Boolean(item.requisitionItem?.outsideBudget),
				})),
			}),
			items: order.items.map((item) => {
				const line = item.requisitionItem?.budgetLineItem;
				return {
					id: item.id,
					description: item.description,
					quantity: item.quantity.toNumber(),
					unit: item.unit,
					unitCost: item.unitCost.toNumber(),
					subtotal: item.subtotal.toNumber(),
					receivedQuantity: item.receivedQuantity.toNumber(),
					outsideBudget: Boolean(item.requisitionItem?.outsideBudget),
					budgetLine: line
						? {
								description: line.description,
								sectionCode: line.section.code,
								sectionName: line.section.name,
							}
						: null,
				};
			}),
		};
	});
	const requisitionRows = readyRequisitions.map((requisition) => ({
		id: requisition.id,
		number: requisition.number,
		title: requisition.title,
		priority: requisition.priority,
		neededDate: requisition.neededDate?.toISOString() ?? null,
		destinationType: requisition.destinationType,
		project: requisition.project,
		warehouse: requisition.warehouse,
		items: requisition.items.map((item) => ({
			id: item.id,
			description: item.description,
			quantity: item.quantity.toNumber(),
			unit: item.unit,
			estimatedCost: item.estimatedCost.toNumber(),
		})),
		estimatedTotal: requisition.items.reduce(
			(total, item) =>
				total + item.quantity.toNumber() * item.estimatedCost.toNumber(),
			0,
		),
	}));
	const openOrders = orderRows.filter((order) =>
		["DRAFT", "ISSUED", "PARTIAL"].includes(order.status),
	);
	const receivedOrders = orderRows.filter(
		(order) => order.status === "RECEIVED",
	);
	const invoicedOrders = orderRows.filter((order) => order.invoiceCount > 0);

	return {
		suppliers: supplierRows,
		orders: orderRows,
		readyRequisitions: requisitionRows,
		projects,
		warehouses,
		materials: materials.map((material) => ({
			...material,
			unitCost: material.unitCost.toNumber(),
		})),
		metrics: {
			openOrders: openOrders.length,
			outsideBudgetOrders: orderRows.filter(
				(order) =>
					order.status !== "CANCELED" &&
					(order.budgetScope === "OUTSIDE" || order.budgetScope === "MIXED"),
			).length,
			openValue: openOrders.reduce((total, order) => total + order.total, 0),
			activeSuppliers: supplierRows.filter(
				(supplier) => supplier.status === "ACTIVE",
			).length,
			readyToBuy: requisitionRows.length,
			receivedOrders: receivedOrders.length,
			invoicedOrders: invoicedOrders.length,
		},
	};
}
