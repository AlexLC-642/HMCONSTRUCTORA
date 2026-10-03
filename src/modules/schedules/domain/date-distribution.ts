const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DATE_INPUT = /^\d{4}-\d{2}-\d{2}$/;

export type PlannedRange = { plannedStart: string; plannedEnd: string };

function toUtcDate(value: string) {
	return new Date(`${value}T00:00:00.000Z`);
}

function toDateInput(value: Date) {
	return value.toISOString().slice(0, 10);
}

function addUtcDays(value: Date, days: number) {
	const next = new Date(value);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

export function isValidPlanningRange(
	start: string | null | undefined,
	end: string | null | undefined,
): boolean {
	if (!start || !end || !DATE_INPUT.test(start) || !DATE_INPUT.test(end))
		return false;
	const startDate = toUtcDate(start);
	const endDate = toUtcDate(end);
	return (
		!Number.isNaN(startDate.getTime()) &&
		!Number.isNaN(endDate.getTime()) &&
		startDate <= endDate
	);
}

/**
 * Reparte el rango [start, end] (fechas YYYY-MM-DD, inclusivo) en `count` tramos
 * consecutivos, uno por actividad y en orden. Los días sobrantes se asignan a las
 * primeras actividades. Si hay más actividades que días, varias comparten día.
 * Es solo una sugerencia de ubicación: el usuario puede ajustar cada fecha luego.
 */
export function distributePlannedDates(
	start: string,
	end: string,
	count: number,
): PlannedRange[] {
	if (count <= 0 || !isValidPlanningRange(start, end)) return [];

	const startDate = toUtcDate(start);
	const totalDays =
		Math.round((toUtcDate(end).getTime() - startDate.getTime()) / MS_PER_DAY) +
		1;

	if (totalDays < count) {
		return Array.from({ length: count }, (_, index) => {
			const day = toDateInput(
				addUtcDays(startDate, Math.floor((index * totalDays) / count)),
			);
			return { plannedStart: day, plannedEnd: day };
		});
	}

	const baseLength = Math.floor(totalDays / count);
	const remainder = totalDays % count;
	const ranges: PlannedRange[] = [];
	let offset = 0;

	for (let index = 0; index < count; index += 1) {
		const length = baseLength + (index < remainder ? 1 : 0);
		ranges.push({
			plannedStart: toDateInput(addUtcDays(startDate, offset)),
			plannedEnd: toDateInput(addUtcDays(startDate, offset + length - 1)),
		});
		offset += length;
	}

	return ranges;
}
