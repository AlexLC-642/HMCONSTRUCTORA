import type { EChartsCoreOption } from "echarts/core";

export const hmChartColors = {
  ink: "#171B1F",
  muted: "#5A6661",
  grid: "rgba(90,102,97,0.16)",
  border: "rgba(207,213,206,0.95)",
  red: "#D32135",
  green: "#1F7A5B",
  blue: "#2563EB",
  amber: "#F2A900",
  violet: "#7C3AED",
  concrete: "#E7E9E3",
  surface: "#FFFFFF"
};

export function chartTooltip(extra = "") {
  return {
    backgroundColor: "rgba(255,255,255,0.98)",
    borderColor: hmChartColors.border,
    borderWidth: 1,
    confine: true,
    extraCssText: `box-shadow:0 20px 48px rgba(37,48,51,.16);border-radius:12px;padding:10px 12px;${extra}`,
    textStyle: { color: hmChartColors.ink, fontSize: 12 }
  };
}

export const baseGrid = {
  top: 36,
  right: 28,
  bottom: 34,
  left: 48,
  containLabel: true
};

export function noDataOption(message: string): EChartsCoreOption {
  return {
    graphic: {
      type: "group",
      left: "center",
      top: "middle",
      children: [
        {
          type: "text",
          style: {
            text: message,
            fill: hmChartColors.muted,
            fontSize: 14,
            fontWeight: 600
          }
        }
      ]
    }
  };
}
