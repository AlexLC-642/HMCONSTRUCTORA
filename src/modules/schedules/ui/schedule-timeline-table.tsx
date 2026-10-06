import { daysBetweenInclusive } from "../application/dates";
import {
	buildDailyTimeline,
	type DailyTimeline,
	dayOffset,
	type TimelineSegment,
} from "../domain/print-timeline";
import {
	type scheduleActivityStatuses,
	scheduleActivityStatusLabels,
} from "../domain/validation";

type Status = (typeof scheduleActivityStatuses)[number];

export type ScheduleTimelineActivity = {
	id: string;
	code: string;
	description: string;
	labor: string | null;
	status: string;
	plannedStart: Date;
	plannedEnd: Date;
	/** Avance real 0–100. */
	progress: number;
};

const shortDate = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "short",
	timeZone: "UTC",
});

const statusColor: Record<Status, string> = {
	PENDING: "#8a949a",
	IN_PROGRESS: "#1f7a5b",
	BLOCKED: "#c4312f",
	COMPLETED: "#2563eb",
};

type PreparedActivity = ScheduleTimelineActivity & {
	statusKey: Status;
	startDay: number;
	duration: number;
	progressValue: number;
};

/**
 * Una barra por actividad sobre todo el proyecto, con columnas por mes: es la
 * hoja de orientación antes del detalle diario.
 */
