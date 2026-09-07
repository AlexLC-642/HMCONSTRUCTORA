import { describe, expect, it } from "vitest";
import { projectFormSchema } from "@/modules/projects/domain/validation";

describe("project validation", () => {
	it("accepts a valid project payload", () => {
		const result = projectFormSchema.safeParse({
			internalId: "PRY-0002",
			code: "HM-TEST-002",
			name: "Proyecto de prueba",
			status: "DRAFT",
			currency: "GTQ",
			baseBudget: "1000.50",
			progressPercentage: "15",
			memberIds: [],
		});

		expect(result.success).toBe(true);
	});

	it("rejects progress greater than 100", () => {
		const result = projectFormSchema.safeParse({
			internalId: "PRY-0002",
			code: "HM-TEST-002",
			name: "Proyecto de prueba",
			status: "ACTIVE",
			currency: "GTQ",
			baseBudget: "1000.50",
			progressPercentage: "101",
			memberIds: [],
		});

		expect(result.success).toBe(false);
	});

	it("requires an 8 digit client phone when provided", () => {
		const result = projectFormSchema.safeParse({
			name: "Proyecto de prueba",
			clientPhone: "555-1234",
			status: "DRAFT",
			currency: "GTQ",
			baseBudget: "1000",
			progressPercentage: "0",
			memberIds: [],
		});

		expect(result.success).toBe(false);
	});

	it("does not accept a manually supplied actual completion date", () => {
		const result = projectFormSchema.parse({
			name: "Proyecto de prueba",
			actualEndDate: "2026-09-04",
			status: "DRAFT",
			currency: "GTQ",
			baseBudget: "1000",
			progressPercentage: "0",
			memberIds: [],
		});

		expect(result).not.toHaveProperty("actualEndDate");
	});
});
