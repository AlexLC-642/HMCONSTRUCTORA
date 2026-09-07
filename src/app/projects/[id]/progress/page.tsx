import {
	AlertTriangle,
	CheckCircle2,
	ClipboardList,
	FileText,
	HardHat,
	type LucideIcon,
	PackageCheck,
	Printer,
	Send,
	Share2,
	Undo2,
} from "lucide-react";
import { notFound } from "next/navigation";
import type { ComponentProps } from "react";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	approveDailyReportAction,
	publishDailyReportAction,
	saveDailyReportAction,
	submitDailyReportAction,
} from "@/modules/progress/application/actions";
import {
	getProjectEvidenceGallery,
	getProjectProgressWorkspace,
} from "@/modules/progress/application/queries";
import {
	DailyReportEvidenceGallery,
	ProjectEvidenceGallery,
} from "@/modules/progress/ui/daily-report-evidence-gallery";
import { DailyReportForm } from "@/modules/progress/ui/daily-report-form";
import { ProgressSummaryCharts } from "@/modules/progress/ui/progress-summary-charts";

const statusLabels = {
	DRAFT: "Borrador",
	SUBMITTED: "En revision",
	REVIEWED: "Revisado",
	APPROVED: "Aprobado",
	PUBLISHED: "Publicado",
} as const;

const statusTone = {
	DRAFT: "border-[#d7d9d2] bg-[#fbfaf6] text-[#52615f]",
	SUBMITTED: "border-[#f2d58a] bg-[#fff8e8] text-[#7a4d00]",
	REVIEWED: "border-[#bed4ff] bg-[#edf4ff] text-[#2057c9]",
	APPROVED: "border-[#b7dfcc] bg-[#edf9f2] text-[#1f7a5a]",
	PUBLISHED: "border-[#b7dfcc] bg-[#edf9f2] text-[#1f7a5a]",
} as const;

type Search = {
	tab?: string | string[];
};

function toNumber(value: { toNumber(): number } | number | null | undefined) {
	return typeof value === "number" ? value : (value?.toNumber() ?? 0);
}

function percent(value: number) {
	return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
}

function signedPercent(value: number) {
	return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function formatDate(value?: Date | null) {
	return value
		? value.toLocaleDateString("es-GT", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			})
		: "Sin fecha";
}

