import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { daysBetweenInclusive } from "@/modules/schedules/application/dates";
import { getProjectSchedule } from "@/modules/schedules/application/queries";
import { ScheduleTimelineTable } from "@/modules/schedules/ui/schedule-timeline-table";
import { PrintActions } from "@/shared/ui/print-actions";

export const metadata: Metadata = { title: "Cronograma | HM Constructora" };

export const dynamic = "force-dynamic";
export const revalidate = 0;

const longDate = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "long",
	year: "numeric",
	timeZone: "UTC",
});

export default async function SchedulePrintPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	await requirePermission("cronograma.ver");
	const { id } = await params;
	const schedule = await getProjectSchedule(id);

	if (!schedule?.startDate || !schedule.endDate) notFound();

	return (
		<>
			<PrintActions backHref={`/projects/${id}/schedule`} />
			<main className="print-surface mx-auto max-w-[1280px] bg-white p-8 text-[#111] print:max-w-none print:p-0">
				<style>{`@page { size: letter landscape; margin: 0.35in; } @media print { html, body { background: white; } }`}</style>
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
							{longDate.format(schedule.startDate)} –{" "}
							{longDate.format(schedule.endDate)} ·{" "}
							{daysBetweenInclusive(schedule.startDate, schedule.endDate)} días
						</p>
					</div>
				</header>
				<ScheduleTimelineTable
					activities={schedule.activities.map((activity) => ({
						id: activity.id,
						code: activity.code,
						description: activity.description,
						labor: activity.labor,
						status: activity.status,
						plannedStart: activity.plannedStart,
						plannedEnd: activity.plannedEnd,
						progress: activity.progress.toNumber(),
					}))}
					end={schedule.endDate}
					notes={schedule.notes}
					start={schedule.startDate}
				/>
			</main>
		</>
	);
}
