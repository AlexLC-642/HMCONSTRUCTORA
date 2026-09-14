"use client";

import {
	Calendar,
	Download,
	FileText,
	FolderKanban,
	Tag,
	User,
	X,
} from "lucide-react";
import type { DocumentPreviewData } from "@/modules/documents/application/queries";
import { documentFileUrl } from "@/modules/documents/domain/catalog";
import { ZoomableImage } from "./zoomable-image";

interface DocumentPreviewModalProps {
	document: DocumentPreviewData;
	closeHref?: string;
	onClose?: () => void;
	variant?: "default" | "receipt";
	// The project card repeats info already visible on the page (breadcrumb,
	// hero) when this modal opens from a project-scoped documents view -
	// callers with that context pass false to avoid the duplication.
	showProjectCard?: boolean;
}

function formatBytes(value: number) {
	if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
	if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
	return `${value} B`;
}

const statusLabels: Record<string, string> = {
	DRAFT: "Borrador",
	REVIEW: "En revisión",
	APPROVED: "Aprobado",
	ARCHIVED: "Archivado",
};

function statusClass(status: string) {
	if (status === "APPROVED")
		return "border-[#b7dfcc] bg-[#edf9f2] text-[var(--success)]";
	if (status === "REVIEW")
		return "border-[#f2d28f] bg-[#fff8e8] text-[var(--warning)]";
	if (status === "ARCHIVED")
		return "border-[#d8d7d2] bg-[#f4f0ed] text-[var(--muted)]";
	return "border-[#d8d7d2] bg-white text-[var(--foreground)]";
}

