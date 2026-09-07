import { Prisma } from "@prisma/client";
import type {
	BudgetLineItemInput,
	BudgetSectionInput,
	BudgetVersionInput,
} from "../domain/validation";
import { laborUnitUsesJornadas } from "../domain/units";

const ZERO = new Prisma.Decimal(0);
const ONE_HUNDRED = new Prisma.Decimal(100);

export type CalculatedLine = BudgetLineItemInput & {
	subtotal: Prisma.Decimal;
};

export type CalculatedSection = Omit<BudgetSectionInput, "lineItems"> & {
	lineItems: CalculatedLine[];
	materialSubtotal: Prisma.Decimal;
	laborSubtotal: Prisma.Decimal;
	otherSubtotal: Prisma.Decimal;
	total: Prisma.Decimal;
};

export type CalculatedBudget = Omit<
	BudgetVersionInput,
	"sections" | "siteManagerCost"
> & {
	sections: CalculatedSection[];
	lineSubtotal: Prisma.Decimal;
	siteManagerCost: Prisma.Decimal;
	contingencyAmount: Prisma.Decimal;
	administrationAmount: Prisma.Decimal;
	profitAmount: Prisma.Decimal;
	vatAmount: Prisma.Decimal;
	financingAmount: Prisma.Decimal;
	subtotal: Prisma.Decimal;
	grandTotal: Prisma.Decimal;
};

function toDecimal(value: string | undefined) {
	return new Prisma.Decimal(value || "0");
}

function money(value: Prisma.Decimal) {
	return value.toDecimalPlaces(2);
}

function calculateLineSubtotal(line: BudgetLineItemInput) {
	const quantity = toDecimal(line.quantity);
	const unitPrice = toDecimal(line.unitPrice);

	if (
		line.type === "LABOR" &&
		laborUnitUsesJornadas(line.unit) &&
		line.days &&
		!toDecimal(line.days).isZero()
	) {
		return money(quantity.mul(toDecimal(line.days)).mul(unitPrice));
	}

	return money(quantity.mul(unitPrice));
}

export function calculateBudget(input: BudgetVersionInput): CalculatedBudget {
	const sections = input.sections.map((section) => {
		const lineItems = section.lineItems.map((line) => ({
			...line,
			subtotal: calculateLineSubtotal(line),
		}));

		const materialSubtotal = lineItems
			.filter((line) => line.type === "MATERIAL")
			.reduce((sum, line) => sum.add(line.subtotal), ZERO);
		const laborSubtotal = lineItems
			.filter((line) => line.type === "LABOR")
			.reduce((sum, line) => sum.add(line.subtotal), ZERO);
		const otherSubtotal = lineItems
			.filter((line) => line.type === "OTHER")
			.reduce((sum, line) => sum.add(line.subtotal), ZERO);
		const total = materialSubtotal.add(laborSubtotal).add(otherSubtotal);

		return {
			...section,
			lineItems,
			materialSubtotal,
			laborSubtotal,
			otherSubtotal,
			total,
		};
	});

	const lineSubtotal = sections.reduce(
		(sum, section) => sum.add(section.total),
		ZERO,
	);
	const siteManagerCost = toDecimal(input.siteManagerCost);
	const contingencyAmount = money(
		lineSubtotal
			.add(siteManagerCost)
			.mul(toDecimal(input.contingencyPercentage))
			.div(ONE_HUNDRED),
	);
	const subtotal = money(
		lineSubtotal.add(siteManagerCost).add(contingencyAmount),
	);
	const administrationAmount = money(
		subtotal.mul(toDecimal(input.administrationPercentage)).div(ONE_HUNDRED),
	);
	const afterAdministration = subtotal.add(administrationAmount);
	const profitAmount = money(
		afterAdministration.mul(toDecimal(input.profitPercentage)).div(ONE_HUNDRED),
	);
	const afterProfit = afterAdministration.add(profitAmount);
	const vatAmount = money(
		afterProfit.mul(toDecimal(input.vatPercentage)).div(ONE_HUNDRED),
	);
	const afterVat = afterProfit.add(vatAmount);
	const financingAmount = money(
		afterVat.mul(toDecimal(input.financingPercentage)).div(ONE_HUNDRED),
	);
	const grandTotal = money(afterVat.add(financingAmount));

	return {
		...input,
		sections,
		lineSubtotal,
		siteManagerCost,
		contingencyAmount,
		administrationAmount,
		profitAmount,
		vatAmount,
		financingAmount,
		subtotal,
		grandTotal,
	};
}
