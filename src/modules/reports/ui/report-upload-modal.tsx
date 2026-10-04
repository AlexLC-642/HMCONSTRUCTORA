"use client";

import { FileCheck2, FileUp, Upload, X } from "lucide-react";
import { useActionState, useId, useState } from "react";
import { useFormStatus } from "react-dom";
import {
	type ReportUploadState,
	uploadProjectReportAction,
} from "@/modules/documents/application/actions";
import { HelpTip } from "@/shared/ui/help-tip";
import { SelectMenu } from "@/shared/ui/select-menu";

const ACCEPT = ".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.webp";

function formatBytes(value: number) {
	if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
	return `${Math.max(1, Math.round(value / 1024))} KB`;
}

function titleFromFileName(name: string) {
	return name
		.replace(/\.[^.]+$/, "")
		.replace(/[_-]+/g, " ")
		.trim();
}

function SubmitButton({ disabled }: { disabled: boolean }) {
	const { pending } = useFormStatus();
	return (
		<button
			className="reports-primary-action reports-primary-action--compact focus-ring"
			disabled={pending || disabled}
			type="submit"
		>
			<Upload size={16} />
			{pending ? "Subiendo..." : "Subir informe"}
		</button>
	);
}

export function ReportUploadModal({
	projects,
	closeHref,
	defaultProjectId = "",
}: {
	projects: Array<{ id: string; code: string; name: string }>;
	closeHref: string;
	defaultProjectId?: string;
}) {
	const ids = useId();
	const [state, formAction] = useActionState<ReportUploadState, FormData>(
		uploadProjectReportAction,
		{ status: "idle", message: "" },
	);
	const [projectId, setProjectId] = useState(defaultProjectId);
	const [file, setFile] = useState<File | null>(null);
	const [title, setTitle] = useState("");
	const [titleTouched, setTitleTouched] = useState(false);

	return (
		<div className="reports-modal-backdrop">
			<section
				aria-labelledby={`${ids}-title`}
				aria-modal="true"
				className="reports-modal"
				role="dialog"
			>
				<header className="reports-modal__header">
					<span className="grid size-11 place-items-center rounded-xl bg-[#d12032] text-white shadow-[0_10px_24px_rgba(200,32,47,0.28)]">
						<Upload size={20} />
					</span>
					<div className="min-w-0 flex-1">
						<h2 className="text-xl font-bold text-white" id={`${ids}-title`}>
							Subir informe
						</h2>
						<p className="text-sm text-white/70">
							Informe externo o firmado del proyecto
						</p>
					</div>
					<a
						aria-label="Cerrar"
						className="reports-modal__close focus-ring"
						href={closeHref}
					>
						<X size={18} />
					</a>
				</header>
				<form action={formAction} className="space-y-4 p-5 sm:p-6">
					{state.status === "error" ? (
						<p className="report-upload__error" role="alert">
							{state.message}
						</p>
					) : null}
					<div className="reports-field">
						<span id={`${ids}-project`}>Proyecto</span>
						<SelectMenu
							aria-labelledby={`${ids}-project`}
							emptyMessage="Ningún proyecto coincide."
							name="projectId"
							onChange={setProjectId}
							options={projects.map((project) => ({
								value: project.id,
								label: project.name,
								description: project.code,
							}))}
							placeholder="Elegir proyecto"
							searchPlaceholder="Buscar por nombre o código"
							searchable={projects.length > 6}
							value={projectId}
						/>
					</div>

					<div className="reports-field">
						<span className="inline-flex items-center gap-1.5">
							Archivo
							<HelpTip label="Ayuda: formatos de informe">
								PDF recomendado: se ve completo dentro del sistema. También
								Word, Excel o foto (JPG, PNG). Máximo 80 MB.
							</HelpTip>
						</span>
						<label className="report-upload__drop" data-filled={Boolean(file)}>
							{file ? (
								<FileCheck2 aria-hidden="true" size={22} />
							) : (
								<FileUp aria-hidden="true" size={22} />
							)}
							<span className="min-w-0">
								<strong>{file ? file.name : "Elegir archivo"}</strong>
								<small>
									{file ? formatBytes(file.size) : "PDF, Word, Excel o foto"}
								</small>
							</span>
							<input
								accept={ACCEPT}
								className="sr-only"
								name="file"
								onChange={(event) => {
									const selected = event.target.files?.[0] ?? null;
									setFile(selected);
									if (selected && !titleTouched) {
										setTitle(titleFromFileName(selected.name));
									}
								}}
								required
								type="file"
							/>
						</label>
					</div>

					<label className="reports-field">
						Título
						<input
							className="reports-input"
							maxLength={191}
							name="title"
							onChange={(event) => {
								setTitle(event.target.value);
								setTitleTouched(true);
							}}
							placeholder="Ej. Informe de supervisión semana 12"
							value={title}
						/>
					</label>

					<label className="reports-field">
						Descripción (opcional)
						<textarea
							className="reports-input min-h-20 py-2.5"
							maxLength={1000}
							name="description"
						/>
					</label>

					<label className="report-upload__check">
						<input name="portalVisible" type="checkbox" />
						Visible para el cliente en su portal
					</label>

					<div className="flex flex-col-reverse gap-2 border-t border-[#dce2dd] pt-4 sm:flex-row sm:justify-end">
						<a className="reports-secondary-action focus-ring" href={closeHref}>
							Cancelar
						</a>
						<SubmitButton disabled={!projectId || !file} />
					</div>
				</form>
			</section>
		</div>
	);
}
