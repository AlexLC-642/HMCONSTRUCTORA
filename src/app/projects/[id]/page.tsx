import {
	AlertTriangle,
	Archive,
	Banknote,
	CalendarDays,
	CheckCircle2,
	ClipboardList,
	FileText,
	Gauge,
	PackageSearch,
	Plus,
	RotateCcw,
	Share2,
	TrendingUp,
	WalletCards,
} from "lucide-react";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import { getPortalShareStatus } from "@/modules/client-portal/application/service";
import {
	archiveProjectAction,
	completeProjectAction,
	reactivateProjectAction,
} from "@/modules/projects/application/actions";
import { getProjectDashboard } from "@/modules/projects/application/dashboard";
import {
	BudgetProgressChart,
	type BudgetProgressPoint,
	ProjectSCurveChart,
	type ProjectTimelinePoint,
} from "@/modules/projects/ui/project-workspace/project-charts";
import { WorkspaceReveal } from "@/modules/projects/ui/project-workspace/project-motion";
import {
	moneyCompact,
	moneyFull,
	percent,
	pp,
} from "@/shared/ui/charts/format";

const dateFormatter = new Intl.DateTimeFormat("es-GT", { dateStyle: "medium" });
const shortDateFormatter = new Intl.DateTimeFormat("es-GT", {
	day: "2-digit",
	month: "short",
});

function toNumber(value: { toNumber(): number } | number | null | undefined) {
	return typeof value === "number" ? value : (value?.toNumber() ?? 0);
}

function clampPercent(value: number) {
	return Math.max(0, Math.min(100, value));
}

function formatDate(value?: Date | null) {
	return value ? dateFormatter.format(value) : "Sin fecha";
}

function shortDate(value: Date) {
	return shortDateFormatter.format(value).replace(".", "");
}

