const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TimelineUnit = "day" | "week" | "month";

export type TimelinePeriod = {
	key: string;
	/** Etiqueta corta de la columna (día, inicio de semana o mes). */
	label: string;
	/** Texto secundario opcional (letra del día). */
	sublabel?: string;
	/** Día (desde el inicio del cronograma, base 0) en que empieza el periodo. */
	startDay: number;
	days: number;
};

export type TimelineGroup = { key: string; label: string; span: number };

export type PrintTimeline = {
	unit: TimelineUnit;
	totalDays: number;
	periods: TimelinePeriod[];
	groups: TimelineGroup[];
};

const MONTHS = [
	"ene",
	"feb",
	"mar",
	"abr",
	"may",
	"jun",
	"jul",
	"ago",
	"sep",
	"oct",
	"nov",
	"dic",
];
const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

function addDays(value: Date, days: number) {
	const next = new Date(value);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

export function dayOffset(start: Date, value: Date) {
	return Math.round((value.getTime() - start.getTime()) / MS_PER_DAY);
}

/**
 * Elige la escala que cabe legible en una hoja horizontal: días hasta un mes,
 * semanas hasta ~6 meses y meses para cronogramas más largos.
 */
export function chooseTimelineUnit(totalDays: number): TimelineUnit {
	if (totalDays <= 31) return "day";
	if (totalDays <= 26 * 7) return "week";
	return "month";
}

function monthLabel(date: Date) {
	return MONTHS[date.getUTCMonth()];
}

function groupBy(
	periods: TimelinePeriod[],
	keyOf: (period: TimelinePeriod) => { key: string; label: string },
): TimelineGroup[] {
	const groups: TimelineGroup[] = [];
	for (const period of periods) {
		const { key, label } = keyOf(period);
		const current = groups.at(-1);
		if (current?.key === key) current.span += 1;
		else groups.push({ key, label, span: 1 });
	}
	return groups;
}

export function buildPrintTimeline(start: Date, end: Date): PrintTimeline {
	const totalDays = Math.max(1, dayOffset(start, end) + 1);
	const unit = chooseTimelineUnit(totalDays);
	const periods: TimelinePeriod[] = [];

	if (unit === "day") {
		for (let day = 0; day < totalDays; day += 1) {
			const date = addDays(start, day);
			periods.push({
				key: `d${day}`,
				label: String(date.getUTCDate()),
				sublabel: WEEKDAYS[date.getUTCDay()],
				startDay: day,
				days: 1,
			});
		}
		const groups = groupBy(periods, (period) => {
			const week = Math.floor(period.startDay / 7);
			const first = addDays(start, week * 7);
			const last = addDays(start, Math.min(totalDays - 1, week * 7 + 6));
			return {
				key: `w${week}`,
				label: `${first.getUTCDate()} ${monthLabel(first)} – ${last.getUTCDate()} ${monthLabel(last)}`,
			};
		});
		return { unit, totalDays, periods, groups };
	}

	if (unit === "week") {
		for (let day = 0; day < totalDays; day += 7) {
			const date = addDays(start, day);
			periods.push({
				key: `w${day}`,
				label: `${date.getUTCDate()}`,
				startDay: day,
				days: Math.min(7, totalDays - day),
			});
		}
		const groups = groupBy(periods, (period) => {
			const date = addDays(start, period.startDay);
			return {
				key: `${date.getUTCFullYear()}-${date.getUTCMonth()}`,
				label: `${monthLabel(date)} ${date.getUTCFullYear()}`,
			};
		});
		return { unit, totalDays, periods, groups };
	}

	let day = 0;
	while (day < totalDays) {
		const date = addDays(start, day);
		const nextMonth = new Date(
			Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
		);
		const length = Math.min(dayOffset(date, nextMonth), totalDays - day);
		periods.push({
			key: `m${day}`,
			label: monthLabel(date),
			startDay: day,
			days: length,
		});
		day += length;
	}
	const groups = groupBy(periods, (period) => {
		const year = addDays(start, period.startDay).getUTCFullYear();
		return { key: String(year), label: String(year) };
	});
	return { unit, totalDays, periods, groups };
}
