import { daysBetweenInclusive } from "../application/dates";
import {
	buildPrintTimeline,
	dayOffset,
	type TimelineUnit,
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

const unitLabel: Record<TimelineUnit, string> = {
	day: "días",
	week: "semanas (fecha de inicio de cada semana)",
	month: "meses",
};

/**
 * Tabla Gantt compartida por la vista PDF del cronograma y el portal del
 * cliente. La escala (días, semanas o meses) se elige según la duración para
 * que siempre sea legible, y cada barra muestra lo planificado con el avance
 * real encima.
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
	const timeline = buildPrintTimeline(start, end);
	const hasLabor = activities.some((activity) => activity.labor?.trim());
	// Columnas fijas en % del ancho; el resto es la línea de tiempo.
	const fixed = {
		no: 3,
		description: hasLabor ? 18 : 23,
		labor: hasLabor ? 9 : 0,
		start: 6,
		end: 6,
		days: 4,
		status: 7,
	};
	const timelineWidth =
		100 - Object.values(fixed).reduce((sum, value) => sum + value, 0);
	const fixedColumns = hasLabor ? 7 : 6;
	const pct = (days: number) => (days / timeline.totalDays) * 100;

	return (
		<div className="schedule-timeline">
			<div className="schedule-timeline__scroll">
				<table className="schedule-timeline__table">
					<colgroup>
						<col style={{ width: `${fixed.no}%` }} />
						<col style={{ width: `${fixed.description}%` }} />
						{hasLabor ? <col style={{ width: `${fixed.labor}%` }} /> : null}
						<col style={{ width: `${fixed.start}%` }} />
						<col style={{ width: `${fixed.end}%` }} />
						<col style={{ width: `${fixed.days}%` }} />
						<col style={{ width: `${fixed.status}%` }} />
						{timeline.periods.map((period) => (
							<col
								key={period.key}
								style={{
									width: `${(period.days / timeline.totalDays) * timelineWidth}%`,
								}}
							/>
						))}
					</colgroup>
					<thead>
						<tr>
							<th colSpan={fixedColumns} />
							{timeline.groups.map((group) => (
								<th className="period" colSpan={group.span} key={group.key}>
									{group.label}
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
							{timeline.periods.map((period) => (
								<th className="period" key={period.key}>
									{period.label}
									{period.sublabel ? <small>{period.sublabel}</small> : null}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{activities.map((activity) => {
							const status = (
								activity.status in statusColor ? activity.status : "PENDING"
							) as Status;
							const color = statusColor[status];
							const offset = Math.max(
								0,
								dayOffset(start, activity.plannedStart),
							);
							const duration = daysBetweenInclusive(
								activity.plannedStart,
								activity.plannedEnd,
							);
							const progress = Math.min(100, Math.max(0, activity.progress));
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
									<td className="text-center tabular-nums">{duration}</td>
									<td className="text-center">
										{scheduleActivityStatusLabels[status]}
										{progress > 0 && progress < 100 ? (
											<span className="schedule-timeline__pct">
												{progress.toFixed(0)}%
											</span>
										) : null}
									</td>
									<td className="bar-cell" colSpan={timeline.periods.length}>
										{timeline.periods.slice(1).map((period) => (
											<span
												className="grid-line"
												key={period.key}
												style={{ left: `${pct(period.startDay)}%` }}
											/>
										))}
										<span
											className="bar"
											style={{
												left: `${pct(offset)}%`,
												width: `max(3px, ${pct(duration)}%)`,
												borderColor: color,
												background: `${color}22`,
											}}
										>
											<span
												style={{ width: `${progress}%`, background: color }}
											/>
										</span>
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
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
					<span>Escala: {unitLabel[timeline.unit]}</span>
				</div>
				{notes ? <p>Nota: {notes}</p> : null}
			</div>
		</div>
	);
}
