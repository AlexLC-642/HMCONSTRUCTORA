import type { EChartsCoreOption } from "echarts/core";

// Legacy shape kept intact - inventory/progress/project charts still import
// hmChartColors.ink/.muted/.grid/.border/.concrete/.surface directly and are
// light-mode only for now. Only the dashboard charts have been migrated to
// the theme-aware tokens below; do the same for a module before assuming its
// charts already adapt to dark mode.
export const hmChartColors = {
	ink: "#171B1F",
	muted: "#5A6661",
	grid: "rgba(90,102,97,0.16)",
	border: "rgba(207,213,206,0.95)",
	red: "#D32135",
	// Original green (#1F7A5B) and amber (#F2A900) failed the dataviz-skill
	// validator (chroma floor / contrast vs surface) - these steps keep the
	// same hue identity but pass every check (validate_palette.js).
	green: "#178A5E",
	blue: "#2563EB",
	amber: "#C98500",
	violet: "#7C3AED",
	concrete: "#E7E9E3",
	surface: "#FFFFFF",
};

export type ChartTextTokens = {
	ink: string;
	muted: string;
	grid: string;
	border: string;
	surface: string;
	concrete: string;
};

const lightTokens: ChartTextTokens = {
	ink: hmChartColors.ink,
	muted: hmChartColors.muted,
	grid: hmChartColors.grid,
	border: hmChartColors.border,
	surface: hmChartColors.surface,
	concrete: hmChartColors.concrete,
};

// Mirrors the app's --foreground/--muted/--border/--surface dark values
// (src/app/globals.css). ECharts writes literal SVG fill/stroke attributes,
// which [data-theme="dark"] CSS cannot reach, so a chart that wants to
// survive dark mode must read the theme in JS and pass these explicitly
// (see useIsDarkMode in use-chart-theme.ts) instead of using hmChartColors
// directly for text/chrome.
const darkTokens: ChartTextTokens = {
	ink: "#EEF1EE",
	muted: "#A3AFA9",
	grid: "rgba(163,175,169,0.18)",
	border: "#2A353A",
	surface: "#182124",
	concrete: "#3A4A52",
};

export function chartTextTokens(isDark: boolean): ChartTextTokens {
	return isDark ? darkTokens : lightTokens;
}

export function chartTooltip(theme: ChartTextTokens = lightTokens, extra = "") {
	return {
		backgroundColor:
			theme === darkTokens ? "rgba(24,33,36,0.98)" : "rgba(255,255,255,0.98)",
		borderColor: theme.border,
		borderWidth: 1,
		confine: true,
		extraCssText: `box-shadow:0 20px 48px rgba(0,0,0,.28);border-radius:12px;padding:10px 12px;${extra}`,
		textStyle: { color: theme.ink, fontSize: 12 },
	};
}

// Real depth on the marks themselves (offset + blur), not just the card
// chrome around them - a soft-shadowed bar/slice reads as raised, a
// zero-offset colored halo would just be decoration.
export const markShadow = {
	shadowBlur: 14,
	shadowColor: "rgba(23,27,31,0.22)",
	shadowOffsetY: 6,
};

export const baseGrid = {
	top: 36,
	right: 28,
	bottom: 34,
	left: 48,
	containLabel: true,
};

export function noDataOption(
	message: string,
	theme: ChartTextTokens = lightTokens,
): EChartsCoreOption {
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
						fill: theme.muted,
						fontSize: 14,
						fontWeight: 600,
					},
				},
			],
		},
	};
}
