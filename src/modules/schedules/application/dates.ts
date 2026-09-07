import type { ScheduleActivityInput } from "../domain/validation";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function parseDateInput(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDateInput(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toISOString().slice(0, 10);
}

export function daysBetweenInclusive(start: Date, end: Date) {
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / MS_PER_DAY) + 1);
}

export function getScheduleBounds(activities: Pick<ScheduleActivityInput, "plannedStart" | "plannedEnd">[]) {
  const starts = activities.map((activity) => parseDateInput(activity.plannedStart).getTime());
  const ends = activities.map((activity) => parseDateInput(activity.plannedEnd).getTime());
  return {
    start: new Date(Math.min(...starts)),
    end: new Date(Math.max(...ends))
  };
}
