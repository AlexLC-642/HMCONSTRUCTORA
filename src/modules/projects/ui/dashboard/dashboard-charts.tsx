"use client";

import type { EChartsCoreOption } from "echarts/core";
import * as echarts from "echarts/core";
import { PieChart as PieChartIcon } from "lucide-react";
import { useMemo } from "react";
import {
	baseGrid,
	chartTooltip,
	hmChartColors,
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
	const isEmpty = metrics.timeline.length < 2 || !hasPlanning(metrics);
	const option = useMemo<EChartsCoreOption>(() => {
		if (isEmpty)
			return noDataOption("Sin planificacion suficiente para Curva S.");

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
				textStyle: { color: hmChartColors.muted, fontSize: 12 },
			},
			tooltip: {
				...chartTooltip(),
				trigger: "axis",
				axisPointer: {
					type: "cross",
					label: { backgroundColor: hmChartColors.ink },
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
				axisLine: { lineStyle: { color: hmChartColors.grid } },
				axisLabel: { color: hmChartColors.muted, fontSize: 11 },
			},
			yAxis: {
				type: "value",
				min: 0,
				max: 100,
				interval: 25,
				axisLabel: {
					formatter: "{value}%",
					color: hmChartColors.muted,
					fontSize: 11,
				},
				splitLine: { lineStyle: { color: hmChartColors.grid } },
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
	}, [metrics, isEmpty]);

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
			? hmChartColors.muted
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
		if (total === 0) return noDataOption("Sin actividades registradas.");
		return {
			animationDuration: 650,
			tooltip: {
				...chartTooltip(),
				trigger: "item",
				formatter: "{b}<br/><strong>{c}</strong> actividades ({d}%)",
			},
			series: [
				{
					type: "pie",
					radius: ["62%", "82%"],
					center: ["50%", "50%"],
					label: { show: false },
					itemStyle: { borderColor: "#fff", borderWidth: 3, borderRadius: 5 },
					data: rows.map((row) => ({
						name: row.label,
						value: row.value,
						itemStyle: { color: row.color },
					})),
				},
			],
		};
	}, [rows, total]);

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

export function ProjectProgressChart({
	projects,
	onSelect,
}: {
	projects: DashboardProjectRow[];
	onSelect: (project: DashboardProjectRow) => void;
}) {
	const bands = useMemo(
		() => [
			{
				key: "start",
				label: "0-25%",
				caption: "Arranque",
				color: hmChartColors.red,
				projects: projects.filter((project) => project.realProgress < 25),
			},
			{
				key: "build",
				label: "26-50%",
				caption: "Ejecucion media",
				color: hmChartColors.amber,
				projects: projects.filter(
					(project) => project.realProgress >= 25 && project.realProgress < 50,
				),
			},
			{
				key: "advance",
				label: "51-75%",
				caption: "Avance alto",
				color: hmChartColors.green,
				projects: projects.filter(
					(project) => project.realProgress >= 50 && project.realProgress < 75,
				),
			},
			{
				key: "close",
				label: "76-100%",
				caption: "Cierre",
				color: hmChartColors.blue,
				projects: projects.filter((project) => project.realProgress >= 75),
			},
		],
		[projects],
	);
	const total = projects.length;
	const option = useMemo<EChartsCoreOption>(() => {
		if (total === 0) return noDataOption("Sin proyectos activos.");
		return {
			animationDuration: 650,
			color: bands.map((band) => band.color),
			tooltip: {
				...chartTooltip(),
				trigger: "item",
				formatter: (params: unknown) => {
					if (!params || typeof params !== "object") return "";
					const item = params as {
						name?: string;
						value?: number;
						percent?: number;
					};
					return `<strong>${item.name ?? ""}</strong><br/>${item.value ?? 0} proyectos (${Number(item.percent ?? 0).toFixed(1)}%)`;
				},
			},
			series: [
				{
					type: "pie",
					radius: ["54%", "78%"],
					center: ["50%", "50%"],
					label: { show: false },
					itemStyle: { borderColor: "#fff", borderWidth: 4, borderRadius: 7 },
					data: bands.map((band) => ({
						name: band.caption,
						value: band.projects.length,
						itemStyle: { color: band.color },
					})),
				},
			],
		};
	}, [bands, total]);

	const averageProgress =
		total === 0
			? 0
			: projects.reduce((sum, project) => sum + project.realProgress, 0) /
				total;

	return (
		<div className="grid gap-4 md:grid-cols-[14rem_1fr] md:items-center">
			<div className="relative h-[250px]">
				{total === 0 ? (
					<EmptyDonut message="Aun no hay proyectos activos." size={224} />
				) : (
					<>
						<EChart
							className="h-[250px] w-full"
							onChartClick={(params) => {
								const dataIndex =
									typeof params === "object" && params && "dataIndex" in params
										? Number((params as { dataIndex: number }).dataIndex)
										: -1;
								const project = bands[dataIndex]?.projects[0];
								if (project) onSelect(project);
							}}
							option={option}
						/>
						<div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
							<div>
								<p className="text-3xl font-semibold tabular-nums">
									{percent(averageProgress)}
								</p>
								<p className="text-xs text-[var(--muted)]">Promedio</p>
							</div>
						</div>
					</>
				)}
			</div>
			<div className="grid gap-2">
				{bands.map((band) => {
					const firstProject = band.projects[0];
					const share = total > 0 ? (band.projects.length / total) * 100 : 0;
					return (
						<button
							className="focus-ring rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-left shadow-[0_10px_24px_rgba(37,48,51,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(37,48,51,0.13)] disabled:cursor-default disabled:opacity-60 disabled:hover:translate-y-0"
							disabled={!firstProject}
							key={band.key}
							onClick={() =>
								firstProject ? onSelect(firstProject) : undefined
							}
							type="button"
						>
							<div className="flex items-center justify-between gap-3">
								<span className="flex items-center gap-2 text-sm font-semibold">
									<span
										className="size-2.5 rounded-full"
										style={{ backgroundColor: band.color }}
									/>
									{band.caption}
								</span>
								<strong className="tabular-nums">{band.projects.length}</strong>
							</div>
							<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e4e8e1]">
								<div
									className="h-full rounded-full"
									style={{
										width: `${clamp(share)}%`,
										backgroundColor: band.color,
									}}
								/>
							</div>
							<p className="mt-1 text-xs text-[var(--muted)]">
								{band.label} de avance
							</p>
						</button>
					);
				})}
			</div>
		</div>
	);
}

