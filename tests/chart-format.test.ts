import { describe, expect, it } from "vitest";
import { progressGap } from "@/shared/ui/charts/format";

describe("progress gap formatting", () => {
	it("explica el atraso sin signos negativos ni abreviaturas técnicas", () => {
		expect(progressGap(-100)).toBe("Atraso de 100%");
	});

	it("distingue estados al día y adelantados con lenguaje operativo", () => {
		expect(progressGap(0)).toBe("Al día");
		expect(progressGap(7.25)).toBe("Adelanto de 7.3%");
	});

	it("does not invent a value when planning is unavailable", () => {
		expect(progressGap(null)).toBe("Sin datos");
	});
});
