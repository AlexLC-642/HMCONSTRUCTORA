"use client";

import type { EChartsCoreOption } from "echarts/core";
import { motion } from "motion/react";
import { useThemeMode } from "@/shared/hooks/use-theme-mode";
import { EChart } from "@/shared/ui/charts/e-chart";

type ActivityPoint = {
	name: string;
	previous: number;
	current: number;
	today: number;
};

type StatusPoint = {
	name: string;
	value: number;
	status: "COMPLETED" | "IN_PROGRESS" | "PENDING" | "BLOCKED";
};

type PortalProgressChartsProps = {
	progress: number;
	previousAverage: number;
	dailyAdvance: number;
	activities: ActivityPoint[];
	statuses: StatusPoint[];
};

// Canvas charts can't read CSS custom properties, so these mirror the real
// light/dark tokens (--foreground/--muted/--border/--success/--info/
// --warning/--danger in globals.css) as literal hex, picked at render time
// by the current theme.
const palettes = {
	light: {
		text: "#111719",
		muted: "#665f57",
		grid: "#e2ded4",
		tooltipBg: "rgba(255,255,255,0.98)",
		tooltipBorder: "#d8cec1",
		green: "#1f7a5b",
		blue: "#2563eb",
		red: "#b42318",
		amber: "#b76e00",
	},
	dark: {
		text: "#eef1ee",
		muted: "#a3afa9",
		grid: "#2a353a",
		tooltipBg: "rgba(24,33,36,0.96)",
		tooltipBorder: "#3a464b",
		green: "#3ecf96",
		blue: "#6ea8fe",
		red: "#f26a63",
		amber: "#e3a63e",
	},
} as const;

function pct(value: number) {
	return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
}

// Matches statusTone()/statusColor() in the portal page: Completed=info,
// In progress=success, Blocked=danger, Pending=warning.
function statusPointColor(
	status: StatusPoint["status"],
	palette: { blue: string; green: string; red: string; amber: string },
) {
	if (status === "COMPLETED") return palette.blue;
	if (status === "IN_PROGRESS") return palette.green;
	if (status === "BLOCKED") return palette.red;
	return palette.amber;
}

