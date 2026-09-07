import { FileQuestion, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
	return (
		<main className="system-state-page">
			<section className="system-state-card" aria-labelledby="not-found-title">
				<div className="system-state-accent" aria-hidden="true" />
				<div className="system-state-icon system-state-icon--steel">
					<FileQuestion aria-hidden="true" size={30} strokeWidth={1.8} />
				</div>
				<p className="system-state-code">404</p>
				<h1 id="not-found-title">Esta página no está disponible</h1>
				<p className="system-state-description">
					El enlace puede estar incompleto o el contenido pudo cambiar de
					ubicación.
				</p>
				<div className="system-state-actions">
					<Link className="system-state-primary-action" href="/dashboard">
						<LayoutDashboard aria-hidden="true" size={18} /> Ir al tablero
					</Link>
				</div>
			</section>
		</main>
	);
}
