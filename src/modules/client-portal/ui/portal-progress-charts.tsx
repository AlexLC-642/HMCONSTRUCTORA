"use client";

import { motion } from "motion/react";
import type { EChartsCoreOption } from "echarts/core";
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
  color: string;
};

type PortalProgressChartsProps = {
  progress: number;
  previousAverage: number;
  dailyAdvance: number;
  activities: ActivityPoint[];
  statuses: StatusPoint[];
};

const text = "#111719";
const muted = "#5b6764";
const grid = "#dde3dc";
const green = "#1f7a5a";
const red = "#d01f35";
const amber = "#f2b600";
const blue = "#2563eb";

function pct(value: number) {
  return `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
}

export function PortalProgressCharts({ activities, dailyAdvance, previousAverage, progress, statuses }: PortalProgressChartsProps) {
  const activityNames = activities.map((activity) => activity.name);
  const hasActivities = activities.length > 0;

  const curveOption: EChartsCoreOption = {
    color: [green, blue, red],
    tooltip: { trigger: "axis", valueFormatter: (value: unknown) => pct(Number(value)) },
    grid: { left: 36, right: 18, top: 26, bottom: 34 },
    xAxis: {
      type: "category",
      data: hasActivities ? activityNames : ["Inicio", "Hoy"],
      axisTick: { show: false },
      axisLine: { lineStyle: { color: grid } },
      axisLabel: { color: muted, fontSize: 11, interval: 0, overflow: "truncate", width: 92 }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: muted, formatter: "{value}%" },
      splitLine: { lineStyle: { color: grid } }
    },
    series: [
      {
        name: "Avance actual",
        type: "line",
        smooth: true,
        symbolSize: 8,
        areaStyle: { color: "rgba(31, 122, 90, 0.14)" },
        lineStyle: { width: 3, color: green },
        data: hasActivities ? activities.map((activity) => activity.current) : [previousAverage, progress]
      },
      {
        name: "Base anterior",
        type: "line",
        smooth: true,
        symbolSize: 6,
        lineStyle: { width: 2, color: blue, type: "dashed" },
        data: hasActivities ? activities.map((activity) => activity.previous) : [previousAverage, previousAverage]
      }
    ]
  };

  const activityOption: EChartsCoreOption = {
    color: [green, amber],
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
    legend: { bottom: 0, textStyle: { color: muted } },
    grid: { left: 118, right: 18, top: 10, bottom: 40 },
    xAxis: {
      type: "value",
      min: 0,
      max: 100,
      axisLabel: { color: muted, formatter: "{value}%" },
      splitLine: { lineStyle: { color: grid } }
    },
    yAxis: {
      type: "category",
      data: activityNames,
      axisTick: { show: false },
      axisLine: { show: false },
      axisLabel: { color: text, fontWeight: 700, overflow: "truncate", width: 110 }
    },
    series: [
      {
        name: "Acumulado",
        type: "bar",
        barWidth: 12,
        data: activities.map((activity) => activity.current),
        itemStyle: { borderRadius: [0, 8, 8, 0] }
      },
      {
        name: "Hoy",
        type: "bar",
        barWidth: 8,
        data: activities.map((activity) => activity.today),
        itemStyle: { borderRadius: [0, 8, 8, 0] }
      }
    ]
  };

  const statusOption: EChartsCoreOption = {
    tooltip: { trigger: "item" },
    legend: { orient: "vertical", right: 0, top: "center", textStyle: { color: muted } },
    series: [
      {
        name: "Estado",
        type: "pie",
        radius: ["56%", "76%"],
        center: ["34%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: statuses.map((status) => ({ name: status.name, value: status.value, itemStyle: { color: status.color } }))
      }
    ],
    graphic: [
      {
        type: "text",
        left: "25%",
        top: "44%",
        style: { text: pct(progress), fill: text, fontSize: 26, fontWeight: 800, textAlign: "center" }
      }
    ]
  };

  return (
    <div className="portal-chart-grid">
      <motion.article className="portal-chart-card portal-chart-card-wide" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <div className="portal-chart-head">
          <div>
            <h3>Curva de avance</h3>
            <p>Lectura del avance reportado contra la base anterior.</p>
          </div>
          <span>{pct(dailyAdvance)} hoy</span>
        </div>
        <EChart className="h-[260px] w-full" option={curveOption} />
      </motion.article>

      <motion.article className="portal-chart-card" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.04 }}>
        <div className="portal-chart-head">
          <div>
            <h3>Estado del frente</h3>
            <p>Distribucion de actividades del ultimo informe.</p>
          </div>
        </div>
        <EChart className="h-[260px] w-full" option={statusOption} />
      </motion.article>

      {hasActivities ? (
        <motion.article className="portal-chart-card portal-chart-card-wide" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, delay: 0.08 }}>
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
