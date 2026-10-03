import { describe, expect, it } from "vitest";
import {
	distributePlannedDates,
	isValidPlanningRange,
} from "@/modules/schedules/domain/date-distribution";

describe("distributePlannedDates", () => {
	it("splits the project range into consecutive blocks that cover it exactly", () => {
		const ranges = distributePlannedDates("2026-08-03", "2026-12-18", 7);
		expect(ranges).toHaveLength(7);
		expect(ranges[0].plannedStart).toBe("2026-08-03");
		expect(ranges.at(-1)?.plannedEnd).toBe("2026-12-18");
		for (let index = 1; index < ranges.length; index += 1) {
			const previousEnd = new Date(`${ranges[index - 1].plannedEnd}T00:00:00Z`);
			previousEnd.setUTCDate(previousEnd.getUTCDate() + 1);
			expect(ranges[index].plannedStart).toBe(
				previousEnd.toISOString().slice(0, 10),
			);
		}
	});

	it("gives remainder days to the first activities", () => {
		expect(distributePlannedDates("2026-01-01", "2026-01-10", 3)).toEqual([
			{ plannedStart: "2026-01-01", plannedEnd: "2026-01-04" },
			{ plannedStart: "2026-01-05", plannedEnd: "2026-01-07" },
			{ plannedStart: "2026-01-08", plannedEnd: "2026-01-10" },
		]);
	});

	it("shares days when there are more activities than days", () => {
		const ranges = distributePlannedDates("2026-01-01", "2026-01-02", 4);
		expect(ranges.map((range) => range.plannedStart)).toEqual([
			"2026-01-01",
			"2026-01-01",
			"2026-01-02",
			"2026-01-02",
		]);
		expect(
			ranges.every((range) => range.plannedStart === range.plannedEnd),
		).toBe(true);
	});

	it("rejects invalid ranges", () => {
		expect(isValidPlanningRange("2026-02-01", "2026-01-01")).toBe(false);
		expect(isValidPlanningRange("", "2026-01-01")).toBe(false);
		expect(distributePlannedDates("2026-02-01", "2026-01-01", 3)).toEqual([]);
		expect(distributePlannedDates("2026-01-01", "2026-01-31", 0)).toEqual([]);
	});
});
