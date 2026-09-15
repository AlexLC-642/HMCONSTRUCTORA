"use client";

import {
	AlertTriangle,
	Banknote,
	CalendarDays,
	FileText,
	FolderKanban,
	PackageSearch,
	Search,
	SlidersHorizontal,
	Trash2,
	TrendingUp,
	WalletCards,
	X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
	moneyCompact,
	moneyFull,
	percent,
	progressGap,
	shortDate,
} from "@/shared/ui/charts/format";
import {
	ActivityStatusChart,
	AlertsStatRow,
	CashFlowChart,
	FinancialControlChart,
	PortfolioSCurve,
	ProgressVarianceChart,
	StockBarChart,
} from "./dashboard-charts";
import { PortfolioTable } from "./portfolio-table";
import type { DashboardMetricsView, DashboardProjectRow } from "./types";

type KpiIcon = React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;

type KpiCardBase = {
	title: string;
	value: React.ReactNode;
	detail: string;
	icon: KpiIcon;
	tone: string;
	href: string;
};

type KpiCard =
	| (KpiCardBase & {
			variant: "trend";
			data: number[];
			delta: number | null;
			deltaLabel: string;
	  })
	| (KpiCardBase & {
			variant: "composition";
			segments: Array<{
				label: string;
				value: number;
				share: number;
				color: string;
			}>;
	  });

function clamp(value: number) {
	return Math.max(0, Math.min(100, value));
}

function average(values: number[]) {
	return values.length === 0
		? 0
		: values.reduce((sum, value) => sum + value, 0) / values.length;
}

function riskRank(risk: string) {
	if (risk === "Riesgo") return 0;
	if (risk === "Atencion") return 1;
	return 2;
}

function cumulative(values: number[]) {
	let running = 0;
	return values.map((value) => {
		running += value;
		return running;
	});
}

// Month-over-month (or point-over-point) change, not cumulative growth -
// a cumulative series almost always "improves", which hides the metric
// actually going backwards recently.
function seriesDelta(values: number[]) {
	if (values.length < 2) return null;
	const previous = values[values.length - 2];
	const current = values[values.length - 1];
	if (previous === 0) return current === 0 ? 0 : null;
	return ((current - previous) / Math.abs(previous)) * 100;
}

function filteredTimeline(
	metrics: DashboardMetricsView,
	projects: DashboardProjectRow[],
) {
	if (projects.length === metrics.projectSummaries.length)
		return metrics.timeline;
	if (projects.length === 0) return [];

	const real = average(projects.map((project) => project.realProgress));
	const planned = average(projects.map((project) => project.plannedProgress));
	const budget = projects.reduce(
		(sum, project) => sum + project.budgetTotal,
		0,
	);
	const spent = projects.reduce((sum, project) => sum + project.spent, 0);
	const financial = budget > 0 ? (spent / budget) * 100 : null;

	return metrics.timeline.map((point, index, rows) => {
		const factor = rows.length <= 1 ? 1 : index / (rows.length - 1);
		return {
			date: point.date,
			planned: planned * factor,
			real: real * factor,
			financial: financial === null ? null : financial * factor,
		};
	});
}

function statusClass(risk: string) {
	if (risk === "Riesgo") return "border-[#efb4ad] bg-[#fff1ef] text-[#9f1f17]";
	if (risk === "Atencion")
		return "border-[#efd18a] bg-[#fff8e8] text-[#8a5700]";
	return "border-[#b4ddca] bg-[#edf9f2] text-[#14684b]";
}

function ResetDatabaseButton() {
	const [loading, setLoading] = useState(false);
	const [isDev, setIsDev] = useState(false);

	// Sync with client after hydration
	useEffect(() => {
		setIsDev(
			typeof window !== "undefined" && window.location.hostname === "localhost",
		);
	}, []);

	const handleReset = async () => {
		if (
			!confirm(
				"SOLO PARA PRUEBAS\n\nEsto eliminará los datos operativos: proyectos, presupuestos, cronogramas, informes, documentos, finanzas e inventario.\n\nEl módulo Sitio web, sus textos, servicios, álbumes, fotos y solicitudes no se eliminarán. Los usuarios y permisos tampoco.\n\n¿Eliminar los datos operativos?",
			)
		) {
			return;
		}

		setLoading(true);
		try {
			const response = await fetch("/api/dev/reset-database", {
				method: "POST",
			});
			if (response.ok) {
				alert("✓ Base de datos reiniciada correctamente.\n\nRecargando...");
				window.location.reload();
			} else {
				const error = await response
					.json()
					.catch(() => ({ error: response.statusText }));
				alert(`Error: ${error.error || response.statusText}`);
			}
		} catch (error) {
			alert(`Error: ${error instanceof Error ? error.message : "Desconocido"}`);
		} finally {
			setLoading(false);
		}
	};

	// Only show in development (localhost)
	if (!isDev) return null;

	return (
		<button
			type="button"
			onClick={handleReset}
			disabled={loading}
			className="dashboard-reset-button focus-ring"
			title="Limpiar datos operativos de prueba; no afecta el Sitio web"
		>
			<Trash2 size={16} />
			<span className="sr-only">
				{loading ? "Limpiando datos" : "Reiniciar datos de prueba"}
			</span>
		</button>
	);
}

