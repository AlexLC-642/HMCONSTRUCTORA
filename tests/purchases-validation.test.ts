import { describe, expect, it } from "vitest";
import {
	purchaseOrderInputSchema,
	purchaseReceiptInputSchema,
	supplierInputSchema,
} from "@/modules/purchases/domain/validation";

const validOrder = {
	requisitionId: "req-1",
	supplierId: "supplier-1",
	issueDate: "2026-09-07",
	expectedDate: "2026-09-12",
	paymentType: "IMMEDIATE",
	paymentDueDate: "",
	taxPercentage: 12,
	notes: "",
	items: [{ requisitionItemId: "item-1", unitCost: 125.5 }],
};

describe("purchase validation", () => {
	it("requires positive costs for every purchase-order line", () => {
		expect(
			purchaseOrderInputSchema.safeParse({
				...validOrder,
				items: [{ requisitionItemId: "item-1", unitCost: -1 }],
			}).success,
		).toBe(false);
		expect(
			purchaseOrderInputSchema.safeParse({
				...validOrder,
				items: [{ requisitionItemId: "item-1", unitCost: 0 }],
			}).success,
		).toBe(false);
	});

	it("does not accept a delivery date before issue", () => {
		expect(
			purchaseOrderInputSchema.safeParse({
				...validOrder,
				expectedDate: "2026-09-01",
			}).success,
		).toBe(false);
	});

	it("requires an expected delivery date", () => {
		expect(
			purchaseOrderInputSchema.safeParse({
				...validOrder,
				expectedDate: "",
			}).success,
		).toBe(false);
	});

	it("requires an eight-digit supplier phone when provided", () => {
		const supplier = {
			businessName: "Materiales de Obra, S.A.",
			taxId: "1234567-8",
			phone: "55551234",
		};
		expect(supplierInputSchema.safeParse(supplier).success).toBe(true);
		expect(
			supplierInputSchema.safeParse({ ...supplier, phone: "5555" }).success,
		).toBe(false);
	});

	it("requires a supplier NIT and at least one contact method", () => {
		const supplier = {
			businessName: "Materiales de Obra, S.A.",
			taxId: "1234567-8",
			phone: "55551234",
		};
		expect(supplierInputSchema.safeParse(supplier).success).toBe(true);
		expect(
			supplierInputSchema.safeParse({ ...supplier, taxId: "" }).success,
		).toBe(false);
		expect(
			supplierInputSchema.safeParse({ ...supplier, phone: "", email: "" })
				.success,
		).toBe(false);
	});

	it("requires a due date only when the purchase is on credit", () => {
		expect(purchaseOrderInputSchema.safeParse(validOrder).success).toBe(true);
		expect(
			purchaseOrderInputSchema.safeParse({
				...validOrder,
				paymentType: "ON_DELIVERY",
			}).success,
		).toBe(true);
		expect(
			purchaseOrderInputSchema.safeParse({
				...validOrder,
				paymentType: "CREDIT",
				paymentDueDate: "",
			}).success,
		).toBe(false);
		expect(
			purchaseOrderInputSchema.safeParse({
				...validOrder,
				paymentType: "CREDIT",
				paymentDueDate: "2026-10-07",
			}).success,
		).toBe(true);
	});

	it("allows a direct purchase without a requisition", () => {
		const directPurchase = {
			...validOrder,
			requisitionId: "",
			warehouseId: "warehouse-1",
			projectId: "",
			items: [
				{
					materialId: "material-1",
					description: "Cemento gris",
					quantity: 25,
					unit: "saco",
					unitCost: 82.5,
				},
			],
		};
		expect(purchaseOrderInputSchema.safeParse(directPurchase).success).toBe(
			true,
		);
		expect(
			purchaseOrderInputSchema.safeParse({
				...directPurchase,
				warehouseId: "",
			}).success,
		).toBe(false);
		expect(
			purchaseOrderInputSchema.safeParse({
				...directPurchase,
				items: [{ ...directPurchase.items[0], quantity: -1 }],
			}).success,
		).toBe(false);
		expect(
			purchaseOrderInputSchema.safeParse({
				...directPurchase,
				items: [directPurchase.items[0], directPurchase.items[0]],
			}).success,
		).toBe(false);
	});

	it("requires a positive received quantity and delivery reference", () => {
		const receipt = {
			purchaseOrderId: "order-1",
			receivedDate: "2026-09-07",
			reference: "ENTREGA-100",
			items: [{ purchaseOrderItemId: "line-1", quantity: 2 }],
		};
		expect(purchaseReceiptInputSchema.safeParse(receipt).success).toBe(true);
		expect(
			purchaseReceiptInputSchema.safeParse({ ...receipt, reference: "" })
				.success,
		).toBe(false);
		expect(
			purchaseReceiptInputSchema.safeParse({
				...receipt,
				items: [{ purchaseOrderItemId: "line-1", quantity: -1 }],
			}).success,
		).toBe(false);
	});
});
