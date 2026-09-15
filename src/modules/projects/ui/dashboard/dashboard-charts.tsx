"use client";

import type { EChartsCoreOption } from "echarts/core";
import * as echarts from "echarts/core";
import { PieChart as PieChartIcon } from "lucide-react";
import { useMemo } from "react";
import {
	baseGrid,
	chartTextTokens,
	chartTooltip,
	hmChartColors,
	markShadow,
	noDataOption,
} from "@/shared/ui/charts/chart-theme";
import { EChart } from "@/shared/ui/charts/e-chart";
import {
	moneyCompact,
	moneyFull,
	percent,
	progressGap,
	shortDate,
} from "@/shared/ui/charts/format";
import { useIsDarkMode } from "@/shared/ui/charts/use-chart-theme";
import { classifyProgressGap } from "../../domain/risk";
import type { DashboardMetricsView, DashboardProjectRow } from "./types";

const riskColors = {
	Riesgo: hmChartColors.red,
	Atencion: hmChartColors.amber,
	"En ritmo": hmChartColors.green,
} as const;

function clamp(value: number) {
	return Math.max(0, Math.min(100, value));
}

function hasPlanning(metrics: DashboardMetricsView) {
	return metrics.timeline.some((point) => point.planned > 0);
}

export function PortfolioSCurve({
	metrics,
}: {
	metrics: DashboardMetricsView;
}) {
	const theme = chartTextTokens(useIsDarkMode());
	const isEmpty = metrics.timeline.length < 2 || !hasPlanning(metrics);
	const option = useMemo<EChartsCoreOption>(() => {
		if (isEmpty)
			return noDataOption("Sin planificacion suficiente para Curva S.", theme);

		const labels = metrics.timeline.map((point) => shortDate(point.date));
		const todayLabel = shortDate(new Date().toISOString());

		return {
			animationDuration: 720,
			animationEasing: "cubicOut",
			color: [hmChartColors.blue, hmChartColors.green, hmChartColors.violet],
			grid: { ...baseGrid, right: 24, left: 42 },
			legend: {
				top: 0,
				right: 8,
				icon: "roundRect",
				itemHeight: 8,
				itemWidth: 20,
				textStyle: { color: theme.muted, fontSize: 12 },
			},
			tooltip: {
				...chartTooltip(theme),
				trigger: "axis",
				axisPointer: {
					type: "cross",
					label: { backgroundColor: theme.ink },
				},
				formatter: (params: unknown) => {
					const rows = Array.isArray(params) ? params : [];
					const date =
						rows[0] && typeof rows[0] === "object" && "axisValue" in rows[0]
							? String(rows[0].axisValue)
							: "";
					const lines = rows
						.map((row) => {
							if (!row || typeof row !== "object") return "";
							const item = row as {
								marker?: string;
								seriesName?: string;
								value?: number | null;
							};
							return `<div style="display:flex;gap:18px;justify-content:space-between"><span>${item.marker ?? ""}${item.seriesName}</span><strong>${item.value == null ? "Sin datos" : percent(Number(item.value))}</strong></div>`;
						})
						.join("");
					return `<strong>${date}</strong>${lines}`;
				},
			},
			xAxis: {
				type: "category",
				data: labels,
				boundaryGap: false,
				axisTick: { show: false },
				axisLine: { lineStyle: { color: theme.grid } },
				axisLabel: { color: theme.muted, fontSize: 11 },
			},
			yAxis: {
				type: "value",
				min: 0,
				max: 100,
				interval: 25,
				axisLabel: {
					formatter: "{value}%",
					color: theme.muted,
					fontSize: 11,
				},
				splitLine: { lineStyle: { color: theme.grid } },
			},
			series: [
				{
					name: "Planificado",
					type: "line",
					smooth: true,
					symbol: "circle",
					symbolSize: 5,
					data: metrics.timeline.map((point) =>
						Number(point.planned.toFixed(2)),
					),
					lineStyle: { width: 3 },
					markLine: {
						symbol: "none",
						label: { color: "#B76E00", fontWeight: 700, formatter: "Hoy" },
						lineStyle: {
							color: "rgba(242,169,0,0.64)",
							type: "dashed",
							width: 1.5,
						},
						data: labels.includes(todayLabel) ? [{ xAxis: todayLabel }] : [],
					},
				},
				{
					name: "Avance real",
					type: "line",
					smooth: true,
					symbol: "circle",
					symbolSize: 6,
					data: metrics.timeline.map((point) =>
						point.real === null ? null : Number(point.real.toFixed(2)),
					),
					lineStyle: { width: 4 },
					areaStyle: {
						color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
							{ offset: 0, color: "rgba(31,122,91,0.22)" },
							{ offset: 1, color: "rgba(31,122,91,0.02)" },
						]),
					},
				},
				{
					name: "Avance financiero",
					type: "line",
					smooth: true,
					symbol: "circle",
					symbolSize: 5,
					data: metrics.timeline.map((point) =>
						point.financial === null
							? null
							: Number(clamp(point.financial).toFixed(2)),
					),
					lineStyle: { width: 3, type: "dashed" },
				},
			],
		};
	}, [metrics, isEmpty, theme]);

	// The chart shows the full schedule, but the summary compares only the
	// values calculated for today. Using the final timeline point made every
	// active project look 100% planned even when its end date was still ahead.
	const real = metrics.realProgressAverage;
	const planned = hasPlanning(metrics) ? metrics.plannedProgressAverage : null;
	const financial =
		metrics.approvedBudgetTotal > 0
			? (metrics.spentTotal / metrics.approvedBudgetTotal) * 100
			: null;
	const gap = planned === null || real === null ? null : real - planned;
	const gapColor =
		gap === null
			? theme.muted
			: riskColors[classifyProgressGap(gap, metrics.overdueActivities)];

	return (
		<div className="grid gap-5 xl:grid-cols-[1fr_15rem]">
			{isEmpty ? (
				<EmptyChart
					height={360}
					message="Aún no hay suficiente planificación para trazar la curva S."
				/>
			) : (
				<EChart className="h-[360px] w-full" option={option} />
			)}
			<div className="grid content-center gap-3">
				<ChartMetric
					color={hmChartColors.green}
					label="Avance real"
					value={percent(real)}
				/>
				<ChartMetric
					color={hmChartColors.blue}
					label="Planificado"
					value={percent(planned)}
				/>
				<ChartMetric
					color={hmChartColors.violet}
					label="Financiero"
					value={financial === null ? "Sin datos" : percent(financial)}
				/>
				<ChartMetric color={gapColor} label="Estado" value={progressGap(gap)} />
			</div>
		</div>
	);
}

