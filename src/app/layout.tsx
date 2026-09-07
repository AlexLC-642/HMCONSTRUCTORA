import type { Metadata, Viewport } from "next";
import Script from "next/script";
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

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" suppressHydrationWarning>
			<body suppressHydrationWarning>
				{children}
				<Script src="/theme-init.js" strategy="beforeInteractive" />
			</body>
		</html>
	);
}
