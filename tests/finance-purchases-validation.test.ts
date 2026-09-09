import { describe, expect, it } from "vitest";
import {
	purchaseInvoiceInputSchema,
	supplierPaymentInputSchema,
} from "@/modules/finances/domain/validation";

describe("purchase finance validation", () => {
	it("requires the order, invoice identity, date and a positive total", () => {
		const invoice = {
			projectId: "project-1",
			purchaseOrderId: "order-1",
			expenseDate: "2026-09-07",
			documentNumber: "FACE-100",
			subtotal: 1500,
		};
		expect(purchaseInvoiceInputSchema.safeParse(invoice).success).toBe(true);
		expect(
			purchaseInvoiceInputSchema.safeParse({ ...invoice, documentNumber: "" })
				.success,
		).toBe(false);
		expect(
			purchaseInvoiceInputSchema.safeParse({ ...invoice, subtotal: -1 })
				.success,
		).toBe(false);
	});

	it("requires payment traceability and rejects zero or negative amounts", () => {
		const payment = {
			financialExpenseId: "expense-1",
			paymentDate: "2026-09-07",
			amount: 250,
			method: "Transferencia",
			reference: "TRX-100",
		};
		expect(supplierPaymentInputSchema.safeParse(payment).success).toBe(true);
		expect(
			supplierPaymentInputSchema.safeParse({ ...payment, reference: "" })
				.success,
		).toBe(false);
		expect(
			supplierPaymentInputSchema.safeParse({ ...payment, amount: 0 }).success,
		).toBe(false);
	});
});
