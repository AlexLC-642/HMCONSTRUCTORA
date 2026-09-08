import type { NextConfig } from "next";

// Content-Security-Policy for this app.
//
// 'unsafe-inline' is kept for script-src and style-src as a deliberate,
// documented trade-off rather than an oversight:
//   - script-src: Next.js App Router injects inline <script> tags for RSC
//     hydration payloads on every page. Removing 'unsafe-inline' requires a
//     per-request nonce generated in proxy.ts, which in turn forces every
//     route (including the public marketing pages that are intentionally
//     static today) into dynamic rendering - a real performance/caching
//     regression for a low-traffic public site. No stored/reflected XSS was
//     found in this audit (no dangerouslySetInnerHTML, no innerHTML, no
//     eval in src/), so the residual risk this accepts is "if a future XSS
//     bug is introduced, an inline <script> payload would still execute" -
//     everything else below (object-src, base-uri, form-action,
//     frame-ancestors) still contains the blast radius of that scenario.
//   - style-src: this codebase uses React's inline `style={{...}}` prop
//     extensively (chart colors, dynamic tints, progress bars). CSP's
//     style-src governs inline style attributes the same as <style> blocks,
//     so blocking it without a large refactor would break real UI.
// Revisit both if the app ever moves fully to nonce-based CSP.
//
// 'unsafe-eval' is added to script-src ONLY in development: Next.js/Turbopack
// dev mode uses eval() for its own debugging tooling (reconstructing stack
// traces across the dev server boundary), and refuses to run without it -
// see https://nextjs.org/docs/messages/csp-eval. React itself never calls
// eval() in production, so the production CSP below stays eval-free.
const isDev = process.env.NODE_ENV === "development";
const cspDirectives = [
	"default-src 'self'",
	`script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' data: blob:",
	"font-src 'self'",
	"connect-src 'self'",
	"media-src 'self' blob:",
	"object-src 'none'",
	"base-uri 'self'",
	"form-action 'self'",
	"frame-ancestors 'none'",
	"upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
	{ key: "Content-Security-Policy", value: cspDirectives },
	{
		key: "Strict-Transport-Security",
		value: "max-age=63072000; includeSubDomains; preload",
	},
	{ key: "X-Content-Type-Options", value: "nosniff" },
	{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
	{
		key: "Permissions-Policy",
		value: "camera=(), microphone=(), geolocation=(), payment=()",
	},
	// Belt-and-suspenders alongside frame-ancestors in the CSP above: older
	// browsers that ignore frame-ancestors still respect X-Frame-Options.
	{ key: "X-Frame-Options", value: "DENY" },
];

const nextConfig: NextConfig = {
	typedRoutes: true,
	experimental: {
		useOffline: true,
	},
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: securityHeaders,
			},
			{
				source: "/sw.js",
				headers: [
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
				],
			},
		];
	},
	async redirects() {
		return [
			{ source: "/index.html", destination: "/", permanent: true },
			{ source: "/servicios.html", destination: "/servicios", permanent: true },
			{
				source: "/remodelaciones.html",
				destination: "/proyectos",
				permanent: true,
			},
			{ source: "/contacto.html", destination: "/contacto", permanent: true },
		];
	},
};

export default nextConfig;
