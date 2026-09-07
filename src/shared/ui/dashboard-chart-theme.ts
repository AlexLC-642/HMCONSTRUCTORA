export const dashboardChartTheme = {
  colors: {
    app: "#07111F",
    panel: "#101D2E",
    panelElevated: "#162438",
    border: "rgba(148, 163, 184, 0.16)",
    grid: "rgba(148, 163, 184, 0.14)",
    text: "#F8FAFC",
    muted: "#94A3B8",
    plan: "#22D3EE",
    actual: "#10B981",
    financial: "#8B5CF6",
    budget: "#3B82F6",
    spent: "#F59E0B",
    paid: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    neutral: "#CBD5E1"
  },
  motion: {
    fast: "160ms",
    normal: "260ms",
    slow: "720ms",
    easing: "cubic-bezier(0.16, 1, 0.3, 1)"
  }
};

export type DashboardAccent = "cyan" | "blue" | "emerald" | "amber" | "red" | "violet" | "slate";

export const dashboardAccents: Record<DashboardAccent, { color: string; soft: string; shadow: string }> = {
  cyan: { color: "#22D3EE", soft: "rgba(34, 211, 238, 0.14)", shadow: "rgba(34, 211, 238, 0.28)" },
  blue: { color: "#3B82F6", soft: "rgba(59, 130, 246, 0.14)", shadow: "rgba(59, 130, 246, 0.26)" },
  emerald: { color: "#10B981", soft: "rgba(16, 185, 129, 0.14)", shadow: "rgba(16, 185, 129, 0.26)" },
  amber: { color: "#F59E0B", soft: "rgba(245, 158, 11, 0.14)", shadow: "rgba(245, 158, 11, 0.24)" },
  red: { color: "#EF4444", soft: "rgba(239, 68, 68, 0.14)", shadow: "rgba(239, 68, 68, 0.24)" },
  violet: { color: "#8B5CF6", soft: "rgba(139, 92, 246, 0.14)", shadow: "rgba(139, 92, 246, 0.25)" },
  slate: { color: "#CBD5E1", soft: "rgba(203, 213, 225, 0.1)", shadow: "rgba(203, 213, 225, 0.18)" }
};