export function ActivityStatusChart({
	metrics,
}: {
	metrics: DashboardMetricsView;
}) {
	const theme = chartTextTokens(useIsDarkMode());
	const rows = [
		{ key: "COMPLETED", label: "Completadas", color: hmChartColors.blue },
		{ key: "IN_PROGRESS", label: "En proceso", color: hmChartColors.green },
		{ key: "PENDING", label: "Pendientes", color: hmChartColors.amber },
		{ key: "BLOCKED", label: "Bloqueadas", color: hmChartColors.red },
	].map((item) => ({
		...item,
		value:
			metrics.activityStatusCounts.find((row) => row.status === item.key)
				?.count ?? 0,
	}));
	const total = rows.reduce((sum, row) => sum + row.value, 0);
	const completed = rows.find((row) => row.key === "COMPLETED")?.value ?? 0;

	const option = useMemo<EChartsCoreOption>(() => {
		if (total === 0) return noDataOption("Sin actividades registradas.", theme);
		return {
			animationDuration: 650,
			tooltip: {
				...chartTooltip(theme),
				trigger: "item",
				formatter: "{b}<br/><strong>{c}</strong> actividades ({d}%)",
			},
			series: [
				{
					type: "pie",
					radius: ["62%", "82%"],
					center: ["50%", "50%"],
					label: { show: false },
					itemStyle: {
						borderColor: theme.surface,
						borderWidth: 3,
						borderRadius: 5,
						...markShadow,
					},
					data: rows.map((row) => ({
						name: row.label,
						value: row.value,
						itemStyle: { color: row.color },
					})),
				},
			],
		};
	}, [rows, total, theme]);

	return (
		<div className="grid gap-4 md:grid-cols-[12rem_1fr] md:items-center">
			<div className="relative h-48">
				{total === 0 ? (
					<EmptyDonut
						message="Aun no hay actividades registradas."
						size={172}
					/>
				) : (
					<>
						<EChart className="h-48 w-full" option={option} />
						<div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
							<div>
								<p className="text-3xl font-semibold tabular-nums">{total}</p>
								<p className="text-xs text-[var(--muted)]">Actividades</p>
							</div>
						</div>
					</>
				)}
			</div>
			<div className="grid gap-2">
				<p className="text-sm text-[var(--muted)]">
					{completed} completadas,{" "}
					{total === 0 ? "0.0" : ((completed / total) * 100).toFixed(1)}% del
					total.
				</p>
				{rows.map((row) => (
					<ChartMetric
						color={row.color}
						key={row.key}
						label={row.label}
						value={String(row.value)}
					/>
				))}
			</div>
		</div>
	);
}

