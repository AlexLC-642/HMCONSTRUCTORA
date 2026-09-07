import { Prisma } from "@prisma/client";

export type StatementExpenseGroupInput = {
	phase?: string | null;
	budgetSectionNo?: string | null;
	requisitionItem?: {
		budgetLineItem?: { section: { code: string; name: string } } | null;
		scheduleActivity?: {
			budgetSectionCode?: string | null;
			budgetSectionName?: string | null;
		} | null;
	} | null;
};

export function expenseGroupLabel(expense: StatementExpenseGroupInput) {
	const section = expense.requisitionItem?.budgetLineItem?.section;
	if (section) return `${section.code} - ${section.name}`;
	const activity = expense.requisitionItem?.scheduleActivity;
	if (activity?.budgetSectionCode || activity?.budgetSectionName) {
		return [activity.budgetSectionCode, activity.budgetSectionName]
			.filter(Boolean)
			.join(" - ");
	}

	const phase = expense.phase?.trim();
	if (phase && !["compra", "recepcion", "recepción"].includes(phase.toLowerCase())) {
		return phase;
	}

	const sectionNo = expense.budgetSectionNo?.trim();
	return sectionNo ? `Renglón ${sectionNo}` : "Sin etapa asignada";
}

export function classifiedExpenseTotal<T extends { type?: string | null; subtotal: { toNumber(): number } }>(expenses: T[], terms: string[]) {
	return expenses
		.filter((expense) => terms.some((term) => (expense.type ?? "").toLowerCase().includes(term)))
		.reduce((sum, expense) => sum + expense.subtotal.toNumber(), 0);
}

export function calculateFinanceSummary(
	totalBudget: Prisma.Decimal,
	expenses: Array<{
		subtotal: Prisma.Decimal;
		status: string;
		supplierPayments?: Array<{ amount: Prisma.Decimal; status: string }>;
	}>,
	payments: Array<{ amount: Prisma.Decimal; status: string }>,
) {
	const validExpenses = expenses.filter((expense) => expense.status === "VALID");
	const totalExpenses = validExpenses
		.reduce((sum, expense) => sum.add(expense.subtotal), new Prisma.Decimal(0))
		.toDecimalPlaces(2);
	const totalPayments = payments
		.filter((payment) => payment.status === "REGISTERED")
		.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0))
		.toDecimalPlaces(2);
	const hasPaymentDetail = expenses.some((expense) => Array.isArray(expense.supplierPayments));
	const totalSupplierPayments = hasPaymentDetail
		? validExpenses
				.flatMap((expense) => expense.supplierPayments ?? [])
				.filter((payment) => payment.status === "REGISTERED")
				.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0))
				.toDecimalPlaces(2)
		: totalExpenses;

	return {
		totalBudget,
		totalExpenses,
		totalPayments,
		totalSupplierPayments,
		availableBalance: totalPayments.sub(totalSupplierPayments).toDecimalPlaces(2),
		budgetDifference: totalBudget.sub(totalExpenses).toDecimalPlaces(2),
	};
}
