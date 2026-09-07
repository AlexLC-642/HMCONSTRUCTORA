"use client";

import { useEffect, useRef } from "react";
import * as echarts from "echarts/core";
import { BarChart, LineChart, PieChart } from "echarts/charts";
import { DataZoomComponent, GraphicComponent, GridComponent, LegendComponent, MarkLineComponent, TooltipComponent } from "echarts/components";
import { SVGRenderer } from "echarts/renderers";
import type { ECharts, EChartsCoreOption } from "echarts/core";

echarts.use([
  BarChart,
  DataZoomComponent,
  GraphicComponent,
  GridComponent,
  LegendComponent,
  LineChart,
  MarkLineComponent,
  PieChart,
  SVGRenderer,
  TooltipComponent
]);

type EChartProps = {
  option: EChartsCoreOption;
  className?: string;
  onChartClick?: (params: unknown) => void;
};

export function EChart({ option, className = "h-[320px] w-full", onChartClick }: EChartProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const clickRef = useRef(onChartClick);

  useEffect(() => {
    clickRef.current = onChartClick;
  }, [onChartClick]);

  useEffect(() => {
    if (!nodeRef.current || chartRef.current) return;

    chartRef.current = echarts.init(nodeRef.current, undefined, { renderer: "svg" });
    const observer = new ResizeObserver(() => chartRef.current?.resize());
    observer.observe(nodeRef.current);

    const handleClick = (params: unknown) => clickRef.current?.(params);
    chartRef.current.on("click", handleClick);

    return () => {
      observer.disconnect();
      chartRef.current?.off("click", handleClick);
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true, lazyUpdate: true });
  }, [option]);

  return <div aria-hidden="true" className={className} ref={nodeRef} />;
}
