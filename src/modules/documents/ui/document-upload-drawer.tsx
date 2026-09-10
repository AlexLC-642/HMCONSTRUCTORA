"use client";

import {
	ClipboardSignature,
	FileCheck2,
	FileImage,
	FileText,
	FileUp,
	FileVideo,
	FolderKanban,
	Info,
	ReceiptText,
	ShieldCheck,
	Tag,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { videoDurationLimitSeconds } from "../domain/catalog";
import { documentInputClass } from "./document-ui";

type UploadAction = (formData: FormData) => Promise<void>;
type Category = { id: string; key: string; name: string; description: string | null };

type Props = {
	action: UploadAction;
	categories: Category[];
	project?: { id: string; code: string; name: string };
	projects?: { id: string; code: string; name: string }[];
	closeHref: string;
};

export function DocumentUploadDrawer({
	action,
	categories,
	project,
	projects = [],
	closeHref,
}: Props) {
	const [fileName, setFileName] = useState("");
	const [pending, setPending] = useState(false);
	const [videoPreview, setVideoPreview] = useState("");
	const [videoDurationSeconds, setVideoDurationSeconds] = useState<
		number | null
	>(null);
	const [selectedCategory, setSelectedCategory] = useState("");
	const categoryIcons = {
		contratos: ClipboardSignature,
		planos: FileText,
		renders: FileVideo,
		comprobantes: ReceiptText,
		permisos: ShieldCheck,
		evidencias: FileImage,
		otros: FolderKanban,
	};

	const selectedCategoryKey = categories.find(
		(category) => category.id === selectedCategory,
	)?.key;
	const durationLimit = selectedCategoryKey
		? videoDurationLimitSeconds[selectedCategoryKey]
		: undefined;
	const durationExceeded =
		durationLimit !== undefined &&
		videoDurationSeconds !== null &&
		videoDurationSeconds > durationLimit;

	useEffect(
		() => () => {
			if (videoPreview) URL.revokeObjectURL(videoPreview);
		},
		[videoPreview],
	);

	return (
		<div className="documents-upload-backdrop">
			<a
				aria-label="Cerrar carga"
				className="absolute inset-0"
				href={closeHref}
			>
				<span className="sr-only">Cerrar carga</span>
			</a>
			<section
				aria-labelledby="upload-dialog-title"
				aria-modal="true"
				className="documents-upload-modal"
				role="dialog"
			>
				<header className="documents-upload-header">
					<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d12032] text-white shadow-[0_11px_25px_rgba(200,32,47,0.28)]">
						<FileUp aria-hidden="true" size={20} strokeWidth={1.8} />
					</span>
					<div className="min-w-0 flex-1">
						<h2
							className="text-xl font-bold text-white"
							id="upload-dialog-title"
						>
							Subir documento
						</h2>
						<p className="mt-1 truncate text-xs text-[#bdc8c3]">
							{project
								? `${project.code} · ${project.name}`
								: "Agregar al expediente de un proyecto"}
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

				<form
					action={action}
					className="flex min-h-0 flex-1 flex-col"
					onSubmit={(event) => {
						if (durationExceeded) {
							event.preventDefault();
							return;
						}
						setPending(true);
					}}
				>
					<div className="documents-upload-body documents-scrollbar">
						<label
							className={`documents-file-drop ${fileName ? "documents-file-drop--selected" : ""}`}
						>
							<span className="documents-file-drop__icon">
								{fileName ? <FileCheck2 size={24} /> : <FileUp size={24} />}
							</span>
							<strong>{fileName || "Selecciona un archivo"}</strong>
							<span>
								{fileName
									? "Archivo listo para cargar"
									: "PDF, imágenes, videos MP4/MOV, Office, DWG o DXF · máximo 80 MB"}
							</span>
							<input
								className="sr-only"
								name="file"
								onChange={(event) => {
									const file = event.target.files?.[0];
									setFileName(file?.name ?? "");
									setVideoDurationSeconds(null);
									setVideoPreview((current) => {
										if (current) URL.revokeObjectURL(current);
										return file?.type.startsWith("video/")
											? URL.createObjectURL(file)
											: "";
									});
								}}
								accept=".pdf,.png,.jpg,.jpeg,.webp,.mp4,.mov,.docx,.xlsx,.pptx,.dwg,.dxf"
								required
								type="file"
							/>
						</label>
						{videoPreview ? (
							<div className="overflow-hidden rounded-2xl bg-[#101719] p-3 shadow-[0_16px_36px_rgba(16,23,25,0.2)]">
								<div className="mb-2 flex items-center gap-2 text-xs font-semibold text-white">
									<FileVideo size={15} /> Vista previa del video
									{videoDurationSeconds !== null ? (
										<span className="ml-auto font-normal text-[#9fb0aa]">
											{Math.ceil(videoDurationSeconds)} s
										</span>
									) : null}
								</div>
								<video
									className="max-h-72 w-full rounded-xl bg-black object-contain"
									controls
									onLoadedMetadata={(event) =>
										setVideoDurationSeconds(event.currentTarget.duration)
									}
									src={videoPreview}
								>
									<track kind="captions" />
								</video>
								{durationExceeded ? (
									<p className="mt-2 rounded-lg bg-[#4a1c1f] px-3 py-2 text-xs text-[#ffd1d1]">
										Este video dura {Math.ceil(videoDurationSeconds ?? 0)}{" "}
										segundos; la categoría seleccionada admite hasta{" "}
										{durationLimit} segundos.
									</p>
								) : null}
							</div>
						) : null}

						<section className="documents-form-section">
							<div className="flex items-center gap-2">
								<span className="grid size-9 place-items-center rounded-lg bg-[#e9eeea] text-[#43514c]">
									<FolderKanban aria-hidden="true" size={17} />
								</span>
								<div>
									<h3 className="text-sm font-bold text-[#1d2828]">
										Datos del documento
									</h3>
									<p className="text-xs text-[#68756f]">
										Organiza el archivo dentro del expediente.
									</p>
								</div>
							</div>

							<div className="mt-4 grid gap-4 sm:grid-cols-2">
								{!project ? (
									<label className="documents-field sm:col-span-2">
										Proyecto
										<select
											className={documentInputClass}
											name="projectId"
											required
										>
											<option value="">Selecciona un proyecto</option>
											{projects.map((item) => (
												<option key={item.id} value={item.id}>
													{item.code} · {item.name}
												</option>
											))}
										</select>
									</label>
								) : null}
								<label className="documents-field sm:col-span-2">
									Título
									<input
										className={documentInputClass}
										name="title"
										placeholder="Nombre del documento"
									/>
								</label>
								<fieldset className="sm:col-span-2">
									<legend className="documents-field mb-2">Tipo de documento</legend>
									<p className="mb-3 text-xs leading-relaxed text-[#6c7974]">Elige qué representa el archivo. Las facturas y recibos se adjuntan desde Finanzas; presupuestos, informes y requerimientos se gestionan desde sus propios módulos.</p>
									<div className="grid gap-2 sm:grid-cols-2">
										{categories.map((category) => {
											const Icon = categoryIcons[category.key as keyof typeof categoryIcons] ?? FileText;
											const selected = selectedCategory === category.id;
											return <label className={`group flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition duration-200 ${selected ? "border-[#278362] bg-[#eef8f3] shadow-[0_8px_22px_rgba(31,122,91,0.12)]" : "border-[#d8ded8] bg-white hover:-translate-y-0.5 hover:border-[#aab7b0] hover:shadow-[0_8px_20px_rgba(22,27,29,0.08)]"}`} key={category.id}>
												<input className="sr-only" name="categoryId" onChange={() => setSelectedCategory(category.id)} required type="radio" value={category.id} />
												<span className={`grid size-9 shrink-0 place-items-center rounded-lg ${selected ? "bg-[#d9f0e4] text-[#176f54]" : "bg-[#f0f3f0] text-[#596762]"}`}><Icon size={16} /></span>
												<span className="min-w-0"><strong className="block text-sm text-[#263330]">{category.name}</strong><small className="mt-0.5 block leading-relaxed text-[#71807a]">{category.description}</small></span>
											</label>;
										})}
									</div>
								</fieldset>
							</div>
							<input name="status" type="hidden" value="DRAFT" />
						</section>

						<details className="documents-additional">
							<summary>
								<Info size={16} /> Información adicional
							</summary>
							<div className="mt-4 grid gap-4">
								<label className="documents-field">
									Descripción
									<textarea
										className="documents-textarea focus-ring"
										name="description"
										placeholder="Contenido o propósito del archivo"
									/>
								</label>
								<label className="documents-field">
									<span className="inline-flex items-center gap-1.5">
										<Tag size={13} /> Etiquetas
									</span>
									<input
										className={documentInputClass}
										name="tags"
										placeholder="Ej. contrato, fase 1, aprobado"
									/>
								</label>
							</div>
						</details>
					</div>

					<footer className="documents-upload-footer">
						<a
							className="documents-secondary-action focus-ring"
							href={closeHref}
						>
							Cancelar
						</a>
						<button
							className="documents-primary-action focus-ring"
							disabled={pending || durationExceeded}
							type="submit"
						>
							<FileUp size={16} /> {pending ? "Subiendo..." : "Subir documento"}
						</button>
					</footer>
				</form>
			</section>
		</div>
	);
}
