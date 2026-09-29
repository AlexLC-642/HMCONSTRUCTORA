import { describe, expect, it } from "vitest";
import { calculateBudget } from "@/modules/budgets/application/calculations";
import { calculateBudgetPreview } from "@/modules/budgets/domain/preview-totals";
import type { BudgetVersionInput } from "@/modules/budgets/domain/validation";

type Line = BudgetVersionInput["sections"][number]["lineItems"][number];

function line(
	type: Line["type"],
	quantity: string,
	unitPrice: string,
	unit = "unidad",
	days = "",
): Line {
	return {
		type,
		position: 1,
		description: "x",
		quantity,
		unit,
		days,
		unitPrice,
	};
}

function budget(
	sections: Line[][],
	financial: Partial<BudgetVersionInput> = {},
): BudgetVersionInput {
	return {
		title: "Presupuesto",
		sourceReference: "",
		notes: "",
		executorName: "",
		siteManagerCost: "0",
		contingencyPercentage: "0",
		administrationPercentage: "0",
		profitPercentage: "0",
		vatPercentage: "0",
		financingPercentage: "0",
		...financial,
		sections: sections.map((lineItems, index) => ({
			code: String(index + 1),
			name: `Renglon ${index + 1}`,
			category: "",
			position: index + 1,
			lineItems,
		})),
	};
}

function expectPreviewMatchesServer(input: BudgetVersionInput) {
	const server = calculateBudget(input);
	const preview = calculateBudgetPreview(input);
	const pairs: [string, { toFixed(digits: number): string }, number][] = [
		["lineSubtotal", server.lineSubtotal, preview.lineSubtotalTotal],
		["contingency", server.contingencyAmount, preview.contingencyAmount],
		["subtotal", server.subtotal, preview.subtotal],
		[
			"administration",
			server.administrationAmount,
			preview.administrationAmount,
		],
		["profit", server.profitAmount, preview.profitAmount],
		["vat", server.vatAmount, preview.vatAmount],
		["financing", server.financingAmount, preview.financingAmount],
		["grandTotal", server.grandTotal, preview.grandTotal],
	];
	for (const [name, expected, actual] of pairs) {
		expect(`${name}:${actual.toFixed(2)}`).toBe(
			`${name}:${expected.toFixed(2)}`,
		);
	}
	server.sections.forEach((section, index) => {
		expect(preview.sections[index]?.total.toFixed(2)).toBe(
			section.total.toFixed(2),
		);
	});
}

// Deterministic PRNG so failures are reproducible.
function random(seed: number) {
	let state = seed;
	return () => {
		state = (state * 1664525 + 1013904223) % 4294967296;
		return state / 4294967296;
	};
}

function decimalString(next: () => number, max: number) {
	return (Math.floor(next() * max * 100) / 100).toFixed(2);
}

