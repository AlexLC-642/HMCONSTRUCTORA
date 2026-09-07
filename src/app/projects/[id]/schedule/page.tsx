import {
	CalendarDays,
	CheckCircle2,
	Clock3,
	Printer,
	Undo2,
} from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { getProjectById } from "@/modules/projects/application/queries";
import {
	createInitialScheduleAction,
	saveScheduleAction,
} from "@/modules/schedules/application/actions";
import { formatDateInput } from "@/modules/schedules/application/dates";
import { getProjectSchedule } from "@/modules/schedules/application/queries";
import type { ScheduleInput } from "@/modules/schedules/domain/validation";
import { scheduleActivityStatusLabels } from "@/modules/schedules/domain/validation";
import { ScheduleForm } from "@/modules/schedules/ui/schedule-form";

function toScheduleInput(
	schedule: NonNullable<Awaited<ReturnType<typeof getProjectSchedule>>>,
): ScheduleInput {
	return {
		title: schedule.title,
		sourceReference: schedule.sourceReference ?? "",
		notes: schedule.notes ?? "",
		activities: schedule.activities.map((activity) => ({
			id: activity.id,
			code: activity.code,
			description: activity.description,
			labor: activity.labor ?? "",
			budgetSectionCode: activity.budgetSectionCode ?? "",
			budgetSectionName: activity.budgetSectionName ?? "",
			status: activity.status,
			plannedStart: formatDateInput(activity.plannedStart),
			plannedEnd: formatDateInput(activity.plannedEnd),
			actualStart: formatDateInput(activity.actualStart),
			actualEnd: formatDateInput(activity.actualEnd),
			progress: activity.progress.toString(),
			position: activity.position,
			notes: activity.notes ?? "",
			dependsOnCodes: activity.dependencies.map(
				(dependency) => dependency.dependsOnActivity.code,
			),
			assigneeLabels: activity.assignments.map(
				(assignment) => assignment.label,
			),
		})),
	};
}

export default async function ProjectSchedulePage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await requirePermission("cronograma.ver");
	const { id } = await params;
	const [project, schedule] = await Promise.all([
		getProjectById(id),
		getProjectSchedule(id),
	]);

	if (!project) notFound();

	const canEdit = user.permissions.includes("cronograma.editar");
	const createAction = createInitialScheduleAction.bind(null, id);
	const completed =
		schedule?.activities.filter((activity) => activity.status === "COMPLETED")
			.length ?? 0;
	const total = schedule?.activities.length ?? 0;
	const inProgress =
		schedule?.activities.filter((activity) => activity.status === "IN_PROGRESS")
			.length ?? 0;
	const blocked =
		schedule?.activities.filter((activity) => activity.status === "BLOCKED")
			.length ?? 0;
	const averageProgress =
		schedule && total > 0
			? schedule.activities.reduce(
					(sum, activity) => sum + activity.progress.toNumber(),
					0,
				) / total
			: 0;

	return (
		<main className="mx-auto max-w-[1520px] space-y-6">
			<section className="overflow-hidden rounded-2xl border border-[#cfd5ce] bg-white shadow-[0_24px_70px_rgba(37,48,51,0.12)]">
				<div className="grid gap-5 bg-[linear-gradient(120deg,#ffffff_0%,#fbfaf6_55%,#fff1f2_100%)] p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
					<div>
						<div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#f0b4ad] bg-[#fff5f3] px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[var(--brand-red)]">
							<CalendarDays aria-hidden="true" size={14} />
							Control de obra
						</div>
						<h1 className="text-3xl font-semibold tracking-[-0.02em]">
							Cronograma
						</h1>
						<p className="mt-1 text-sm text-[var(--muted)]">
							{project.code} - {project.name}
						</p>
					</div>
					<div className="flex flex-wrap gap-2 lg:justify-end">
						<a
							className="focus-ring inline-flex h-11 items-center gap-2 rounded-md border border-[#cfd5ce] bg-white px-4 text-sm font-semibold shadow-[0_10px_22px_rgba(37,48,51,0.08)] transition hover:-translate-y-0.5 hover:bg-[#fbfaf6]"
							href={`/projects/${id}`}
						>
							<Undo2 aria-hidden="true" size={18} />
							Volver
						</a>

						{schedule ? (
							<a
								className="focus-ring inline-flex h-11 items-center gap-2 rounded-md border border-[#cfd5ce] bg-white px-4 text-sm font-semibold shadow-[0_10px_22px_rgba(37,48,51,0.08)] transition hover:-translate-y-0.5 hover:bg-[#fbfaf6]"
								href={`/projects/${id}/schedule/print`}
							>
								<Printer aria-hidden="true" size={18} />
								Vista PDF
							</a>
						) : null}
					</div>
				</div>
			</section>

			{!schedule ? (
				<section className="rounded-2xl border border-[#cfd5ce] bg-white p-6 shadow-[0_18px_48px_rgba(37,48,51,0.10)]">
					<h2 className="text-lg font-semibold">Cronograma inicial</h2>
					<p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
						Comienza con un cronograma vacío. Nada se guardará hasta que pulses
						“Guardar cronograma”.
					</p>
					{canEdit ? (
						<ScheduleForm
							action={createAction}
							initialValue={{
								title: "",
								sourceReference: "",
								notes: "",
								activities: [],
							}}
							readOnly={false}
						/>
					) : null}
				</section>
			) : (
				<>
					<section className="kpi-grid grid gap-3 md:grid-cols-2 xl:grid-cols-4">
						{[
							{
								label: "Actividades",
								value: String(total),
								detail: `${inProgress} en proceso`,
								icon: CalendarDays,
								tone: "bg-[#253033]",
							},
							{
								label: "Completadas",
								value: String(completed),
								detail: `${averageProgress.toFixed(1)}% promedio`,
								icon: CheckCircle2,
								tone: "bg-[#2563eb]",
							},
							{
								label: "Rango",
								value: `${formatDateInput(schedule.startDate)} - ${formatDateInput(schedule.endDate)}`,
								detail: `${blocked} bloqueadas`,
								icon: Clock3,
								tone: "bg-[#f2a900]",
							},
							{
								label: "Estado",
								value:
									completed === total
										? scheduleActivityStatusLabels.COMPLETED
										: scheduleActivityStatusLabels.IN_PROGRESS,
								detail: "Dominante",
								icon: CalendarDays,
								tone: "bg-[var(--success)]",
							},
						].map((metric) => {
							const Icon = metric.icon;
							return (
								<article
									className="relative overflow-hidden rounded-2xl border border-[#cfd5ce] bg-white p-4 shadow-[0_16px_38px_rgba(37,48,51,0.09)]"
									key={metric.label}
								>
									<span
										className={`absolute right-4 top-4 grid size-11 place-items-center rounded-xl text-white shadow-[0_12px_24px_rgba(37,48,51,0.18)] ${metric.tone}`}
									>
										<Icon aria-hidden="true" size={18} />
									</span>
									<p className="text-xs font-bold uppercase tracking-[0.12em] text-[#58635f]">
										{metric.label}
									</p>
									<strong className="mt-3 block pr-12 text-xl font-semibold leading-tight tabular-nums">
										{metric.value}
									</strong>
									<p className="mt-2 text-sm text-[var(--muted)]">
										{metric.detail}
									</p>
								</article>
							);
						})}
					</section>
					<ScheduleForm
						initialValue={toScheduleInput(schedule)}
						readOnly={!canEdit}
						action={saveScheduleAction.bind(null, id, schedule.id)}
					/>
				</>
			)}
		</main>
	);
}
