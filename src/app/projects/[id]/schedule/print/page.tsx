import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { daysBetweenInclusive } from "@/modules/schedules/application/dates";
import { getProjectSchedule } from "@/modules/schedules/application/queries";
import { ScheduleTimelineTable } from "@/modules/schedules/ui/schedule-timeline-table";
import { PrintActions } from "@/shared/ui/print-actions";
import { PrintDocumentHeader } from "@/shared/ui/print-document-header";

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
				<PrintDocumentHeader
					details={[
						{ label: "Proyecto", value: schedule.project.code ?? "—" },
						{
							label: "Periodo",
							value: `${longDate.format(schedule.startDate)} – ${longDate.format(schedule.endDate)}`,
						},
						...(schedule.project.location
							? [
									{
										label: "Ubicación",
										value: schedule.project.location,
										wide: true,
									},
								]
							: []),
					]}
					documentMeta={[
						`${daysBetweenInclusive(schedule.startDate, schedule.endDate)} días`,
						`${schedule.activities.length} actividades`,
					]}
					documentTitle="Cronograma"
					projectName={schedule.project.name}
				/>
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