export function DocumentPreviewModal({
	document,
	closeHref,
	onClose,
	variant = "default",
	showProjectCard = true,
}: DocumentPreviewModalProps) {
	const safeVersion = document.version;
	const tagsList = document.tags
		? document.tags
				.split(",")
				.map((tag) => tag.trim())
				.filter(Boolean)
		: [];

	const isImage = safeVersion
		? safeVersion.mimeType.startsWith("image/")
		: false;
	const isVideo = safeVersion
		? safeVersion.mimeType.startsWith("video/")
		: false;
	const isPdf =
		!!safeVersion &&
		(safeVersion.mimeType === "application/pdf" ||
			safeVersion.originalName.toLowerCase().endsWith(".pdf"));
	const isPortalVisible =
		document.status === "APPROVED" && document.portalVisible;

	return (
		<div className="documents-preview-backdrop">
			<section
				className={`documents-preview-modal ${variant === "receipt" ? "documents-preview-modal--receipt" : ""}`}
			>
				<div className="flex min-h-0 flex-1 flex-col bg-[#e9ede9]">
					<header className="flex items-center justify-between gap-3 border-b border-[#dfe3dc] bg-white px-4 py-3 xl:hidden">
						<h2 className="min-w-0 truncate text-base font-semibold">
							{document.title}
						</h2>
						{onClose ? (
							<button
								aria-label="Cerrar vista previa"
								className="grid h-10 w-10 place-items-center rounded-lg border border-[#cfd5ce] bg-white hover:bg-[#f4f0ed]"
								onClick={onClose}
								type="button"
							>
								<X aria-hidden="true" size={18} />
							</button>
						) : (
							<a
								aria-label="Cerrar vista previa"
								className="grid h-10 w-10 place-items-center rounded-lg border border-[#cfd5ce] bg-white hover:bg-[#f4f0ed]"
								href={closeHref}
							>
								<X aria-hidden="true" size={18} />
							</a>
						)}
					</header>

					<div className="grid min-h-0 flex-1 place-items-center p-4">
						{!safeVersion ? (
							<div className="flex max-w-md flex-col items-center rounded-2xl border border-[#dfe3dc] bg-white p-8 text-center shadow-sm">
								<div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f4f0ed] text-[var(--muted)]">
									<FileText size={32} />
								</div>
								<h3 className="text-base font-semibold text-[var(--foreground)]">
									No hay archivo disponible para este documento.
								</h3>
								<p className="mt-2 text-xs text-[var(--muted)]">
									Este registro no tiene una versión válida asociada para
									previsualizar.
								</p>
							</div>
						) : isImage ? (
							<div className="relative h-full w-full overflow-hidden rounded-xl border border-[#dfe3dc] bg-[#f3f5f3] p-3">
								<ZoomableImage
									alt={document.title}
									src={documentFileUrl(safeVersion.id)}
								/>
							</div>
						) : isVideo ? (
							<div className="flex h-full w-full items-center justify-center rounded-xl border border-[#dfe3dc] bg-[#0f1720] p-3">
								<video
									className="max-h-full max-w-full rounded-lg bg-black"
									controls
									src={documentFileUrl(safeVersion.id)}
								>
									<track kind="captions" />
								</video>
							</div>
						) : isPdf ? (
							<iframe
								className="h-full w-full rounded-xl border border-[#dfe3dc] bg-white"
								src={documentFileUrl(safeVersion.id)}
								title={document.title}
							/>
						) : (
							<div className="flex max-w-md flex-col items-center rounded-2xl border border-[#dfe3dc] bg-white p-8 text-center shadow-sm">
								<div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[#f4f0ed] text-[var(--muted)]">
									<FileText size={32} />
								</div>
								<h3 className="text-base font-semibold text-[var(--foreground)]">
									{safeVersion.originalName}
								</h3>
								<p className="mt-2 text-xs text-[var(--muted)]">
									Vista previa no disponible para este tipo de archivo.
								</p>
								<p className="mt-1 text-xs text-[var(--muted)]">
									{safeVersion.mimeType || "Formato desconocido"} ·{" "}
									{formatBytes(safeVersion.fileSize)}
								</p>
								<a
									className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-red)] px-5 text-sm font-semibold text-white hover:bg-[#b51d2a]"
									download
									href={documentFileUrl(safeVersion.id)}
								>
									<Download size={16} />
									Descargar
								</a>
							</div>
						)}
					</div>
				</div>

				<aside className="flex h-full w-full flex-col border-t border-[#cfd5ce] bg-white xl:border-l xl:border-t-0">
					<header className="documents-preview-header hidden items-center justify-between px-5 py-4 xl:flex">
						<div className="min-w-0">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-[#bfc9c5]">
								Vista del documento
							</span>
							<h2
								className="truncate text-lg font-bold text-white"
								title={document.title}
							>
								{document.title}
							</h2>
						</div>
						{onClose ? (
							<button
								aria-label="Cerrar vista previa"
								className="documents-upload-close focus-ring"
								onClick={onClose}
								type="button"
							>
								<X aria-hidden="true" size={16} />
							</button>
						) : (
							<a
								aria-label="Cerrar vista previa"
								className="documents-upload-close focus-ring"
								href={closeHref}
							>
								<X aria-hidden="true" size={16} />
							</a>
						)}
					</header>

					<div className="flex-1 space-y-5 overflow-y-auto p-5">
						{showProjectCard ? (
							<div className="rounded-xl border border-[#dfe3dc] bg-[#fbfbf8] p-3">
								<div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
									<FolderKanban size={14} />
									Proyecto
								</div>
								<p className="mt-2 text-sm font-bold text-[var(--foreground)]">
									{document.project.code}
								</p>
								<p className="text-xs text-[var(--muted)]">
									{document.project.name}
								</p>
							</div>
						) : null}

						<div className="space-y-3">
							<div className="grid grid-cols-2 gap-4 border-b border-[var(--border)] pb-3">
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
										Categoría
									</p>
									<p className="mt-1 text-sm font-medium text-[var(--foreground)]">
										{document.category.name}
									</p>
								</div>
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
										Estado
									</p>
									<span
										className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass(document.status)}`}
									>
										{statusLabels[document.status] ?? document.status}
									</span>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 border-b border-[var(--border)] pb-3">
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
										Versión
									</p>
									<p className="mt-1 text-sm font-medium text-[var(--foreground)]">
										{safeVersion
											? `v${safeVersion.versionNumber}`
											: "Sin versión"}
									</p>
								</div>
								<div>
									<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
										Visibilidad
									</p>
									<div className="mt-1">
										{isPortalVisible ? (
											<span className="inline-flex rounded-full border border-[#b7dfcc] bg-[#edf9f2] px-2 py-0.5 text-[10px] font-semibold text-[var(--success)]">
												Visible al cliente
											</span>
										) : (
											<span className="inline-flex rounded-full border border-[#d8d7d2] bg-[#f4f0ed] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]">
												Interno
											</span>
										)}
									</div>
								</div>
							</div>

							<div className="grid grid-cols-2 gap-4 border-b border-[var(--border)] pb-3">
								<div>
									<p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
										<Calendar size={12} />
										Fecha
									</p>
									<p className="mt-1 text-xs text-[var(--foreground)]">
										{safeVersion
											? new Date(safeVersion.createdAt).toLocaleDateString(
													"es-GT",
													{ dateStyle: "medium" },
												)
											: "—"}
									</p>
								</div>
								<div>
									<p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
										<User size={12} />
										Autor
									</p>
									<p className="mt-1 text-xs text-[var(--foreground)]">
										{document.author?.name ??
											safeVersion?.uploadedBy?.name ??
											"Desconocido"}
									</p>
								</div>
							</div>
						</div>

						{document.description ? (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
									Descripción
								</p>
								<p className="mt-2 rounded-lg border border-[#dfe3dc] bg-[#fbfbf8] p-2.5 text-xs leading-relaxed text-[var(--muted)]">
									{document.description}
								</p>
							</div>
						) : null}

						{tagsList.length > 0 ? (
							<div>
								<p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
									<Tag size={12} />
									Etiquetas
								</p>
								<div className="mt-2 flex flex-wrap gap-1.5">
									{tagsList.map((tag) => (
										<span
											className="rounded-full bg-[#f0f3f8] px-2 py-0.5 text-[10px] font-semibold text-[var(--muted)]"
											key={tag}
										>
											{tag}
										</span>
									))}
								</div>
							</div>
						) : null}

						{safeVersion?.notes ? (
							<div>
								<p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
									Notas
								</p>
								<p className="mt-2 rounded-lg border border-[#dfe3dc] bg-[#fbfbf8] p-2.5 text-xs leading-relaxed text-[var(--muted)]">
									{safeVersion.notes}
								</p>
							</div>
						) : null}
					</div>

					<footer className="flex items-center justify-between gap-3 border-t border-[#dfe3dc] bg-white px-4 py-3">
						{safeVersion ? (
							<a
								className="documents-secondary-action focus-ring"
								download
								href={documentFileUrl(safeVersion.id)}
							>
								<Download size={16} />
								Descargar
							</a>
						) : (
							<span className="text-sm text-[var(--muted)]">Sin archivo</span>
						)}
						{onClose ? (
							<button
								className="documents-primary-action focus-ring"
								onClick={onClose}
								type="button"
							>
								Cerrar
							</button>
						) : (
							<a
								className="documents-primary-action focus-ring"
								href={closeHref}
							>
								Cerrar
							</a>
						)}
					</footer>
				</aside>
			</section>
		</div>
	);
}
