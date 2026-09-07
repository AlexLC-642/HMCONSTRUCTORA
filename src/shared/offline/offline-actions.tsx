"use client";

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

export function OfflineActions() {
	const [checking, setChecking] = useState(false);
	const [failed, setFailed] = useState(false);

	const checkConnection = useCallback(async (showProgress = false) => {
		if (showProgress) {
			setChecking(true);
			setFailed(false);
		}

		try {
			const response = await fetch(`/sw.js?health=${Date.now()}`, {
				cache: "no-store",
			});
			if (!response.ok) throw new Error("Servicio no disponible");
			window.location.replace("/dashboard");
		} catch {
			if (showProgress) setFailed(true);
			setChecking(false);
		}
	}, []);

	useEffect(() => {
		const interval = window.setInterval(() => checkConnection(), 6000);
		return () => window.clearInterval(interval);
	}, [checkConnection]);

	return (
		<div>
			<button
				className="system-state-primary-action"
				disabled={checking}
				onClick={() => checkConnection(true)}
				type="button"
			>
				<RefreshCw
					aria-hidden="true"
					className={checking ? "animate-spin" : ""}
					size={18}
				/>
				{checking ? "Comprobando…" : "Reintentar ahora"}
			</button>
			{failed ? (
				<p className="system-state-retry-message" role="status">
					Aún no hay conexión. Seguiremos intentando.
				</p>
			) : null}
		</div>
	);
}