export function DashboardWorkspace({
	metrics,
}: {
	metrics: DashboardMetricsView;
}) {
	const [projectId, setProjectId] = useState("all");
	const [clientFilter, setClientFilter] = useState("all");
	const [responsibleFilter, setResponsibleFilter] = useState("all");
	const [dateStart, setDateStart] = useState("");
	const [dateEnd, setDateEnd] = useState("");
	const [periodFilter, setPeriodFilter] = useState("all");
	const [riskFilter, setRiskFilter] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	const [query, setQuery] = useState("");
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [selectedProject, setSelectedProject] =
		useState<DashboardProjectRow | null>(null);

	useEffect(() => {
		if (!filtersOpen) return;

		const handlePointerDown = (event: MouseEvent) => {
			const target = event.target;
			const panel = document.getElementById("dashboard-filters-panel");
			if (panel && target instanceof Node && !panel.contains(target)) {
				setFiltersOpen(false);
			}
		};
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") setFiltersOpen(false);
		};

		document.addEventListener("mousedown", handlePointerDown);
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("mousedown", handlePointerDown);
			document.removeEventListener("keydown", handleKeyDown);
		};
	}, [filtersOpen]);

	const projects = useMemo(() => {
		const normalizedQuery = query.trim().toLowerCase();
		const startFilter = dateStart ? new Date(`${dateStart}T00:00:00`) : null;
		const endFilter = dateEnd ? new Date(`${dateEnd}T23:59:59`) : null;
		return metrics.projectSummaries.filter((project) => {
			if (projectId !== "all" && project.id !== projectId) return false;
			if (clientFilter !== "all" && project.clientName !== clientFilter)
				return false;
			if (
				responsibleFilter !== "all" &&
				project.responsibleName !== responsibleFilter
			)
				return false;
			if (riskFilter !== "all" && project.risk !== riskFilter) return false;
			if (statusFilter !== "all" && project.status !== statusFilter)
				return false;
			if (startFilter || endFilter) {
				const projectStart = project.startDate
					? new Date(project.startDate)
					: null;
				const projectEnd = project.expectedEndDate
					? new Date(project.expectedEndDate)
					: null;
				if (startFilter && projectEnd && projectEnd < startFilter) return false;
				if (endFilter && projectStart && projectStart > endFilter) return false;
			}
			if (!normalizedQuery) return true;
			return [
				project.code,
				project.name,
				project.clientName,
				project.responsibleName,
			].some((value) => value.toLowerCase().includes(normalizedQuery));
		});
	}, [
		clientFilter,
		dateEnd,
		dateStart,
		metrics.projectSummaries,
		projectId,
		query,
		responsibleFilter,
		riskFilter,
		statusFilter,
	]);

	const clients = useMemo(
		() =>
			[
				...new Set(
					metrics.projectSummaries.map((project) => project.clientName),
				),
			].sort(),
		[metrics.projectSummaries],
	);
	const responsibles = useMemo(
		() =>
			[
				...new Set(
					metrics.projectSummaries.map((project) => project.responsibleName),
				),
			].sort(),
		[metrics.projectSummaries],
	);

	const scopedMetrics = useMemo<DashboardMetricsView>(() => {
		if (projects.length === metrics.projectSummaries.length) return metrics;

		const projectIds = new Set(projects.map((project) => project.id));
		const activityStatusCounts = metrics.activityStatusCounts;
		const budget = projects.reduce(
			(sum, project) => sum + project.budgetTotal,
			0,
		);
		const spent = projects.reduce((sum, project) => sum + project.spent, 0);
		const paid = projects.reduce((sum, project) => sum + project.paid, 0);

		return {
			...metrics,
			activeProjects: projects.filter((project) => project.status === "ACTIVE")
				.length,
			approvedBudgetTotal: budget,
			balanceTotal: paid - spent,
			baseBudgetTotal: budget,
			lowStock: metrics.lowStock,
			overdueActivities: projects.reduce(
				(sum, project) => sum + project.overdueActivities,
				0,
			),
			paidTotal: paid,
			pendingReports: projects.reduce(
				(sum, project) => sum + project.pendingReports,
				0,
			),
			pendingRequirements: projects.reduce(
				(sum, project) => sum + project.pendingRequirements,
				0,
			),
			plannedProgressAverage: average(
				projects.map((project) => project.plannedProgress),
			),
			projectSummaries: projects,
			realProgressAverage: average(
				projects.map((project) => project.realProgress),
			),
			spentTotal: spent,
			statusCounts: Object.entries(
				projects.reduce<Record<string, number>>((acc, project) => {
					acc[project.status] = (acc[project.status] ?? 0) + 1;
					return acc;
				}, {}),
			).map(([status, count]) => ({ status, count })),
			activityStatusCounts,
			timeline: filteredTimeline(metrics, projects),
			ganttRows: metrics.ganttRows.filter((row) => projectIds.has(row.id)),
		};
	}, [metrics, projects]);

	const budgetTotal =
		scopedMetrics.approvedBudgetTotal || scopedMetrics.baseBudgetTotal;
	const spentTotal = scopedMetrics.spentTotal;
	const paidTotal = scopedMetrics.paidTotal;
	const balanceTotal = paidTotal - spentTotal;
	const execution = budgetTotal > 0 ? (spentTotal / budgetTotal) * 100 : 0;
	const coverage = spentTotal > 0 ? (paidTotal / spentTotal) * 100 : 0;
	const activeFilterCount = [
		clientFilter !== "all",
		responsibleFilter !== "all",
		Boolean(dateStart),
		Boolean(dateEnd),
		riskFilter !== "all",
		statusFilter !== "all",
	].filter(Boolean).length;
	const priorityProjects = [...projects]
		.sort(
			(a, b) =>
				riskRank(a.risk) - riskRank(b.risk) ||
				b.overdueActivities - a.overdueActivities,
		)
		.slice(0, 5);

	const ganttBounds = useMemo(() => {
		const starts = scopedMetrics.ganttRows
			.map((row) => (row.start ? new Date(row.start).getTime() : null))
			.filter((value): value is number => value !== null);
		const ends = scopedMetrics.ganttRows
			.map((row) => (row.end ? new Date(row.end).getTime() : null))
			.filter((value): value is number => value !== null);
		if (starts.length === 0 || ends.length === 0) return null;
		const min = Math.min(...starts);
		const max = Math.max(...ends);
		return max > min ? { min, max } : null;
	}, [scopedMetrics.ganttRows]);

	const advanceGap = average(
		projects.map((project) => project.realProgress - project.plannedProgress),
	);

	// Recent history for sparklines - derived from the same monthly/timeline
	// series the other charts already use, not fabricated shapes.
	const monthlySpent = scopedMetrics.financialFlow.map((row) => row.spent);
	const monthlyPaid = scopedMetrics.financialFlow.map((row) => row.paid);
	const spentCumulative = cumulative(monthlySpent);
	const paidCumulative = cumulative(monthlyPaid);
	const balanceCumulative = spentCumulative.map(
		(value, index) => paidCumulative[index] - value,
	);
	const progressTrend = scopedMetrics.timeline
		.map((point) => point.real)
		.filter((value): value is number => value !== null);

	const statusToneByKey: Record<string, string> = {
		ACTIVE: "var(--success)",
		PAUSED: "var(--warning)",
		CLOSED: "var(--muted)",
	};
	const statusLabelByKey: Record<string, string> = {
		ACTIVE: "Activos",
		PAUSED: "Pausados",
		CLOSED: "Cerrados",
	};
	const projectsInView = scopedMetrics.statusCounts.reduce(
		(sum, item) => sum + item.count,
		0,
	);

	const cards: KpiCard[] = [
		{
			title: "Proyectos activos",
			value: scopedMetrics.activeProjects,
			detail: `${projects.length} de ${metrics.totalProjects} visibles`,
			icon: FolderKanban,
			tone: "var(--steel)",
			href: "/projects",
			variant: "composition",
			segments: scopedMetrics.statusCounts
				.filter((item) => item.count > 0)
				.map((item) => ({
					label: statusLabelByKey[item.status] ?? item.status,
					value: item.count,
					share: projectsInView > 0 ? (item.count / projectsInView) * 100 : 0,
					color: statusToneByKey[item.status] ?? "var(--muted)",
				})),
		},
		{
			title: "Presupuesto vigente",
			value: moneyCompact(budgetTotal),
			detail: "Aprobado y vigente",
			icon: WalletCards,
			tone: "var(--brand-red)",
			href: "/projects",
			variant: "composition",
			segments: [
				{
					label: "Ejecutado",
					value: Math.min(spentTotal, budgetTotal),
					share: budgetTotal > 0 ? clamp((spentTotal / budgetTotal) * 100) : 0,
					color: "var(--brand-red)",
				},
				{
					label: "Disponible",
					value: Math.max(budgetTotal - spentTotal, 0),
					share:
						budgetTotal > 0 ? clamp(100 - (spentTotal / budgetTotal) * 100) : 0,
					color: "var(--steel)",
				},
			],
		},
		{
			title: "Costo ejecutado",
			value: moneyCompact(spentTotal),
			detail: `${percent(execution)} del presupuesto`,
			icon: Banknote,
			tone: "var(--safety)",
			href: "/finances",
			variant: "trend",
			data: spentCumulative,
			delta: seriesDelta(monthlySpent),
			deltaLabel: "vs mes anterior",
		},
		{
			title: "Abonado clientes",
			value: moneyCompact(paidTotal),
			detail: `${percent(coverage)} sobre ejecutado`,
			icon: WalletCards,
			tone: "#7C3AED",
			href: "/finances",
			variant: "trend",
			data: paidCumulative,
			delta: seriesDelta(monthlyPaid),
			deltaLabel: "vs mes anterior",
		},
		{
			title: "Saldo disponible",
			value: moneyCompact(balanceTotal),
			detail: "Abonado - ejecutado",
			icon: TrendingUp,
			tone: balanceTotal < 0 ? "var(--danger)" : "var(--success)",
			href: "/finances",
			variant: "trend",
			data: balanceCumulative,
			delta: seriesDelta(balanceCumulative),
			deltaLabel: "vs mes anterior",
		},
		{
			title: "Avance global",
			value: percent(scopedMetrics.realProgressAverage),
			detail: `Plan para hoy: ${percent(scopedMetrics.plannedProgressAverage)} · ${progressGap(advanceGap)}`,
			icon: PackageSearch,
			tone: "var(--info)",
			href: "/projects",
			variant: "trend",
			data: progressTrend,
			delta: seriesDelta(progressTrend),
			deltaLabel: "vs corte anterior",
		},
	];

	return (
		<main className="executive-dashboard space-y-5">
			<section className="dashboard-command-hero relative z-10 overflow-visible">
				{/* The sidebar already highlights "Dashboard" as the active item,
				    so this page doesn't repeat the module name visually - kept for
				    screen readers, which need a page-identifying heading. */}
				<h1 className="sr-only">Dashboard</h1>
				<div className="dashboard-command-hero__layout">
					<div className="dashboard-command-controls">
						{/* Search and filters row */}
						<div className="dashboard-quick-filters">
							<select
								aria-label="Periodo"
								className="dashboard-quick-select focus-ring"
								onChange={(event) => {
									setPeriodFilter(event.target.value);
									const now = new Date();
									if (event.target.value === "month") {
										setDateStart(
											`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`,
										);
										setDateEnd(now.toISOString().slice(0, 10));
									}
									if (event.target.value === "all") {
										setDateStart("");
										setDateEnd("");
									}
								}}
								value={periodFilter}
							>
								<option value="all">Todo el periodo</option>
								<option value="month">Este mes</option>
							</select>

							<label className="dashboard-quick-search focus-within:ring-2 focus-within:ring-[#c8202f]/20">
								<Search
									aria-hidden="true"
									size={16}
									className="text-[#a89f98]"
								/>
								<input
									aria-label="Buscar proyecto"
									onChange={(event) => setQuery(event.target.value)}
									placeholder="Buscar proyecto..."
									value={query}
									className="min-w-0 flex-1 bg-transparent text-sm text-[#1a1a18] outline-none placeholder:text-[#8d9792]"
								/>
							</label>

							<select
								aria-label="Proyecto"
								className="dashboard-quick-select focus-ring"
								onChange={(event) => setProjectId(event.target.value)}
								value={projectId}
							>
								<option value="all">Todos los proyectos</option>
								{metrics.projectSummaries.map((project) => (
									<option key={project.id} value={project.id}>
										{project.code}
									</option>
								))}
							</select>
						</div>

						{/* Filters and reset buttons */}
						<div className="dashboard-command-actions">
							<div className="relative z-[60]">
								<button
									type="button"
									onClick={() => setFiltersOpen((value) => !value)}
									className="dashboard-command-filter-button focus-ring"
									aria-controls="dashboard-filters-panel"
									aria-expanded={filtersOpen}
								>
									<SlidersHorizontal
										aria-hidden="true"
										size={16}
										className="opacity-90"
									/>
									<span>Filtros</span>
									{activeFilterCount > 0 ? (
										<span className="dashboard-command-filter-count">
											{activeFilterCount}
										</span>
									) : null}
								</button>

								{filtersOpen ? (
									<section
										id="dashboard-filters-panel"
										className="dashboard-advanced-filters"
										aria-label="Filtros avanzados del dashboard"
									>
										<div className="dashboard-advanced-filters__header">
											<div className="min-w-0">
												<p className="dashboard-advanced-filters__title">
													Filtros avanzados
												</p>
												<p className="dashboard-advanced-filters__hint">
													Los resultados cambian automáticamente.
												</p>
											</div>
											<div className="dashboard-advanced-filters__actions">
												{activeFilterCount > 0 ? (
													<button
														type="button"
														onClick={() => {
															setClientFilter("all");
															setResponsibleFilter("all");
															setDateStart("");
															setDateEnd("");
															setPeriodFilter("all");
															setRiskFilter("all");
															setStatusFilter("all");
														}}
														className="dashboard-advanced-filters__clear focus-ring"
													>
														Limpiar {activeFilterCount}
													</button>
												) : (
													<span className="dashboard-advanced-filters__status">
														Sin filtros activos
													</span>
												)}
												<button
													type="button"
													onClick={() => setFiltersOpen(false)}
													className="dashboard-advanced-filters__close focus-ring"
													aria-label="Cerrar filtros"
												>
													<X aria-hidden="true" size={17} />
												</button>
											</div>
										</div>

										<div className="dashboard-advanced-filters__grid">
											<div className="space-y-4">
												<div>
													<p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7b756f]">
														Riesgo
													</p>
													<select
														aria-label="Estado operativo"
														className="w-full rounded-xl border border-[#d9d2ce] bg-white px-3 py-2.5 text-sm font-medium text-[#1a1a18] outline-none transition hover:bg-[#fafaf8] focus:border-[#98a1aa]"
														onChange={(event) =>
															setRiskFilter(event.target.value)
														}
														value={riskFilter}
													>
														<option value="all">Todos los riesgos</option>
														<option value="En ritmo">En ritmo</option>
														<option value="Atencion">Atencion</option>
														<option value="Riesgo">Riesgo</option>
													</select>
												</div>

												<div>
													<p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7b756f]">
														Cliente
													</p>
													<select
														aria-label="Cliente"
														className="w-full rounded-xl border border-[#d9d2ce] bg-white px-3 py-2.5 text-sm font-medium text-[#1a1a18] outline-none transition hover:bg-[#fafaf8] focus:border-[#98a1aa]"
														onChange={(event) =>
															setClientFilter(event.target.value)
														}
														value={clientFilter}
													>
														<option value="all">Todos los clientes</option>
														{clients.map((client) => (
															<option key={client} value={client}>
																{client}
															</option>
														))}
													</select>
												</div>

												<div>
													<p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7b756f]">
														Responsable
													</p>
													<select
														aria-label="Responsable"
														className="w-full rounded-xl border border-[#d9d2ce] bg-white px-3 py-2.5 text-sm font-medium text-[#1a1a18] outline-none transition hover:bg-[#fafaf8] focus:border-[#98a1aa]"
														onChange={(event) =>
															setResponsibleFilter(event.target.value)
														}
														value={responsibleFilter}
													>
														<option value="all">Todos los responsables</option>
														{responsibles.map((responsible) => (
															<option key={responsible} value={responsible}>
																{responsible}
															</option>
														))}
													</select>
												</div>
											</div>

											<div className="space-y-4">
												<div>
													<p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7b756f]">
														Estado
													</p>
													<select
														aria-label="Estado del proyecto"
														className="w-full rounded-xl border border-[#d9d2ce] bg-white px-3 py-2.5 text-sm font-medium text-[#1a1a18] outline-none transition hover:bg-[#fafaf8] focus:border-[#98a1aa]"
														onChange={(event) =>
															setStatusFilter(event.target.value)
														}
														value={statusFilter}
													>
														<option value="all">Todos los estados</option>
														<option value="ACTIVE">Activos</option>
														<option value="PAUSED">Pausados</option>
														<option value="CLOSED">Cerrados</option>
													</select>
												</div>

												<div>
													<p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7b756f]">
														Fecha inicio
													</p>
													<input
														aria-label="Fecha inicio"
														className="w-full rounded-xl border border-[#d9d2ce] bg-white px-3 py-2.5 text-sm font-medium text-[#1a1a18] outline-none transition hover:bg-[#fafaf8] focus:border-[#98a1aa]"
														onChange={(event) =>
															setDateStart(event.target.value)
														}
														type="date"
														value={dateStart}
													/>
												</div>

												<div>
													<p className="mb-2 text-[10px] font-bold uppercase tracking-[0.12em] text-[#7b756f]">
														Fecha fin
													</p>
													<input
														aria-label="Fecha fin"
														className="w-full rounded-xl border border-[#d9d2ce] bg-white px-3 py-2.5 text-sm font-medium text-[#1a1a18] outline-none transition hover:bg-[#fafaf8] focus:border-[#98a1aa]"
														onChange={(event) => setDateEnd(event.target.value)}
														type="date"
														value={dateEnd}
													/>
												</div>
											</div>
										</div>
									</section>
								) : null}
							</div>

							<ResetDatabaseButton />
						</div>
					</div>
				</div>
			</section>

			<section className="kpi-grid grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
				{cards.map((card, index) => (
					<ExecutiveKpi {...card} delay={index * 0.04} key={card.title} />
				))}
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.6fr_0.72fr]">
				<DashboardPanel
					action={<a href="/projects">Proyectos</a>}
					subtitle="Comparacion acumulada entre planificacion, avance fisico y ejecucion financiera."
					title="Curva S de portafolio"
				>
					<PortfolioSCurve metrics={scopedMetrics} />
				</DashboardPanel>

				<DashboardPanel
					subtitle="Distribucion operativa de actividades."
					title="Actividades"
				>
					<ActivityStatusChart metrics={scopedMetrics} />
				</DashboardPanel>
			</section>

			<section className="grid gap-4">
				<DashboardPanel
					action={<a href="/projects">Ver proyectos</a>}
					subtitle="Cartera filtrable con desviacion, presupuesto y riesgo."
					title="Estado del portafolio"
				>
					<PortfolioTable onSelect={setSelectedProject} projects={projects} />
				</DashboardPanel>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_0.8fr]">
				<DashboardPanel
					subtitle="Muestra cuáles proyectos van al día, adelantados o atrasados según el plan de hoy."
					title="Estado del avance"
				>
					<ProgressVarianceChart projects={projects} />
				</DashboardPanel>
				<DashboardPanel
					subtitle="Ejecucion presupuestaria consolidada del filtro actual."
					title="Ejecucion presupuestaria"
				>
					<div className="grid gap-4">
						<BudgetLine
							label="Presupuesto"
							value={budgetTotal}
							max={budgetTotal}
							color="var(--steel)"
						/>
						<BudgetLine
							label="Ejecutado"
							value={spentTotal}
							max={budgetTotal}
							color="var(--brand-red)"
						/>
						<BudgetLine
							label="Abonado"
							value={paidTotal}
							max={budgetTotal}
							color="var(--success)"
						/>
						<BudgetLine
							label="Disponible"
							value={Math.max(0, budgetTotal - spentTotal)}
							max={budgetTotal}
							color="var(--info)"
						/>
					</div>
				</DashboardPanel>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.05fr_0.95fr]">
				<DashboardPanel
					action={<a href="/finances">Ver finanzas</a>}
					subtitle="Presupuesto, costo ejecutado y abonos por proyecto."
					title="Control financiero"
				>
					<FinancialControlChart projects={projects} />
				</DashboardPanel>
				<DashboardPanel
					subtitle="Movimiento mensual validado de gastos y pagos."
					title="Flujo financiero"
				>
					<CashFlowChart metrics={scopedMetrics} />
				</DashboardPanel>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_0.85fr_0.85fr]">
				<DashboardPanel
					subtitle="Lineas base de inicio y finalizacion por proyecto."
					title="Cronograma ejecutivo"
				>
					<div className="space-y-3">
						{scopedMetrics.ganttRows.slice(0, 8).map((row) => (
							<GanttRow bounds={ganttBounds} key={row.id} row={row} />
						))}
						{scopedMetrics.ganttRows.length === 0 ? (
							<EmptyLine text="Sin cronogramas registrados." />
						) : null}
					</div>
				</DashboardPanel>
				<DashboardPanel
					subtitle="Pendientes que necesitan seguimiento."
					title="Alertas"
				>
					<AlertsStatRow
						rows={[
							{
								label: "Atrasadas",
								value: scopedMetrics.overdueActivities,
								href: "/projects",
							},
							{
								label: "Informes",
								value: scopedMetrics.pendingReports,
								href: "/projects",
							},
							{
								label: "Requerimientos",
								value: scopedMetrics.pendingRequirements,
								href: "/requisitions",
							},
							{
								label: "Stock bajo",
								value: scopedMetrics.lowStock,
								href: "/inventory",
							},
						]}
					/>
					<div className="mt-4 grid gap-2">
						{scopedMetrics.operationalAlerts.length > 0 ? (
							scopedMetrics.operationalAlerts.slice(0, 6).map((alert) => (
								<a
									className="focus-ring rounded-xl bg-white px-3 py-3 shadow-[0_8px_20px_rgba(37,48,51,0.07)] transition hover:-translate-y-0.5 hover:bg-[#fff8f2] hover:shadow-[0_14px_30px_rgba(37,48,51,0.12)]"
									href={alert.href}
									key={`${alert.title}-${alert.detail}`}
								>
									<div className="flex items-start justify-between gap-3">
										<span>
											<span className="block text-xs font-semibold uppercase tracking-[0.08em] text-[var(--brand-red)]">
												{alert.severity}
											</span>
											<span className="block font-semibold">{alert.title}</span>
											<span className="block text-sm text-[var(--muted)]">
												{alert.detail}
											</span>
										</span>
										<AlertTriangle
											aria-hidden="true"
											className={
												alert.severity === "Critico"
													? "text-[var(--danger)]"
													: "text-[var(--warning)]"
											}
											size={17}
										/>
									</div>
								</a>
							))
						) : (
							<EmptyLine text="Sin pendientes: todo al dia." />
						)}
					</div>
				</DashboardPanel>
				<DashboardPanel
					action={<a href="/inventory">Ver inventario</a>}
					subtitle="Existencia vs. minimo por material."
					title="Inventario sensible"
				>
					<StockBarChart rows={metrics.stockAlerts.slice(0, 5)} />
				</DashboardPanel>
			</section>

			<section className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.9fr_1.1fr]">
				<DashboardPanel
					subtitle="Obras que concentran riesgo o pendientes."
					title="Seguimiento prioritario"
				>
					<div className="space-y-2">
						{priorityProjects.map((project) => (
							<button
								className="focus-ring w-full rounded-xl bg-white px-4 py-3 text-left shadow-[0_8px_20px_rgba(37,48,51,0.07)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(37,48,51,0.14)]"
								key={project.id}
								onClick={() => setSelectedProject(project)}
								type="button"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="font-semibold">{project.code}</p>
										<p className="line-clamp-1 text-sm text-[var(--muted)]">
											{project.name}
										</p>
									</div>
									<span
										className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(project.risk)}`}
									>
										{project.risk}
									</span>
								</div>
								<div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e4e8e1]">
									<div
										className="h-full rounded-full bg-[var(--success)]"
										style={{ width: `${clamp(project.realProgress)}%` }}
									/>
								</div>
							</button>
						))}
					</div>
				</DashboardPanel>

				<DashboardPanel
					subtitle="Ultimos registros aprobados o enviados."
					title="Actividad reciente"
				>
					<div className="grid gap-2">
						{metrics.recentActivity.map((item) => (
							<a
								className="focus-ring flex items-start gap-3 rounded-xl bg-white px-3 py-3 shadow-[0_8px_20px_rgba(37,48,51,0.07)] transition hover:-translate-y-0.5 hover:bg-[#fff8f2] hover:shadow-[0_14px_30px_rgba(37,48,51,0.12)]"
								href={item.href}
								key={`${item.title}-${item.at}`}
							>
								<span className="mt-1 rounded-lg bg-[#fff1ef] p-2 text-[var(--brand-red)]">
									<FileText size={16} />
								</span>
								<span className="min-w-0">
									<span className="block font-semibold">{item.title}</span>
									<span className="block truncate text-sm text-[var(--muted)]">
										{item.detail}
									</span>
									<span className="text-xs text-[var(--muted)]">
										{shortDate(item.at)}
									</span>
								</span>
							</a>
						))}
						{metrics.recentActivity.length === 0 ? (
							<EmptyLine text="Sin actividad reciente." />
						) : null}
					</div>
				</DashboardPanel>
			</section>

			<section className="grid gap-4">
				<DashboardPanel
					subtitle="Atajos compactos para registrar informacion operativa."
					title="Accesos rapidos"
				>
					<div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
						<QuickAction href="/projects" label="Nuevo avance" />
						<QuickAction href="/requisitions" label="Nuevo requerimiento" />
						<QuickAction href="/finances" label="Registrar gasto" />
						<QuickAction href="/finances" label="Registrar abono" />
						<QuickAction href="/documents" label="Subir documento" />
						<QuickAction href="/inventory" label="Movimiento inventario" />
					</div>
				</DashboardPanel>
			</section>

			<AnimatePresence>
				{selectedProject ? (
					<ProjectDrawer
						onClose={() => setSelectedProject(null)}
						project={selectedProject}
					/>
				) : null}
			</AnimatePresence>
		</main>
	);
}

function DashboardPanel({
	action,
	children,
	subtitle,
	title,
}: {
	action?: React.ReactNode;
	children: React.ReactNode;
	subtitle?: string;
	title: string;
}) {
	return (
		<motion.article
			className="executive-panel"
			initial={{ opacity: 0, y: 12 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
		>
			<div className="mb-4 flex items-start justify-between gap-3">
				<div>
					<h2 className="text-xl font-semibold tracking-tight">{title}</h2>
					{subtitle ? (
						<p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
					) : null}
				</div>
				{action ? <div className="dashboard-panel-action">{action}</div> : null}
			</div>
			{children}
		</motion.article>
	);
}

function ExecutiveKpi({ delay, ...card }: KpiCard & { delay: number }) {
	const { detail, href, icon: Icon, title, tone, value } = card;

	return (
		<motion.a
			aria-label={`Abrir ${title}`}
			className="executive-kpi"
			href={href}
			style={{ "--kpi-accent": tone } as React.CSSProperties}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
			whileHover={{ y: -5, scale: 1.012 }}
			whileTap={{ scale: 0.99 }}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="executive-kpi__title text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
						{title}
					</p>
					<p className="mt-4 truncate text-[clamp(1.55rem,2vw,2rem)] font-semibold tabular-nums">
						{value}
					</p>
					{card.variant === "trend" ? (
						<div className="mt-1.5">
							<KpiDelta {...card} />
						</div>
					) : null}
					<p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
				</div>
				<span
					className="executive-kpi__icon rounded-xl p-3 text-white shadow-[0_10px_24px_rgba(37,48,51,0.18)]"
					style={{ backgroundColor: tone }}
				>
					<Icon aria-hidden={true} size={20} />
				</span>
			</div>
			{card.variant === "trend" ? (
				<KpiSparkline data={card.data} tone={tone} />
			) : (
				<KpiComposition segments={card.segments} />
			)}
		</motion.a>
	);
}

function KpiDelta({
	delta,
	deltaLabel,
}: {
	delta: number | null;
	deltaLabel: string;
}) {
	if (delta === null || Number.isNaN(delta)) return null;
	const isFlat = Math.abs(delta) < 0.05;
	const isUp = delta > 0;
	return (
		<span
			className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
				isFlat
					? "bg-[color-mix(in_srgb,var(--muted)_16%,transparent)] text-[var(--muted)]"
					: isUp
						? "bg-[color-mix(in_srgb,var(--success)_18%,transparent)] text-[var(--success)]"
						: "bg-[color-mix(in_srgb,var(--danger)_16%,transparent)] text-[var(--danger)]"
			}`}
			title={deltaLabel}
		>
			{isFlat ? "•" : isUp ? "▲" : "▼"}
			{Math.abs(delta).toFixed(1)}%
		</span>
	);
}