function daysBetween(start: Date, end: Date) {
	const startUtc = Date.UTC(
		start.getFullYear(),
		start.getMonth(),
		start.getDate(),
	);
	const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
	return Math.max(1, Math.round((endUtc - startUtc) / 86_400_000) + 1);
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

function timelineDates(start: Date, end: Date, today: Date) {
	const duration = daysBetween(start, end);
	const step = Math.max(1, Math.ceil(duration / 7));
	const dates: Date[] = [];

	for (let date = new Date(start); date <= end; date = addDays(date, step)) {
		dates.push(new Date(date));
	}

	if (
		today >= start &&
		today <= end &&
		!dates.some((date) => date.toDateString() === today.toDateString())
	) {
		dates.push(new Date(today));
	}

	if (!dates.some((date) => date.toDateString() === end.toDateString())) {
		dates.push(new Date(end));
	}

	return dates.sort((a, b) => a.getTime() - b.getTime());
}

function plannedProgressAt(
	activities: Array<{ plannedStart: Date; plannedEnd: Date }>,
	date: Date,
) {
	if (activities.length === 0) return null;

	const total = activities.reduce((sum, activity) => {
		if (date < activity.plannedStart) return sum;
		if (date >= activity.plannedEnd) return sum + 100;

		const elapsed = daysBetween(activity.plannedStart, date);
		const duration = daysBetween(activity.plannedStart, activity.plannedEnd);
		return sum + Math.min(100, (elapsed / duration) * 100);
	}, 0);

	return total / activities.length;
}

function statusLabel(status: string) {
	const labels: Record<string, string> = {
		ACTIVE: "Activo",
		DRAFT: "Borrador",
		PAUSED: "Pausado",
		COMPLETED: "Finalizado",
		ARCHIVED: "Archivado",
		CANCELED: "Cancelado",
		PENDING: "Pendiente",
		IN_PROGRESS: "En proceso",
		BLOCKED: "Bloqueada",
	};
	return labels[status] ?? status;
}

function activityStatusLabel(status: string) {
	const labels: Record<string, string> = {
		PENDING: "Pendientes",
		IN_PROGRESS: "En proceso",
		BLOCKED: "Bloqueadas",
		COMPLETED: "Completadas",
	};
	return labels[status] ?? status;
}

function riskClass(risk: string) {
	if (risk === "Riesgo")
		return "border-[#f0b4ad] bg-[#fff4f2] text-[var(--danger)]";
	if (risk === "Atencion")
		return "border-[#f2d28f] bg-[#fff8e8] text-[var(--warning)]";
	return "border-[#b7dfcc] bg-[#edf9f2] text-[var(--success)]";
}

function buildTimeline(
	activities: Array<{ plannedStart: Date; plannedEnd: Date }>,
	reports: Array<{
		reportDate: Date;
		activities: Array<{ newProgress: { toNumber(): number } | number }>;
	}>,
	budgetTotal: number,
	spent: number,
	realProgress: number,
): ProjectTimelinePoint[] {
	if (activities.length === 0) return [];

	const today = new Date();
	const start = activities.reduce(
		(min, activity) =>
			activity.plannedStart < min ? activity.plannedStart : min,
		activities[0].plannedStart,
	);
	const end = activities.reduce(
		(max, activity) => (activity.plannedEnd > max ? activity.plannedEnd : max),
		activities[0].plannedEnd,
	);
	const sortedReports = [...reports].sort(
		(a, b) => a.reportDate.getTime() - b.reportDate.getTime(),
	);

	return timelineDates(start, end, today).map((date) => {
		const report = sortedReports
			.filter((item) => item.reportDate <= date)
			.at(-1);
		const reportProgress =
			report && report.activities.length > 0
				? report.activities.reduce(
						(sum, item) => sum + toNumber(item.newProgress),
						0,
					) / report.activities.length
				: null;

		return {
			label: shortDate(date),
			planned: plannedProgressAt(activities, date),
			real:
				date.toDateString() === today.toDateString()
					? realProgress
					: reportProgress,
			financial:
				date.toDateString() === today.toDateString() && budgetTotal > 0
					? clampPercent((spent / budgetTotal) * 100)
					: null,
		};
	});
}

function projectTabs(projectId: string) {
	return [
		{ label: "Resumen", href: `/projects/${projectId}` },
		{ label: "Presupuesto", href: `/projects/${projectId}/budget` },
		{ label: "Cronograma", href: `/projects/${projectId}/schedule` },
		{ label: "Avance diario", href: `/projects/${projectId}/progress` },
		{ label: "Finanzas", href: `/projects/${projectId}/finance` },
		{ label: "Recursos", href: `/projects/${projectId}/resources` },
		{ label: "Documentos", href: `/projects/${projectId}/documents` },
		{ label: "Informacion", href: `/projects/${projectId}/information` },
		{ label: "Portal cliente", href: `/projects/${projectId}/sharing` },
	];
}

export default async function ProjectDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await requirePermission("proyectos.ver");
	const { id } = await params;
	const [dashboard, portalShare] = await Promise.all([
		getProjectDashboard(id),
		getPortalShareStatus(id),
	]);

	if (!dashboard) notFound();

	const { project } = dashboard;
	const activities = dashboard.schedule.activities;
	const hasPlanning = activities.length > 0;
	const budgetTotal = dashboard.budget.total;
	const spent = dashboard.budget.spent;
	const paid = dashboard.budget.paid;
	const financialProgress =
		budgetTotal > 0 ? clampPercent((spent / budgetTotal) * 100) : null;
	const coverage = spent > 0 ? clampPercent((paid / spent) * 100) : null;
	const timeline = buildTimeline(
		activities,
		dashboard.reports.recent,
		budgetTotal,
		spent,
		dashboard.progress.real,
	);
	const completed = dashboard.schedule.counts.COMPLETED;
	const inProgress = dashboard.schedule.counts.IN_PROGRESS;
	const pending = dashboard.schedule.counts.PENDING;
	const blocked = dashboard.schedule.counts.BLOCKED;
	const completionRatio =
		dashboard.schedule.totalActivities > 0
			? (completed / dashboard.schedule.totalActivities) * 100
			: 0;
	const daysRemaining = project.expectedEndDate
		? Math.max(0, daysBetween(new Date(), project.expectedEndDate))
		: null;
	const canEditProject = user.permissions.includes("proyectos.editar");

	const sectionProgress: BudgetProgressPoint[] = dashboard.budget.sections
		.slice(0, 8)
		.map((section) => {
			const related = activities.filter(
				(activity) => activity.budgetSectionCode === section.code,
			);
			const progress =
				related.length > 0
					? related.reduce(
							(sum, activity) => sum + toNumber(activity.progress),
							0,
						) / related.length
					: 0;
			return {
				code: `R${section.code}`,
				name: section.name,
				budget: toNumber(section.total),
				progress,
			};
		});

	const kpis = [
		{
			title: "Presupuesto vigente",
			value: moneyCompact(budgetTotal),
			detail: dashboard.budget.version
				? `Version v${dashboard.budget.version}`
				: "Sin presupuesto aprobado",
			href: `/projects/${id}/budget`,
			icon: WalletCards,
			tone: "var(--steel)",
		},
		{
			title: "Costo ejecutado",
			value: moneyCompact(spent),
			detail:
				financialProgress === null
					? "Sin presupuesto base"
					: `${percent(financialProgress)} del presupuesto`,
			href: `/projects/${id}/finance`,
			icon: Banknote,
			tone: "var(--safety)",
		},
		{
			title: "Abonado clientes",
			value: moneyCompact(paid),
			detail:
				coverage === null
					? "Sin gasto registrado"
					: `${percent(coverage)} sobre ejecutado`,
			href: `/projects/${id}/finance`,
			icon: WalletCards,
			tone: "#7C3AED",
		},
		{
			title: "Saldo operativo",
			value: moneyFull(dashboard.budget.balance),
			detail: "Abonado menos ejecutado",
			href: `/projects/${id}/finance`,
			icon: TrendingUp,
			tone: "var(--success)",
		},
		{
			title: "Avance real",
			value: percent(dashboard.progress.real),
			detail: hasPlanning
				? `Plan ${percent(dashboard.progress.planned)} | ${pp(dashboard.progress.gap)}`
				: "Sin planificacion",
			href: `/projects/${id}/progress`,
			icon: Gauge,
			tone: "var(--brand-red)",
		},
		{
			title: "Tiempo",
			value: daysRemaining === null ? "Sin fecha" : `${daysRemaining} dias`,
			detail: project.expectedEndDate
				? `Fin previsto ${formatDate(project.expectedEndDate)}`
				: "Define fecha prevista",
			href: `/projects/${id}/schedule`,
			icon: CalendarDays,
			tone: "var(--info)",
		},
	];
	const operationalAlerts = [
		{
			label: "Actividades atrasadas",
			value: dashboard.schedule.overdueActivities,
			icon: AlertTriangle,
			href: `/projects/${id}/schedule`,
		},
		{
			label: "Informes por revisar",
			value: dashboard.reports.pending,
			icon: ClipboardList,
			href: `/projects/${id}/progress`,
		},
		{
			label: "Requerimientos activos",
			value: dashboard.requisitions.length,
			icon: PackageSearch,
			href: `/requisitions?projectId=${id}`,
		},
		{
			label: "Portal cliente",
			value: portalShare ? "Activo" : "Sin enlace",
			icon: Share2,
			href: `/projects/${id}/sharing`,
		},
	];

	return (
		<main className="project-workspace mx-auto max-w-[1500px] space-y-5">
			<WorkspaceReveal className="project-hero rounded-2xl border border-[var(--border)] bg-white p-5 shadow-[0_24px_70px_rgba(37,48,51,0.12)]">
				<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px] xl:items-stretch">
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<span className="rounded-full bg-[#fff1f2] px-3 py-1 text-xs font-bold tracking-[0.22em] text-[var(--brand-red)]">
								{project.code}
							</span>
							<span
								className={`rounded-full border px-3 py-1 text-xs font-semibold ${riskClass(dashboard.progress.risk)}`}
							>
								{dashboard.progress.risk}
							</span>
							<span className="rounded-full border border-[var(--border)] bg-[#fbfaf6] px-3 py-1 text-xs font-semibold text-[var(--muted)]">
								{portalShare ? "Portal activo" : "Portal sin enlace"}
							</span>
						</div>
						<h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em]">
							{project.name}
						</h1>
						<dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
							<div>
								<dt className="text-[var(--muted)]">Cliente</dt>
								<dd className="font-semibold">
									{project.client?.name ?? "Sin cliente"}
								</dd>
							</div>
							<div>
								<dt className="text-[var(--muted)]">Ubicacion</dt>
								<dd className="font-semibold">
									{project.location ?? "Sin ubicacion"}
								</dd>
							</div>
							<div>
								<dt className="text-[var(--muted)]">Responsable</dt>
								<dd className="font-semibold">
									{project.responsible?.name ?? "Sin responsable"}
								</dd>
							</div>
							<div>
								<dt className="text-[var(--muted)]">Estado</dt>
								<dd className="font-semibold">{statusLabel(project.status)}</dd>
							</div>
						</dl>
					</div>
					<aside className="rounded-xl border border-[#dfe3dc] bg-[#fbfaf6]/95 p-4 shadow-[0_16px_38px_rgba(37,48,51,0.08),inset_0_1px_0_rgba(255,255,255,0.8)]">
						<div className="mb-4 flex items-start justify-between gap-3">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
									Acciones
								</p>
								<p className="text-sm text-[var(--muted)]">
									Operacion del proyecto
								</p>
							</div>
							<a
								className="focus-ring inline-flex min-h-11 items-center rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm font-semibold shadow-sm hover:bg-[#f4f0ed]"
								href="/projects"
							>
								Volver
							</a>
						</div>
						<div className="grid gap-2 sm:grid-cols-2">
							<a
								className="focus-ring inline-flex items-center justify-center gap-2 rounded-md bg-[var(--brand-red)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(211,33,53,0.22)] hover:bg-[#b91f2b]"
								href={`/projects/${id}/progress`}
							>
								<ClipboardList aria-hidden="true" size={16} />
								Registrar avance
							</a>
							<details className="project-action-menu">
								<summary className="focus-ring inline-flex w-full cursor-pointer list-none items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2.5 text-sm font-semibold shadow-sm hover:bg-[#f4f0ed]">
									<Plus aria-hidden="true" size={16} />
									Nuevo registro
								</summary>
								<div>
									<a href={`/projects/${id}/progress?tab=registro`}>
										Evidencia diaria
									</a>
									<a href={`/projects/${id}/documents`}>
										Contrato, plano o video
									</a>
									<a href={`/requisitions?projectId=${id}`}>Requerimiento</a>
									<a href={`/projects/${id}/finance`}>Movimiento financiero</a>
								</div>
							</details>
						</div>
						<div className="mt-4 grid gap-2 sm:grid-cols-2">
							{canEditProject &&
							project.status !== "COMPLETED" &&
							project.status !== "ARCHIVED" ? (
								<form action={completeProjectAction.bind(null, id)}>
									<button
										className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#b7dfcc] bg-[#edf9f2] px-4 py-2 text-sm font-semibold text-[var(--success)] shadow-sm hover:bg-white"
										type="submit"
									>
										<CheckCircle2 aria-hidden="true" size={16} />
										Finalizar
									</button>
								</form>
							) : null}
							{canEditProject && project.status === "COMPLETED" ? (
								<form action={archiveProjectAction.bind(null, id)}>
									<button
										className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md border border-[#d8d7d2] bg-[#f4f0ed] px-4 py-2 text-sm font-semibold text-[#46504c] shadow-sm hover:bg-white"
										type="submit"
									>
										<Archive aria-hidden="true" size={16} />
										Archivar
									</button>
								</form>
							) : null}
							{canEditProject &&
							(project.status === "ARCHIVED" ||
								project.status === "COMPLETED" ||
								project.status === "PAUSED") ? (
								<form action={reactivateProjectAction.bind(null, id)}>
									<button
										className="focus-ring inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-[#f4f0ed]"
										type="submit"
									>
										<RotateCcw aria-hidden="true" size={16} />
										Reactivar
									</button>
								</form>
							) : null}
						</div>
					</aside>
				</div>
			</WorkspaceReveal>

			<nav className="project-tabs" aria-label="Secciones del proyecto">
				{projectTabs(id).map((tab) => (
					<a
						aria-current={tab.label === "Resumen" ? "page" : undefined}
						className={tab.label === "Resumen" ? "active" : ""}
						href={tab.href}
						key={tab.href}
					>
						{tab.label}
					</a>
				))}
			</nav>

			<section className="kpi-grid grid gap-3 md:grid-cols-2 xl:grid-cols-6">
				{kpis.map((kpi) => {
					const Icon = kpi.icon;
					return (
						<a
							className="project-kpi focus-ring"
							href={kpi.href}
							key={kpi.title}
						>
							<span
								className="project-kpi-icon"
								style={{ backgroundColor: kpi.tone }}
							>
								<Icon aria-hidden="true" size={18} />
							</span>
							<span className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
								{kpi.title}
							</span>
							<strong className="mt-3 block text-2xl tabular-nums">
								{kpi.value}
							</strong>
							<span className="mt-2 block text-sm text-[var(--muted)]">
								{kpi.detail}
							</span>
						</a>
					);
				})}
			</section>

			<section className="grid gap-4 xl:grid-cols-[1fr_420px]">
				<article className="project-panel">
					<div className="project-panel-header">
						<div>
							<h2>Curva S del proyecto</h2>
							<p>
								Planificacion, avance real y ejecucion financiera con datos del
								proyecto.
							</p>
						</div>
						<a href={`/projects/${id}/schedule`}>Cronograma</a>
					</div>
					<ProjectSCurveChart hasPlanning={hasPlanning} points={timeline} />
				</article>

				<article className="project-panel">
					<div className="project-panel-header">
						<div>
							<h2>Actividades</h2>
							<p>Estado consolidado del cronograma.</p>
						</div>
					</div>
					<div className="rounded-xl bg-[#f4f0ed] p-4 text-center">
						<p className="text-4xl font-semibold tabular-nums">
							{percent(completionRatio)}
						</p>
						<p className="text-sm text-[var(--muted)]">
							{completed} de {dashboard.schedule.totalActivities} completadas
						</p>
					</div>
					<div className="mt-5 h-4 overflow-hidden rounded-full bg-[#e8e9e4]">
						<div className="flex h-full">
							<span
								className="bg-[var(--info)]"
								style={{ width: `${completionRatio}%` }}
							/>
							<span
								className="bg-[var(--success)]"
								style={{
									width: `${dashboard.schedule.totalActivities ? (inProgress / dashboard.schedule.totalActivities) * 100 : 0}%`,
								}}
							/>
							<span
								className="bg-[var(--danger)]"
								style={{
									width: `${dashboard.schedule.totalActivities ? (blocked / dashboard.schedule.totalActivities) * 100 : 0}%`,
								}}
							/>
						</div>
					</div>
					<div className="mt-4 grid gap-2">
						{[
							["Completadas", completed, "var(--info)"],
							["En proceso", inProgress, "var(--success)"],
							["Pendientes", pending, "var(--safety)"],
							["Bloqueadas", blocked, "var(--danger)"],
						].map(([label, value, color]) => (
							<div
								className="flex items-center justify-between rounded-md border border-[var(--border)] bg-white px-3 py-2 text-sm"
								key={String(label)}
							>
								<span className="flex items-center gap-2 text-[var(--muted)]">
									<span
										className="size-2 rounded-full"
										style={{ backgroundColor: String(color) }}
									/>
									{label}
								</span>
								<strong>{value}</strong>
							</div>
						))}
					</div>
				</article>
			</section>

			<section className="grid gap-4 xl:grid-cols-[1fr_460px]">
				<article className="project-panel">
					<div className="project-panel-header">
						<div>
							<h2>Avance por renglon</h2>
							<p>Relación entre presupuesto y actividades programadas.</p>
						</div>
						<a href={`/projects/${id}/budget`}>Presupuesto</a>
					</div>
					<BudgetProgressChart items={sectionProgress} />
					<div className="mt-2 grid gap-2">
						{sectionProgress.slice(0, 4).map((item) => (
							<div
								className="flex items-center justify-between gap-3 rounded-md bg-[#fbfaf6] px-3 py-2 text-sm"
								key={item.code}
							>
								<span className="truncate">
									<strong>{item.code}</strong> - {item.name}
								</span>
								<span className="font-semibold tabular-nums">
									{moneyCompact(item.budget)}
								</span>
							</div>
						))}
					</div>
				</article>

				<article className="project-panel">
					<div className="project-panel-header">
						<div>
							<h2>Control financiero</h2>
							<p>Resumen operativo del proyecto.</p>
						</div>
						<a href={`/projects/${id}/finance`}>Finanzas</a>
					</div>
					<div className="space-y-3">
						{[
							["Presupuesto", budgetTotal, 100, "var(--steel)"],
							["Ejecutado", spent, financialProgress ?? 0, "var(--safety)"],
							[
								"Abonado",
								paid,
								budgetTotal > 0 ? (paid / budgetTotal) * 100 : 0,
								"#7C3AED",
							],
							[
								"Saldo",
								dashboard.budget.balance,
								budgetTotal > 0
									? Math.abs(dashboard.budget.balance / budgetTotal) * 100
									: 0,
								"var(--success)",
							],
						].map(([label, value, width, color]) => (
							<div
								className="grid grid-cols-[110px_1fr_82px] items-center gap-3 text-sm"
								key={String(label)}
							>
								<span className="text-[var(--muted)]">{label}</span>
								<span className="h-3 overflow-hidden rounded-full bg-[#e8e9e4]">
									<span
										className="block h-full rounded-full"
										style={{
											width: `${clampPercent(Number(width))}%`,
											backgroundColor: String(color),
										}}
									/>
								</span>
								<strong className="text-right tabular-nums">
									{moneyCompact(Number(value))}
								</strong>
							</div>
						))}
					</div>
					<div className="mt-5 rounded-xl border border-[var(--border)] bg-[#fbfaf6] p-4">
						<p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
							Brecha avance vs plan
						</p>
						<p className="mt-1 text-2xl font-semibold">
							{hasPlanning ? pp(dashboard.progress.gap) : "Sin planificacion"}
						</p>
					</div>
				</article>
			</section>

			<section className="grid gap-4 xl:grid-cols-[1fr_420px]">
				<article className="project-panel overflow-hidden p-0">
					<div className="project-panel-header px-5 py-4">
						<div>
							<h2>Próximas actividades</h2>
							<p>Seguimiento inmediato de campo.</p>
						</div>
					</div>
					<div className="overflow-x-auto">
						<table className="w-full min-w-[680px] border-collapse text-sm">
							<thead className="bg-[#f3f1ec] text-left text-xs uppercase text-[var(--muted)]">
								<tr>
									<th className="px-4 py-3">Actividad</th>
									<th className="px-4 py-3">Renglon</th>
									<th className="px-4 py-3">Estado</th>
									<th className="px-4 py-3">Fecha</th>
									<th className="px-4 py-3 text-right">Avance</th>
								</tr>
							</thead>
							<tbody>
								{dashboard.schedule.nextActivities.map((activity) => (
									<tr
										className="border-t border-[var(--border)]"
										key={activity.id}
									>
										<td className="px-4 py-3 font-semibold">
											{activity.description}
										</td>
										<td className="px-4 py-3 text-[var(--muted)]">
											{activity.budgetSectionCode
												? `R${activity.budgetSectionCode}`
												: "Sin renglon"}
										</td>
										<td className="px-4 py-3">
											{activityStatusLabel(activity.status)}
										</td>
										<td className="px-4 py-3">
											{formatDate(activity.plannedStart)}
										</td>
										<td className="px-4 py-3 text-right font-semibold tabular-nums">
											{percent(toNumber(activity.progress))}
										</td>
									</tr>
								))}
								{dashboard.schedule.nextActivities.length === 0 ? (
									<tr>
										<td
											className="px-4 py-10 text-center text-[var(--muted)]"
											colSpan={5}
										>
											No hay actividades pendientes.
										</td>
									</tr>
								) : null}
							</tbody>
						</table>
					</div>
				</article>

				<article className="project-panel">
					<div className="project-panel-header">
						<div>
							<h2>Último informe</h2>
							<p>Actividad diaria más reciente.</p>
						</div>
						<a href={`/projects/${id}/progress`}>Avances</a>
					</div>
					{dashboard.reports.latest ? (
						<div className="space-y-4">
							<div>
								<p className="text-xs font-bold uppercase tracking-[0.14em] text-[var(--muted)]">
									{dashboard.reports.latest.reportNumber}
								</p>
								<p className="mt-1 text-xl font-semibold">
									{formatDate(dashboard.reports.latest.reportDate)}
								</p>
								<p className="text-sm text-[var(--muted)]">
									{dashboard.reports.latest.siteManager}
								</p>
							</div>
							<div className="grid grid-cols-2 gap-3">
								<div className="rounded-xl bg-[#f4f0ed] p-3">
									<p className="text-xs uppercase text-[var(--muted)]">
										Personal
									</p>
									<strong className="text-xl">
										{dashboard.reports.latestPeople.toFixed(0)}
									</strong>
								</div>
								<div className="rounded-xl bg-[#f4f0ed] p-3">
									<p className="text-xs uppercase text-[var(--muted)]">
										Materiales
									</p>
									<strong className="text-xl">
										{dashboard.reports.latestMaterials.toFixed(2)}
									</strong>
								</div>
							</div>
							<p className="rounded-xl border border-[var(--border)] bg-white p-3 text-sm text-[var(--muted)]">
								{dashboard.reports.latest.generalObservations ||
									"Sin observaciones generales."}
							</p>
						</div>
					) : (
						<div className="rounded-xl border border-dashed border-[var(--border)] bg-[#fbfaf6] p-6 text-center text-sm text-[var(--muted)]">
							Todavía no hay informes diarios. Registra el primer avance para
							activar el historial.
						</div>
					)}
				</article>
			</section>

			<section className="grid gap-4 xl:grid-cols-[1fr_420px]">
				<article className="project-panel">
					<div className="project-panel-header">
						<div>
							<h2>Evidencias recientes</h2>
							<p>Fotos, videos o archivos vinculados a informes diarios.</p>
						</div>
						<a href={`/projects/${id}/documents`}>Documentos</a>
					</div>
					{dashboard.reports.recentMedia.length > 0 ? (
						<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{dashboard.reports.recentMedia.map((media) => (
								<a
									className="rounded-xl border border-[var(--border)] bg-[#fbfaf6] p-3 text-sm shadow-sm hover:bg-white"
									href={media.publicUrl}
									key={media.id}
									target="_blank"
									rel="noreferrer"
								>
									<span className="mb-3 grid size-10 place-items-center rounded-lg bg-white text-[var(--brand-red)]">
										<FileText aria-hidden="true" size={18} />
									</span>
									<strong className="line-clamp-2">
										{media.title || media.originalName}
									</strong>
									<span className="mt-2 block text-xs text-[var(--muted)]">
										{media.reportNumber} - {formatDate(media.reportDate)}
									</span>
								</a>
							))}
						</div>
					) : (
						<div className="rounded-xl border border-dashed border-[var(--border)] bg-[#fbfaf6] p-6 text-center text-sm text-[var(--muted)]">
							Sin evidencias cargadas.
						</div>
					)}
				</article>

				<article className="project-panel">
					<div className="project-panel-header">
						<div>
							<h2>Alertas operativas</h2>
							<p>Puntos que requieren revisión.</p>
						</div>
					</div>
					<div className="grid gap-2">
						{operationalAlerts.map((alert) => {
							const AlertIcon = alert.icon;
							return (
								<a
									className="focus-ring flex items-center justify-between gap-3 rounded-md border border-[var(--border)] bg-white px-3 py-3 text-sm hover:bg-[#fbfaf6]"
									href={alert.href}
									key={alert.label}
								>
									<span className="flex items-center gap-2 text-[var(--muted)]">
										<AlertIcon aria-hidden="true" size={16} />
										{alert.label}
									</span>
									<strong>{alert.value}</strong>
								</a>
							);
						})}
					</div>
				</article>
			</section>
		</main>
	);
}
