"use client";

import { Clock, Download, FileUp, History, User, X } from "lucide-react";
import { useState } from "react";
import { documentInputClass } from "./document-ui";

type AddVersionAction = (formData: FormData) => Promise<void>;

type VersionRow = {
	id: string;
	versionNumber: number;
	originalName: string;
	fileSize: number;
	createdAt: string;
	notes: string | null;
	uploadedBy?: { name: string } | null;
	downloadHref: string;
};

type Props = {
	action: AddVersionAction;
	closeHref: string;
	documentTitle: string;
	versions: VersionRow[];
	canAddVersion: boolean;
};

const dateFormatter = new Intl.DateTimeFormat("es-GT", {
	dateStyle: "medium",
	timeStyle: "short",
});

function formatBytes(value: number) {
	if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
	if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
	return `${value} B`;
}

export function DocumentVersionsDrawer({
	action,
	closeHref,
	documentTitle,
	versions,
	canAddVersion,
}: Props) {
	const [fileName, setFileName] = useState("");
	const [pending, setPending] = useState(false);

	return (
		<div className="documents-upload-backdrop">
			<a
				aria-label="Cerrar historial"
				className="absolute inset-0"
				href={closeHref}
			>
				<span className="sr-only">Cerrar historial</span>
			</a>
			<section
				aria-labelledby="versions-dialog-title"
				aria-modal="true"
				className="documents-upload-modal"
				role="dialog"
			>
				<header className="documents-upload-header">
					<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d12032] text-white shadow-[0_11px_25px_rgba(200,32,47,0.28)]">
						<History aria-hidden="true" size={20} strokeWidth={1.8} />
					</span>
					<div className="min-w-0 flex-1">
						<h2
							className="text-xl font-bold text-white"
							id="versions-dialog-title"
						>
							Historial de versiones
						</h2>
						<p className="mt-1 truncate text-xs text-[#bdc8c3]">
							{documentTitle}
						</p>
					</div>
					<a
						aria-label="Cerrar"
						className="documents-upload-close focus-ring"
						href={closeHref}
					>
						<X aria-hidden="true" size={18} />
					</a>
				</header>

				<div className="documents-upload-body documents-scrollbar flex min-h-0 flex-1 flex-col">
					<ul className="space-y-2">
						{versions.map((version) => (
							<li
								className="flex items-start gap-3 rounded-xl border border-[#dfe3dc] bg-[#fbfbf8] p-3"
								key={version.id}
							>
								<span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[#e9eeea] text-[#43514c] text-xs font-bold">
									v{version.versionNumber}
								</span>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-[#1d2828]">
										{version.originalName}
									</p>
									<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#6c7974]">
										<span className="inline-flex items-center gap-1">
											<Clock size={11} />
											{dateFormatter.format(new Date(version.createdAt))}
										</span>
										{version.uploadedBy?.name ? (
											<span className="inline-flex items-center gap-1">
												<User size={11} />
												{version.uploadedBy.name}
											</span>
										) : null}
										<span>{formatBytes(version.fileSize)}</span>
									</div>
									{version.notes ? (
										<p className="mt-1.5 text-xs leading-relaxed text-[#6c7974]">
											{version.notes}
										</p>
									) : null}
								</div>
								<a
									aria-label={`Descargar versión ${version.versionNumber}`}
									className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#d8ded8] bg-white text-[#43514c] hover:bg-[#f4f0ed]"
									download
									href={version.downloadHref}
								>
									<Download size={14} />
								</a>
							</li>
						))}
					</ul>
				</div>

				{canAddVersion ? (
					<form
						action={action}
						className="flex flex-none flex-col gap-2 border-t border-[#d8dfda] bg-white p-4"
						onSubmit={() => setPending(true)}
					>
						<label
							className={`documents-file-drop ${fileName ? "documents-file-drop--selected" : ""}`}
						>
							<span className="documents-file-drop__icon">
								<FileUp size={20} />
							</span>
							<strong>
								{fileName || "Selecciona el archivo de la nueva versión"}
							</strong>
							<span>Reemplaza el contenido, conserva las anteriores</span>
							<input
								className="sr-only"
								name="file"
								onChange={(event) =>
									setFileName(event.target.files?.[0]?.name ?? "")
								}
								accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.mov,.docx,.xlsx,.pptx,.dwg,.dxf"
								required
								type="file"
							/>
						</label>
						<input
							className={documentInputClass}
							name="notes"
							placeholder="Notas de esta versión (opcional)"
						/>
						<button
							className="documents-primary-action focus-ring w-full justify-center"
							disabled={pending || !fileName}
							type="submit"
						>
							<FileUp size={16} />{" "}
							{pending ? "Subiendo..." : "Agregar como nueva versión"}
						</button>
					</form>
				) : null}
			</section>
		</div>
	);
}