export function PortalProgressCharts({
	activities,
	dailyAdvance,
	previousAverage,
	progress,
	statuses,
}: PortalProgressChartsProps) {
	const mode = useThemeMode();
	const palette = palettes[mode];
	const { text, muted, grid, green, blue, red, amber } = palette;

	const tooltipStyle = {
		backgroundColor: palette.tooltipBg,
		borderColor: palette.tooltipBorder,
		borderWidth: 1,
		textStyle: { color: text },
	};

	const activityNames = activities.map((activity) => activity.name);
	const hasActivities = activities.length > 0;

	const curveOption: EChartsCoreOption = {
		color: [green, blue, red],
		tooltip: {
			trigger: "axis",
			valueFormatter: (value: unknown) => pct(Number(value)),
			...tooltipStyle,
		},
		grid: { left: 36, right: 18, top: 26, bottom: 34 },
		xAxis: {
			type: "category",
			data: hasActivities ? activityNames : ["Inicio", "Hoy"],
			axisTick: { show: false },
			axisLine: { lineStyle: { color: grid } },
			axisLabel: {
				color: muted,
				fontSize: 11,
				interval: 0,
				overflow: "truncate",
				width: 92,
			},
		},
		yAxis: {
			type: "value",
			min: 0,
			max: 100,
			axisLabel: { color: muted, formatter: "{value}%" },
			splitLine: { lineStyle: { color: grid } },
		},
		series: [
			{
				name: "Avance actual",
				type: "line",
				smooth: true,
				symbolSize: 8,
				areaStyle: {
					color:
						mode === "dark"
							? "rgba(62, 207, 150, 0.16)"
							: "rgba(31, 122, 90, 0.14)",
				},
				lineStyle: { width: 3, color: green },
				data: hasActivities
					? activities.map((activity) => activity.current)
					: [previousAverage, progress],
			},
			{
				name: "Base anterior",
				type: "line",
				smooth: true,
				symbolSize: 6,
				lineStyle: { width: 2, color: blue, type: "dashed" },
				data: hasActivities
					? activities.map((activity) => activity.previous)
					: [previousAverage, previousAverage],
			},
		],
	};

	const activityOption: EChartsCoreOption = {
		color: [green, amber],
		tooltip: {
			trigger: "axis",
			axisPointer: { type: "shadow" },
			...tooltipStyle,
		},
		legend: { bottom: 0, textStyle: { color: muted } },
		// Percentage instead of a fixed px reservation: on a narrow phone card
		// a fixed 118px for labels left almost nothing for the bars themselves.
		grid: { left: "38%", right: 18, top: 10, bottom: 40 },
		xAxis: {
			type: "value",
			min: 0,
			max: 100,
			axisLabel: { color: muted, formatter: "{value}%" },
			splitLine: { lineStyle: { color: grid } },
		},
		yAxis: {
			type: "category",
			data: activityNames,
			axisTick: { show: false },
			axisLine: { show: false },
			axisLabel: {
				color: text,
				fontWeight: 700,
				overflow: "truncate",
				width: 110,
			},
		},
		series: [
			{
				name: "Acumulado",
				type: "bar",
				barWidth: 12,
				data: activities.map((activity) => activity.current),
				itemStyle: { borderRadius: [0, 8, 8, 0] },
			},
			{
				name: "Hoy",
				type: "bar",
				barWidth: 8,
				data: activities.map((activity) => activity.today),
				itemStyle: { borderRadius: [0, 8, 8, 0] },
			},
		],
	};

	const statusOption: EChartsCoreOption = {
		tooltip: { trigger: "item", ...tooltipStyle },
		legend: {
			orient: "vertical",
			right: 0,
			top: "center",
			textStyle: { color: muted },
		},
		series: [
			{
				name: "Estado",
				type: "pie",
				radius: ["56%", "76%"],
				center: ["34%", "50%"],
				avoidLabelOverlap: true,
				label: { show: false },
				labelLine: { show: false },
				itemStyle: {
					borderColor: mode === "dark" ? "#182124" : "#ffffff",
					borderWidth: 2,
				},
				data: statuses.map((status) => ({
					name: status.name,
					value: status.value,
					itemStyle: { color: statusPointColor(status.status, palette) },
				})),
			},
		],
		graphic: [
			{
				type: "text",
				left: "25%",
				top: "44%",
				style: {
					text: pct(progress),
					fill: text,
					fontSize: 26,
					fontWeight: 800,
					textAlign: "center",
				},
			},
		],
	};

	return (
		<div className="portal-chart-grid">
			<motion.article
				className="portal-chart-card portal-chart-card-wide"
				initial={{ opacity: 0, y: 14 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.28 }}
			>
				<div className="portal-chart-head">
					<div>
						<h3>Curva de avance</h3>
						<p>Lectura del avance reportado contra la base anterior.</p>
					</div>
					<span>{pct(dailyAdvance)} hoy</span>
				</div>
				<EChart className="h-[260px] w-full" option={curveOption} />
			</motion.article>

			<motion.article
				className="portal-chart-card"
				initial={{ opacity: 0, y: 14 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.28, delay: 0.04 }}
			>
				<div className="portal-chart-head">
					<div>
						<h3>Estado del frente</h3>
						<p>Distribucion de actividades del ultimo informe.</p>
					</div>
				</div>
				<EChart className="h-[260px] w-full" option={statusOption} />
			</motion.article>

			{hasActivities ? (
				<motion.article
					className="portal-chart-card portal-chart-card-wide"
					initial={{ opacity: 0, y: 14 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.28, delay: 0.08 }}
				>
					<div className="portal-chart-head">
						<div>
							<h3>Actividades reportadas</h3>
							<p>Acumulado actual y movimiento de la jornada por frente.</p>
						</div>
					</div>
					<EChart className="h-[300px] w-full" option={activityOption} />
				</motion.article>
			) : null}
		</div>
	);
}
