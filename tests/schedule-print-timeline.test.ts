import { describe, expect, it } from "vitest";
import { buildDailyTimeline } from "@/modules/schedules/domain/print-timeline";

const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

describe("schedule daily timeline", () => {
	it("splits the schedule into calendar months with every day", () => {
		const timeline = buildDailyTimeline(day("2026-08-03"), day("2026-12-18"));
		expect(timeline.totalDays).toBe(138);
		expect(timeline.segments.map((segment) => segment.label)).toEqual([
			"agosto 2026",
			"septiembre 2026",
			"octubre 2026",
			"noviembre 2026",
			"diciembre 2026",
		]);
		expect(timeline.segments.map((segment) => segment.days.length)).toEqual([
			29, 30, 31, 30, 18,
		]);
		expect(
			timeline.segments.flatMap((segment) =>
				segment.days.map((item) => item.offset),
			),
		).toEqual(Array.from({ length: 138 }, (_, index) => index));
	});

	it("numbers work weeks from the project start and marks Sundays", () => {
		const timeline = buildDailyTimeline(day("2026-08-03"), day("2026-08-16"));
		const [august] = timeline.segments;
		expect(august?.weeks.map((week) => [week.label, week.span])).toEqual([
			["Semana 1 · 3–9", 7],
			["Semana 2 · 10–16", 7],
		]);
		expect(
			august?.days
				.filter((item) => item.isSunday)
				.map((item) => item.dayOfMonth),
		).toEqual([9, 16]);
	});

	it("keeps a week split across months in both segments", () => {
		const timeline = buildDailyTimeline(day("2026-08-27"), day("2026-09-04"));
		expect(timeline.segments.map((segment) => segment.weeks[0]?.label)).toEqual(
			["Semana 1 · 27–31", "S1"],
		);
	});
});
