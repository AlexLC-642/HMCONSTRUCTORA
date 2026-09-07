import { describe, expect, it } from "vitest";
import { daysBetweenInclusive, getScheduleBounds } from "@/modules/schedules/application/dates";
import { scheduleInputSchema } from "@/modules/schedules/domain/validation";

describe("schedule planning", () => {
  it("validates planned date order", () => {
    const result = scheduleInputSchema.safeParse({
      title: "Cronograma",
      activities: [
        {
          code: "1",
          description: "Actividad",
          labor: "CONTRATAR",
          status: "PENDING",
          plannedStart: "2026-10-12",
          plannedEnd: "2026-10-10",
          progress: "0",
          position: 1
        }
      ]
    });

    expect(result.success).toBe(false);
  });

  it("calculates schedule bounds and inclusive duration", () => {
    const bounds = getScheduleBounds([
      { plannedStart: "2026-10-12", plannedEnd: "2026-10-14" },
      { plannedStart: "2026-10-18", plannedEnd: "2026-10-20" }
    ]);

    expect(bounds.start.toISOString().slice(0, 10)).toBe("2026-10-12");
    expect(bounds.end.toISOString().slice(0, 10)).toBe("2026-10-20");
    expect(daysBetweenInclusive(bounds.start, bounds.end)).toBe(9);
  });
});
