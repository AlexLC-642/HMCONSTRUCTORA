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

// El orden de prioridad importa: "Renglón del presupuesto" (budgetSectionNo)
// es un dato estructurado (viene de un <select> con los renglones reales del
// presupuesto aprobado), mientras que "Fase" es texto libre sin validar. Antes
// "Fase" tenía prioridad sobre el renglón real, así que dos gastos del mismo
// renglón terminaban en tablas separadas si alguien escribía "Fase 1" en uno
// y lo dejaba vacío en otro (o los escribía distinto) - el agrupado del
// estado de cuenta y el PDF dependía de texto libre en vez del renglón que
// el usuario sí seleccionó correctamente. Ahora el renglón real siempre gana
// cuando existe; "Fase" solo agrupa los gastos que no tienen renglón asignado.
export function expenseGroupLabel(expense: StatementExpenseGroupInput) {
	const section = expense.requisitionItem?.budgetLineItem?.section;
	if (section) return `${section.code} - ${section.name}`;
	const activity = expense.requisitionItem?.scheduleActivity;
	if (activity?.budgetSectionCode || activity?.budgetSectionName) {
		return [activity.budgetSectionCode, activity.budgetSectionName]
			.filter(Boolean)
			.join(" - ");
	}

	const sectionNo = expense.budgetSectionNo?.trim();
	if (sectionNo) return `Renglón ${sectionNo}`;

	const phase = expense.phase?.trim();
	if (
		phase &&
		!["compra", "recepcion", "recepción"].includes(phase.toLowerCase())
	) {
		return phase;
	}

	return "Sin etapa asignada";
}

export function classifiedExpenseTotal<
	T extends { type?: string | null; subtotal: { toNumber(): number } },
>(expenses: T[], terms: string[]) {
	return expenses
		.filter((expense) =>
			terms.some((term) => (expense.type ?? "").toLowerCase().includes(term)),
		)
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
	const validExpenses = expenses.filter(
		(expense) => expense.status === "VALID",
	);
	const totalExpenses = validExpenses
		.reduce((sum, expense) => sum.add(expense.subtotal), new Prisma.Decimal(0))
		.toDecimalPlaces(2);
	const totalPayments = payments
		.filter((payment) => payment.status === "REGISTERED")
		.reduce((sum, payment) => sum.add(payment.amount), new Prisma.Decimal(0))
		.toDecimalPlaces(2);
	const hasPaymentDetail = expenses.some((expense) =>
		Array.isArray(expense.supplierPayments),
	);
	const totalSupplierPayments = hasPaymentDetail
		? validExpenses
				.flatMap((expense) => expense.supplierPayments ?? [])
				.filter((payment) => payment.status === "REGISTERED")
				.reduce(
					(sum, payment) => sum.add(payment.amount),
					new Prisma.Decimal(0),
				)
				.toDecimalPlaces(2)
		: totalExpenses;

	return {
		totalBudget,
		totalExpenses,
		totalPayments,
		totalSupplierPayments,
		availableBalance: totalPayments
			.sub(totalSupplierPayments)
			.toDecimalPlaces(2),
		budgetDifference: totalBudget.sub(totalExpenses).toDecimalPlaces(2),
	};
}
