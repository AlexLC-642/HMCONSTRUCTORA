import { describe, expect, it } from "vitest";
import {
	stockMovementInputSchema,
	wasteReviewInputSchema,
} from "@/modules/inventory/domain/validation";

const baseWaste = {
	materialId: "material-1",
	warehouseId: "warehouse-1",
	type: "WASTE",
	quantity: 2,
	unitCost: 25,
	wasteReason: "BREAKAGE",
	notes: "Se quebró durante la descarga.",
};

describe("inventory waste validation", () => {
	it("accepts a complete waste record", () => {
		expect(stockMovementInputSchema.safeParse(baseWaste).success).toBe(true);
	});

	it("requires a classified cause and a useful explanation", () => {
		expect(
			stockMovementInputSchema.safeParse({
				...baseWaste,
				wasteReason: undefined,
			}).success,
		).toBe(false);
		expect(
			stockMovementInputSchema.safeParse({ ...baseWaste, notes: "Daño" })
				.success,
		).toBe(false);
	});

	it("requires an explanation when follow-up action is requested", () => {
		expect(
			wasteReviewInputSchema.safeParse({
				movementId: "5c8e8601-6ad2-4aa3-b35d-10bda437e565",
				status: "NEEDS_ACTION",
				notes: "",
			}).success,
		).toBe(false);
		expect(
			wasteReviewInputSchema.safeParse({
				movementId: "5c8e8601-6ad2-4aa3-b35d-10bda437e565",
				status: "REVIEWED",
				notes: "",
			}).success,
		).toBe(true);
	});
});
