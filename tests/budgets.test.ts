import { describe, expect, it } from "vitest";
import { calculateBudget } from "@/modules/budgets/application/calculations";
import { budgetVersionInputSchema } from "@/modules/budgets/domain/validation";

describe("budget calculations", () => {
	it("exige el resumen financiero y rechaza negativos o porcentajes mayores a 100", () => {
		const validInput = {
			title: "Presupuesto validado",
			siteManagerCost: "0",
			contingencyPercentage: "0",
			administrationPercentage: "0",
			profitPercentage: "0",
			vatPercentage: "0",
			financingPercentage: "0",
			sections: [
				{
					code: "1",
					name: "Obra",
					position: 1,
					lineItems: [
						{
							type: "MATERIAL" as const,
							position: 1,
							description: "Material",
							quantity: "1",
							unit: "unidad",
							unitPrice: "10",
						},
					],
				},
			],
		};

		expect(budgetVersionInputSchema.safeParse(validInput).success).toBe(true);
		expect(
			budgetVersionInputSchema.safeParse({
				...validInput,
				siteManagerCost: "",
			}).success,
		).toBe(false);
		expect(
			budgetVersionInputSchema.safeParse({
				...validInput,
				siteManagerCost: "-1",
			}).success,
		).toBe(false);
		expect(
			budgetVersionInputSchema.safeParse({
				...validInput,
				vatPercentage: "101",
			}).success,
		).toBe(false);
	});

	it("calculates materials, labor with days, contingency and administration", () => {
		const input = budgetVersionInputSchema.parse({
			title: "Presupuesto",
			sourceReference: "PRESUPUESTO FASE 2 SHUSHU.pdf",
			notes: "",
			siteManagerCost: "6000.00",
			contingencyPercentage: "5.00",
			administrationPercentage: "15.00",
			profitPercentage: "0",
			vatPercentage: "0",
			financingPercentage: "0",
			sections: [
				{
					code: "5",
					name: "Levantado de block",
					category: "Levantado de muro",
					position: 1,
					lineItems: [
						{
							type: "MATERIAL",
							position: 1,
							description: "Cemento",
							quantity: "3",
							unit: "saco",
							unitPrice: "80.00",
						},
						{
							type: "MATERIAL",
							position: 2,
							description: "Arena",
							quantity: "1",
							unit: "m3",
							unitPrice: "150.00",
						},
						{
							type: "LABOR",
							position: 1,
							description: "Albanil",
							quantity: "3",
							days: "4",
							unit: "persona",
							unitPrice: "150.00",
						},
						{
							type: "LABOR",
							position: 2,
							description: "Ayudante",
							quantity: "3",
							days: "4",
							unit: "persona",
							unitPrice: "90.00",
						},
					],
				},
			],
		});

		const budget = calculateBudget(input);

		expect(budget.sections[0].materialSubtotal.toString()).toBe("390");
		expect(budget.sections[0].laborSubtotal.toString()).toBe("2880");
		expect(budget.lineSubtotal.toString()).toBe("3270");
		expect(budget.contingencyAmount.toString()).toBe("463.5");
		expect(budget.subtotal.toString()).toBe("9733.5");
		expect(budget.administrationAmount.toString()).toBe("1460.03");
		expect(budget.grandTotal.toString()).toBe("11193.53");
	});

	it("acumula utilidad, IVA y financiamiento en el orden del resumen", () => {
		const input = budgetVersionInputSchema.parse({
			title: "Presupuesto integrado",
			siteManagerCost: "100",
			contingencyPercentage: "5",
			administrationPercentage: "10",
			profitPercentage: "8",
			vatPercentage: "12",
			financingPercentage: "2",
			sections: [
				{
					code: "1",
					name: "Obra",
					position: 1,
					lineItems: [
						{
							type: "MATERIAL",
							position: 1,
							description: "Materiales",
							quantity: "1",
							unit: "global",
							unitPrice: "900",
						},
					],
				},
			],
		});

		const budget = calculateBudget(input);
		expect(budget.contingencyAmount.toString()).toBe("50");
		expect(budget.administrationAmount.toString()).toBe("105");
		expect(budget.profitAmount.toString()).toBe("92.4");
		expect(budget.vatAmount.toString()).toBe("149.69");
		expect(budget.financingAmount.toString()).toBe("27.94");
		expect(budget.grandTotal.toString()).toBe("1425.03");
	});

	it("calcula mano de obra por medida sin multiplicar jornadas", () => {
		const input = budgetVersionInputSchema.parse({
			title: "Presupuesto por medida",
			siteManagerCost: "0",
			contingencyPercentage: "0",
			administrationPercentage: "0",
			profitPercentage: "0",
			vatPercentage: "0",
			financingPercentage: "0",
			sections: [
				{
					code: "1",
					name: "Acabados",
					position: 1,
					lineItems: [
						{
							type: "LABOR",
							position: 1,
							description: "Colocacion",
							quantity: "10",
							days: "7",
							unit: "m²",
							unitPrice: "25",
						},
					],
				},
			],
		});

		expect(calculateBudget(input).grandTotal.toString()).toBe("250");
	});

	it("calcula la mano de obra global como un precio por trato", () => {
		const input = budgetVersionInputSchema.parse({
			title: "Presupuesto por trato",
			siteManagerCost: "0",
			contingencyPercentage: "0",
			administrationPercentage: "0",
			profitPercentage: "0",
			vatPercentage: "0",
			financingPercentage: "0",
			sections: [
				{
					code: "1",
					name: "Instalacion",
					position: 1,
					lineItems: [
						{
							type: "LABOR",
							position: 1,
							description: "Instalacion completa",
							quantity: "1",
							unit: "global",
							unitPrice: "5000",
						},
					],
				},
			],
		});

		expect(calculateBudget(input).grandTotal.toString()).toBe("5000");
	});
});
