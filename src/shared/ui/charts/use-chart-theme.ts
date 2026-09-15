"use client";

import { useEffect, useState } from "react";

function readIsDark() {
	if (typeof document === "undefined") return false;
	const explicit = document.documentElement.getAttribute("data-theme");
	if (explicit === "dark") return true;
	if (explicit === "light") return false;
	return (
		typeof window !== "undefined" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
	);
}

// ECharts renders text as literal SVG fill attributes, not CSS custom
// properties - the app's [data-theme] dark-mode CSS can't reach inside the
// canvas, so chart components must read the theme in JS and pick the right
// hex themselves instead of hardcoding light-mode values.
export function useIsDarkMode() {
	const [isDark, setIsDark] = useState(readIsDark);

	useEffect(() => {
		const update = () => setIsDark(readIsDark());
		const media = window.matchMedia("(prefers-color-scheme: dark)");
		media.addEventListener("change", update);
		const observer = new MutationObserver(update);
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});
		return () => {
			media.removeEventListener("change", update);
			observer.disconnect();
		};
	}, []);

	return isDark;
}