function KpiSparkline({ data, tone }: { data: number[]; tone: string }) {
	if (data.length < 2) {
		return (
			<p className="mt-4 h-10 content-center text-xs text-[var(--muted)]">
				Historial insuficiente para tendencia.
			</p>
		);
	}

	const max = Math.max(...data, 1);
	const min = Math.min(...data, 0);
	const range = max - min || 1;
	const points = data
		.map(
			(item, index) =>
				`${(index / (data.length - 1)) * 132},${48 - ((item - min) / range) * 36}`,
		)
		.join(" ");

	return (
		<svg
			aria-hidden="true"
			className="mt-4 h-10 w-full"
			preserveAspectRatio="none"
			viewBox="0 0 132 52"
		>
			<path d="M0 49H132" stroke="rgba(90,102,97,.18)" />
			<polyline
				fill="none"
				points={points}
				stroke={tone}
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="3"
			/>
		</svg>
	);
}

function KpiComposition({
	segments,
}: {
	segments: Array<{
		label: string;
		value: number;
		share: number;
		color: string;
	}>;
}) {
	if (
		segments.length === 0 ||
		segments.every((segment) => segment.value === 0)
	) {
		return (
			<p className="mt-4 h-10 content-center text-xs text-[var(--muted)]">
				Sin datos para desglosar.
			</p>
		);
	}

	return (
		<div className="mt-4">
			<div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#e4e8e1]">
				{segments.map((segment) => (
					<div
						key={segment.label}
						style={{
							width: `${clamp(segment.share)}%`,
							backgroundColor: segment.color,
						}}
					/>
				))}
			</div>
			<div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
				{segments.map((segment) => (
					<span
						key={segment.label}
						className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]"
					>
						<span
							className="size-1.5 rounded-full"
							style={{ backgroundColor: segment.color }}
						/>
						{segment.label} · {Math.round(segment.share)}%
					</span>
				))}
			</div>
		</div>
	);
}