export function ProgressVarianceChart({
	projects,
}: {
	projects: DashboardProjectRow[];
}) {
	const theme = chartTextTokens(useIsDarkMode());
	const buckets = useMemo(
		() => [
			{
				key: "ahead",
				label: "Adelantados",
				color: hmChartColors.green,
				projects: projects.filter(
					(project) => project.realProgress - project.plannedProgress >= 5,
				),
			},
			{
				key: "line",
				label: "Al día",
				color: hmChartColors.blue,
				projects: projects.filter(
					(project) =>
						Math.abs(project.realProgress - project.plannedProgress) < 5,
				),
			},
			{
				key: "late",
				label: "Atrasados",
				color: hmChartColors.red,
				projects: projects.filter(
					(project) => project.realProgress - project.plannedProgress <= -5,
				),
			},
		],
		[projects],
	);
	const option = useMemo<EChartsCoreOption>(() => {
		if (projects.length === 0)
			return noDataOption("Sin proyectos para comparar.", theme);
		return {
			animationDuration: 650,
			color: buckets.map((bucket) => bucket.color),
			tooltip: {
				...chartTooltip(theme),
				trigger: "item",
				formatter: "{b}<br/><strong>{c}</strong> proyectos ({d}%)",
			},
			series: [
				{
					type: "pie",
					radius: ["58%", "80%"],
					center: ["50%", "50%"],
					label: { show: false },
					itemStyle: {
						borderColor: theme.surface,
						borderWidth: 4,
						borderRadius: 7,
						...markShadow,
					},
					data: buckets.map((bucket) => ({
						name: bucket.label,
						value: bucket.projects.length,
						itemStyle: { color: bucket.color },
					})),
				},
			],
		};
	}, [buckets, projects.length, theme]);

	return (
		<div className="grid gap-4 md:grid-cols-[12rem_1fr] md:items-center">
			<div className="relative h-[235px]">
				{projects.length === 0 ? (
					<EmptyDonut
						message="Aun no hay proyectos para comparar."
						size={210}
					/>
				) : (
					<>
						<EChart className="h-[235px] w-full" option={option} />
						<div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
							<div>
								<p className="text-2xl font-semibold tabular-nums">
									{projects.length}
								</p>
								<p className="text-xs text-[var(--muted)]">Proyectos</p>
							</div>
						</div>
					</>
				)}
			</div>
			<div className="grid gap-2.5">
				{buckets.map((bucket) => {
					const share =
						projects.length > 0
							? (bucket.projects.length / projects.length) * 100
							: 0;
					return (
						<div
							className="rounded-xl border border-[var(--border)] bg-white px-4 py-3 shadow-[0_10px_24px_rgba(37,48,51,0.08)]"
							key={bucket.key}
						>
							<div className="flex items-center justify-between gap-3">
								<span className="flex items-center gap-2 text-sm font-semibold">
									<span
										className="size-2.5 shrink-0 rounded-full"
										style={{ backgroundColor: bucket.color }}
									/>
									{bucket.label}
								</span>
								<strong className="tabular-nums">
									{bucket.projects.length}
								</strong>
							</div>
							<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e4e8e1]">
								<div
									className="h-full rounded-full"
									style={{ width: `${share}%`, backgroundColor: bucket.color }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

// A "budget usage" bar per project: one stacked bar (Ejecutado + Disponible
// = 100% of Presupuesto) with a bullet-style tick marking Abonado. Answers
// the real question - how much of the budget is used, and of that, how much
// is actually collected - in one bar, and its height scales with row count
// instead of leaving a mostly-empty 330px canvas for one or two projects.
export function FinancialControlChart({
	projects,
}: {
	projects: DashboardProjectRow[];
}) {
	const theme = chartTextTokens(useIsDarkMode());
	const rows = [...projects]
		.sort((a, b) => b.budgetTotal - a.budgetTotal)
		.slice(0, 8);
	const height = Math.max(190, rows.length * 60 + 50);
	const option = useMemo<EChartsCoreOption>(() => {
		if (rows.length === 0) return noDataOption("Sin datos financieros.", theme);
		return {
			animationDuration: 650,
			// The legend lives as HTML above the chart instead (see the
			// custom row below) so it isn't declared twice.
			grid: { ...baseGrid, top: 16, left: 96, right: 64 },
			tooltip: {
				...chartTooltip(theme),
				trigger: "axis",
				axisPointer: { type: "shadow" },
				formatter: (params: unknown) => {
					const rowsParams = Array.isArray(params) ? params : [];
					const first = rowsParams[0];
					const index =
						first && typeof first === "object" && "dataIndex" in first
							? Number((first as { dataIndex: number }).dataIndex)
							: 0;
					const row = rows[index];
					if (!row) return "";
					return `<strong>${row.code}</strong><br/>Presupuesto: ${moneyFull(row.budgetTotal)}<br/>Ejecutado: ${moneyFull(row.spent)}<br/>Abonado: ${moneyFull(row.paid)}`;
				},
			},
			xAxis: {
				type: "value",
				axisLabel: {
					formatter: (value: number) => moneyCompact(value),
					color: theme.muted,
				},
				splitLine: { lineStyle: { color: theme.grid } },
			},
			yAxis: {
				type: "category",
				data: rows.map((row) => row.code),
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: { color: theme.ink, fontWeight: 700 },
			},
			series: [
				{
					name: "Ejecutado",
					type: "bar",
					stack: "budget",
					barWidth: 22,
					data: rows.map((row) => row.spent),
					itemStyle: {
						color: hmChartColors.red,
						borderRadius: [10, 0, 0, 10],
						...markShadow,
					},
				},
				{
					name: "Disponible",
					type: "bar",
					stack: "budget",
					barWidth: 22,
					data: rows.map((row) => Math.max(row.budgetTotal - row.spent, 0)),
					itemStyle: {
						color: theme.concrete,
						borderRadius: [0, 10, 10, 0],
					},
					label: {
						show: true,
						position: "right",
						color: theme.muted,
						fontSize: 11,
						fontWeight: 700,
						formatter: (params: { dataIndex: number }) =>
							moneyCompact(rows[params.dataIndex]?.budgetTotal ?? 0),
					},
				},
				{
					name: "Abonado",
					type: "scatter",
					symbol: "rect",
					symbolSize: [4, 30],
					data: rows.map((row, index) => [row.paid, index]),
					itemStyle: { color: hmChartColors.green, ...markShadow },
					tooltip: { show: false },
				},
			],
		};
	}, [rows, theme]);

	if (rows.length === 0) {
		return (
			<EmptyChart
				height={190}
				message="Aun no hay proyectos con presupuesto para comparar."
			/>
		);
	}
	return (
		<div>
			<div className="mb-2 flex flex-wrap items-center gap-4 text-xs text-[var(--muted)]">
				<span className="inline-flex items-center gap-1.5">
					<span
						className="inline-block size-2.5 rounded-sm"
						style={{ backgroundColor: hmChartColors.red }}
					/>
					Ejecutado
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span className="inline-block size-2.5 rounded-sm bg-[var(--border)]" />
					Disponible (de presupuesto)
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span
						className="inline-block h-2.5 w-1 rounded-sm"
						style={{ backgroundColor: hmChartColors.green }}
					/>
					Abonado
				</span>
			</div>
			<div style={{ height }}>
				<EChart className="h-full w-full" option={option} />
			</div>
		</div>
	);
}

export function CashFlowChart({ metrics }: { metrics: DashboardMetricsView }) {
	const theme = chartTextTokens(useIsDarkMode());
	const hasValues = metrics.financialFlow.some(
		(row) => row.paid > 0 || row.spent > 0,
	);
	// Running balance across the 12-month window, so the saldo line reads
	// as "where the project stands" rather than repeating the two bars.
	const balanceSeries = useMemo(() => {
		let running = 0;
		return metrics.financialFlow.map((row) => {
			running += row.paid - row.spent;
			return running;
		});
	}, [metrics.financialFlow]);

	const option = useMemo<EChartsCoreOption>(() => {
		if (!hasValues)
			return noDataOption("Sin movimientos financieros en el periodo.", theme);
		return {
			animationDuration: 650,
			color: [hmChartColors.green, hmChartColors.red, hmChartColors.blue],
			grid: baseGrid,
			legend: {
				top: 0,
				right: 0,
				icon: "roundRect",
				itemHeight: 8,
				itemWidth: 18,
				textStyle: { color: theme.muted },
			},
			tooltip: {
				...chartTooltip(theme),
				trigger: "axis",
				axisPointer: { type: "shadow" },
				valueFormatter: (value: unknown) => moneyFull(Number(value)),
			},
			xAxis: {
				type: "category",
				data: metrics.financialFlow.map((row) => row.month),
				axisTick: { show: false },
				axisLabel: { color: theme.muted },
			},
			yAxis: {
				type: "value",
				axisLabel: {
					formatter: (value: number) => moneyCompact(value),
					color: theme.muted,
				},
				splitLine: { lineStyle: { color: theme.grid } },
			},
			series: [
				{
					name: "Abonado",
					type: "bar",
					barGap: "10%",
					barMaxWidth: 22,
					data: metrics.financialFlow.map((row) => row.paid),
					itemStyle: {
						color: hmChartColors.green,
						borderRadius: [4, 4, 0, 0],
						...markShadow,
					},
				},
				{
					name: "Gastado",
					type: "bar",
					barMaxWidth: 22,
					data: metrics.financialFlow.map((row) => row.spent),
					itemStyle: {
						color: hmChartColors.red,
						borderRadius: [4, 4, 0, 0],
						...markShadow,
					},
				},
				{
					name: "Saldo acumulado",
					type: "line",
					smooth: true,
					symbolSize: 6,
					data: balanceSeries,
					lineStyle: { width: 3, type: "dashed" },
				},
			],
		};
	}, [balanceSeries, metrics, hasValues, theme]);

	if (!hasValues) {
		return (
			<EmptyChart
				height={280}
				message="Aun no hay movimientos financieros en el periodo."
			/>
		);
	}
	return <EChart className="h-[280px] w-full" option={option} />;
}

// A handful of independent counts (not a trend, not a part-to-whole split)
// is a stat-tile row, not a bar chart - with mostly-zero values a bar chart
// renders as near-invisible slivers, while a number reads at zero just fine.
export function AlertsStatRow({
	rows,
}: {
	rows: Array<{ label: string; value: number; href: string }>;
}) {
	return (
		<div className="grid grid-cols-2 gap-2">
			{rows.map((row) => (
				<a
					className="focus-ring rounded-xl bg-white px-3 py-3 shadow-[0_8px_20px_rgba(37,48,51,0.07)] transition hover:-translate-y-0.5 hover:bg-[#fff8f2] hover:shadow-[0_14px_30px_rgba(37,48,51,0.12)]"
					href={row.href}
					key={row.label}
				>
					<p
						className={`text-2xl font-semibold tabular-nums ${
							row.value > 0 ? "text-[var(--danger)]" : ""
						}`}
					>
						{row.value}
					</p>
					<p className="mt-1 truncate text-xs font-medium text-[var(--muted)]">
						{row.label}
					</p>
				</a>
			))}
		</div>
	);
}

// Existencia vs. minimo is a value-against-a-threshold comparison, not two
// independent measures - a bullet chart (one bar + a threshold tick) reads
// that in one glance, instead of two parallel bars of different widths.
export function StockBarChart({
	rows,
}: {
	rows: Array<{
		material: string;
		unit: string;
		quantity: number;
		minimum: number;
		level: string;
	}>;
}) {
	const theme = chartTextTokens(useIsDarkMode());
	const height = Math.max(140, rows.length * 44 + 24);
	const option = useMemo<EChartsCoreOption>(() => {
		if (rows.length === 0)
			return noDataOption("Sin alertas de inventario.", theme);
		return {
			animationDuration: 550,
			grid: { ...baseGrid, top: 12, right: 40 },
			tooltip: {
				...chartTooltip(theme),
				trigger: "axis",
				axisPointer: { type: "shadow" },
				formatter: (params: unknown) => {
					const rowsParams = Array.isArray(params) ? params : [];
					const first = rowsParams[0];
					const index =
						first && typeof first === "object" && "dataIndex" in first
							? Number((first as { dataIndex: number }).dataIndex)
							: 0;
					const row = rows[index];
					if (!row) return "";
					return `<strong>${row.material}</strong><br/>Existencia: ${row.quantity} ${row.unit}<br/>Minimo: ${row.minimum} ${row.unit}`;
				},
			},
			xAxis: {
				type: "value",
				axisLabel: { color: theme.muted, fontSize: 11 },
				splitLine: { lineStyle: { color: theme.grid } },
			},
			yAxis: {
				type: "category",
				data: rows.map((row) => row.material),
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: {
					color: theme.ink,
					fontSize: 11,
					width: 96,
					overflow: "truncate",
				},
			},
			series: [
				{
					name: "Existencia",
					type: "bar",
					barWidth: 16,
					data: rows.map((row) => ({
						value: row.quantity,
						itemStyle: {
							color:
								row.level === "Critico"
									? hmChartColors.red
									: hmChartColors.amber,
							borderRadius: [0, 4, 4, 0],
							...markShadow,
						},
					})),
					label: {
						show: true,
						position: "right",
						color: theme.ink,
						fontSize: 11,
						fontWeight: 700,
						formatter: (params: { dataIndex: number }) =>
							`${rows[params.dataIndex]?.quantity ?? ""} ${rows[params.dataIndex]?.unit ?? ""}`,
					},
				},
				{
					name: "Minimo",
					type: "scatter",
					symbol: "rect",
					symbolSize: [4, 22],
					data: rows.map((row, index) => [row.minimum, index]),
					itemStyle: { color: theme.ink },
					tooltip: { show: false },
				},
			],
		};
	}, [rows, theme]);

	if (rows.length === 0) {
		return <EmptyChart height={140} message="Sin alertas de inventario." />;
	}
	return (
		<div>
			<div className="mb-2 flex items-center gap-4 text-xs text-[var(--muted)]">
				<span className="inline-flex items-center gap-1.5">
					<span
						className="inline-block size-2.5 rounded-sm"
						style={{ backgroundColor: hmChartColors.red }}
					/>
					Existencia
				</span>
				<span className="inline-flex items-center gap-1.5">
					<span className="inline-block h-2.5 w-1 rounded-sm bg-[var(--foreground)]" />
					Minimo
				</span>
			</div>
			<div style={{ height }}>
				<EChart className="h-full w-full" option={option} />
			</div>
		</div>
	);
}

function ChartMetric({
	color,
	label,
	value,
}: {
	color: string;
	label: string;
	value: string;
}) {
	return (
		<div className="rounded-xl border border-[var(--border)] bg-white px-3 py-3 shadow-[0_10px_24px_rgba(37,48,51,0.08)]">
			<div className="flex items-center justify-between gap-3">
				<span className="flex min-w-0 items-center gap-2 text-sm text-[var(--muted)]">
					<span
						className="size-2.5 shrink-0 rounded-full"
						style={{ backgroundColor: color }}
					/>
					<span className="truncate">{label}</span>
				</span>
				<strong className="shrink-0 whitespace-nowrap text-right tabular-nums">
					{value}
				</strong>
			</div>
		</div>
	);
}

/** Replaces an empty donut chart entirely - a dashed ring placeholder instead of a live
 * pie chart with no slices, so its own "no data" caption never fights an unconditional
 * center-overlay number/label (the old bug: a "0" or "0.0%" rendered on top of the message). */
function EmptyDonut({
	message,
	size = 192,
}: {
	message: string;
	size?: number;
}) {
	return (
		<div className="grid h-full place-items-center py-4">
			<div
				className="grid place-items-center gap-2 rounded-full border-2 border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_5%,transparent)] p-6 text-center"
				style={{ height: size, width: size }}
			>
				<PieChartIcon
					aria-hidden="true"
					className="text-[var(--muted)] opacity-60"
					size={22}
				/>
				<p className="max-w-[9rem] text-xs font-medium leading-snug text-[var(--muted)]">
					{message}
				</p>
			</div>
		</div>
	);
}

/** Same idea as EmptyDonut but for line/bar charts: a soft dashed panel with a subtle
 * "sketched" trend line instead of a flat, half-empty-looking chart canvas. */
function EmptyChart({
	message,
	height = 280,
}: {
	message: string;
	height?: number;
}) {
	return (
		<div
			className="grid place-items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_4%,transparent)] px-6 text-center"
			style={{ height }}
		>
			<svg
				aria-hidden="true"
				className="text-[var(--muted)] opacity-50"
				fill="none"
				height="28"
				viewBox="0 0 96 28"
				width="96"
			>
				<path
					d="M2 22c10 0 10-16 20-16s10 12 20 12 10-14 20-14 10 18 20 18 10-8 12-8"
					stroke="currentColor"
					strokeDasharray="4 5"
					strokeLinecap="round"
					strokeWidth="2"
				/>
			</svg>
			<p className="max-w-xs text-sm font-medium text-[var(--muted)]">
				{message}
			</p>
		</div>
	);
}
