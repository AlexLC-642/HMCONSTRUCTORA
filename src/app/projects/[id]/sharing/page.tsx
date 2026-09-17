import {
	ArrowLeft,
	ExternalLink,
	Link2,
	RotateCcw,
	ShieldCheck,
	Unlink,
} from "lucide-react";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { requirePermission } from "@/modules/auth/application/authorization";
import {
	createPortalShareAction,
	revokePortalShareAction,
} from "@/modules/client-portal/application/actions";
import { getPortalShareStatus } from "@/modules/client-portal/application/service";
import { CopyPortalLinkButton } from "@/modules/client-portal/ui/copy-portal-link-button";
import { getProjectById } from "@/modules/projects/application/queries";

const dateFormatter = new Intl.DateTimeFormat("es-GT", {
	dateStyle: "medium",
	timeStyle: "short",
});

// Sin esto, Next.js puede tratar esta página como estática/cacheable en
// build (Railway) y servir el host leído en ese momento (normalmente
// "localhost" dentro del contenedor de build) hasta que algo la invalide -
// exactamente el bug reportado ("a veces sale localhost, se arregla al
// recargar"). headers() ya debería forzar render dinámico, pero se declara
// explícito para no depender de esa inferencia.
export const dynamic = "force-dynamic";

export default async function ProjectSharingPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const user = await requirePermission("proyectos.ver");
	const { id } = await params;
	const [project, portalShare] = await Promise.all([
		getProjectById(id),
		getPortalShareStatus(id),
	]);

	if (!project) notFound();

	const canManagePortal = user.permissions.includes("portal.gestionar");
	const createPortalAction = createPortalShareAction.bind(null, project.id);
	const revokePortalAction = revokePortalShareAction.bind(null, project.id);
	const requestHeaders = await headers();
	// x-forwarded-host es el que preserva el dominio público real detrás de un
	// proxy/CDN (Railway incluido) - "host" a veces llega reescrito al valor
	// interno del contenedor, que es de donde salía "localhost" en el enlace.
	const host =
		requestHeaders.get("x-forwarded-host") ??
		requestHeaders.get("host") ??
		"localhost:3000";
	const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
	const activePortalShare = portalShare?.token
		? { ...portalShare, token: portalShare.token }
		: null;
	const portalUrl = activePortalShare
		? `${protocol}://${host}/portal/${activePortalShare.token}`
		: "";

	return (
		<main className="mx-auto max-w-6xl space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold">Portal cliente</h1>
					<p className="text-sm text-[var(--muted)]">
						{project.code} - {project.name}
					</p>
				</div>
				<a
					className="focus-ring inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold shadow-sm"
					href={`/projects/${id}`}
				>
					<ArrowLeft aria-hidden="true" size={16} />
					Resumen
				</a>
			</div>

			<section className="overflow-hidden rounded-2xl border border-[#cfd5ce] bg-white shadow-[0_24px_70px_rgba(37,48,51,0.12)]">
				<div className="grid gap-6 bg-[linear-gradient(120deg,#ffffff_0%,#fbfaf6_58%,#fff1f2_100%)] p-6 lg:grid-cols-[1fr_360px]">
					<div>
						<span className="grid size-12 place-items-center rounded-xl bg-[#edf9f2] text-[var(--success)]">
							<ShieldCheck aria-hidden="true" size={22} />
						</span>
						<h2 className="mt-4 text-xl font-semibold">
							Enlace privado de solo lectura
						</h2>
						<p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
							Comparte este enlace con el cliente para consultar el portal del
							proyecto. El enlace permanece igual hasta que lo cambies o lo
							revoques.
						</p>

						{activePortalShare ? (
							<div className="mt-5 rounded-2xl border border-[#b7dfcc] bg-white p-4 shadow-[0_14px_34px_rgba(31,122,91,0.10)]">
								<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
									<span className="inline-flex items-center gap-2 rounded-full border border-[#b7dfcc] bg-[#edf9f2] px-3 py-1 text-xs font-semibold text-[var(--success)]">
										<Link2 aria-hidden="true" size={14} />
										Enlace activo
									</span>
									<span className="text-xs text-[var(--muted)]">
										Creado {dateFormatter.format(activePortalShare.createdAt)}
									</span>
								</div>
								<div className="grid gap-2 sm:grid-cols-[1fr_auto]">
									<input
										className="focus-ring h-11 min-w-0 rounded-md border border-[#cfd5ce] bg-[#fbfaf6] px-3 text-sm font-medium text-[#253033]"
										readOnly
										value={portalUrl}
									/>
									<CopyPortalLinkButton value={portalUrl} />
								</div>
								<a
									className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--success)] underline-offset-4 hover:underline"
									href={portalUrl}
									target="_blank"
									rel="noreferrer"
								>
									<ExternalLink aria-hidden="true" size={15} />
									Abrir portal
								</a>
							</div>
						) : (
							<div className="mt-5 rounded-2xl border border-[#e0d8cf] bg-white p-4 shadow-[0_14px_34px_rgba(37,48,51,0.08)]">
								<p className="text-sm font-semibold">
									{portalShare
										? "El portal esta activo, pero el enlace anterior no se puede mostrar."
										: "No hay enlace activo."}
								</p>
								<p className="mt-1 text-sm text-[var(--muted)]">
									{portalShare
										? "Genera un enlace nuevo una vez para dejarlo visible y reutilizable en esta pantalla."
										: "Genera el primer enlace para compartir el portal privado con el cliente."}
								</p>
							</div>
						)}
					</div>

					<aside className="rounded-2xl border border-[#d7d9d2] bg-white p-4 shadow-[0_14px_34px_rgba(37,48,51,0.08)]">
						<h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
							Acciones del enlace
						</h3>
						<div className="mt-4 grid gap-2">
							{canManagePortal ? (
								<form action={createPortalAction}>
									<button
										className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--brand-red)] px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(211,33,53,0.20)] transition hover:-translate-y-0.5 hover:bg-[#b91f2b]"
										type="submit"
									>
										<RotateCcw aria-hidden="true" size={16} />
										{portalShare ? "Cambiar enlace" : "Generar enlace"}
									</button>
								</form>
							) : null}
							{canManagePortal && portalShare ? (
								<form action={revokePortalAction}>
									<button
										className="focus-ring inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#cfd5ce] bg-white px-4 text-sm font-semibold shadow-sm hover:bg-[#fbfaf6]"
										type="submit"
									>
										<Unlink aria-hidden="true" size={16} />
										Revocar acceso
									</button>
								</form>
							) : null}
						</div>
						<div className="mt-5 space-y-3 text-sm text-[var(--muted)]">
							<p>
								<strong className="text-[#253033]">Copiar:</strong> comparte el
								mismo enlace vigente.
							</p>
							<p>
								<strong className="text-[#253033]">Cambiar enlace:</strong>{" "}
								invalida el anterior y crea uno nuevo.
							</p>
							<p>
								<strong className="text-[#253033]">Revocar:</strong> cierra el
								acceso al portal.
							</p>
						</div>
					</aside>
				</div>
			</section>
		</main>
	);
}
