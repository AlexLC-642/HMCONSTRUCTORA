import { Prisma } from "@prisma/client";
import { prisma } from "@/shared/lib/prisma";

const budgetVersionInclude = {
	approvedBy: { select: { id: true, name: true, email: true } },
	sections: {
		include: {
			lineItems: {
				orderBy: [{ type: "asc" as const }, { position: "asc" as const }],
			},
		},
		orderBy: { position: "asc" as const },
	},
};

export async function getProjectBudget(projectId: string) {
	return prisma.budget.findFirst({
		where: { projectId },
		include: {
			project: { include: { client: true } },
			versions: {
				include: budgetVersionInclude,
				orderBy: { versionNumber: "desc" },
			},
		},
	});
}

export async function getApprovedBudgetChanges(projectId: string) {
	const [requisitionItems, directOrders] = await Promise.all([
		prisma.requisitionItem.findMany({
			where: {
				outsideBudget: true,
				requisition: {
					projectId,
					status: {
						in: ["APPROVED", "PURCHASED", "RECEIVED", "DELIVERED", "CLOSED"],
					},
				},
			},
			select: {
				id: true,
				description: true,
				quantity: true,
				unit: true,
				estimatedCost: true,
				outsideBudgetReason: true,
				requisition: {
					select: {
						number: true,
						approvedAt: true,
						approvedBy: { select: { name: true, email: true } },
					},
				},
			},
			orderBy: { requisition: { approvedAt: "asc" } },
		}),
		prisma.purchaseOrder.findMany({
			where: {
				projectId,
				requisitionId: null,
				budgetExceptionReason: { not: null },
				status: { in: ["ISSUED", "PARTIAL", "RECEIVED"] },
			},
			select: {
				number: true,
				issuedAt: true,
				taxPercentage: true,
				budgetExceptionReason: true,
				issuedBy: { select: { name: true, email: true } },
				items: {
					select: {
						id: true,
						description: true,
						quantity: true,
						unit: true,
						unitCost: true,
					},
				},
			},
		}),
	]);
	const items = [
		...requisitionItems.map((item) => ({
			...item,
			amount: item.quantity.mul(item.estimatedCost).toDecimalPlaces(2),
		})),
		...directOrders.flatMap((order) =>
			order.items.map((item) => ({
				id: item.id,
				description: item.description,
				quantity: item.quantity,
				unit: item.unit,
				estimatedCost: item.unitCost,
				outsideBudgetReason: order.budgetExceptionReason,
				requisition: {
					number: order.number,
					approvedAt: order.issuedAt,
					approvedBy: order.issuedBy,
				},
				amount: item.quantity
					.mul(item.unitCost)
					.mul(order.taxPercentage.div(100).add(1))
					.toDecimalPlaces(2),
			})),
		),
	].sort(
		(left, right) =>
			(left.requisition.approvedAt?.getTime() ?? 0) -
			(right.requisition.approvedAt?.getTime() ?? 0),
	);

	return {
		items,
		total: items.reduce(
			(sum, item) => sum.add(item.amount),
			new Prisma.Decimal(0),
		),
	};
}
