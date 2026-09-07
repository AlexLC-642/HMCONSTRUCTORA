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
	pp,
	shortDate,
} from "@/shared/ui/charts/format";
import {
	ActivityStatusChart,
	CashFlowChart,
	FinancialControlChart,
	PortfolioSCurve,
	ProgressVarianceChart,
	ProjectProgressChart,
} from "./dashboard-charts";
import { PortfolioTable } from "./portfolio-table";
import type { DashboardMetricsView, DashboardProjectRow } from "./types";

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

function trendData(value: number) {
	const base = Math.max(8, value || 12);
	return [0.48, 0.54, 0.5, 0.62, 0.58, 0.68, 0.63, 0.72, 0.67, 0.77, 0.71].map(
		(item) => base * item,
	);
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
	const criticalAlerts =
		scopedMetrics.overdueActivities +
		scopedMetrics.lowStock +
		scopedMetrics.pendingReports +
		scopedMetrics.pendingRequirements;
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

	const advanceGap = average(
		projects.map((project) => project.realProgress - project.plannedProgress),
	);
	const cards = [
		{
			title: "Proyectos activos",
			value: scopedMetrics.activeProjects,
			detail: `${projects.length} de ${metrics.totalProjects} visibles`,
			icon: FolderKanban,
			tone: "var(--steel)",
			data: trendData(projects.length),
			href: "/projects",
		},
		{
			title: "Presupuesto vigente",
			value: moneyCompact(budgetTotal),
			detail: "Aprobado y vigente",
			icon: WalletCards,
			tone: "var(--brand-red)",
			data: trendData(budgetTotal),
			href: "/projects",
		},
		{
			title: "Costo ejecutado",
			value: moneyCompact(spentTotal),
			detail: `${percent(execution)} del presupuesto`,
			icon: Banknote,
			tone: "var(--safety)",
			data: trendData(execution),
			href: "/finances",
		},
		{
			title: "Abonado clientes",
			value: moneyCompact(paidTotal),
			detail: `${percent(coverage)} sobre ejecutado`,
			icon: WalletCards,
			tone: "#7C3AED",
			data: trendData(paidTotal),
			href: "/finances",
		},
		{
			title: "Saldo disponible",
			value: moneyCompact(balanceTotal),
			detail: "Abonado - ejecutado",
			icon: TrendingUp,
			tone: balanceTotal < 0 ? "var(--danger)" : "var(--success)",
			data: trendData(balanceTotal),
			href: "/finances",
		},
		{
			title: "Avance global",
			value: percent(scopedMetrics.realProgressAverage),
			detail: `Plan ${percent(scopedMetrics.plannedProgressAverage)} - ${pp(advanceGap)}`,
			icon: PackageSearch,
			tone: "var(--info)",
			data: trendData(scopedMetrics.realProgressAverage),
			href: "/projects",
		},
	];

	return (
		<main className="executive-dashboard space-y-5">
			<section className="dashboard-command-hero relative z-10 overflow-visible">
				<div className="dashboard-command-hero__layout">
					{/* Left: Title section with visual anchor */}
					<div className="dashboard-command-hero__intro">
						<h1 className="dashboard-command-hero__title">Dashboard</h1>
						<p className="dashboard-command-hero__description">
							Resumen ejecutivo de todos los proyectos
						</p>
					</div>

					{/* Right: Controls group with visual cohesion */}
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

			<section className="grid gap-4 xl:grid-cols-[1.6fr_0.72fr]">
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

			<section className="grid gap-4 xl:grid-cols-[1fr_0.92fr]">
				<DashboardPanel
					action={<a href="/projects">Ver proyectos</a>}
					subtitle="Cartera filtrable con desviacion, presupuesto y riesgo."
					title="Estado del portafolio"
				>
					<PortfolioTable onSelect={setSelectedProject} projects={projects} />
				</DashboardPanel>

				<DashboardPanel
					subtitle="Distribucion de proyectos por rango de avance."
					title="Avance por proyecto"
				>
					<ProjectProgressChart
						onSelect={setSelectedProject}
						projects={projects}
					/>
				</DashboardPanel>
			</section>

			<section className="grid gap-4 xl:grid-cols-[1fr_0.8fr]">
				<DashboardPanel
					subtitle="Semaforo de brecha entre avance real y planificado."
					title="Desviacion de avance"
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

			<section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
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

			<section className="grid gap-4 xl:grid-cols-[1fr_0.85fr_0.85fr]">
				<DashboardPanel
					subtitle="Lineas base de inicio y finalizacion por proyecto."
					title="Cronograma ejecutivo"
				>
					<div className="space-y-3">
						{scopedMetrics.ganttRows.slice(0, 8).map((row) => (
							<GanttRow key={row.id} row={row} />
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
					<div className="grid gap-2">
						{scopedMetrics.operationalAlerts.length > 0 ? (
							scopedMetrics.operationalAlerts.slice(0, 6).map((alert) => (
								<a
									className="focus-ring rounded-xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm hover:bg-[#fff8f2]"
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
							<>
								<AlertLine
									href="/projects"
									label="Actividades atrasadas"
									value={scopedMetrics.overdueActivities}
								/>
								<AlertLine
									href="/projects"
									label="Informes pendientes"
									value={scopedMetrics.pendingReports}
								/>
								<AlertLine
									href="/requisitions"
									label="Requerimientos activos"
									value={scopedMetrics.pendingRequirements}
								/>
								<AlertLine
									href="/inventory"
									label="Stock bajo"
									value={scopedMetrics.lowStock}
								/>
								<AlertLine
									href="/projects"
									label="Alertas consolidadas"
									value={criticalAlerts}
								/>
							</>
						)}
					</div>
				</DashboardPanel>
				<DashboardPanel
					subtitle="Materiales por debajo del minimo."
					title="Inventario sensible"
				>
					<div className="grid gap-2">
						{metrics.stockAlerts.slice(0, 5).map((stock) => (
							<div
								className="rounded-xl border border-[var(--border)] bg-white px-3 py-2"
								key={`${stock.material}-${stock.unit}`}
							>
								<div className="flex justify-between gap-3">
									<span className="truncate font-medium">{stock.material}</span>
									<strong
										className={
											stock.level === "Critico"
												? "text-[var(--danger)]"
												: "text-[var(--warning)]"
										}
									>
										{stock.level}
									</strong>
								</div>
								<p className="text-sm text-[var(--muted)]">
									{stock.quantity} / {stock.minimum} {stock.unit}
								</p>
							</div>
						))}
						{metrics.stockAlerts.length === 0 ? (
							<EmptyLine text="Sin alertas de inventario." />
						) : null}
					</div>
				</DashboardPanel>
			</section>

			<section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
				<DashboardPanel
					subtitle="Obras que concentran riesgo o pendientes."
					title="Seguimiento prioritario"
				>
					<div className="space-y-2">
						{priorityProjects.map((project) => (
							<button
								className="focus-ring w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(37,48,51,0.14)]"
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
								className="focus-ring flex items-start gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm hover:bg-[#fff8f2]"
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

			<section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
				<DashboardPanel
					subtitle="Atajos compactos para registrar informacion operativa."
					title="Accesos rapidos"
				>
					<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
						<QuickAction href="/projects" label="Nuevo avance" />
						<QuickAction href="/requisitions" label="Nuevo requerimiento" />
						<QuickAction href="/finances" label="Registrar gasto" />
						<QuickAction href="/finances" label="Registrar abono" />
						<QuickAction href="/documents" label="Subir documento" />
						<QuickAction href="/inventory" label="Movimiento inventario" />
					</div>
				</DashboardPanel>
				<DashboardPanel
					subtitle="Informes pendientes y publicados visibles desde proyectos."
					title="Informes recientes"
				>
					<div className="grid gap-2">
						{metrics.recentActivity
							.filter((item) => item.title.startsWith("Informe"))
							.slice(0, 5)
							.map((item) => (
								<a
									className="focus-ring flex items-center justify-between rounded-xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm hover:bg-[#fff8f2]"
									href={item.href}
									key={`${item.title}-${item.at}`}
								>
									<span>
										<span className="block font-semibold">{item.title}</span>
										<span className="block text-sm text-[var(--muted)]">
											{item.detail}
										</span>
									</span>
									<span className="text-xs text-[var(--muted)]">
										{shortDate(item.at)}
									</span>
								</a>
							))}
						{metrics.recentActivity.filter((item) =>
							item.title.startsWith("Informe"),
						).length === 0 ? (
							<EmptyLine text="Sin informes recientes." />
						) : null}
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

function ExecutiveKpi({
	data,
	delay,
	detail,
	href,
	icon: Icon,
	title,
	tone,
	value,
}: {
	data: number[];
	delay: number;
	detail: string;
	href: string;
	icon: React.ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
	title: string;
	tone: string;
	value: React.ReactNode;
}) {
	const max = Math.max(...data, 1);
	const points = data
		.map(
			(item, index) =>
				`${(index / (data.length - 1)) * 132},${48 - (item / max) * 36}`,
		)
		.join(" ");

	return (
		<motion.a
			aria-label={`Abrir ${title}`}
			className="executive-kpi"
			href={href}
			style={{ "--kpi-accent": tone } as React.CSSProperties}
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay, duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
			whileTap={{ scale: 0.99 }}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
						{title}
					</p>
					<p className="mt-4 truncate text-[clamp(1.55rem,2vw,2rem)] font-semibold tabular-nums">
						{value}
					</p>
					<p className="mt-2 text-sm text-[var(--muted)]">{detail}</p>
				</div>
				<span
					className="rounded-xl p-3 text-white shadow-[0_10px_24px_rgba(37,48,51,0.18)]"
					style={{ backgroundColor: tone }}
				>
					<Icon aria-hidden={true} size={20} />
				</span>
			</div>
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
		</motion.a>
	);
}

function GanttRow({ row }: { row: DashboardMetricsView["ganttRows"][number] }) {
	const start = row.start ? new Date(row.start) : null;
	const end = row.end ? new Date(row.end) : null;
	return (
		<a
			className="focus-ring block rounded-xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm hover:bg-[#fff8f2]"
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
			<div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e4e8e1]">
				<div
					className="h-full rounded-full bg-[var(--brand-red)]"
					style={{ width: `${clamp(row.progress)}%` }}
				/>
			</div>
		</a>
	);
}

function AlertLine({
	href,
	label,
	value,
}: {
	href: string;
	label: string;
	value: number;
}) {
	const active = value > 0;
	return (
		<a
			className="focus-ring flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-white px-3 py-3 shadow-sm hover:bg-[#fff8f2]"
			href={href}
		>
			<span className="flex items-center gap-2 text-sm text-[var(--muted)]">
				<AlertTriangle
					aria-hidden="true"
					className={active ? "text-[var(--danger)]" : "text-[var(--muted)]"}
					size={16}
				/>
				{label}
			</span>
			<strong
				className={
					active ? "tabular-nums text-[var(--danger)]" : "tabular-nums"
				}
			>
				{value}
			</strong>
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
			className="focus-ring rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[#fff8f2] hover:shadow-[0_16px_34px_rgba(37,48,51,0.12)]"
			href={href}
		>
			+ {label}
		</a>
	);
}

function ProjectDrawer({
	onClose,
	project,
}: {
	onClose: () => void;
	project: DashboardProjectRow;
}) {
	const gap = project.realProgress - project.plannedProgress;
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
				initial={{ x: 420 }}
				animate={{ x: 0 }}
				exit={{ x: 420 }}
				transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
			>
				<div className="flex items-start justify-between gap-3">
					<div>
						<p className="dashboard-eyebrow">{project.code}</p>
						<h2 className="text-2xl font-semibold">{project.name}</h2>
						<p className="mt-1 text-sm text-[var(--muted)]">
							{project.clientName}
						</p>
					</div>
					<button
						className="focus-ring rounded-full border border-[var(--border)] p-2 hover:bg-[#f6f3ef]"
						onClick={onClose}
						type="button"
					>
						<X size={18} />
					</button>
				</div>
				<div className="mt-6 grid grid-cols-2 gap-3">
					<DrawerMetric
						label="Avance real"
						value={percent(project.realProgress)}
					/>
					<DrawerMetric label="Plan" value={percent(project.plannedProgress)} />
					<DrawerMetric label="Brecha" value={pp(gap)} />
					<DrawerMetric
						label="Presupuesto"
						value={moneyCompact(project.budgetTotal)}
					/>
					<DrawerMetric label="Ejecutado" value={moneyCompact(project.spent)} />
					<DrawerMetric label="Saldo" value={moneyCompact(project.balance)} />
				</div>
				<div className="mt-6 rounded-xl border border-[var(--border)] bg-[#fbfaf6] p-4">
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

function DrawerMetric({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-xl border border-[var(--border)] bg-white p-3">
			<p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
				{label}
			</p>
			<p className="mt-2 text-xl font-semibold tabular-nums">{value}</p>
		</div>
	);
}
