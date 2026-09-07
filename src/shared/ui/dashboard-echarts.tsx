"use client";

import { useEffect, useMemo, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { ECharts, EChartsCoreOption } from "echarts/core";
import type { PortfolioRow } from "./dashboard-charts";

echarts.use([BarChart, GridComponent, LegendComponent, LineChart, MarkLineComponent, PieChart, SVGRenderer, TooltipComponent]);

type Segment = {
  label: string;
  value: number;
  color: string;
};

type ProgressComparisonRow = {
  label: string;
  real: number;
  planned: number;
};

const currencyFormatter = new Intl.NumberFormat("es-GT", { style: "currency", currency: "GTQ", maximumFractionDigits: 0 });

function clamp(value: number) {
  return Math.max(0, Math.min(100, value));
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function moneyShort(value: number) {
  if (Math.abs(value) >= 1_000_000) return `Q ${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `Q ${(value / 1_000).toFixed(0)}K`;
  return currencyFormatter.format(value);
}

function buildCurve(target: number) {
  if (target <= 0) return [0, 0, 0, 0, 0, 0, 0];
  return [0, target * 0.08, target * 0.22, target * 0.45, target * 0.68, target * 0.86, target].map(clamp);
}

function useEChart(option: EChartsCoreOption) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const instance: ECharts = echarts.init(ref.current, undefined, { renderer: "svg" });
    instance.setOption(option);

    const observer = new ResizeObserver(() => instance.resize());
    observer.observe(ref.current);

    return () => {
      observer.disconnect();
      instance.dispose();
    };
  }, [option]);

  return ref;
}

function CardMetric({ color, label, value, detail }: { color: string; label: string; value: string; detail?: string }) {
  return (
    <div className="dashboard-soft-metric">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
          <span className="size-2.5 rounded-full shadow-[0_0_16px_currentColor]" style={{ backgroundColor: color, color }} />
          {label}
        </span>
        <strong className="text-[var(--foreground)] tabular-nums">{value}</strong>
      </div>
      {detail ? <p className="mt-1 text-xs text-[var(--muted)]">{detail}</p> : null}
    </div>
  );
}

export function EChartsPortfolioSChart({ projects }: { projects: PortfolioRow[] }) {
  const option = useMemo<EChartsCoreOption>(() => {
    const projectCount = Math.max(1, projects.length);
    const realAverage = projects.reduce((sum, project) => sum + project.real, 0) / projectCount;
    const plannedAverage = projects.reduce((sum, project) => sum + project.planned, 0) / projectCount;
    const financialAverage = projects.reduce((sum, project) => sum + (project.budget === 0 ? 0 : (project.spent / project.budget) * 100), 0) / projectCount;
    const labels = ["Inicio", "20%", "40%", "Hoy", "60%", "80%", "Cierre"];

    return {
      animationDuration: 950,
      animationEasing: "cubicOut",
      color: ["#10B981", "#0284C7", "#8B5CF6"],
      grid: { top: 28, right: 18, bottom: 36, left: 48, containLabel: false },
      legend: {
        bottom: 0,
        icon: "roundRect",
        itemHeight: 8,
        itemWidth: 18,
        textStyle: { color: "#5A6661", fontSize: 12 }
      },
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(255,255,255,0.96)",
        borderColor: "rgba(207,213,206,0.95)",
        borderWidth: 1,
        confine: true,
        extraCssText: "box-shadow:0 18px 42px rgba(37,48,51,.16);border-radius:12px;padding:10px 12px;",
        textStyle: { color: "#111719", fontSize: 12 },
        valueFormatter: (value: unknown) => percent(Number(value))
      },
      xAxis: {
        type: "category",
        data: labels,
        boundaryGap: false,
        axisTick: { show: false },
        axisLine: { lineStyle: { color: "rgba(90,102,97,0.22)" } },
        axisLabel: { color: "#5A6661", fontSize: 11 }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: { color: "#5A6661", formatter: "{value}%", fontSize: 11 },
        splitLine: { lineStyle: { color: "rgba(90,102,97,0.14)" } }
      },
      series: [
        {
          name: "Avance real",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          data: buildCurve(realAverage),
          lineStyle: { width: 4, color: "#10B981" },
          itemStyle: { color: "#10B981", borderColor: "#FFFFFF", borderWidth: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "rgba(16,185,129,0.26)" },
              { offset: 1, color: "rgba(16,185,129,0.02)" }
            ])
          },
          markLine: {
            symbol: "none",
            label: { color: "#B76E00", fontWeight: 700, formatter: "Hoy" },
            lineStyle: { color: "rgba(245,158,11,0.58)", type: "dashed", width: 1.5 },
            data: [{ xAxis: "Hoy" }]
          }
        },
        {
          name: "Planificado",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          data: buildCurve(plannedAverage),
          lineStyle: { width: 3, color: "#0284C7" },
          itemStyle: { color: "#0284C7", borderColor: "#FFFFFF", borderWidth: 2 }
        },
        {
          name: "Avance financiero",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          data: buildCurve(financialAverage),
          lineStyle: { width: 3, color: "#8B5CF6" },
          itemStyle: { color: "#8B5CF6", borderColor: "#FFFFFF", borderWidth: 2 }
        }
      ]
    };
  }, [projects]);

  const ref = useEChart(option);
  const projectCount = Math.max(1, projects.length);
  const realAverage = projects.reduce((sum, project) => sum + project.real, 0) / projectCount;
  const plannedAverage = projects.reduce((sum, project) => sum + project.planned, 0) / projectCount;
  const financialAverage = projects.reduce((sum, project) => sum + (project.budget === 0 ? 0 : (project.spent / project.budget) * 100), 0) / projectCount;
  const breach = realAverage - plannedAverage;

  if (projects.length === 0) {
    return <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-8 text-center text-sm text-[var(--muted)]">Sin proyectos para consolidar.</div>;
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_16rem]">
      <div className="min-h-[330px]" ref={ref} />
      <div className="grid content-center gap-3">
        <CardMetric color="#10B981" label="Avance real" value={percent(realAverage)} />
        <CardMetric color="#0284C7" label="Planificado" value={percent(plannedAverage)} />
        <CardMetric color="#8B5CF6" label="Avance financiero" value={percent(financialAverage)} />
        <CardMetric color={breach < -5 ? "#EF4444" : "#10B981"} label="Brecha" value={`${breach >= 0 ? "+" : ""}${breach.toFixed(1)} pp`} detail={breach < -5 ? "Requiere revision" : "Dentro del ritmo"} />
      </div>
    </div>
  );
}

export function EChartsActivityDonut({ segments, completedRatio }: { segments: Segment[]; completedRatio: number }) {
  const option = useMemo<EChartsCoreOption>(() => ({
    animationDuration: 780,
    animationEasing: "cubicOut",
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "rgba(207,213,206,0.95)",
      extraCssText: "box-shadow:0 18px 42px rgba(37,48,51,.16);border-radius:12px;padding:10px 12px;",
      formatter: "{b}<br/><strong>{c}</strong> actividades"
    },
    series: [{
      type: "pie",
      radius: ["58%", "78%"],
      center: ["50%", "50%"],
      avoidLabelOverlap: true,
      itemStyle: { borderColor: "#fff", borderRadius: 5, borderWidth: 3 },
      label: { show: false },
      emphasis: { scale: true, scaleSize: 6 },
      data: segments.map((segment) => ({ name: segment.label, value: segment.value, itemStyle: { color: segment.color } }))
    }]
  }), [segments]);

  const ref = useEChart(option);

  return (
    <div className="grid gap-4">
      <div className="relative mx-auto h-52 w-full max-w-[260px]">
        <div className="h-full w-full" ref={ref} />
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-3xl font-semibold tabular-nums">{percent(completedRatio)}</p>
            <p className="text-xs text-[var(--muted)]">Completado</p>
          </div>
        </div>
      </div>
      <div className="grid gap-2">
        {segments.map((segment) => (
          <div className="dashboard-soft-metric py-2" key={segment.label}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm text-[var(--muted)]">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
              </span>
              <strong className="tabular-nums">{segment.value}</strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EChartsProgressComparison({ rows }: { rows: ProgressComparisonRow[] }) {
  const option = useMemo<EChartsCoreOption>(() => ({
    animationDuration: 820,
    animationEasing: "cubicOut",
    grid: { top: 18, right: 36, bottom: 26, left: 90, containLabel: true },
    legend: {
      top: 0,
      right: 0,
      icon: "roundRect",
      itemHeight: 8,
      itemWidth: 18,
      textStyle: { color: "#5A6661", fontSize: 12 }
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "rgba(207,213,206,0.95)",
      extraCssText: "box-shadow:0 18px 42px rgba(37,48,51,.16);border-radius:12px;padding:10px 12px;",
      valueFormatter: (value: unknown) => percent(Number(value))
    },
    xAxis: {
      type: "value",
      max: 100,
      axisLabel: { formatter: "{value}%", color: "#5A6661" },
      splitLine: { lineStyle: { color: "rgba(90,102,97,0.14)" } }
    },
    yAxis: {
      type: "category",
      data: rows.map((row) => row.label),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: "#111719", fontWeight: 700 }
    },
    series: [
      {
        name: "Plan",
        type: "bar",
        barWidth: 14,
        data: rows.map((row) => clamp(row.planned)),
        itemStyle: { borderRadius: [0, 8, 8, 0], color: "rgba(37,99,235,0.20)" },
        z: 1
      },
      {
        name: "Real",
        type: "bar",
        barWidth: 14,
        data: rows.map((row) => clamp(row.real)),
        itemStyle: {
          borderRadius: [0, 8, 8, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: "#0F766E" },
            { offset: 1, color: "#10B981" }
          ])
        },
        label: { show: true, position: "right", formatter: "{c}%", color: "#111719", fontWeight: 700 },
        z: 2
      }
    ]
  }), [rows]);

  const ref = useEChart(option);

  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-8 text-center text-sm text-[var(--muted)]">Sin avance registrado.</div>;
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_15rem]">
      <div className="min-h-[260px]" ref={ref} />
      <div className="grid content-center gap-2">
        {rows.slice(0, 5).map((row) => {
          const breach = row.real - row.planned;
          return (
            <CardMetric
              color={breach < -5 ? "#EF4444" : "#10B981"}
              detail={`Real ${percent(row.real)} / Plan ${percent(row.planned)}`}
              key={row.label}
              label={row.label}
              value={`${breach >= 0 ? "+" : ""}${breach.toFixed(1)} pp`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function EChartsFinanceBars({ projects }: { projects: PortfolioRow[] }) {
  const rows = projects.slice(0, 7);
  const option = useMemo<EChartsCoreOption>(() => ({
    animationDuration: 820,
    animationEasing: "cubicOut",
    grid: { top: 28, right: 36, bottom: 24, left: 90, containLabel: true },
    legend: {
      top: 0,
      right: 0,
      icon: "roundRect",
      itemHeight: 8,
      itemWidth: 18,
      textStyle: { color: "#5A6661", fontSize: 12 }
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      backgroundColor: "rgba(255,255,255,0.96)",
      borderColor: "rgba(207,213,206,0.95)",
      extraCssText: "box-shadow:0 18px 42px rgba(37,48,51,.16);border-radius:12px;padding:10px 12px;",
      valueFormatter: (value: unknown) => moneyShort(Number(value))
    },
    xAxis: {
      type: "value",
      axisLabel: { color: "#5A6661", formatter: (value: number) => moneyShort(value) },
      splitLine: { lineStyle: { color: "rgba(90,102,97,0.14)" } }
    },
    yAxis: {
      type: "category",
      data: rows.map((project) => project.code),
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: "#111719", fontWeight: 700 }
    },
    series: [
      {
        name: "Presupuesto",
        type: "bar",
        data: rows.map((project) => project.budget),
        itemStyle: { borderRadius: [0, 8, 8, 0], color: "#253033" }
      },
      {
        name: "Gastado",
        type: "bar",
        data: rows.map((project) => project.spent),
        itemStyle: { borderRadius: [0, 8, 8, 0], color: "#F2A900" }
      },
      {
        name: "Abonado",
        type: "bar",
        data: rows.map((project) => project.paid),
        itemStyle: { borderRadius: [0, 8, 8, 0], color: "#1F7A5B" }
      }
    ]
  }), [rows]);

  const ref = useEChart(option);

  if (rows.length === 0) {
    return <div className="rounded-lg border border-dashed border-[var(--border)] bg-white p-8 text-center text-sm text-[var(--muted)]">Sin datos financieros.</div>;
  }

  return <div className="min-h-[320px]" ref={ref} />;
}