function OverviewTable({
	timeline,
	activities,
}: {
	timeline: DailyTimeline;
	activities: PreparedActivity[];
}) {
	const fixed: Array<[string, number]> = [
		["no", 3],
		["activity", 24],
		["start", 5.5],
		["end", 5.5],
		["days", 3.5],
	];
	const fixedTotal = fixed.reduce((sum, [, value]) => sum + value, 0);
	const timelineWidth = 100 - fixedTotal;
	const total = timeline.totalDays;
	const pctOfTotal = (days: number) => `${(days / total) * 100}%`;

	return (
		<section className="schedule-timeline__segment schedule-timeline__overview">
			<div className="schedule-timeline__scroll">
				<table className="schedule-timeline__table">
					<colgroup>
						{fixed.map(([key, width]) => (
							<col key={key} style={{ width: `${width}%` }} />
						))}
						{timeline.segments.map((segment) => (
							<col
								key={segment.key}
								style={{
									width: `${(segment.days.length / total) * timelineWidth}%`,
								}}
							/>
						))}
					</colgroup>
					<thead>
						<tr>
							<th className="schedule-timeline__corner" colSpan={fixed.length}>
								Resumen general
							</th>
							{timeline.segments.map((segment) => {
								// Meses cortos o proyectos largos: abreviatura "ago 26".
								const narrow =
									(segment.days.length / total) * timelineWidth < 7;
								const [month, year] = segment.label.split(" ");
								return (
									<th
										className="period"
										key={segment.key}
										rowSpan={2}
										title={segment.label}
									>
										{narrow ? `${month.slice(0, 3)} ${year.slice(2)}` : month}
										{narrow ? null : <small>{year}</small>}
									</th>
								);
							})}
						</tr>
						<tr>
							<th>No.</th>
							<th className="text-left">Actividad</th>
							<th>Inicio</th>
							<th>Fin</th>
							<th>Días</th>
						</tr>
					</thead>
					<tbody>
						{activities.map((activity) => {
							const color = statusColor[activity.statusKey];
							return (
								<tr key={activity.id}>
									<td className="text-center">{activity.code}</td>
									<td>{activity.description}</td>
									<td className="text-center tabular-nums">
										{shortDate.format(activity.plannedStart)}
									</td>
									<td className="text-center tabular-nums">
										{shortDate.format(activity.plannedEnd)}
									</td>
									<td className="text-center tabular-nums">
										{activity.duration}
									</td>
									<td className="bar-cell" colSpan={timeline.segments.length}>
										{timeline.segments.slice(1).map((segment) => (
											<span
												className="grid-line grid-line--month"
												key={segment.key}
												style={{ left: pctOfTotal(segment.startDay) }}
											/>
										))}
										<span
											className="bar"
											style={{
												left: pctOfTotal(activity.startDay),
												width: pctOfTotal(activity.duration),
												borderColor: color,
												background: `${color}22`,
											}}
										>
											<span
												style={{
													width: `${activity.progressValue}%`,
													background: color,
												}}
											/>
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}

function SegmentTable({
	segment,
	activities: allActivities,
	hasLabor,
}: {
	segment: TimelineSegment;
	activities: PreparedActivity[];
	hasLabor: boolean;
}) {
	const segmentStart = segment.startDay;
	const segmentDays = segment.days.length;
	const segmentEnd = segmentStart + segmentDays;
	// Solo las actividades con trabajo en este mes: repetir las demás llena la
	// hoja de filas vacías. El No. se conserva para cruzarlas con el resumen.
	const activities = allActivities.filter(
		(activity) =>
			activity.startDay < segmentEnd &&
			activity.startDay + activity.duration > segmentStart,
	);
	// Columnas fijas en % del ancho total de la hoja; los días reparten el resto
	// con el ancho de un mes completo, para que todas las hojas tengan la misma
	// escala aunque el primer o el último mes estén incompletos.
	const fixed: Array<[string, number]> = hasLabor
		? [
				["no", 3],
				["activity", 15],
				["labor", 8],
				["start", 5.5],
				["end", 5.5],
				["days", 3.5],
				["status", 7],
			]
		: [
				["no", 3],
				["activity", 21],
				["start", 5.5],
				["end", 5.5],
				["days", 3.5],
				["status", 7],
			];
	const fixedTotal = fixed.reduce((sum, [, value]) => sum + value, 0);
	const dayWidth = (100 - fixedTotal) / 31;
	const tableWidth = fixedTotal + dayWidth * segmentDays;
	const pctOfTable = (value: number) => `${(value / tableWidth) * 100}%`;
	const pctOfSegment = (days: number) => `${(days / segmentDays) * 100}%`;
	const fixedColumns = fixed.length;

	return (
		<section className="schedule-timeline__segment">
			<div className="schedule-timeline__scroll">
				<table
					className="schedule-timeline__table"
					style={{ width: `${tableWidth}%` }}
				>
					<colgroup>
						{fixed.map(([key, width]) => (
							<col key={key} style={{ width: pctOfTable(width) }} />
						))}
						{segment.days.map((day) => (
							<col key={day.offset} style={{ width: pctOfTable(dayWidth) }} />
						))}
					</colgroup>
					<thead>
						<tr>
							<th className="schedule-timeline__corner" colSpan={fixedColumns}>
								{segment.label}
								<span className="schedule-timeline__count">
									{activities.length} de {allActivities.length} actividades
								</span>
							</th>
							{segment.weeks.map((week) => (
								<th className="period" colSpan={week.span} key={week.key}>
									{week.label}
								</th>
							))}
						</tr>
						<tr>
							<th>No.</th>
							<th className="text-left">Actividad</th>
							{hasLabor ? <th>Mano de obra</th> : null}
							<th>Inicio</th>
							<th>Fin</th>
							<th>Días</th>
							<th>Estado</th>
							{segment.days.map((day) => (
								<th
									className="period"
									data-sunday={day.isSunday || undefined}
									key={day.offset}
								>
									{day.dayOfMonth}
									<small>{day.weekday}</small>
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{activities.length === 0 ? (
							<tr>
								<td
									className="schedule-timeline__empty"
									colSpan={fixedColumns + segmentDays}
								>
									Sin actividades programadas este mes.
								</td>
							</tr>
						) : null}
						{activities.map((activity) => {
							const color = statusColor[activity.statusKey];
							const end = activity.startDay + activity.duration;
							const visibleStart = Math.max(activity.startDay, segmentStart);
							const visibleEnd = Math.min(end, segmentEnd);
							const visible = visibleEnd > visibleStart;
							const progressEnd =
								activity.startDay +
								(activity.duration * activity.progressValue) / 100;
							const fill = visible
								? Math.min(
										1,
										Math.max(
											0,
											(progressEnd - visibleStart) /
												(visibleEnd - visibleStart),
										),
									)
								: 0;
							return (
								<tr key={activity.id}>
									<td className="text-center">{activity.code}</td>
									<td>{activity.description}</td>
									{hasLabor ? (
										<td className="text-center">{activity.labor ?? ""}</td>
									) : null}
									<td className="text-center tabular-nums">
										{shortDate.format(activity.plannedStart)}
									</td>
									<td className="text-center tabular-nums">
										{shortDate.format(activity.plannedEnd)}
									</td>
									<td className="text-center tabular-nums">
										{activity.duration}
									</td>
									<td className="text-center">
										{scheduleActivityStatusLabels[activity.statusKey]}
										{activity.progressValue > 0 &&
										activity.progressValue < 100 ? (
											<span className="schedule-timeline__pct">
												{activity.progressValue.toFixed(0)}%
											</span>
										) : null}
									</td>
									<td className="bar-cell" colSpan={segmentDays}>
										{segment.days.map((day, index) =>
											day.isSunday ? (
												<span
													className="sunday"
													key={day.offset}
													style={{
														left: pctOfSegment(index),
														width: pctOfSegment(1),
													}}
												/>
											) : null,
										)}
										{segment.days.slice(1).map((day, index) => (
											<span
												className="grid-line"
												key={day.offset}
												style={{ left: pctOfSegment(index + 1) }}
											/>
										))}
										{visible ? (
											<span
												className="bar"
												data-continues-left={
													activity.startDay < segmentStart || undefined
												}
												data-continues-right={end > segmentEnd || undefined}
												style={{
													left: pctOfSegment(visibleStart - segmentStart),
													width: pctOfSegment(visibleEnd - visibleStart),
													borderColor: color,
													background: `${color}22`,
												}}
											>
												<span
													style={{
														width: `${fill * 100}%`,
														background: color,
													}}
												/>
											</span>
										) : null}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</section>
	);
}

/**
 * Gantt diario compartido por la vista PDF del cronograma y el portal del
 * cliente. Abre con un resumen de todo el proyecto y luego se divide por mes
 * calendario: cada mes muestra sus días completos y solo las actividades que
 * trabajan en él; al imprimir, cada bloque ocupa su propia hoja.
 */
export function ScheduleTimelineTable({
	activities,
	start,
	end,
	notes,
}: {
	activities: ScheduleTimelineActivity[];
	start: Date;
	end: Date;
	notes?: string | null;
}) {
	const timeline = buildDailyTimeline(start, end);
	const hasLabor = activities.some((activity) => activity.labor?.trim());
	const prepared: PreparedActivity[] = activities.map((activity) => ({
		...activity,
		statusKey: (activity.status in statusColor
			? activity.status
			: "PENDING") as Status,
		startDay: Math.max(0, dayOffset(start, activity.plannedStart)),
		duration: daysBetweenInclusive(activity.plannedStart, activity.plannedEnd),
		progressValue: Math.min(100, Math.max(0, activity.progress)),
	}));

	return (
		<div className="schedule-timeline">
			{timeline.segments.length > 1 ? (
				<OverviewTable activities={prepared} timeline={timeline} />
			) : null}
			{timeline.segments.map((segment) => (
				<SegmentTable
					activities={prepared}
					hasLabor={hasLabor}
					key={segment.key}
					segment={segment}
				/>
			))}
			<div className="schedule-timeline__legend">
				<div>
					<span>
						<i className="schedule-timeline__swatch schedule-timeline__swatch--planned" />
						Planificado
					</span>
					<span>
						<i className="schedule-timeline__swatch schedule-timeline__swatch--actual" />
						Avance real
					</span>
					<span>
						<i className="schedule-timeline__swatch schedule-timeline__swatch--sunday" />
						Domingo
					</span>
				</div>
				{notes ? <p>Nota: {notes}</p> : null}
			</div>
		</div>
	);
}