export default async function ProjectProgressPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>;
	searchParams?: Promise<Search>;
}) {
	const user = await requirePermission("avance.crear");
	const { id } = await params;
	const search = searchParams ? await searchParams : {};
	const rawTab = Array.isArray(search.tab) ? search.tab[0] : search.tab;
	const activeTab =
		rawTab === "registro" || rawTab === "historial" || rawTab === "evidencias"
			? rawTab
			: "resumen";
	const workspace = await getProjectProgressWorkspace(id);
	// DailyReportForm is interactive and runs in the browser. Prisma Decimal and
	// Date instances must cross that boundary as plain JSON values.
	const clientWorkspace = JSON.parse(
		JSON.stringify(workspace),
	) as typeof workspace;
	const evidenceGallery =
		activeTab === "evidencias" ? await getProjectEvidenceGallery(id) : [];

	if (!workspace.project) notFound();

	const canApprove = user.permissions.includes("avance.aprobar");
	const canPublish = user.permissions.includes("avance.publicar");
	const editableReport =
		workspace.latestReport?.status === "DRAFT" ? workspace.latestReport : null;
	const saveAction = saveDailyReportAction.bind(null, id);
	const activities = workspace.schedule?.activities ?? [];
	const latestActivities = workspace.latestReport?.activities ?? [];
	const activityCount = Math.max(1, activities.length);
	const completed = activities.filter(
		(activity) => activity.status === "COMPLETED",
	).length;
	const inProgress = activities.filter(
		(activity) => activity.status === "IN_PROGRESS",
	).length;
	const blocked = activities.filter(
		(activity) => activity.status === "BLOCKED",
	).length;
	const pending = Math.max(
		0,
		activities.length - completed - inProgress - blocked,
	);
	const scheduleAverage = activities.length
		? activities.reduce(
				(sum, activity) => sum + toNumber(activity.progress),
				0,
			) / activityCount
		: toNumber(workspace.project.progressPercentage);
	const reportBase = Math.max(1, latestActivities.length);
	const reportPrevious =
		latestActivities.reduce(
			(sum, activity) => sum + toNumber(activity.previousProgress),
			0,
		) / reportBase;
	const reportCurrent = latestActivities.length
		? latestActivities.reduce(
				(sum, activity) => sum + toNumber(activity.newProgress),
				0,
			) / reportBase
		: scheduleAverage;
	const dailyDelta = Math.max(0, reportCurrent - reportPrevious);
	const movedToday = latestActivities.filter(
		(activity) =>
			toNumber(activity.todayQuantity) > 0 ||
			toNumber(activity.newProgress) > toNumber(activity.previousProgress),
	).length;
	const totalPeople =
		workspace.latestReport?.laborEntries.reduce(
			(sum, entry) => sum + toNumber(entry.people),
			0,
		) ?? 0;
	const materialRows =
		workspace.latestReport?.materialEntries.filter(
			(entry) => toNumber(entry.quantityUsed) > 0,
		).length ?? 0;
	const issueCount = latestActivities.filter((activity) =>
		activity.issues?.trim(),
	).length;
	const evidence = workspace.latestReport?.mediaEntries.length ?? 0;
	const reportStatus = workspace.latestReport
		? statusLabels[workspace.latestReport.status]
		: "Nuevo informe";
	const reportTone = workspace.latestReport
		? statusTone[workspace.latestReport.status]
		: "border-[#d7d9d2] bg-[#fbfaf6] text-[#52615f]";
	const chartActivities = activities.map((activity) => ({
		name: activity.description,
		progress: toNumber(activity.progress),
		status: activity.status as
			| "PENDING"
			| "IN_PROGRESS"
			| "COMPLETED"
			| "BLOCKED",
	}));

	return (
		<main className="mx-auto max-w-[1480px] space-y-5">
			<section className="rounded-[18px] border border-[var(--border)] bg-white px-5 py-4 shadow-[0_18px_45px_rgba(20,25,27,0.08)]">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-[-0.02em]">
							Informe diario de obra
						</h1>
						<p className="mt-1 text-sm text-[var(--muted)]">
							{workspace.project.code} - {workspace.project.name}
						</p>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-[#596660]">
							El informe reúne lo ejecutado por renglón, materiales consumidos,
							personal, incidencias y evidencias de la jornada.
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<a
							className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
							href={`/projects/${id}`}
						>
							<Undo2 aria-hidden="true" size={18} />
							Volver
						</a>
					</div>
				</div>

				<div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border)] pt-4">
					<nav
						className="flex rounded-xl border border-[var(--border)] bg-[#f4f5f2] p-1"
						aria-label="Vistas del informe diario"
					>
						<a
							className={`focus-ring rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "resumen" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
							href={`/projects/${id}/progress`}
						>
							Resumen
						</a>
						<a
							className={`focus-ring rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "registro" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
							href={`/projects/${id}/progress?tab=registro`}
						>
							Registrar jornada
						</a>
						<a
							className={`focus-ring rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "historial" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
							href={`/projects/${id}/progress?tab=historial`}
						>
							Historial
						</a>
						<a
							className={`focus-ring rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "evidencias" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
							href={`/projects/${id}/progress?tab=evidencias`}
						>
							Evidencias
						</a>
					</nav>
					<div className="flex flex-wrap gap-2">
						{workspace.latestReport ? (
							<a
								className="focus-ring inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
								href={`/projects/${id}/progress/reports/${workspace.latestReport.id}/print`}
							>
								<Printer aria-hidden="true" size={18} />
								Vista PDF
							</a>
						) : null}
						{activeTab !== "registro" ? (
							<a
								className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--brand-red)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(200,32,47,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(200,32,47,0.22)]"
								href={`/projects/${id}/progress?tab=registro`}
							>
								<ClipboardList aria-hidden="true" size={17} />
								Registrar
							</a>
						) : null}
						{editableReport ? (
							<ActionForm
								action={submitDailyReportAction.bind(
									null,
									id,
									editableReport.id,
								)}
								icon={Send}
								label="Enviar revision"
							/>
						) : null}
						{canApprove && workspace.latestReport?.status === "SUBMITTED" ? (
							<ActionForm
								action={approveDailyReportAction.bind(
									null,
									id,
									workspace.latestReport.id,
								)}
								icon={CheckCircle2}
								label="Aprobar"
							/>
						) : null}
						{canPublish && workspace.latestReport?.status === "APPROVED" ? (
							<ActionForm
								action={publishDailyReportAction.bind(
									null,
									id,
									workspace.latestReport.id,
								)}
								icon={Share2}
								label="Publicar"
							/>
						) : null}
					</div>
				</div>
			</section>

			{activeTab === "historial" ? (
				<HistoryPanel reports={workspace.reports} />
			) : activeTab === "evidencias" ? (
				<ProjectEvidenceGallery projectId={id} reports={evidenceGallery} />
			) : activeTab === "registro" ? (
				workspace.schedule?.activities.length ? (
					<>
						<DailyReportForm action={saveAction} workspace={clientWorkspace} />
						{editableReport?.mediaEntries.length ? (
							<DailyReportEvidenceGallery
								editable
								projectId={id}
								report={editableReport}
							/>
						) : null}
					</>
				) : (
					<section className="rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm">
						<p className="text-sm text-[var(--muted)]">
							Primero crea el cronograma para usar sus actividades como base del
							informe diario.
						</p>
					</section>
				)
			) : (
				<>
					<section className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
						<article className="overflow-hidden rounded-[22px] border border-[var(--border)] bg-white p-5 shadow-[0_24px_60px_rgba(31,42,45,0.10)]">
							<div className="flex flex-wrap items-start justify-between gap-4">
								<div>
									<p className="text-sm font-semibold text-[var(--brand-red)]">
										{workspace.latestReport?.reportNumber ?? "Informe nuevo"}
									</p>
									<h2 className="mt-1 text-xl font-semibold">
										Resumen de avance
									</h2>
									<p className="mt-1 text-sm text-[var(--muted)]">
										{workspace.latestReport
											? formatDate(workspace.latestReport.reportDate)
											: "Sin informe guardado para la jornada."}
									</p>
								</div>
								<div className="flex flex-wrap items-center gap-2">
									<span
										className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${reportTone}`}
									>
										{reportStatus}
									</span>
									<a
										className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--brand-red)] px-3 py-2 text-xs font-semibold text-white shadow-sm"
										href={`/projects/${id}/progress?tab=registro`}
									>
										<ClipboardList aria-hidden="true" size={15} />
										Registrar jornada
									</a>
								</div>
							</div>
							<div className="kpi-grid mt-5 grid gap-3 sm:grid-cols-3">
								<ReportStat
									label="Avance actual"
									value={percent(reportCurrent)}
									helper={`Jornada ${signedPercent(dailyDelta)}`}
									tone="red"
								/>
								<ReportStat
									label="Trabajo movido"
									value={`${movedToday}/${activities.length}`}
									helper="Actividades con registro"
									tone="green"
								/>
								<ReportStat
									label="Evidencias"
									value={String(evidence)}
									helper={evidence ? "Adjuntas al informe" : "Pendientes"}
									tone="blue"
								/>
							</div>
							<ProgressSummaryCharts
								activities={chartActivities}
								blocked={blocked}
								completed={completed}
								currentProgress={reportCurrent}
								inProgress={inProgress}
								pending={pending}
								plannedProgress={scheduleAverage}
								previousProgress={reportPrevious}
							/>
						</article>

						<article className="kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
							<InsightCard
								icon={ClipboardList}
								label="Base del proyecto"
								value={`${activities.length} actividades`}
								detail={`${completed} completadas, ${pending} pendientes`}
								tone="red"
							/>
							<InsightCard
								icon={HardHat}
								label="Personal de campo"
								value={String(totalPeople)}
								detail="Personas registradas en la jornada"
								tone="amber"
							/>
							<InsightCard
								icon={PackageCheck}
								label="Materiales"
								value={String(materialRows)}
								detail="Consumos reportados"
								tone="green"
							/>
							<InsightCard
								icon={AlertTriangle}
								label="Incidencias"
								value={String(issueCount)}
								detail={
									issueCount ? "Requieren seguimiento" : "Sin incidencias"
								}
								tone="red"
							/>
						</article>
					</section>

					<section className="grid gap-4 lg:grid-cols-[1fr_0.55fr]">
						<article className="rounded-[18px] border border-[var(--border)] bg-white p-5 shadow-[0_16px_38px_rgba(20,25,27,0.07)]">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<h2 className="text-lg font-semibold">Frente de trabajo</h2>
									<p className="text-sm text-[var(--muted)]">
										Estado actual del cronograma base del proyecto.
									</p>
								</div>
								<span className="rounded-full border border-[var(--border)] bg-[#fbfaf6] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
									{percent(scheduleAverage)} promedio
								</span>
							</div>
							<div className="kpi-grid mt-5 grid gap-3 md:grid-cols-4">
								<StatusPill
									label="Pendientes"
									count={pending}
									total={activityCount}
									tone="bg-[#f2a900]"
								/>
								<StatusPill
									label="En proceso"
									count={inProgress}
									total={activityCount}
									tone="bg-[var(--success)]"
								/>
								<StatusPill
									label="Completadas"
									count={completed}
									total={activityCount}
									tone="bg-[#2563eb]"
								/>
								<StatusPill
									label="Bloqueadas"
									count={blocked}
									total={activityCount}
									tone="bg-[var(--danger)]"
								/>
							</div>
						</article>

						<article className="rounded-[18px] border border-[var(--border)] bg-white p-5 shadow-[0_16px_38px_rgba(20,25,27,0.07)]">
							<h2 className="text-lg font-semibold">Revision rapida</h2>
							<div className="mt-4 space-y-3 text-sm">
								<ReviewLine
									label="Jornada"
									value={workspace.latestReport?.workShift ?? "Por registrar"}
								/>
								<ReviewLine
									label="Ubicacion"
									value={
										workspace.latestReport?.location ??
										workspace.project.location ??
										"Sin ubicacion"
									}
								/>
								<ReviewLine label="Estado" value={reportStatus} />
							</div>
						</article>
					</section>
				</>
			)}
		</main>
	);
}

function ActionForm({
	action,
	icon: Icon,
	label,
}: {
	action: ComponentProps<"form">["action"];
	icon: LucideIcon;
	label: string;
}) {
	return (
		<form action={action}>
			<button
				className="focus-ring inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(200,32,47,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_30px_rgba(200,32,47,0.22)]"
				type="submit"
			>
				<Icon aria-hidden="true" size={17} />
				{label}
			</button>
		</form>
	);
}

function ReportStat({
	label,
	value,
	helper,
	tone,
}: {
	label: string;
	value: string;
	helper: string;
	tone: "red" | "green" | "blue";
}) {
	const toneClass = {
		red: "from-[#fff6f6] to-white before:bg-[var(--brand-red)]",
		green: "from-[#f1fbf6] to-white before:bg-[var(--success)]",
		blue: "from-[#f2f7ff] to-white before:bg-[#2563eb]",
	}[tone];

	return (
		<div
			className={`relative overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br p-4 shadow-[0_12px_28px_rgba(31,42,45,0.07)] before:absolute before:inset-x-0 before:top-0 before:h-1 ${toneClass}`}
		>
			<p className="text-xs font-semibold uppercase text-[var(--muted)]">
				{label}
			</p>
			<p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
			<p className="mt-1 text-sm text-[var(--muted)]">{helper}</p>
		</div>
	);
}

function InsightCard({
	icon: Icon,
	label,
	value,
	detail,
	tone,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	detail: string;
	tone: "red" | "green" | "amber";
}) {
	const toneClass = {
		red: "bg-[#fff1f1] text-[var(--brand-red)]",
		green: "bg-[#edf9f2] text-[var(--success)]",
		amber: "bg-[#fff8e8] text-[#b76e00]",
	}[tone];

	return (
		<div className="rounded-[18px] border border-[var(--border)] bg-white p-4 shadow-[0_18px_42px_rgba(31,42,45,0.09)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_54px_rgba(31,42,45,0.13)]">
			<div className="flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase text-[var(--muted)]">
						{label}
					</p>
					<p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
				</div>
				<span
					className={`grid size-10 place-items-center rounded-xl ${toneClass}`}
				>
					<Icon aria-hidden="true" size={19} />
				</span>
			</div>
			<p className="mt-4 text-sm text-[var(--muted)]">{detail}</p>
		</div>
	);
}

function StatusPill({
	label,
	count,
	total,
	tone,
}: {
	label: string;
	count: number;
	total: number;
	tone: string;
}) {
	const share = total > 0 ? (count / total) * 100 : 0;
	return (
		<div className="rounded-2xl border border-[var(--border)] bg-[#fbfaf6] p-4">
			<div className="flex items-center justify-between gap-3">
				<span className="text-sm font-medium text-[var(--muted)]">{label}</span>
				<strong>{count}</strong>
			</div>
			<div className="mt-3 h-2.5 overflow-hidden rounded-full bg-[#e2e5df]">
				<div
					className={`h-full rounded-full ${tone}`}
					style={{ width: percent(share) }}
				/>
			</div>
		</div>
	);
}

function ReviewLine({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-2 last:border-b-0">
			<span className="text-[var(--muted)]">{label}</span>
			<strong className="text-right">{value}</strong>
		</div>
	);
}

function HistoryPanel({
	reports,
}: {
	reports: Awaited<ReturnType<typeof getProjectProgressWorkspace>>["reports"];
}) {
	return (
		<section className="rounded-[18px] border border-[var(--border)] bg-white shadow-[0_16px_38px_rgba(20,25,27,0.08)]">
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
				<div>
					<h2 className="text-lg font-semibold">Historial de informes</h2>
					<p className="text-sm text-[var(--muted)]">
						Consulta las bitacoras registradas para este proyecto.
					</p>
				</div>
				<span className="rounded-full border border-[var(--border)] bg-[#fbfaf6] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
					{reports.length} recientes
				</span>
			</div>
			{reports.length ? (
				<>
					<div className="hidden overflow-x-auto md:block">
						<table className="w-full min-w-[760px] border-collapse text-sm">
							<thead className="bg-[#f4f5f2] text-xs uppercase text-[var(--muted)]">
								<tr>
									<th className="px-5 py-3 text-left">Informe</th>
									<th className="px-5 py-3 text-left">Fecha</th>
									<th className="px-5 py-3 text-left">Estado</th>
									<th className="px-5 py-3 text-left">Acciones</th>
								</tr>
							</thead>
							<tbody>
								{reports.map((report) => (
									<tr
										className="border-t border-[var(--border)]"
										key={report.id}
									>
										<td className="px-5 py-4 font-semibold">
											{report.reportNumber}
										</td>
										<td className="px-5 py-4">
											{formatDate(report.reportDate)}
										</td>
										<td className="px-5 py-4">
											<span
												className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[report.status]}`}
											>
												{statusLabels[report.status]}
											</span>
										</td>
										<td className="px-5 py-4">
											<div className="flex flex-wrap items-center gap-2">
												<a
													className="focus-ring rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
													href={`/projects/${report.projectId}/progress/reports/${report.id}`}
												>
													{report.status === "DRAFT" ? "Editar" : "Ver"}
												</a>
												<a
													className="focus-ring rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
													href={`/projects/${report.projectId}/progress/reports/${report.id}/print`}
												>
													PDF
												</a>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<div className="grid gap-3 p-4 md:hidden">
						{reports.map((report) => (
							<article
								className="rounded-2xl border border-[var(--border)] bg-[#fbfaf6] p-4"
								key={report.id}
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<h3 className="font-semibold">{report.reportNumber}</h3>
										<p className="mt-1 text-sm text-[var(--muted)]">
											{formatDate(report.reportDate)}
										</p>
									</div>
									<span
										className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone[report.status]}`}
									>
										{statusLabels[report.status]}
									</span>
								</div>
								<p className="mt-3 text-sm">{report.siteManager}</p>
								<div className="mt-4 flex flex-wrap gap-2">
									<a
										className="focus-ring rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold shadow-sm"
										href={`/projects/${report.projectId}/progress/reports/${report.id}`}
									>
										{report.status === "DRAFT" ? "Editar" : "Ver"}
									</a>
									<a
										className="focus-ring rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-xs font-semibold shadow-sm"
										href={`/projects/${report.projectId}/progress/reports/${report.id}/print`}
									>
										PDF
									</a>
								</div>
							</article>
						))}
					</div>
				</>
			) : (
				<div className="grid min-h-64 place-items-center px-5 py-12 text-center">
					<div>
						<FileText
							aria-hidden="true"
							className="mx-auto text-[var(--muted)]"
							size={34}
						/>
						<p className="mt-3 font-semibold">
							Todavia no hay informes de avance.
						</p>
						<p className="mt-1 text-sm text-[var(--muted)]">
							Cuando guardes el primer informe aparecera en este historial.
						</p>
					</div>
				</div>
			)}
		</section>
	);
}
