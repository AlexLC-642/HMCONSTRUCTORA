"use client";

import { AlertTriangle, LayoutDashboard, RefreshCw } from "lucide-react";
import { useEffect, useTransition } from "react";

type SystemErrorStateProps = {
	error: Error & { digest?: string };
	reset: () => void;
};

export function SystemErrorState({ error, reset }: SystemErrorStateProps) {
	const [pending, startTransition] = useTransition();

	useEffect(() => {
		console.error(error);
	}, [error]);

	function retry() {
		startTransition(() => reset());
	}

	return (
		<main className="system-state-page system-state-page--embedded">
			<section className="system-state-card" aria-labelledby="error-title">
				<div className="system-state-accent" aria-hidden="true" />
				<div className="system-state-icon system-state-icon--red">
					<AlertTriangle aria-hidden="true" size={30} strokeWidth={1.8} />
				</div>
				<h1 id="error-title">No pudimos cargar esta sección</h1>
				<p className="system-state-description">
					Puede ser una interrupción temporal del servicio. Tus datos guardados
					no fueron modificados.
				</p>
				<div className="system-state-actions">
					<button
						className="system-state-primary-action"
						disabled={pending}
						onClick={retry}
						type="button"
					>
						<RefreshCw
							aria-hidden="true"
							className={pending ? "animate-spin" : ""}
							size={18}
						/>
						{pending ? "Reintentando…" : "Intentar de nuevo"}
					</button>
					<a className="system-state-secondary-action" href="/dashboard">
						<LayoutDashboard aria-hidden="true" size={18} /> Ir al tablero
					</a>
				</div>
				{error.digest ? (
					<p className="system-state-footnote">Referencia: {error.digest}</p>
				) : null}
			</section>
		</main>
	);
}
