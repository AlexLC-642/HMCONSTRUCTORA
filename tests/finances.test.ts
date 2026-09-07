import { Prisma } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { calculateFinanceSummary, expenseGroupLabel } from "@/modules/finances/application/statement";

describe("resumen financiero", () => {
	it("separa compromisos, pagos a proveedores y caja sin contar anulados", () => {
		const result = calculateFinanceSummary(
			new Prisma.Decimal(850000),
			[
				{ subtotal: new Prisma.Decimal(63000), status: "VALID", supplierPayments: [{ amount: new Prisma.Decimal(10000), status: "REGISTERED" }] },
				{ subtotal: new Prisma.Decimal(9000), status: "VOID", supplierPayments: [{ amount: new Prisma.Decimal(9000), status: "REGISTERED" }] },
			],
			[{ amount: new Prisma.Decimal(20000), status: "REGISTERED" }],
		);

		expect(result.totalExpenses.toNumber()).toBe(63000);
		expect(result.totalSupplierPayments.toNumber()).toBe(10000);
		expect(result.availableBalance.toNumber()).toBe(10000);
		expect(result.budgetDifference.toNumber()).toBe(787000);
	});

	it("usa el renglón presupuestario y no la palabra Compra como etapa", () => {
		expect(expenseGroupLabel({ phase: "Compra" })).toBe("Sin etapa asignada");
		expect(expenseGroupLabel({ phase: "Compra", requisitionItem: { budgetLineItem: { section: { code: "2", name: "Movimiento de tierras" } } } })).toBe("2 - Movimiento de tierras");
		expect(expenseGroupLabel({ phase: "Compra", requisitionItem: { scheduleActivity: { budgetSectionCode: "1", budgetSectionName: "Trabajos preliminares" } } })).toBe("1 - Trabajos preliminares");
	});
});