export function ProgressVarianceChart({
	projects,
}: {
	projects: DashboardProjectRow[];
}) {
	const rows = [...projects]
		.sort(
			(a, b) =>
				Math.abs(b.realProgress - b.plannedProgress) -
				Math.abs(a.realProgress - a.plannedProgress),
		)
		.slice(0, 5);
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
			return noDataOption("Sin proyectos para comparar.");
		return {
			animationDuration: 650,
			color: buckets.map((bucket) => bucket.color),
			tooltip: {
				...chartTooltip(),
				trigger: "item",
				formatter: "{b}<br/><strong>{c}</strong> proyectos ({d}%)",
			},
			series: [
				{
					type: "pie",
					radius: ["58%", "80%"],
					center: ["50%", "50%"],
					label: { show: false },
					itemStyle: { borderColor: "#fff", borderWidth: 4, borderRadius: 7 },
					data: buckets.map((bucket) => ({
						name: bucket.label,
						value: bucket.projects.length,
						itemStyle: { color: bucket.color },
					})),
				},
			],
		};
	}, [buckets, projects.length]);

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
			<div className="grid gap-3">
				<div className="grid grid-cols-3 gap-2">
					{buckets.map((bucket) => (
						<div
							className="rounded-xl border border-[var(--border)] bg-white px-3 py-3 text-center shadow-[0_10px_24px_rgba(37,48,51,0.08)]"
							key={bucket.key}
						>
							<span
								className="mx-auto block size-2.5 rounded-full"
								style={{ backgroundColor: bucket.color }}
							/>
							<p className="mt-2 text-xs font-semibold text-[var(--muted)]">
								{bucket.label}
							</p>
							<strong className="tabular-nums">{bucket.projects.length}</strong>
						</div>
					))}
				</div>
				<div className="grid gap-2">
					{rows.map((project) => {
						const gap = project.realProgress - project.plannedProgress;
						const color =
							gap <= -5
								? hmChartColors.red
								: gap < 5
									? hmChartColors.blue
									: hmChartColors.green;
						return (
							<div
								className="rounded-xl border border-[var(--border)] bg-white px-3 py-2 shadow-sm"
								key={project.id}
							>
								<div className="flex items-center justify-between gap-3">
									<span className="truncate text-sm font-semibold">
										{project.code}
									</span>
									<strong className="text-sm tabular-nums" style={{ color }}>
										{progressGap(gap)}
									</strong>
								</div>
								<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e4e8e1]">
									<div
										className="h-full rounded-full"
										style={{
											width: `${clamp(Math.abs(gap))}%`,
											backgroundColor: color,
										}}
									/>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}

export function FinancialControlChart({
	projects,
}: {
	projects: DashboardProjectRow[];
}) {
	const rows = [...projects]
		.sort((a, b) => b.budgetTotal - a.budgetTotal)
		.slice(0, 8);
	const option = useMemo<EChartsCoreOption>(() => {
		if (rows.length === 0) return noDataOption("Sin datos financieros.");
		return {
			animationDuration: 650,
			grid: { ...baseGrid, left: 96, right: 44 },
			legend: {
				top: 0,
				right: 0,
				icon: "roundRect",
				itemHeight: 8,
				itemWidth: 18,
				textStyle: { color: hmChartColors.muted },
			},
			tooltip: {
				...chartTooltip(),
				trigger: "axis",
				axisPointer: { type: "shadow" },
				valueFormatter: (value: unknown) => moneyFull(Number(value)),
			},
			xAxis: {
				type: "value",
				axisLabel: {
					formatter: (value: number) => moneyCompact(value),
					color: hmChartColors.muted,
				},
				splitLine: { lineStyle: { color: hmChartColors.grid } },
			},
			yAxis: {
				type: "category",
				data: rows.map((row) => row.code),
				axisLine: { show: false },
				axisTick: { show: false },
				axisLabel: { color: hmChartColors.ink, fontWeight: 700 },
			},
			series: [
				{
					name: "Presupuesto",
					type: "bar",
					barWidth: 18,
					data: rows.map((row) => row.budgetTotal),
					itemStyle: {
						color: hmChartColors.concrete,
						borderRadius: [0, 10, 10, 0],
					},
				},
				{
					name: "Ejecutado",
					type: "bar",
					barWidth: 18,
					data: rows.map((row) => row.spent),
					itemStyle: { color: hmChartColors.red, borderRadius: [0, 10, 10, 0] },
				},
				{
					name: "Abonado",
					type: "bar",
					barWidth: 10,
					data: rows.map((row) => row.paid),
					itemStyle: { color: hmChartColors.green, borderRadius: [0, 8, 8, 0] },
				},
			],
		};
	}, [rows]);

	if (rows.length === 0) {
		return (
			<EmptyChart
				height={330}
				message="Aun no hay proyectos con presupuesto para comparar."
			/>
		);
	}
	return <EChart className="h-[330px] w-full" option={option} />;
}

export function CashFlowChart({ metrics }: { metrics: DashboardMetricsView }) {
	const hasValues = metrics.financialFlow.some(
		(row) => row.paid > 0 || row.spent > 0,
	);
	const option = useMemo<EChartsCoreOption>(() => {
		if (!hasValues)
			return noDataOption("Sin movimientos financieros en el periodo.");
		return {
			animationDuration: 650,
			color: [hmChartColors.green, hmChartColors.red],
			grid: baseGrid,
			legend: {
				top: 0,
				right: 0,
				icon: "roundRect",
				itemHeight: 8,
				itemWidth: 18,
				textStyle: { color: hmChartColors.muted },
			},
			tooltip: {
				...chartTooltip(),
				trigger: "axis",
				valueFormatter: (value: unknown) => moneyFull(Number(value)),
			},
			xAxis: {
				type: "category",
				boundaryGap: false,
				data: metrics.financialFlow.map((row) => row.month),
				axisTick: { show: false },
				axisLabel: { color: hmChartColors.muted },
			},
			yAxis: {
				type: "value",
				axisLabel: {
					formatter: (value: number) => moneyCompact(value),
					color: hmChartColors.muted,
				},
				splitLine: { lineStyle: { color: hmChartColors.grid } },
			},
			series: [
				{
					name: "Abonado",
					type: "line",
					smooth: true,
					symbolSize: 5,
					data: metrics.financialFlow.map((row) => row.paid),
					areaStyle: { color: "rgba(31,122,91,0.10)" },
					lineStyle: { width: 3 },
				},
				{
					name: "Gastado",
					type: "line",
					smooth: true,
					symbolSize: 5,
					data: metrics.financialFlow.map((row) => row.spent),
					areaStyle: { color: "rgba(211,33,53,0.08)" },
					lineStyle: { width: 3 },
				},
			],
		};
	}, [metrics, hasValues]);

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
