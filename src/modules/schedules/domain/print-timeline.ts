const MS_PER_DAY = 24 * 60 * 60 * 1000;

const MONTHS = [
	"enero",
	"febrero",
	"marzo",
	"abril",
	"mayo",
	"junio",
	"julio",
	"agosto",
	"septiembre",
	"octubre",
	"noviembre",
	"diciembre",
];
const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

export type TimelineDay = {
	/** Día desde el inicio del cronograma (base 0). */
	offset: number;
	dayOfMonth: number;
	weekday: string;
	isSunday: boolean;
};

export type TimelineWeek = {
	key: string;
	/** Semana de obra contada desde el inicio del cronograma. */
	label: string;
	span: number;
};

/** Un bloque por mes calendario: es la unidad que cabe legible en una hoja. */
export type TimelineSegment = {
	key: string;
	label: string;
	startDay: number;
	days: TimelineDay[];
	weeks: TimelineWeek[];
};

export type DailyTimeline = {
	totalDays: number;
	segments: TimelineSegment[];
};

function addDays(value: Date, days: number) {
	const next = new Date(value);
	next.setUTCDate(next.getUTCDate() + days);
	return next;
}

export function dayOffset(start: Date, value: Date) {
	return Math.round((value.getTime() - start.getTime()) / MS_PER_DAY);
}

export function buildDailyTimeline(start: Date, end: Date): DailyTimeline {
	const totalDays = Math.max(1, dayOffset(start, end) + 1);
	const segments: TimelineSegment[] = [];

	for (let offset = 0; offset < totalDays; offset += 1) {
		const date = addDays(start, offset);
		const key = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
		let segment = segments.at(-1);
		if (segment?.key !== key) {
			segment = {
				key,
				label: `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`,
				startDay: offset,
				days: [],
				weeks: [],
			};
			segments.push(segment);
		}
		segment.days.push({
			offset,
			dayOfMonth: date.getUTCDate(),
			weekday: WEEKDAYS[date.getUTCDay()],
			isSunday: date.getUTCDay() === 0,
		});

		const week = Math.floor(offset / 7);
		const currentWeek = segment.weeks.at(-1);
		if (currentWeek?.key === `${key}-w${week}`) {
			currentWeek.span += 1;
		} else {
			segment.weeks.push({ key: `${key}-w${week}`, label: "", span: 1 });
		}
	}

	// Etiquetas al final, cuando ya se conoce el rango de cada semana.
	for (const segment of segments) {
		let cursor = 0;
		for (const week of segment.weeks) {
			const first = segment.days[cursor];
			const last = segment.days[cursor + week.span - 1];
			const number = Math.floor(first.offset / 7) + 1;
			// El mes ya está en la cabecera del bloque: la semana solo lleva días.
			week.label =
				week.span >= 5
					? `Semana ${number} · ${first.dayOfMonth}–${last.dayOfMonth}`
					: week.span >= 3
						? `Sem. ${number}`
						: `S${number}`;
			cursor += week.span;
		}
	}

	return { totalDays, segments };
}
