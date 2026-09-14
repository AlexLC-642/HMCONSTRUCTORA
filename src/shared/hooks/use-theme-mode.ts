"use client";

import { useEffect, useState } from "react";

function readTheme(): "light" | "dark" {
	if (typeof document === "undefined") return "light";
	return document.documentElement.getAttribute("data-theme") === "dark"
		? "dark"
		: "light";
}

/**
 * Canvas-based charts (ECharts) can't read CSS custom properties, so their
 * colors have to be literal hex picked in JS. This tracks the current
 * light/dark mode (set by ThemeToggle as a data-theme attribute) so a chart
 * can pick the matching palette and re-render when the user toggles theme.
 */
export function useThemeMode(): "light" | "dark" {
	const [mode, setMode] = useState<"light" | "dark">(readTheme);

	useEffect(() => {
		setMode(readTheme());
		const observer = new MutationObserver(() => setMode(readTheme()));
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => observer.disconnect();
	}, []);

	return mode;
}
