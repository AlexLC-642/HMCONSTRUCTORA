import localFont from "next/font/local";

// Self-hosted Barlow families for the public site, loaded through next/font so
// they are preloaded with the page instead of being discovered late in CSS.
// The condensed display face uses display "block": swapping from a wide
// fallback made the hero heading visibly jump in size on every reload.
export const hmDisplayFont = localFont({
	src: [
		{
			path: "../../../../public/fonts/barlow-condensed/BarlowCondensed-SemiBold.ttf",
			weight: "600",
		},
		{
			path: "../../../../public/fonts/barlow-condensed/BarlowCondensed-Bold.ttf",
			weight: "700",
		},
	],
	variable: "--font-hm-display",
	display: "block",
	fallback: ["Arial Narrow", "sans-serif"],
});

export const hmTextFont = localFont({
	src: [
		{
			path: "../../../../public/fonts/barlow/Barlow-Regular.ttf",
			weight: "400",
		},
		{
			path: "../../../../public/fonts/barlow/Barlow-Medium.ttf",
			weight: "500",
		},
		{
			path: "../../../../public/fonts/barlow/Barlow-SemiBold.ttf",
			weight: "600",
		},
	],
	variable: "--font-hm-text",
	display: "swap",
	fallback: ["Segoe UI", "system-ui", "sans-serif"],
});

export const publicFontVariables = `${hmDisplayFont.variable} ${hmTextFont.variable}`;