describe("budget preview totals", () => {
	it("reproduce centavo a centavo el presupuesto de vivienda de Q300,000.00", () => {
		const input = budget(
			[
				[
					line("LABOR", "1", "3200", "global"),
					line("MATERIAL", "60", "7.50", "pie tablar"),
					line("MATERIAL", "4", "25", "rollo"),
					line("MATERIAL", "6", "38", "saco"),
					line("LABOR", "3", "150", "persona", "3"),
				],
				[
					line("LABOR", "26", "95", "m³"),
					line("MATERIAL", "80", "88", "saco"),
					line("MATERIAL", "7", "210", "m³"),
					line("MATERIAL", "8", "325", "m³"),
					line("MATERIAL", "17", "465", "quintal"),
					line("MATERIAL", "55", "9", "lb"),
					line("LABOR", "4", "160", "persona", "8"),
				],
				[
					line("MATERIAL", "2900", "6.25"),
					line("MATERIAL", "100", "88", "saco"),
					line("MATERIAL", "9", "210", "m³"),
					line("MATERIAL", "13", "465", "quintal"),
					line("MATERIAL", "5", "470", "quintal"),
					line("MATERIAL", "40", "9", "lb"),
					line("LABOR", "240", "85", "m²"),
				],
				[
					line("MATERIAL", "15", "465", "quintal"),
					line("MATERIAL", "88", "88", "saco"),
					line("MATERIAL", "6", "210", "m³"),
					line("MATERIAL", "9", "325", "m³"),
					line("MATERIAL", "820", "7.50", "pie tablar"),
					line("OTHER", "1", "4500", "global"),
					line("LABOR", "1", "16500", "global"),
				],
				[
					line("MATERIAL", "5", "185", "rollo"),
					line("MATERIAL", "4", "780", "rollo"),
					line("MATERIAL", "40", "4.50"),
					line("MATERIAL", "1", "650"),
					line("MATERIAL", "8", "75"),
					line("LABOR", "34", "225"),
				],
				[
					line("MATERIAL", "18", "42"),
					line("MATERIAL", "11", "245"),
					line("MATERIAL", "1", "2200", "lote"),
					line("MATERIAL", "2", "1150"),
					line("MATERIAL", "2", "650"),
					line("LABOR", "1", "8500", "global"),
				],
				[
					line("MATERIAL", "110", "115", "m²"),
					line("MATERIAL", "29", "72", "saco"),
					line("MATERIAL", "26", "145", "galón"),
					line("LABOR", "110", "55", "m²"),
					line("LABOR", "480", "12", "m²"),
				],
			],
			{
				siteManagerCost: "9417.34",
				contingencyPercentage: "5",
				administrationPercentage: "12",
				profitPercentage: "10",
				vatPercentage: "12",
			},
		);

		expectPreviewMatchesServer(input);
		expect(calculateBudgetPreview(input).grandTotal.toFixed(2)).toBe(
			"300000.00",
		);
	});

	it("redondea medio centavo hacia arriba igual que el servidor", () => {
		// 1.01 × 0.50 = 0.505 y 2.01 × 0.5 % = 0.01005: casos donde el punto
		// flotante puede quedar un centavo abajo.
		expectPreviewMatchesServer(budget([[line("MATERIAL", "1.01", "0.50")]]));
		expectPreviewMatchesServer(
			budget([[line("MATERIAL", "1", "2.01")]], { vatPercentage: "0.5" }),
		);
		expect(
			calculateBudgetPreview(budget([[line("MATERIAL", "1.01", "0.50")]]))
				.grandTotal,
		).toBe(0.51);
		expectPreviewMatchesServer(budget([[line("MATERIAL", "0.15", "6.70")]]));
		expectPreviewMatchesServer(
			budget([[line("MATERIAL", "1", "201")]], {
				contingencyPercentage: "0.25",
			}),
		);
		expectPreviewMatchesServer(
			budget([[line("LABOR", "0.5", "0.33", "persona", "0.03")]]),
		);
	});

	it("coincide con el servidor en 2,000 presupuestos aleatorios", () => {
		const next = random(20260929);
		const types: Line["type"][] = ["MATERIAL", "LABOR", "OTHER"];
		const units = ["persona", "unidad", "m²", "global"];

		for (let run = 0; run < 2000; run += 1) {
			const sections = Array.from({ length: 1 + Math.floor(next() * 4) }, () =>
				Array.from({ length: 1 + Math.floor(next() * 5) }, () => {
					const type = types[Math.floor(next() * types.length)] ?? "MATERIAL";
					const unit = units[Math.floor(next() * units.length)] ?? "unidad";
					return line(
						type,
						decimalString(next, 5000),
						decimalString(next, 20000),
						unit,
						next() < 0.8 ? decimalString(next, 60) : "",
					);
				}),
			);
			expectPreviewMatchesServer(
				budget(sections, {
					siteManagerCost: decimalString(next, 50000),
					contingencyPercentage: decimalString(next, 100),
					administrationPercentage: decimalString(next, 100),
					profitPercentage: decimalString(next, 100),
					vatPercentage: decimalString(next, 100),
					financingPercentage: decimalString(next, 100),
				}),
			);
		}
	});
});
