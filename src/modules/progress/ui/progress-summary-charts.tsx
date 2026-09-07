"use client";

import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import * as echarts from "echarts/core";
import { motion } from "motion/react";
import { EChart } from "@/shared/ui/charts/e-chart";
import { baseGrid, chartTooltip, hmChartColors } from "@/shared/ui/charts/chart-theme";

type ActivityRow = {
  name: string;
  progress: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "BLOCKED";
};

type ProgressSummaryChartsProps = {
  previousProgress: number;
  currentProgress: number;
  plannedProgress: number;
  completed: number;
  inProgress: number;
  pending: number;
  blocked: number;
  activities: ActivityRow[];
};

const statusMeta = {
  PENDING: { label: "Pendientes", color: hmChartColors.amber },
  IN_PROGRESS: { label: "En proceso", color: hmChartColors.green },
  COMPLETED: { label: "Completadas", color: hmChartColors.blue },
  BLOCKED: { label: "Bloqueadas", color: hmChartColors.red }
} as const;

function clamp(value: number) {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function pct(value: number) {
  return `${clamp(value).toFixed(1)}%`;
}

function shortLabel(value: string) {
  return value.length > 34 ? `${value.slice(0, 31)}...` : value;
}

export function ProgressSummaryCharts({
  previousProgress,
  currentProgress,
  plannedProgress,
  completed,
  inProgress,
  pending,
  blocked,
  activities
}: ProgressSummaryChartsProps) {
  const real = clamp(currentProgress);
  const previous = clamp(previousProgress);
  const planned = clamp(plannedProgress);
  const delta = real - planned;
  const statusRows = useMemo(() => [
    { key: "COMPLETED", value: completed, ...statusMeta.COMPLETED },
    { key: "IN_PROGRESS", value: inProgress, ...statusMeta.IN_PROGRESS },
    { key: "PENDING", value: pending, ...statusMeta.PENDING },
    { key: "BLOCKED", value: blocked, ...statusMeta.BLOCKED }
  ], [blocked, completed, inProgress, pending]);
  const totalActivities = Math.max(0, completed + inProgress + pending + blocked);
  const movedActivities = activities.filter((activity) => activity.progress > 0).length;

  const sCurveOption = useMemo<EChartsCoreOption>(() => {
    const start = Math.max(0, Math.min(previous, real) - 9);
    const mid = Math.max(start, previous);
    const projected = Math.min(100, Math.max(real, planned, real + 8));

    return {
      animationDuration: 760,
      animationEasing: "cubicOut",
      color: [hmChartColors.green, hmChartColors.blue],
      grid: { ...baseGrid, top: 42, left: 38, right: 20, bottom: 32 },
      legend: {
        top: 2,
        right: 8,
        icon: "roundRect",
        itemHeight: 8,
        itemWidth: 22,
        textStyle: { color: hmChartColors.muted, fontSize: 12 }
      },
      tooltip: {
        ...chartTooltip(),
        trigger: "axis",
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params : [];
          const date = rows[0] && typeof rows[0] === "object" && "axisValue" in rows[0] ? String(rows[0].axisValue) : "";
          const lines = rows.map((row) => {
            if (!row || typeof row !== "object") return "";
            const item = row as { marker?: string; seriesName?: string; value?: number };
            return `<div style="display:flex;gap:18px;justify-content:space-between"><span>${item.marker ?? ""}${item.seriesName ?? ""}</span><strong>${Number(item.value ?? 0).toFixed(1)}%</strong></div>`;
          }).join("");
          return `<strong>${date}</strong>${lines}`;
        }
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: ["Inicio", "Anterior", "Hoy", "Prox."],
        axisTick: { show: false },
        axisLine: { lineStyle: { color: hmChartColors.grid } },
        axisLabel: { color: hmChartColors.muted, fontSize: 11 }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: { formatter: "{value}%", color: hmChartColors.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: hmChartColors.grid } }
      },
      series: [
        {
          name: "Avance real",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          data: [start, mid, real, projected],
          lineStyle: { width: 4, color: hmChartColors.green },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(31,122,91,0.22)" },
              { offset: 1, color: "rgba(31,122,91,0.03)" }
            ])
          },
          markLine: {
            symbol: "none",
            label: { formatter: "Hoy", color: "#b76e00", fontWeight: 700 },
            lineStyle: { color: "rgba(242,169,0,0.72)", type: "dashed", width: 1.4 },
            data: [{ xAxis: "Hoy" }]
          }
        },
        {
          name: "Plan",
          type: "line",
          smooth: true,
          symbol: "none",
          data: [0, Math.max(0, planned - 8), planned, planned],
          lineStyle: { width: 3, type: "dashed", color: hmChartColors.blue }
        }
      ]
    };
  }, [planned, previous, real]);

  const donutOption = useMemo<EChartsCoreOption>(() => ({
    animationDuration: 720,
    tooltip: { ...chartTooltip(), trigger: "item", formatter: "{b}<br/><strong>{c}</strong> actividades ({d}%)" },
    series: [
      {
        type: "pie",
        radius: ["64%", "83%"],
        center: ["50%", "50%"],
        label: { show: false },
        itemStyle: { borderColor: "#fff", borderRadius: 8, borderWidth: 4 },
        data: statusRows.map((row) => ({ name: row.label, value: row.value, itemStyle: { color: row.color } }))
      }
    ]
  }), [statusRows]);

  const activityOption = useMemo<EChartsCoreOption>(() => {
    const rows = activities.slice(0, 8);
    return {
      animationDuration: 680,
      grid: { ...baseGrid, top: 18, right: 22, left: 118, bottom: 26 },
      tooltip: { ...chartTooltip(), trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (value: number) => `${Number(value).toFixed(1)}%` },
      xAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLabel: { formatter: "{value}%", color: hmChartColors.muted, fontSize: 11 },
        splitLine: { lineStyle: { color: hmChartColors.grid } }
      },
      yAxis: {
        type: "category",
        inverse: true,
        data: rows.map((row) => shortLabel(row.name)),
        axisTick: { show: false },
        axisLine: { show: false },
        axisLabel: { color: hmChartColors.ink, fontSize: 11, fontWeight: 600 }
      },
      series: [
        {
          name: "Avance",
          type: "bar",
          barWidth: 13,
          data: rows.map((row) => ({
            value: clamp(row.progress),
            itemStyle: { color: statusMeta[row.status].color, borderRadius: [0, 8, 8, 0] }
          })),
          label: {
            show: true,
            position: "right",
            formatter: "{c}%",
            color: hmChartColors.ink,
            fontSize: 11,
            fontWeight: 700
          }
        }
      ]
    };
  }, [activities]);

  return (
    <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
      <motion.div
        className="rounded-[22px] border border-[var(--border)] bg-white p-4 shadow-[0_20px_50px_rgba(31,42,45,0.10)]"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Curva S de la jornada</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">Avance real contra la base planificada del proyecto.</p>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${delta >= 0 ? "border-[#b7dfcc] bg-[#edf9f2] text-[var(--success)]" : "border-[#f1b6ba] bg-[#fff1f1] text-[var(--brand-red)]"}`}>
            Brecha {delta >= 0 ? "+" : ""}{delta.toFixed(1)} pp
          </span>
        </div>
        <EChart className="mt-2 h-[315px] w-full" option={sCurveOption} />
      </motion.div>

      <div className="grid gap-4">
        <motion.div
          className="rounded-[22px] border border-[var(--border)] bg-white p-4 shadow-[0_20px_50px_rgba(31,42,45,0.10)]"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold">Estado del frente</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">{totalActivities} actividades base</p>
            </div>
            <strong className="text-2xl tabular-nums">{pct(real)}</strong>
          </div>
          <div className="relative mt-2 h-[210px]">
            <EChart className="h-[210px] w-full" option={donutOption} />
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <div>
                <p className="text-3xl font-semibold tabular-nums">{totalActivities ? ((completed / totalActivities) * 100).toFixed(1) : "0.0"}%</p>
                <p className="text-xs text-[var(--muted)]">completado</p>
              </div>
            </div>
          </div>
          <div className="grid gap-2">
            {statusRows.map((row) => (
              <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[#fbfaf6] px-3 py-2 text-sm" key={row.key}>
                <span className="inline-flex items-center gap-2 text-[var(--muted)]">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.label}
                </span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <motion.div
        className="rounded-[22px] border border-[var(--border)] bg-white p-4 shadow-[0_20px_50px_rgba(31,42,45,0.10)] xl:col-span-2"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Avance por actividad</h3>
            <p className="mt-1 text-xs text-[var(--muted)]">{movedActivities} actividades con avance registrado o acumulado.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-[#edf9f2] px-2.5 py-1 font-semibold text-[var(--success)]">Real {pct(real)}</span>
            <span className="rounded-full bg-[#edf4ff] px-2.5 py-1 font-semibold text-[#2057c9]">Plan {pct(planned)}</span>
          </div>
        </div>
        <EChart className="mt-3 h-[285px] w-full" option={activityOption} />
      </motion.div>
    </div>
  );
}
