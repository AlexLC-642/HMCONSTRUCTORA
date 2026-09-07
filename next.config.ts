import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	experimental: {
		useOffline: true,
	},
	async headers() {
		return [
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
