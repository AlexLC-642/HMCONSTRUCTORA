"use client";

import { useOffline } from "next/offline";
import { useEffect, useState } from "react";

export function PwaRuntime() {
	const [online, setOnline] = useState(true);
	const requestIsOffline = useOffline();

	useEffect(() => {
		setOnline(navigator.onLine);
		const updateOnline = () => setOnline(true);
		const updateOffline = () => setOnline(false);
		window.addEventListener("online", updateOnline);
		window.addEventListener("offline", updateOffline);

		if ("serviceWorker" in navigator) {
			if (process.env.NODE_ENV === "production") {
				navigator.serviceWorker
					.register("/sw.js", { updateViaCache: "none" })
					.then((registration) => registration.update())
					.catch(() => undefined);
			} else {
				// En "npm run dev" los nombres de los archivos compilados cambian en
				// cada recarga (HMR/Turbopack), así que un service worker cacheando
				// esos archivos sirve versiones viejas o rutas que ya no existen -
				// Next.js mismo advierte que el modo dev no sirve para probar esta
				// función. Se desregistra cualquier worker de una sesión anterior
				// para que el desarrollo local no quede con caché atascada.
				navigator.serviceWorker
					.getRegistrations()
					.then((registrations) => {
						for (const registration of registrations) registration.unregister();
					})
					.catch(() => undefined);
			}
		}

		return () => {
			window.removeEventListener("online", updateOnline);
			window.removeEventListener("offline", updateOffline);
		};
	}, []);

	const disconnected = !online || requestIsOffline;

	return (
		<span
			className={`pwa-status inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${disconnected ? "border-amber-200 bg-amber-50 text-amber-900" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`}
			role="status"
			title={disconnected ? "Sin conexión al servicio" : "En línea"}
		>
			<span aria-hidden="true" className="pwa-status__dot" />
			<span className="pwa-status__label">
				{disconnected ? "Sin conexión" : "En línea"}
			</span>
		</span>
	);
}
