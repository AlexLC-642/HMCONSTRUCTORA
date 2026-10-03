import { describe, expect, it } from "vitest";
import {
	buildPrintTimeline,
	chooseTimelineUnit,
} from "@/modules/schedules/domain/print-timeline";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("schedule print timeline", () => {
	it("picks a readable unit for the length of the schedule", () => {
		expect(chooseTimelineUnit(6)).toBe("day");
		expect(chooseTimelineUnit(31)).toBe("day");
		expect(chooseTimelineUnit(138)).toBe("week");
		expect(chooseTimelineUnit(241)).toBe("month");
	});

	it("covers every day exactly once in weekly scale", () => {
		const timeline = buildPrintTimeline(day("2026-08-03"), day("2026-12-18"));
		expect(timeline.unit).toBe("week");
		expect(timeline.totalDays).toBe(138);
		expect(timeline.periods.reduce((sum, period) => sum + period.days, 0)).toBe(
			138,
		);
		expect(timeline.periods.at(-1)?.days).toBe(138 % 7);
		expect(timeline.groups.map((group) => group.label)).toEqual([
			"ago 2026",
			"sep 2026",
			"oct 2026",
			"nov 2026",
			"dic 2026",
		]);
	});

	it("splits monthly scale on calendar months", () => {
		const timeline = buildPrintTimeline(day("2026-08-03"), day("2027-03-31"));
		expect(timeline.unit).toBe("month");
		expect(timeline.periods.map((period) => period.label)).toEqual([
			"ago",
			"sep",
			"oct",
			"nov",
			"dic",
			"ene",
			"feb",
			"mar",
		]);
		expect(timeline.periods[0]?.days).toBe(29);
		expect(timeline.groups.map((group) => [group.label, group.span])).toEqual([
			["2026", 5],
			["2027", 3],
		]);
	});
});
