import { describe, expect, it } from "vitest";
import {
	purchaseOrderBudgetScope,
	purchaseOrderCancelBlocker,
	purchaseOrderTracksFinance,
} from "@/modules/purchases/domain/order-rules";

describe("purchase order cancel rules", () => {
	it("allows cancelling drafts and issued orders without receipts or invoices", () => {
		expect(
			purchaseOrderCancelBlocker({
				status: "DRAFT",
				validInvoiceCount: 0,
				hasReceipts: false,
			}),
		).toBeNull();
		expect(
			purchaseOrderCancelBlocker({
				status: "ISSUED",
				validInvoiceCount: 0,
				hasReceipts: false,
			}),
		).toBeNull();
	});

	it("blocks cancelling an order that already has invoices in Finanzas", () => {
		expect(
			purchaseOrderCancelBlocker({
				status: "ISSUED",
				validInvoiceCount: 1,
				hasReceipts: false,
			}),
		).toMatch(/factura registrada en Finanzas/);
		expect(
			purchaseOrderCancelBlocker({
				status: "ISSUED",
				validInvoiceCount: 3,
				hasReceipts: false,
			}),
		).toMatch(/3 facturas/);
	});

	it("blocks cancelling once material entered the warehouse", () => {
		for (const status of ["PARTIAL", "RECEIVED"] as const) {
			expect(
				purchaseOrderCancelBlocker({
					status,
					validInvoiceCount: 0,
					hasReceipts: true,
				}),
			).toMatch(/material recibido/);
		}
	});

	it("does not cancel twice", () => {
		expect(
			purchaseOrderCancelBlocker({
				status: "CANCELED",
				validInvoiceCount: 0,
				hasReceipts: false,
			}),
		).toMatch(/ya está anulada/);
	});

	it("tracks finance only for project purchases", () => {
		expect(purchaseOrderTracksFinance({ projectId: "p1" })).toBe(true);
		expect(purchaseOrderTracksFinance({ projectId: null })).toBe(false);
	});

	it("classifies how an order relates to the project budget", () => {
		const budgeted = [{ outsideBudget: false }];
		expect(
			purchaseOrderBudgetScope({
				projectId: null,
				requisitionId: "r1",
				items: budgeted,
			}),
		).toBe("WAREHOUSE");
		expect(
			purchaseOrderBudgetScope({
				projectId: "p1",
				requisitionId: null,
				items: budgeted,
			}),
		).toBe("OUTSIDE");
		expect(
			purchaseOrderBudgetScope({
				projectId: "p1",
				requisitionId: "r1",
				items: budgeted,
			}),
		).toBe("BUDGETED");
		expect(
			purchaseOrderBudgetScope({
				projectId: "p1",
				requisitionId: "r1",
				items: [...budgeted, { outsideBudget: true }],
			}),
		).toBe("MIXED");
	});
});
