import { Download, FileText, X } from "lucide-react";
import { ZoomableImage } from "@/modules/documents/ui/zoomable-image";

type PortalPreviewVersion = {
	id: string;
	originalName: string;
	mimeType: string;
	fileSize: number;
	publicUrl: string;
};

type Props = {
	title: string;
	categoryName: string;
	version: PortalPreviewVersion | null;
	closeHref: string;
};

function formatBytes(value: number) {
	if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
	if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
	return `${value} B`;
}

// Server-renderable (no client state of its own) - only ZoomableImage inside
// needs to be a client component. Mirrors the internal DocumentPreviewModal's
// type-based branching (image/video/pdf/fallback), simplified for the
// read-only client view: no edit/approve actions, just view + download.
export function PortalDocumentPreviewModal({
	title,
	categoryName,
	version,
	closeHref,
}: Props) {
	const isImage = version?.mimeType.startsWith("image/") ?? false;
	const isVideo = version?.mimeType.startsWith("video/") ?? false;
	const isPdf =
		!!version &&
		(version.mimeType === "application/pdf" ||
			version.originalName.toLowerCase().endsWith(".pdf"));

	return (
		<div className="fixed inset-0 z-[70] flex flex-col bg-[#0d1314]/70 backdrop-blur-sm">
			<header className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#101718]/90 px-5 py-3.5">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-white">{title}</p>
					<p className="text-xs text-[#9fada7]">{categoryName}</p>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					{version ? (
						<a
							aria-label="Descargar"
							className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 text-xs font-semibold text-white transition hover:bg-white/20"
							download
							href={version.publicUrl}
						>
							<Download aria-hidden="true" size={14} />
							Descargar
						</a>
					) : null}
					<a
						aria-label="Cerrar vista previa"
						className="grid size-9 place-items-center rounded-lg border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
						href={closeHref}
					>
						<X aria-hidden="true" size={16} />
					</a>
				</div>
			</header>

			<div className="grid min-h-0 flex-1 place-items-center p-4">
				{!version ? (
					<PortalPreviewFallback
						detail="Este documento no tiene un archivo disponible para previsualizar."
						title="Sin archivo disponible"
					/>
				) : isImage ? (
					<div className="relative h-full w-full overflow-hidden rounded-xl bg-[#171f21]">
						<ZoomableImage alt={title} src={version.publicUrl} />
					</div>
				) : isVideo ? (
					<div className="flex h-full w-full items-center justify-center rounded-xl bg-black p-3">
						<video
							className="max-h-full max-w-full rounded-lg bg-black"
							controls
							src={version.publicUrl}
						>
							<track kind="captions" />
						</video>
					</div>
				) : isPdf ? (
					<iframe
						className="h-full w-full rounded-xl border-0 bg-white"
						src={version.publicUrl}
						title={title}
					/>
				) : (
					<PortalPreviewFallback
						detail={`${version.mimeType || "Formato desconocido"} - ${formatBytes(version.fileSize)}`}
						downloadHref={version.publicUrl}
						title={version.originalName}
					/>
				)}
			</div>
		</div>
	);
}

function PortalPreviewFallback({
	title,
	detail,
	downloadHref,
}: {
	title: string;
	detail: string;
	downloadHref?: string;
}) {
	return (
		<div className="flex max-w-md flex-col items-center rounded-2xl border border-white/10 bg-[#171f21] p-8 text-center">
			<div className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-white/10 text-[#c7d1cc]">
				<FileText size={32} />
			</div>
			<h3 className="text-base font-semibold text-white">{title}</h3>
			<p className="mt-2 text-xs text-[#9fada7]">{detail}</p>
			{downloadHref ? (
				<a
					className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--brand-red)] px-5 text-sm font-semibold text-white hover:bg-[#b51d2a]"
					download
					href={downloadHref}
				>
					<Download size={16} />
					Descargar
				</a>
			) : null}
		</div>
	);
}
