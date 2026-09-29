import { describe, expect, it } from "vitest";
import { allocateClientPrices } from "@/modules/finances/domain/client-pricing";

function sumCents(prices: Map<string, string>) {
	return [...prices.values()].reduce(
		(sum, price) => sum + Math.round(Number(price) * 100),
		0,
	);
}

describe("precio al cliente por renglón", () => {
	it("reparte los Q300,000.00 del presupuesto de vivienda sin perder un centavo", () => {
		const sections = [
			{ id: "01", total: "5328.00" },
			{ id: "02", total: "27100.00" },
			{ id: "03", total: "57970.00" },
			{ id: "04", total: "46054.00" },
			{ id: "05", total: "13125.00" },
			{ id: "06", total: "17751.00" },
			{ id: "07", total: "30318.00" },
		];
		const prices = allocateClientPrices(sections, "300000.00");

		expect(sumCents(prices)).toBe(30000000);
		// 57,970 × 300,000 / 197,646 = 87,990.65...
		expect(prices.get("03")).toMatch(/^87990\.6[56]$/);
		for (const section of sections) {
			expect(Number(prices.get(section.id))).toBeGreaterThan(
				Number(section.total),
			);
		}
	});

	it("siempre suma exactamente el total, también con montos que no dividen parejo", () => {
		const prices = allocateClientPrices(
			[
				{ id: "a", total: "0.01" },
				{ id: "b", total: "0.01" },
				{ id: "c", total: "0.01" },
			],
			"100.00",
		);
		expect(sumCents(prices)).toBe(10000);
		expect([...prices.values()].sort()).toEqual(["33.33", "33.33", "33.34"]);

		let seed = 7;
		const next = () => {
			seed = (seed * 1103515245 + 12345) % 2147483648;
			return seed / 2147483648;
		};
		for (let run = 0; run < 500; run += 1) {
			const sections = Array.from(
				{ length: 1 + Math.floor(next() * 12) },
				(_, index) => ({
					id: String(index),
					total: (Math.floor(next() * 5000000) / 100).toFixed(2),
				}),
			);
			const grandTotal = (Math.floor(next() * 90000000) / 100).toFixed(2);
			const prices = allocateClientPrices(sections, grandTotal);
			const hasCost = sections.some((section) => Number(section.total) > 0);
			expect(sumCents(prices)).toBe(
				hasCost ? Math.round(Number(grandTotal) * 100) : 0,
			);
		}
	});

	it("devuelve cero cuando el presupuesto no tiene costo", () => {
		const prices = allocateClientPrices([{ id: "a", total: "0.00" }], "500.00");
		expect(prices.get("a")).toBe("0.00");
	});
});
