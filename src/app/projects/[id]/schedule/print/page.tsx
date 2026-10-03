import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { daysBetweenInclusive } from "@/modules/schedules/application/dates";
import { getProjectSchedule } from "@/modules/schedules/application/queries";
import {
	buildPrintTimeline,
	dayOffset,
	type TimelineUnit,
} from "@/modules/schedules/domain/print-timeline";
import {
	type scheduleActivityStatuses,
	scheduleActivityStatusLabels,
} from "@/modules/schedules/domain/validation";
import { PrintActions } from "@/shared/ui/print-actions";

export const metadata: Metadata = { title: "Cronograma | HM Constructora" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Status = (typeof scheduleActivityStatuses)[number];

const shortDate = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "short",
	timeZone: "UTC",
});
const longDate = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "long",
	year: "numeric",
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

export default async function SchedulePrintPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requirePermission("cronograma.ver");
	const { id } = await params;
	const schedule = await getProjectSchedule(id);

	if (!schedule?.startDate || !schedule.endDate) notFound();

	const scheduleStart = schedule.startDate;
	const timeline = buildPrintTimeline(scheduleStart, schedule.endDate);
	const hasLabor = schedule.activities.some((activity) =>
		activity.labor?.trim(),
	);
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
		<>
			<PrintActions backHref={`/projects/${id}/schedule`} />
			<main className="schedule-print print-surface mx-auto max-w-[1280px] bg-white p-8 text-[#111] print:max-w-none print:p-0">
				<style>{`
@page { size: letter landscape; margin: 0.35in; }
.schedule-print * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.schedule-print-table { width: 100%; table-layout: fixed; border-collapse: collapse; font-size: 10px; }
.schedule-print-table th, .schedule-print-table td { border: 1px solid #9aa3a0; padding: 4px 5px; vertical-align: middle; }
.schedule-print-table thead th { background: #eef2ef; font-weight: 700; text-transform: uppercase; letter-spacing: .02em; }
.schedule-print-table thead tr:first-child th { background: #dfe6e1; }
.schedule-print-table .period { padding: 3px 0; text-align: center; font-size: 9px; text-transform: none; white-space: nowrap; overflow: hidden; }
.schedule-print-table .period small { display: block; font-weight: 500; color: #555; }
.schedule-print-table tbody tr { break-inside: avoid; page-break-inside: avoid; }
.schedule-print-table tbody tr:nth-child(even) td { background: #fafbfa; }
.schedule-print-table .bar-cell { position: relative; padding: 0; height: 26px; }
.schedule-print-table .grid-line { position: absolute; top: 0; bottom: 0; border-left: 1px solid #e1e6e2; }
.schedule-print-table .bar { position: absolute; top: 7px; bottom: 7px; border-radius: 3px; border: 1.5px solid; overflow: hidden; }
.schedule-print-table .bar > span { position: absolute; inset: 0 auto 0 0; }
.schedule-print-table thead { display: table-header-group; }
@media print {
  html, body { background: white; }
  .schedule-print-table { font-size: 9px; }
  .schedule-print-table .bar-cell { height: 22px; }
  .schedule-print-table .bar { top: 6px; bottom: 6px; }
}
`}</style>
				<header className="mb-5 flex items-end justify-between gap-6 border-b-2 border-[#1b2528] pb-3">
					<div>
						<p className="text-[11px] font-semibold uppercase tracking-wide text-[#555]">
							Proyecto {schedule.project.code}
						</p>
						<h1 className="text-lg font-bold uppercase leading-tight">
							{schedule.project.name}
						</h1>
						{schedule.project.location ? (
							<p className="text-[11px] uppercase text-[#444]">
								{schedule.project.location}
							</p>
						) : null}
					</div>
					<div className="text-right">
						<h2 className="text-lg font-bold uppercase">Cronograma</h2>
						<p className="text-[11px] text-[#444]">
							{longDate.format(scheduleStart)} –{" "}
							{longDate.format(schedule.endDate)} · {timeline.totalDays} días
						</p>
					</div>
				</header>

				<table className="schedule-print-table">
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
						{schedule.activities.map((activity) => {
							const status = activity.status as Status;
							const color = statusColor[status];
							const start = Math.max(
								0,
								dayOffset(scheduleStart, activity.plannedStart),
							);
							const duration = daysBetweenInclusive(
								activity.plannedStart,
								activity.plannedEnd,
							);
							const progress = Math.min(
								100,
								Math.max(0, activity.progress.toNumber()),
							);
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
											<span className="block text-[8px] text-[#555]">
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
												left: `${pct(start)}%`,
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

				<footer className="mt-4 flex flex-wrap items-center justify-between gap-4 text-[10px] text-[#333]">
					<div className="flex flex-wrap items-center gap-4">
						<span className="inline-flex items-center gap-1.5">
							<span className="inline-block h-2.5 w-6 rounded-sm border-[1.5px] border-[#8a949a] bg-[#8a949a22]" />
							Planificado
						</span>
						<span className="inline-flex items-center gap-1.5">
							<span className="inline-block h-2.5 w-6 rounded-sm bg-[#1f7a5b]" />
							Avance real
						</span>
						<span>Escala: {unitLabel[timeline.unit]}</span>
					</div>
					{schedule.notes ? (
						<p className="uppercase">Nota: {schedule.notes}</p>
					) : null}
				</footer>
			</main>
		</>
	);
}