function GanttRow({
	bounds,
	row,
}: {
	bounds: { min: number; max: number } | null;
	row: DashboardMetricsView["ganttRows"][number];
}) {
	const start = row.start ? new Date(row.start) : null;
	const end = row.end ? new Date(row.end) : null;
	const span =
		bounds && start && end
			? {
					left: clamp(
						((start.getTime() - bounds.min) / (bounds.max - bounds.min)) * 100,
					),
					width: Math.max(
						2,
						clamp(
							((end.getTime() - start.getTime()) / (bounds.max - bounds.min)) *
								100,
						),
					),
				}
			: null;
	const todayPercent = bounds
		? clamp(((Date.now() - bounds.min) / (bounds.max - bounds.min)) * 100)
		: null;
	const riskColor =
		row.risk === "Riesgo"
			? "var(--danger)"
			: row.risk === "Atencion"
				? "var(--warning)"
				: "var(--success)";

	return (
		<a
			className="focus-ring block rounded-xl bg-white px-3 py-3 shadow-[0_8px_20px_rgba(37,48,51,0.07)] transition hover:-translate-y-0.5 hover:bg-[#fff8f2] hover:shadow-[0_14px_30px_rgba(37,48,51,0.12)]"
			href={`/projects/${row.id}/schedule`}
		>
			<div className="flex items-center justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate font-semibold">{row.code}</p>
					<p className="truncate text-sm text-[var(--muted)]">{row.name}</p>
				</div>
				<span
					className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusClass(row.risk)}`}
				>
					{row.risk}
				</span>
			</div>
			<div className="mt-3 flex items-center gap-3 text-xs text-[var(--muted)]">
				<CalendarDays size={14} />
				<span>
					{start ? shortDate(start.toISOString()) : "Sin inicio"} -{" "}
					{end ? shortDate(end.toISOString()) : "Sin fin"}
				</span>
			</div>
			{span ? (
				<div className="relative mt-2 h-2.5 overflow-hidden rounded-full bg-[#e4e8e1]">
					<div
						className="absolute inset-y-0 rounded-full"
						style={{
							left: `${span.left}%`,
							width: `${span.width}%`,
							backgroundColor: riskColor,
						}}
					/>
					{todayPercent !== null ? (
						<div
							className="absolute inset-y-0 w-px bg-[#1a1a18]/40"
							style={{ left: `${todayPercent}%` }}
							title="Hoy"
						/>
					) : null}
				</div>
			) : null}
			<div className="mt-1.5 flex items-center justify-between text-[10px] text-[var(--muted)]">
				<span>Linea base</span>
				<span>Avance {clamp(row.progress).toFixed(0)}%</span>
			</div>
			<div className="mt-1 h-2 overflow-hidden rounded-full bg-[#e4e8e1]">
				<div
					className="h-full rounded-full bg-[var(--brand-red)]"
					style={{ width: `${clamp(row.progress)}%` }}
				/>
			</div>
		</a>
	);
}

function EmptyLine({ text }: { text: string }) {
	return (
		<div className="rounded-xl border border-dashed border-[var(--border)] bg-white/70 px-4 py-8 text-center text-sm text-[var(--muted)]">
			{text}
		</div>
	);
}

function BudgetLine({
	color,
	label,
	max,
	value,
}: {
	color: string;
	label: string;
	max: number;
	value: number;
}) {
	const ratio = max > 0 ? clamp((value / max) * 100) : 0;
	return (
		<div>
			<div className="mb-2 flex items-center justify-between gap-3 text-sm">
				<span className="font-medium text-[var(--muted)]">{label}</span>
				<strong className="tabular-nums">{moneyFull(value)}</strong>
			</div>
			<div className="h-3 overflow-hidden rounded-full bg-[#e4e8e1]">
				<div
					className="h-full rounded-full"
					style={{ backgroundColor: color, width: `${ratio}%` }}
				/>
			</div>
		</div>
	);
}

function QuickAction({ href, label }: { href: string; label: string }) {
	return (
		<a
			className="focus-ring rounded-xl bg-white px-4 py-3 text-sm font-semibold shadow-[0_8px_20px_rgba(37,48,51,0.07)] transition hover:-translate-y-0.5 hover:bg-[#fff8f2] hover:shadow-[0_16px_34px_rgba(37,48,51,0.12)]"
			href={href}
		>
			+ {label}
		</a>
	);
}

function riskAccent(risk: string) {
	if (risk === "Riesgo") return "var(--danger)";
	if (risk === "Atencion") return "var(--warning)";
	return "var(--success)";
}

function ProjectDrawer({
	onClose,
	project,
}: {
	onClose: () => void;
	project: DashboardProjectRow;
}) {
	const gap = project.realProgress - project.plannedProgress;
	const accent = riskAccent(project.risk);
	return (
		<motion.div
			className="dashboard-drawer-backdrop"
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
		>
			<button
				aria-label="Cerrar detalle"
				className="absolute inset-0 cursor-default"
				onClick={onClose}
				type="button"
			/>
			<motion.aside
				className="dashboard-drawer"
				style={{ "--drawer-accent": accent } as React.CSSProperties}
				initial={{ x: 420 }}
				animate={{ x: 0 }}
				exit={{ x: 420 }}
				transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
			>
				<div className="dashboard-drawer__banner">
					<div className="flex items-start justify-between gap-3">
						<div className="min-w-0">
							<p className="dashboard-eyebrow">{project.code}</p>
							<h2 className="text-2xl font-semibold text-balance">
								{project.name}
							</h2>
							<p className="mt-1 text-sm text-[var(--muted)]">
								{project.clientName}
							</p>
						</div>
						<button
							className="focus-ring dashboard-drawer__close"
							onClick={onClose}
							type="button"
						>
							<X size={18} />
						</button>
					</div>
					<span
						className="dashboard-drawer__risk-badge"
						style={{ color: accent, borderColor: accent }}
					>
						<span
							className="size-1.5 rounded-full"
							style={{ backgroundColor: accent }}
						/>
						{project.risk}
					</span>
				</div>

				<div className="mt-2 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
					<DrawerProgressRing
						accent={accent}
						planned={project.plannedProgress}
						real={project.realProgress}
					/>
					<div className="grid gap-2 text-sm">
						<div className="flex items-center justify-between gap-3">
							<span className="text-[var(--muted)]">Avance real</span>
							<strong className="tabular-nums">
								{percent(project.realProgress)}
							</strong>
						</div>
						<div className="flex items-center justify-between gap-3">
							<span className="text-[var(--muted)]">Plan para hoy</span>
							<strong className="tabular-nums">
								{percent(project.plannedProgress)}
							</strong>
						</div>
						<div
							className="mt-1 flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5"
							style={{
								backgroundColor:
									"color-mix(in srgb, var(--drawer-accent) 12%, transparent)",
							}}
						>
							<span className="font-medium" style={{ color: accent }}>
								Estado frente al plan
							</span>
							<strong className="tabular-nums" style={{ color: accent }}>
								{progressGap(gap)}
							</strong>
						</div>
					</div>
				</div>

				<div className="mt-5 grid grid-cols-3 gap-3">
					<DrawerMetric
						label="Presupuesto"
						value={moneyCompact(project.budgetTotal)}
					/>
					<DrawerMetric label="Ejecutado" value={moneyCompact(project.spent)} />
					<DrawerMetric label="Saldo" value={moneyCompact(project.balance)} />
				</div>
				<div className="mt-5 rounded-xl border border-[var(--border)] bg-[#fbfaf6] p-4">
					<p className="text-sm font-semibold">Lectura operativa</p>
					<p className="mt-2 text-sm text-[var(--muted)]">
						{project.risk === "Riesgo"
							? "Requiere revision de cronograma, costos o pendientes antes del siguiente corte."
							: project.risk === "Atencion"
								? "Conviene revisar la brecha y cerrar pendientes para evitar atraso."
								: "El proyecto se mantiene alineado con el seguimiento actual."}
					</p>
				</div>
				<div className="mt-6 grid gap-2">
					<a
						className="focus-ring rounded-md bg-[var(--brand-red)] px-4 py-3 text-center font-semibold text-white shadow-[0_18px_36px_rgba(200,32,47,0.22)]"
						href={`/projects/${project.id}`}
					>
						Abrir proyecto
					</a>
					<a
						className="focus-ring rounded-md border border-[var(--border)] px-4 py-3 text-center font-semibold hover:bg-[#f6f3ef]"
						href={`/projects/${project.id}/progress`}
					>
						Ver avance diario
					</a>
				</div>
			</motion.aside>
		</motion.div>
	);
}

function DrawerProgressRing({
	real,
	planned,
	accent,
}: {
	real: number;
	planned: number;
	accent: string;
}) {
	const outerRadius = 50;
	const innerRadius = 36;
	const outerCircumference = 2 * Math.PI * outerRadius;
	const innerCircumference = 2 * Math.PI * innerRadius;
	const realOffset = outerCircumference * (1 - clamp(real) / 100);
	const plannedOffset = innerCircumference * (1 - clamp(planned) / 100);

	return (
		<div className="relative mx-auto size-32 shrink-0">
			<svg
				aria-hidden="true"
				className="size-full -rotate-90"
				viewBox="0 0 120 120"
			>
				<circle
					cx="60"
					cy="60"
					fill="none"
					r={outerRadius}
					stroke="var(--border)"
					strokeWidth="10"
				/>
				<circle
					cx="60"
					cy="60"
					fill="none"
					r={innerRadius}
					stroke="var(--border)"
					strokeWidth="6"
				/>
				<circle
					cx="60"
					cy="60"
					fill="none"
					r={innerRadius}
					stroke="var(--steel)"
					strokeDasharray={innerCircumference}
					strokeDashoffset={plannedOffset}
					strokeLinecap="round"
					strokeWidth="6"
				/>
				<circle
					cx="60"
					cy="60"
					fill="none"
					r={outerRadius}
					stroke={accent}
					strokeDasharray={outerCircumference}
					strokeDashoffset={realOffset}
					strokeLinecap="round"
					strokeWidth="10"
				/>
			</svg>
			<div className="pointer-events-none absolute inset-0 grid place-items-center">
				<div className="text-center">
					<p className="text-2xl font-semibold tabular-nums">
						{percent(real, 0)}
					</p>
					<p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
						Real
					</p>
				</div>
			</div>
		</div>
	);
}

function DrawerMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl bg-white p-3 shadow-[0_8px_20px_rgba(37,48,51,0.07)]">
			<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
				{label}
			</p>
			<p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
		</div>
	);
}
