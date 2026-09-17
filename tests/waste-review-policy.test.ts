import { describe, expect, it } from "vitest";
import { evaluateWasteReview } from "@/modules/inventory/domain/waste-review";

describe("waste review policy", () => {
	it("keeps an ordinary low-value material waste frictionless", () => {
		expect(
			evaluateWasteReview({
				reason: "CUTTING_SURPLUS",
				resourceType: "MATERIAL",
				totalCost: 120,
				reviewAmountThreshold: 1000,
				requestedByUser: false,
			}),
		).toEqual([]);
	});

	it("reviews high-value, sensitive and controlled-resource waste", () => {
		expect(
			evaluateWasteReview({
				reason: "THEFT",
				resourceType: "TOOL",
				totalCost: 1500,
				reviewAmountThreshold: 1000,
				requestedByUser: true,
			}),
		).toEqual([
			"HIGH_VALUE",
			"LOSS_OR_THEFT",
			"CONTROLLED_RESOURCE",
			"REQUESTED_BY_USER",
		]);
	});

	it("uses the configured amount inclusively", () => {
		expect(
			evaluateWasteReview({
				reason: "DAMAGE",
				resourceType: "MATERIAL",
				totalCost: 1000,
				reviewAmountThreshold: 1000,
				requestedByUser: false,
			}),
		).toEqual(["HIGH_VALUE"]);
	});
});
