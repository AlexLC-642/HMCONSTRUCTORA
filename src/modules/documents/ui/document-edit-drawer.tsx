"use client";

import { FolderKanban, Info, Pencil, Tag, X } from "lucide-react";
import { useState } from "react";
import { documentInputClass } from "./document-ui";

type EditAction = (formData: FormData) => Promise<void>;
type Category = { id: string; key: string; name: string };

type Props = {
	action: EditAction;
	closeHref: string;
	document: {
		title: string;
		description: string | null;
		tags: string | null;
		categoryId: string;
		latestFileName?: string;
	};
	categories: Category[];
};

export function DocumentEditDrawer({
	action,
	closeHref,
	document,
	categories,
}: Props) {
	const [pending, setPending] = useState(false);

	return (
		<div className="documents-upload-backdrop">
			<a
				aria-label="Cerrar edición"
				className="absolute inset-0"
				href={closeHref}
			>
				<span className="sr-only">Cerrar edición</span>
			</a>
			<section
				aria-labelledby="edit-dialog-title"
				aria-modal="true"
				className="documents-upload-modal"
				role="dialog"
			>
				<header className="documents-upload-header">
					<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#d12032] text-white shadow-[0_11px_25px_rgba(200,32,47,0.28)]">
						<Pencil aria-hidden="true" size={20} strokeWidth={1.8} />
					</span>
					<div className="min-w-0 flex-1">
						<h2 className="text-xl font-bold text-white" id="edit-dialog-title">
							Editar información
						</h2>
						<p className="mt-1 truncate text-xs text-[#bdc8c3]">
							{document.latestFileName ?? document.title}
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
					onSubmit={() => setPending(true)}
				>
					<div className="documents-upload-body documents-scrollbar">
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
										Actualiza el título, la categoría y las notas del archivo.
									</p>
								</div>
							</div>

							<div className="mt-4 grid gap-4 sm:grid-cols-2">
								<label className="documents-field sm:col-span-2">
									Título
									<input
										className={documentInputClass}
										defaultValue={document.title}
										name="title"
										placeholder="Nombre del documento"
									/>
								</label>
								<label className="documents-field sm:col-span-2">
									Categoría
									<select
										className={documentInputClass}
										defaultValue={document.categoryId}
										name="categoryId"
										required
									>
										{categories.map((category) => (
											<option key={category.id} value={category.id}>
												{category.name}
											</option>
										))}
									</select>
								</label>
							</div>
						</section>

						<details className="documents-additional" open>
							<summary>
								<Info size={16} /> Información adicional
							</summary>
							<div className="mt-4 grid gap-4">
								<label className="documents-field">
									Descripción
									<textarea
										className="documents-textarea focus-ring"
										defaultValue={document.description ?? ""}
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
										defaultValue={document.tags ?? ""}
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
							disabled={pending}
							type="submit"
						>
							<Pencil size={16} />{" "}
							{pending ? "Guardando..." : "Guardar cambios"}
						</button>
					</footer>
				</form>
			</section>
		</div>
	);
}
