"use client";

import { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart } from "@/shared/ui/charts/e-chart";
import { baseGrid, chartTooltip, hmChartColors, noDataOption } from "@/shared/ui/charts/chart-theme";
import { percent } from "@/shared/ui/charts/format";

export type ProjectTimelinePoint = {
  label: string;
  planned: number | null;
  real: number | null;
  financial: number | null;
};

export type BudgetProgressPoint = {
  code: string;
  name: string;
  budget: number;
  progress: number;
};

export function ProjectSCurveChart({ points, hasPlanning }: { points: ProjectTimelinePoint[]; hasPlanning: boolean }) {
  const option = useMemo<EChartsCoreOption>(() => {
    if (!hasPlanning || points.length === 0) {
      return noDataOption("Crea o revisa el cronograma para activar la Curva S.");
    }

    return {
      animationDuration: 650,
      color: [hmChartColors.green, hmChartColors.blue, hmChartColors.violet],
      grid: { ...baseGrid, left: 46, right: 24, bottom: 38, top: 28 },
      tooltip: {
        ...chartTooltip(),
        trigger: "axis",
        valueFormatter: (value: unknown) => (value == null ? "Sin datos" : percent(Number(value)))
      },
      legend: {
        bottom: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { color: hmChartColors.muted, fontSize: 12 }
      },
      xAxis: {
        type: "category",
        data: points.map((point) => point.label),
        axisTick: { show: false },
        axisLine: { lineStyle: { color: hmChartColors.border } },
        axisLabel: { color: hmChartColors.muted, fontSize: 11 }
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        interval: 25,
        axisLabel: { color: hmChartColors.muted, formatter: "{value}%" },
        splitLine: { lineStyle: { color: hmChartColors.grid } }
      },
      series: [
        {
          name: "Avance real",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          data: points.map((point) => point.real),
          areaStyle: {
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(31,122,91,0.22)" },
                { offset: 1, color: "rgba(31,122,91,0.02)" }
              ]
            }
          },
          lineStyle: { width: 3 }
        },
        {
          name: "Planificado",
          type: "line",
          smooth: true,
          symbol: "none",
          data: points.map((point) => point.planned),
          lineStyle: { width: 2, type: "dashed" }
        },
        {
          name: "Financiero",
          type: "line",
          smooth: true,
          symbol: "none",
          data: points.map((point) => point.financial),
          lineStyle: { width: 2 }
        }
      ]
    };
  }, [hasPlanning, points]);

  return <EChart className="h-[330px] w-full" option={option} />;
}

export function BudgetProgressChart({ items }: { items: BudgetProgressPoint[] }) {
  const option = useMemo<EChartsCoreOption>(() => {
    if (items.length === 0) return noDataOption("Sin renglones de presupuesto para comparar.");

    return {
      animationDuration: 500,
      color: [hmChartColors.green, hmChartColors.concrete],
      grid: { ...baseGrid, left: 112, right: 28, top: 16, bottom: 18 },
      tooltip: {
        ...chartTooltip(),
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const rows = Array.isArray(params) ? params : [];
          return rows
            .map((row) => {
              const item = row as { seriesName?: string; value?: number; marker?: string };
              const value = item.seriesName === "Avance" ? percent(Number(item.value ?? 0)) : `Q ${Number(item.value ?? 0).toLocaleString("es-GT")}`;
              return `<div style="display:flex;gap:18px;justify-content:space-between">${item.marker ?? ""}<span>${item.seriesName}</span><strong>${value}</strong></div>`;
            })
            .join("");
        }
      },
      xAxis: [
        {
          type: "value",
          max: 100,
          axisLabel: { color: hmChartColors.muted, formatter: "{value}%" },
          splitLine: { lineStyle: { color: hmChartColors.grid } }
        }
      ],
      yAxis: [
        {
          type: "category",
          data: items.map((item) => item.code),
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: { color: hmChartColors.ink, fontWeight: 700 }
        }
      ],
      series: [
        {
          name: "Avance",
          type: "bar",
          barWidth: 18,
          data: items.map((item) => item.progress),
          itemStyle: { borderRadius: [0, 10, 10, 0] },
          label: {
            show: true,
            position: "right",
            formatter: ({ value }: { value: number }) => percent(Number(value)),
            color: hmChartColors.ink,
            fontWeight: 700
          }
        }
      ]
    };
  }, [items]);

  return <EChart className="h-[280px] w-full" option={option} />;
}
