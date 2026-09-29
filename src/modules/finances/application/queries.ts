import { Prisma } from "@prisma/client";
import { projectScopeWhere } from "@/modules/auth/application/authorization";
import type { AuthenticatedUser } from "@/modules/auth/domain/types";
import { prisma } from "@/shared/lib/prisma";
import { allocateClientPrices } from "../domain/client-pricing";
import { calculateFinanceSummary } from "./statement";

export async function getFinanceWorkspace(
	user: Pick<AuthenticatedUser, "id" | "roles">,
	projectId?: string,
) {
	const projects = await prisma.project.findMany({
		where: projectScopeWhere(user, "finances"),
		select: { id: true, code: true, name: true, baseBudget: true },
		orderBy: { updatedAt: "desc" },
	});
	const selectedProjectId = projects.some((project) => project.id === projectId)
		? projectId
		: projects[0]?.id;

	if (!selectedProjectId) {
		return {
			projects,
			selectedProject: null,
			expenses: [],
			payments: [],
			payables: [],
			invoiceOrders: [],
			budgetSections: [],
			budgetVersion: null,
			summary: emptySummary(),
		};
	}

	const [selectedProject, expenses, payments, approvedBudget] =
		await Promise.all([
			prisma.project.findUnique({
				where: { id: selectedProjectId },
				select: { id: true, code: true, name: true, baseBudget: true },
			}),
			prisma.financialExpense.findMany({
				where: { projectId: selectedProjectId },
				include: {
					supplier: { select: { id: true, businessName: true, code: true } },
					purchaseOrder: {
						select: {
							id: true,
							number: true,
							status: true,
							total: true,
							paymentType: true,
							paymentDueDate: true,
						},
					},
					createdBy: { select: { name: true, email: true } },
					supportingDocument: {
						include: {
							category: true,
							author: { select: { id: true, name: true, email: true } },
							approvedBy: { select: { id: true, name: true, email: true } },
							versions: {
								orderBy: { versionNumber: "desc" },
								include: {
									uploadedBy: { select: { id: true, name: true, email: true } },
								},
							},
						},
					},
					supplierPayments: { orderBy: { paymentDate: "asc" } },
					requisitionItem: {
						select: {
							estimatedCost: true,
							quantity: true,
							description: true,
							budgetLineItem: {
								select: { section: { select: { code: true, name: true } } },
							},
							scheduleActivity: {
								select: { budgetSectionCode: true, budgetSectionName: true },
							},
						},
					},
				},
				orderBy: [{ expenseDate: "asc" }, { createdAt: "asc" }],
			}),
			prisma.clientPayment.findMany({
				where: { projectId: selectedProjectId },
				include: {
					createdBy: { select: { name: true, email: true } },
					budgetSection: {
						select: {
							id: true,
							code: true,
							name: true,
							total: true,
						},
					},
				},
				orderBy: [{ paymentDate: "asc" }, { createdAt: "asc" }],
			}),
			prisma.budgetVersion.findFirst({
				where: { budget: { projectId: selectedProjectId }, status: "APPROVED" },
				orderBy: { versionNumber: "desc" },
				select: {
					versionNumber: true,
					grandTotal: true,
					sections: {
						orderBy: { position: "asc" },
						select: {
							id: true,
							code: true,
							name: true,
							total: true,
							lineItems: {
								orderBy: { position: "asc" },
								select: {
									id: true,
									description: true,
									subtotal: true,
									unit: true,
								},
							},
						},
					},
				},
			}),
		]);

	const clientPrices = approvedBudget
		? allocateClientPrices(
				approvedBudget.sections.map((section) => ({
					id: section.id,
					total: section.total.toFixed(2),
				})),
				approvedBudget.grandTotal.toFixed(2),
			)
		: new Map<string, string>();
	const budgetSections =
		approvedBudget?.sections.map((section) => ({
			id: section.id,
			code: section.code,
			name: section.name,
			total: section.total,
			clientPrice: new Prisma.Decimal(clientPrices.get(section.id) ?? "0"),
			lineItemCount: section.lineItems.length,
		})) ?? [];

	const invoiceOrdersRaw = await prisma.purchaseOrder.findMany({
		where: {
			projectId: selectedProjectId,
			status: { in: ["ISSUED", "PARTIAL", "RECEIVED"] },
		},
		include: {
			supplier: {
				select: { id: true, businessName: true },
			},
			financialExpenses: {
				where: { status: "VALID" },
				select: { subtotal: true },
			},
		},
		orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
	});
	const invoiceOrders = invoiceOrdersRaw.map((order) => {
		// Decimal, not float: "available" pre-fills the invoice amount, and a
		// float like 10807.349999 breaks the input's step="0.01" validation.
		const invoiced = order.financialExpenses.reduce(
			(sum, expense) => sum.add(expense.subtotal),
			new Prisma.Decimal(0),
		);
		const available = Prisma.Decimal.max(
			order.total.sub(invoiced),
			new Prisma.Decimal(0),
		).toDecimalPlaces(2);
		return {
			id: order.id,
			number: order.number,
			status: order.status,
			paymentType: order.paymentType,
			paymentDueDate: order.paymentDueDate?.toISOString() ?? null,
			total: order.total.toNumber(),
			invoiced: invoiced.toNumber(),
			available: available.toNumber(),
			supplier: order.supplier,
		};
	});

	const payables = expenses
		.filter((expense) => expense.status === "VALID")
		.map((expense) => {
			const paid = expense.supplierPayments
				.filter((payment) => payment.status === "REGISTERED")
				.reduce(
					(sum, payment) => sum.add(payment.amount),
					new Prisma.Decimal(0),
				)
				.toDecimalPlaces(2);
			const pending = Prisma.Decimal.max(
				expense.subtotal.sub(paid),
				new Prisma.Decimal(0),
			).toDecimalPlaces(2);
			const estimatedTotal = expense.requisitionItem
				? expense.requisitionItem.estimatedCost
						.mul(expense.requisitionItem.quantity)
						.toDecimalPlaces(2)
				: null;
			return { expense, paid, pending, estimatedTotal };
		});

	return {
		projects,
		selectedProject,
		expenses,
		payments,
		payables,
		invoiceOrders,
		budgetSections,
		budgetVersion: approvedBudget?.versionNumber ?? null,
		summary: calculateFinanceSummary(
			selectedProject?.baseBudget ?? new Prisma.Decimal(0),
			expenses,
			payments,
		),
	};
}

function emptySummary() {
	return {
		totalBudget: new Prisma.Decimal(0),
		totalExpenses: new Prisma.Decimal(0),
		totalPayments: new Prisma.Decimal(0),
		totalSupplierPayments: new Prisma.Decimal(0),
		availableBalance: new Prisma.Decimal(0),
		budgetDifference: new Prisma.Decimal(0),
	};
}
