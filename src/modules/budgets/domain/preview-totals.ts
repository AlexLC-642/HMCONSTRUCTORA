import { laborUnitUsesJornadas } from "./units";

// Exact client-side mirror of application/calculations.ts. Every amount is an
// integer number of cents (BigInt), so the preview never drifts from the
// Prisma.Decimal totals the server stores, not even by one cent. Inputs are
// limited to 2 decimals by validation, so "hundredths" represent them exactly.

type PreviewLine = {
	type: "MATERIAL" | "LABOR" | "OTHER";
	quantity?: string;
	unit?: string;
	days?: string;
	unitPrice?: string;
};

type PreviewBudget = {
	siteManagerCost?: string;
	contingencyPercentage?: string;
	administrationPercentage?: string;
	profitPercentage?: string;
	vatPercentage?: string;
	financingPercentage?: string;
	sections: { lineItems: PreviewLine[] }[];
};

function toHundredths(value: string | undefined) {
	const match = /^(\d*)(?:\.(\d{0,2}))?$/.exec(value?.trim() ?? "");
	if (!match) return BigInt(0);
	return (
		BigInt(match[1] || "0") * BigInt(100) +
		BigInt((match[2] ?? "").padEnd(2, "0"))
	);
}

// Half-up division for non-negative values, same as Decimal.toDecimalPlaces(2).
function divideRounded(numerator: bigint, denominator: bigint) {
	return (numerator + denominator / BigInt(2)) / denominator;
}

function percentOf(cents: bigint, percentage: string | undefined) {
	return divideRounded(cents * toHundredths(percentage), BigInt(10000));
}

function toMoney(cents: bigint) {
	return Number(cents) / 100;
}

function lineCents(line: PreviewLine) {
	const quantity = toHundredths(line.quantity);
	const unitPrice = toHundredths(line.unitPrice);
	const days = toHundredths(line.days);

	if (line.type === "LABOR" && laborUnitUsesJornadas(line.unit) && days > 0) {
		return divideRounded(quantity * days * unitPrice, BigInt(10000));
	}

	return divideRounded(quantity * unitPrice, BigInt(100));
}

export function calculateLinePreview(line: PreviewLine) {
	return toMoney(lineCents(line));
}

export function calculateBudgetPreview(value: PreviewBudget) {
	const sectionCents = value.sections.map((section) => {
		const sumOf = (type: PreviewLine["type"]) =>
			section.lineItems
				.filter((line) => line.type === type)
				.reduce((sum, line) => sum + lineCents(line), BigInt(0));
		const material = sumOf("MATERIAL");
		const labor = sumOf("LABOR");
		const other = sumOf("OTHER");
		return { material, labor, other, total: material + labor + other };
	});

	const lineSubtotal = sectionCents.reduce(
		(sum, section) => sum + section.total,
		BigInt(0),
	);
	const siteManagerCost = toHundredths(value.siteManagerCost);
	const directCost = lineSubtotal + siteManagerCost;
	const contingencyAmount = percentOf(directCost, value.contingencyPercentage);
	const subtotal = directCost + contingencyAmount;
	const administrationAmount = percentOf(
		subtotal,
		value.administrationPercentage,
	);
	const afterAdministration = subtotal + administrationAmount;
	const profitAmount = percentOf(afterAdministration, value.profitPercentage);
	const afterProfit = afterAdministration + profitAmount;
	const vatAmount = percentOf(afterProfit, value.vatPercentage);
	const afterVat = afterProfit + vatAmount;
	const financingAmount = percentOf(afterVat, value.financingPercentage);

	return {
		sections: sectionCents.map((section) => ({
			materialSubtotal: toMoney(section.material),
			laborSubtotal: toMoney(section.labor),
			otherSubtotal: toMoney(section.other),
			total: toMoney(section.total),
		})),
		lineSubtotalTotal: toMoney(lineSubtotal),
		siteManagerCost: toMoney(siteManagerCost),
		directCost: toMoney(directCost),
		contingencyAmount: toMoney(contingencyAmount),
		subtotal: toMoney(subtotal),
		administrationAmount: toMoney(administrationAmount),
		profitAmount: toMoney(profitAmount),
		vatAmount: toMoney(vatAmount),
		financingAmount: toMoney(financingAmount),
		grandTotal: toMoney(afterVat + financingAmount),
	};
}
