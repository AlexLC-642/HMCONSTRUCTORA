import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
	title: "Control de obra",
	description: "Sistema interno de gestión de proyectos",
	manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
	themeColor: "#1f6b4f",
	viewportFit: "cover",
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const savedTheme = (await cookies()).get("hm-theme")?.value;
	const theme = savedTheme === "dark" ? "dark" : "light";

	return (
		<html data-theme={theme} lang="es">
			<body>{children}</body>
		</html>
	);
}
