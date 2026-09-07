import { describe, expect, it } from "vitest";
import { calculateDailyReportActivity } from "@/modules/progress/application/calculations";

describe("daily progress calculations", () => {
  it("calculates accumulated quantity and new progress", () => {
    const result = calculateDailyReportActivity({
      scheduleActivityId: "activity-1",
      activityCode: "1",
      activityName: "Levantado de block",
      budgetSectionCode: "1",
      budgetSectionName: "Levantado de block",
      workDescription: "Avance de muro",
      unit: "m2",
      contractedQuantity: "100",
      previousQuantity: "35",
      todayQuantity: "15",
      previousProgress: "35",
      status: "IN_PROGRESS",
      issues: "",
      position: 1
    });

    expect(result.accumulatedQuantity.toString()).toBe("50");
    expect(result.newProgress.toString()).toBe("50");
  });

  it("rejects progress greater than 100 percent", () => {
    expect(() => calculateDailyReportActivity({
      scheduleActivityId: "activity-1",
      activityCode: "1",
      activityName: "Levantado de block",
      budgetSectionCode: "1",
      budgetSectionName: "Levantado de block",
      workDescription: "Avance de muro",
      unit: "m2",
      contractedQuantity: "100",
      previousQuantity: "90",
      todayQuantity: "20",
      previousProgress: "90",
      status: "IN_PROGRESS",
      issues: "",
      position: 1
    })).toThrow("supera el 100%");
  });

  it("rejects ordinary quantities after an activity is complete", () => {
    expect(() => calculateDailyReportActivity({
      scheduleActivityId: "activity-1",
      activityCode: "1",
      activityName: "Levantado de block",
      budgetSectionCode: "1",
      budgetSectionName: "Levantado de block",
      workDescription: "Actividad completada",
      unit: "m2",
      contractedQuantity: "53",
      previousQuantity: "53",
      todayQuantity: "1",
      previousProgress: "100",
      status: "COMPLETED",
      issues: "",
      position: 1
    })).toThrow("ya esta completada");
  });

  it("uses the physical unit instead of treating quantities as percentages", () => {
    const result = calculateDailyReportActivity({
      scheduleActivityId: "activity-1",
      activityCode: "2",
      activityName: "Levantado de tablayeso",
      budgetSectionCode: "2",
      budgetSectionName: "Levantado de tablayeso",
      workDescription: "Avance de muro",
      unit: "m2",
      contractedQuantity: "53",
      previousQuantity: "35",
      todayQuantity: "10",
      previousProgress: "66.04",
      status: "IN_PROGRESS",
      issues: "",
      position: 1
    });

    expect(result.accumulatedQuantity.toString()).toBe("45");
    expect(result.newProgress.toString()).toBe("84.91");
  });
});